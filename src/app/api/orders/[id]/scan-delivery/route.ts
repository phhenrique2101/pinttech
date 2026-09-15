import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();
    const { code, forceInclude } = body;

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
      // 1. O barril já foi bipado neste pedido?
      const alreadyScannedItem = order.items.find((it) => it.kegId === keg.id);
      if (alreadyScannedItem) {
        return NextResponse.json(
          {
            error: `Barril ${keg.code} (${keg.currentBeerName || 'Chopp'}) já foi bipado e conferido neste pedido.`,
            order,
          },
          { status: 400 }
        );
      }

      let isNewItem = false;
      const recipe = keg.currentBatch?.recipe;
      const beerName = keg.currentBeerName || recipe?.name || 'Cerveja Artesanal';
      const volume = keg.currentVolumeLiters || keg.capacity || 50;

      // Determinar preço por litro: consultar Tabela de Preços do pedido se houver
      let pricePerLiter = recipe?.salePricePerLiter || recipe?.suggestedPricePerLiter || 22.0;
      if (order.priceTableId && recipe?.id) {
        try {
          const tableItem = await prisma.priceTableItem.findUnique({
            where: {
              priceTableId_recipeId: {
                priceTableId: order.priceTableId,
                recipeId: recipe.id,
              },
            },
          });
          if (tableItem && tableItem.pricePerLiter > 0) {
            pricePerLiter = tableItem.pricePerLiter;
          }
        } catch (e) {
          console.warn('Error fetching priceTableItem in scan-delivery:', e);
        }
      }
      const calculatedPrice = pricePerLiter * volume;

      // 2. Existe um item no pedido sem barril vinculado que corresponda a esta cerveja?
      const pendingItem = order.items.find(
        (it) =>
          !it.kegId &&
          ((it.recipeId && keg.currentBatch?.recipeId && it.recipeId === keg.currentBatch.recipeId) ||
            (it.recipe?.name && it.recipe.name.toLowerCase().trim() === beerName.toLowerCase().trim()) ||
            (!it.recipeId && it.description?.toLowerCase().includes(beerName.toLowerCase())))
      );

      if (pendingItem) {
        // Se o item tinha quantidade > 1 (ex: 2x 50L), desmembra o item bipado para 1 unidade e mantém o restante pendente
        if (pendingItem.quantity > 1) {
          const unitPrice = pendingItem.unitPrice > 0 ? pendingItem.unitPrice : calculatedPrice;
          await prisma.orderItem.update({
            where: { id: pendingItem.id },
            data: {
              quantity: pendingItem.quantity - 1,
              totalPrice: (pendingItem.quantity - 1) * unitPrice,
            },
          });

          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              recipeId: pendingItem.recipeId || recipe?.id || null,
              batchId: keg.currentBatchId || pendingItem.batchId || null,
              kegId: keg.id,
              description: `Barril ${keg.capacity}L - ${beerName} (${volume}L envasados)`,
              quantity: 1,
              unitPrice: unitPrice,
              totalPrice: unitPrice,
            },
          });
        } else {
          // Vincula o barril físico ao item pendente único
          await prisma.orderItem.update({
            where: { id: pendingItem.id },
            data: {
              kegId: keg.id,
              batchId: keg.currentBatchId || pendingItem.batchId,
              description: `Barril ${keg.capacity}L - ${beerName} (${volume}L envasados)`,
              unitPrice: pendingItem.unitPrice > 0 ? pendingItem.unitPrice : calculatedPrice,
              totalPrice: pendingItem.totalPrice > 0 ? pendingItem.totalPrice : calculatedPrice,
            },
          });
        }
      } else {
        // O barril bipado não consta nos itens pendentes deste pedido
        if (!forceInclude) {
          return NextResponse.json({
            requiresConfirmation: true,
            keg: {
              id: keg.id,
              code: keg.code,
              beerName,
              capacity: keg.capacity,
              volume,
              calculatedPrice,
            },
            message: `O barril ${keg.code} (${beerName} ${volume}L) não consta nos itens deste pedido. O cliente solicitou a inclusão deste barril de última hora? (+ ${formatCurrency(calculatedPrice)})`,
            order,
          });
        }

        // Se foi confirmado a inclusão de última hora
        isNewItem = true;
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            recipeId: recipe?.id || null,
            batchId: keg.currentBatchId || null,
            kegId: keg.id,
            description: `Barril ${keg.capacity}L - ${beerName} (${volume}L envasados)`,
            quantity: 1,
            unitPrice: calculatedPrice,
            totalPrice: calculatedPrice,
          },
        });
      }

      // Recalcular totais do pedido
      const allUpdatedItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
      const newSubtotal = allUpdatedItems.reduce((acc, it) => acc + it.totalPrice, 0);
      const newTotalAmount = Math.max(0, newSubtotal + order.deliveryFee + order.cautionDeposit - order.discount);
      const newRemainingAmount = Math.max(0, newTotalAmount - (order.paidAmount || 0));
      const newPaymentStatus =
        (order.paidAmount || 0) >= newTotalAmount && newTotalAmount > 0
          ? 'PAGO'
          : (order.paidAmount || 0) > 0
          ? 'PARCIAL'
          : 'PENDENTE';

      // Verifica se todos os itens de cerveja já foram bipados
      const allDelivered = allUpdatedItems.length > 0 && allUpdatedItems.every((it) => it.kegId !== null);
      const newStatus = allDelivered ? 'ENTREGUE' : (order.status === 'ENTREGUE' ? 'ENTREGUE' : 'EM_ROTA');

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          subtotal: newSubtotal,
          totalAmount: newTotalAmount,
          remainingAmount: newRemainingAmount,
          paymentStatus: newPaymentStatus,
          status: newStatus,
        },
        include: {
          client: true,
          priceTable: true,
          items: { include: { keg: true, recipe: true } },
          orderEquipments: { include: { equipment: true } },
          transactions: true,
        },
      });

      // Atualizar transação financeira vinculada ao pedido
      if (order.transactions.length > 0) {
        const primaryTx = order.transactions.find((t) => t.category === 'VENDA_CERVEJA') || order.transactions[0];
        await prisma.financialTransaction.update({
          where: { id: primaryTx.id },
          data: {
            amount: newTotalAmount,
            description: `Faturamento Pedido ${order.orderNumber} - ${order.client.tradeName || order.client.name} (Atualizado via Bipe)`,
          },
        });
      }

      // Se o barril estava retido com outro cliente, decrementa o contador anterior
      if (keg.currentClientId && keg.currentClientId !== order.clientId) {
        await prisma.client.update({
          where: { id: keg.currentClientId },
          data: { retainedKegsCount: { decrement: 1 } },
        }).catch(() => {});
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
          driverName: order.driverName || session.name,
          notes: isNewItem
            ? `Entregue e incluído de última hora no pedido ${order.orderNumber}`
            : `Entregue no pedido ${order.orderNumber}`,
        },
      });

      const beerDesc = keg.currentBeerName || 'Cerveja';

      return NextResponse.json({
        success: true,
        isNewItem,
        message: isNewItem
          ? `Barril ${keg.code} (${beerDesc}) incluído no pedido! Total recalculado para ${formatCurrency(newTotalAmount)}.`
          : `Barril ${keg.code} (${beerDesc}) conferido e vinculado com sucesso!`,
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
