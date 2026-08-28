import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const where: any = {};
    if (session.role !== 'SUPER_ADMIN' || session.breweryId) {
      if (session.breweryId) where.breweryId = session.breweryId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        brewery: true,
        client: true,
        items: {
          include: {
            keg: true,
            recipe: true,
          },
        },
        orderEquipments: {
          include: { equipment: true },
        },
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const {
      clientId,
      deliveryDate,
      estimatedReturnDate,
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

    if (!clientId) {
      return NextResponse.json({ error: 'Selecione um cliente' }, { status: 400 });
    }

    const orderCount = await prisma.order.count({ where: { breweryId: session.breweryId } });
    const orderNumber = `PED-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`;

    let computedSubtotal = 0;
    const processedItems: any[] = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        let desc = item.description;
        if (!desc && item.recipeId) {
          const recipe = await prisma.beerRecipe.findUnique({ where: { id: item.recipeId } });
          desc = `Barril - ${recipe?.name || 'Chopp Artesanal'}`;
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
    const finalDeliveryFee = parseFloat(deliveryFee) || 0;
    const finalCautionDeposit = parseFloat(cautionDeposit) || 0;
    const finalDiscount = parseFloat(discount) || 0;
    const finalTotal = totalAmount !== undefined
      ? parseFloat(totalAmount)
      : Math.max(0, finalSubtotal + finalDeliveryFee + finalCautionDeposit - finalDiscount);

    const order = await prisma.order.create({
      data: {
        breweryId: session.breweryId,
        orderNumber,
        clientId,
        status: 'CONFIRMADO',
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
        estimatedReturnDate: estimatedReturnDate ? new Date(estimatedReturnDate) : null,
        deliveryAddress,
        subtotal: finalSubtotal,
        discount: finalDiscount,
        deliveryFee: finalDeliveryFee,
        cautionDeposit: finalCautionDeposit,
        totalAmount: finalTotal,
        paidAmount: 0,
        remainingAmount: finalTotal,
        paymentMethod: paymentMethod || 'PIX',
        paymentStatus: 'PENDENTE',
        notes,
      },
    });

    // Create Order Items
    for (const pItem of processedItems) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          recipeId: pItem.recipeId,
          kegId: pItem.kegId,
          description: pItem.description,
          quantity: pItem.quantity,
          unitPrice: pItem.unitPrice,
          totalPrice: pItem.totalPrice,
        },
      });
    }

    // Bind Comodato Equipments
    if (Array.isArray(equipmentIds) && equipmentIds.length > 0) {
      // Release from other active unfulfilled orders
      await prisma.orderEquipment.deleteMany({
        where: {
          equipmentId: { in: equipmentIds },
          orderId: { not: order.id },
          order: { status: { in: ['ORCAMENTO', 'CONFIRMADO', 'EM_SEPARACAO'] } },
        },
      });

      for (const eqId of equipmentIds) {
        await prisma.orderEquipment.create({
          data: {
            orderId: order.id,
            equipmentId: eqId,
          },
        });
      }
    }

    // Automatically create Accounts Receivable in Finance
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (finalTotal > 0) {
      await prisma.financialTransaction.create({
        data: {
          breweryId: session.breweryId,
          orderId: order.id,
          type: 'RECEITA',
          category: 'VENDA_CERVEJA',
          description: `Venda ${orderNumber} - ${client?.tradeName || client?.name}`,
          amount: finalTotal,
          dueDate: deliveryDate ? new Date(deliveryDate) : new Date(),
          status: 'PENDENTE',
          paymentMethod: paymentMethod || 'PIX',
        },
      });
    }

    const createdWithRelations = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        client: true,
        items: true,
        orderEquipments: true,
      },
    });

    return NextResponse.json(createdWithRelations);
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}
