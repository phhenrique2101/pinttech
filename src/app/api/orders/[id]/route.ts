import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        brewery: true,
        client: true,
        items: {
          include: { recipe: true, keg: true },
        },
        orderEquipments: {
          include: { equipment: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar pedido' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        orderEquipments: true,
        client: true,
      },
    });

    if (!existing) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    const body = await req.json();
    const {
      clientId,
      status,
      deliveryDate,
      estimatedReturnDate,
      actualReturnDate,
      deliveryAddress,
      items,
      equipmentIds,
      subtotal,
      discount,
      deliveryFee,
      cautionDeposit,
      totalAmount,
      paymentMethod,
      notes,
    } = body;

    let computedSubtotal = 0;
    const processedItems: any[] = [];

    if (Array.isArray(items)) {
      // Process items and compute subtotal

      for (const item of items) {
        let desc = item.description;
        if (!desc && item.recipeId) {
          const recipe = await prisma.beerRecipe.findUnique({ where: { id: item.recipeId } });
          const cap = parseInt(item.kegCapacity, 10) || 50;
          desc = `Barril ${cap}L - ${recipe?.name || 'Chopp Artesanal'}`;
        } else if (!desc) {
          desc = 'Barril de Chopp';
        }

        const qty = parseFloat(item.quantity) || 1;
        const uPrice = parseFloat(item.unitPrice) || 0;
        const tPrice = item.totalPrice !== undefined ? parseFloat(item.totalPrice) : qty * uPrice;
        computedSubtotal += tPrice;

        processedItems.push({
          recipeId: item.recipeId || null,
          kegId: item.kegId || null,
          description: desc,
          quantity: qty,
          unitPrice: uPrice,
          totalPrice: tPrice,
        });
      }
    }

    const finalSubtotal = subtotal !== undefined ? parseFloat(subtotal) : computedSubtotal;
    const finalDeliveryFee = deliveryFee !== undefined ? parseFloat(deliveryFee) : existing.deliveryFee;
    const finalCautionDeposit = cautionDeposit !== undefined ? parseFloat(cautionDeposit) : existing.cautionDeposit;
    const finalDiscount = discount !== undefined ? parseFloat(discount) : existing.discount;
    const finalTotal = totalAmount !== undefined
      ? parseFloat(totalAmount)
      : Math.max(0, finalSubtotal + finalDeliveryFee + finalCautionDeposit - finalDiscount);

    const paid = existing.paidAmount || 0;
    const remaining = Math.max(0, finalTotal - paid);
    const newPaymentStatus = paid >= finalTotal && finalTotal > 0
      ? 'PAGO'
      : paid > 0
      ? 'PARCIAL'
      : 'PENDENTE';

    // Update order
    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        clientId: clientId || existing.clientId,
        status: status ?? existing.status,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : existing.deliveryDate,
        estimatedReturnDate: estimatedReturnDate ? new Date(estimatedReturnDate) : existing.estimatedReturnDate,
        actualReturnDate: actualReturnDate ? new Date(actualReturnDate) : existing.actualReturnDate,
        deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : existing.deliveryAddress,
        subtotal: finalSubtotal,
        discount: finalDiscount,
        deliveryFee: finalDeliveryFee,
        cautionDeposit: finalCautionDeposit,
        totalAmount: finalTotal,
        remainingAmount: remaining,
        paymentStatus: newPaymentStatus,
        paymentMethod: paymentMethod ?? existing.paymentMethod,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    // Replace items if provided
    if (Array.isArray(items)) {
      await prisma.orderItem.deleteMany({ where: { orderId: params.id } });
      for (const pItem of processedItems) {
        await prisma.orderItem.create({
          data: {
            orderId: params.id,
            recipeId: pItem.recipeId,
            kegId: pItem.kegId,
            description: pItem.description,
            quantity: pItem.quantity,
            unitPrice: pItem.unitPrice,
            totalPrice: pItem.totalPrice,
          },
        });
      }
    }

    // Replace equipments if provided
    if (Array.isArray(equipmentIds)) {
      if (equipmentIds.length > 0) {
        // Release from other active unfulfilled orders
        await prisma.orderEquipment.deleteMany({
          where: {
            equipmentId: { in: equipmentIds },
            orderId: { not: params.id },
            order: { status: { in: ['ORCAMENTO', 'CONFIRMADO', 'EM_SEPARACAO'] } },
          },
        });
      }

      await prisma.orderEquipment.deleteMany({ where: { orderId: params.id } });
      for (const eqId of equipmentIds) {
        await prisma.orderEquipment.create({
          data: {
            orderId: params.id,
            equipmentId: eqId,
          },
        });
      }
    }

    // Update primary pending transaction amount in financial if exists
    const primaryTx = await prisma.financialTransaction.findFirst({
      where: { orderId: params.id, status: 'PENDENTE' },
    });
    if (primaryTx) {
      await prisma.financialTransaction.update({
        where: { id: primaryTx.id },
        data: {
          amount: remaining > 0 ? remaining : finalTotal,
          dueDate: updated.deliveryDate || new Date(),
        },
      });
    }

    // Register in ActionLog
    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'ORDER_UPDATE',
        description: `Pedido ${existing.orderNumber} atualizado (${existing.client.tradeName || existing.client.name}) - Total: R$ ${finalTotal.toFixed(2)}`,
        entityType: 'Order',
        entityId: existing.id,
        previousData: JSON.stringify(existing),
        newData: JSON.stringify(updated),
      },
    });

    const fullOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        items: { include: { recipe: true, keg: true } },
        orderEquipments: { include: { equipment: true } },
        transactions: true,
      },
    });

    return NextResponse.json(fullOrder);
  } catch (error: any) {
    console.error('Order update error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar pedido' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.order.findUnique({
      where: { id: params.id },
      include: { client: true },
    });

    if (!existing) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    await prisma.order.delete({ where: { id: params.id } });

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'ORDER_DELETE',
        description: `Pedido ${existing.orderNumber} (${existing.client.name}) excluído`,
        entityType: 'Order',
        entityId: existing.id,
        previousData: JSON.stringify(existing),
        newData: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao excluir pedido' }, { status: 500 });
  }
}
