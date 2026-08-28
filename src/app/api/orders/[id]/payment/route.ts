import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { client: true },
    });

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    const body = await req.json();
    const { amount, paymentMethod, paymentDate, documentNumber, notes } = body;

    const paymentVal = parseFloat(amount);
    if (isNaN(paymentVal) || paymentVal <= 0) {
      return NextResponse.json({ error: 'Informe um valor de recebimento válido' }, { status: 400 });
    }

    const currentPaid = order.paidAmount || 0;
    const newPaid = currentPaid + paymentVal;
    const newRemaining = Math.max(0, order.totalAmount - newPaid);
    const newPaymentStatus = newPaid >= order.totalAmount ? 'PAGO' : 'PARCIAL';

    // 1. Create FinancialTransaction for this receipt
    const tx = await prisma.financialTransaction.create({
      data: {
        breweryId: session.breweryId,
        orderId: order.id,
        type: 'RECEITA',
        category: 'VENDA_CERVEJA',
        description: `Recebimento Pedido ${order.orderNumber} - ${order.client.tradeName || order.client.name}`,
        amount: paymentVal,
        dueDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        status: 'PAGO',
        paymentMethod: paymentMethod || 'PIX',
        documentNumber: documentNumber || null,
      },
    });

    // 2. Update Order with new paid and remaining amount
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        paymentStatus: newPaymentStatus,
      },
      include: {
        client: true,
        items: { include: { recipe: true, keg: true } },
        orderEquipments: { include: { equipment: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });

    // 3. Log in ActionLog
    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'PAYMENT_RECORD',
        description: `Recebimento de R$ ${paymentVal.toFixed(2)} (${paymentMethod || 'PIX'}) no Pedido ${order.orderNumber}`,
        entityType: 'FinancialTransaction',
        entityId: tx.id,
        previousData: JSON.stringify({
          paidAmount: order.paidAmount,
          remainingAmount: order.remainingAmount,
          paymentStatus: order.paymentStatus,
        }),
        newData: JSON.stringify({
          transactionId: tx.id,
          amount: paymentVal,
          orderId: order.id,
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          paymentStatus: newPaymentStatus,
        }),
      },
    });

    return NextResponse.json({ success: true, order: updatedOrder, transaction: tx });
  } catch (error: any) {
    console.error('Payment record error:', error);
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 });
  }
}
