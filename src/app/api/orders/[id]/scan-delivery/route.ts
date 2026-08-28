import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Código de barras / QR é obrigatório' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Buscar o pedido com itens e equipamentos
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        items: { include: { keg: true, recipe: true } },
        orderEquipments: { include: { equipment: true } },
        transactions: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const breweryId = order.breweryId;

    // 2. Procurar se o código é um Barril ou Equipamento
    const keg = await prisma.keg.findFirst({
      where: { code: cleanCode, breweryId },
      include: { currentBatch: { include: { recipe: true } } },
    });

    const equipment = !keg
      ? await prisma.equipment.findFirst({ where: { code: cleanCode, breweryId } })
      : null;

    if (!keg && !equipment) {
      return NextResponse.json({ error: `Código "${cleanCode}" não cadastrado nesta cervejaria` }, { status: 404 });
    }

    // ----------------------------------------------------
    // PROCESSAR BARRIL BIPADO NO PEDIDO
    // ----------------------------------------------------
    if (keg) {
      let isNewItem = false;
      const existingItem = order.items.find((it) => it.kegId === keg.id);

      if (!existingItem) {
        // Barril NÃO estava no pedido original -> Adicionar automaticamente e recalcular!
        isNewItem = true;
        const recipe = keg.currentBatch?.recipe;
        const beerName = keg.currentBeerName || recipe?.name || 'Cerveja Artesanal';
        const pricePerLiter = recipe?.suggestedPricePerLiter || 22.0;
        const volume = keg.currentVolumeLiters || keg.capacity;
        const itemTotalPrice = pricePerLiter * volume;

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            recipeId: recipe?.id || null,
            batchId: keg.currentBatchId || null,
            kegId: keg.id,
            description: `Barril ${keg.capacity}L - ${beerName} (${volume}L envasados)`,
            quantity: 1,
            unitPrice: itemTotalPrice,
            totalPrice: itemTotalPrice,
          },
        });
      }

      // Recalcular totais do pedido
      const allUpdatedItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
      const newSubtotal = allUpdatedItems.reduce((acc, it) => acc + it.totalPrice, 0);
      const newTotalAmount = newSubtotal + order.deliveryFee + order.cautionDeposit - order.discount;

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          subtotal: newSubtotal,
          totalAmount: newTotalAmount,
          status: 'ENTREGUE',
        },
        include: {
          client: true,
          items: { include: { keg: true, recipe: true } },
          orderEquipments: { include: { equipment: true } },
        },
      });

      // Atualizar transação financeira vinculada ao pedido
      if (order.transactions.length > 0) {
        const primaryTx = order.transactions.find((t) => t.category === 'VENDA_CERVEJA') || order.transactions[0];
        await prisma.financialTransaction.update({
          where: { id: primaryTx.id },
          data: {
            amount: newTotalAmount,
            description: `Faturamento Pedido ${order.orderNumber} - ${order.client.tradeName || order.client.name} (Atualizado)`,
          },
        });
      }

      // Atualizar status do barril para NO_CLIENTE
      await prisma.keg.update({
        where: { id: keg.id },
        data: {
          status: 'NO_CLIENTE',
          currentClientId: order.clientId,
          lastDeliveredAt: new Date(),
        },
      });

      await prisma.client.update({
        where: { id: order.clientId },
        data: { retainedKegsCount: { increment: 1 } },
      });

      await prisma.kegMovement.create({
        data: {
          breweryId,
          kegId: keg.id,
          toClientId: order.clientId,
          action: 'ENTREGA',
          fromStatus: keg.status,
          toStatus: 'NO_CLIENTE',
          volumeLiters: keg.currentVolumeLiters || keg.capacity,
          userName: session.name,
          driverName: session.name,
          notes: isNewItem
            ? `Entregue via bipe e adicionado automaticamente ao pedido ${order.orderNumber}`
            : `Entregue no pedido ${order.orderNumber}`,
        },
      });

      const beerDesc = keg.currentBeerName || 'Cerveja';

      return NextResponse.json({
        success: true,
        isNewItem,
        message: isNewItem
          ? `Barril ${keg.code} (${beerDesc}) adicionado ao pedido! Total recalculado para ${formatCurrency(newTotalAmount)}.`
          : `Barril ${keg.code} (${beerDesc}) conferido e entregue com sucesso!`,
        order: updatedOrder,
      });
    }

    // ----------------------------------------------------
    // PROCESSAR EQUIPAMENTO BIPADO NO PEDIDO
    // ----------------------------------------------------
    if (equipment) {
      const alreadyLinked = order.orderEquipments.some((eq) => eq.equipmentId === equipment.id);

      if (!alreadyLinked) {
        await prisma.orderEquipment.create({
          data: {
            orderId: order.id,
            equipmentId: equipment.id,
          },
        });
      }

      await prisma.equipment.update({
        where: { id: equipment.id },
        data: {
          status: 'EM_USO_CLIENTE',
          currentClientId: order.clientId,
        },
      });

      await prisma.kegMovement.create({
        data: {
          breweryId,
          equipmentId: equipment.id,
          toClientId: order.clientId,
          action: 'ENTREGA',
          fromStatus: equipment.status,
          toStatus: 'EM_USO_CLIENTE',
          userName: session.name,
          driverName: session.name,
          notes: `Equipamento entregue em comodato no pedido ${order.orderNumber}`,
        },
      });

      const updatedOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          client: true,
          items: { include: { keg: true, recipe: true } },
          orderEquipments: { include: { equipment: true } },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Equipamento ${equipment.name} (${equipment.code}) comodatado no pedido!`,
        order: updatedOrder,
      });
    }

    return NextResponse.json({ error: 'Erro ao processar item' }, { status: 400 });
  } catch (error: any) {
    console.error('Order scan error:', error);
    return NextResponse.json({ error: 'Erro ao bipar no pedido' }, { status: 500 });
  }
}
