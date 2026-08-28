import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao proprietário do sistema' }, { status: 403 });
    }

    const [payments, breweries] = await Promise.all([
      prisma.saasSubscriptionPayment.findMany({
        include: {
          brewery: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              monthlyPrice: true,
              billingStatus: true,
              active: true,
            },
          },
        },
        orderBy: { dueDate: 'desc' },
      }),
      prisma.brewery.findMany({
        select: {
          id: true,
          name: true,
          plan: true,
          monthlyPrice: true,
          billingStatus: true,
          active: true,
        },
      }),
    ]);

    const totalMRR = breweries
      .filter((b) => b.active)
      .reduce((acc, b) => acc + (b.monthlyPrice || 0), 0);

    const receivedPayments = payments
      .filter((p) => p.status === 'PAGO')
      .reduce((acc, p) => acc + p.amount, 0);

    const pendingPayments = payments
      .filter((p) => p.status === 'PENDENTE' || p.status === 'ATRASADO')
      .reduce((acc, p) => acc + p.amount, 0);

    return NextResponse.json({
      payments,
      summary: {
        totalMRR,
        receivedPayments,
        pendingPayments,
        totalClients: breweries.length,
        upToDateClients: breweries.filter((b) => b.billingStatus === 'EM_DIA').length,
        pendingClients: breweries.filter((b) => b.billingStatus !== 'EM_DIA').length,
      },
    });
  } catch (error: any) {
    console.error('Master finance error:', error);
    return NextResponse.json({ error: 'Erro ao buscar financeiro do SaaS' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao proprietário do sistema' }, { status: 403 });
    }

    const body = await req.json();
    const { breweryId, amount, referenceMonth, dueDate, paidDate, status, paymentMethod, notes } = body;

    if (!breweryId || !amount || !referenceMonth) {
      return NextResponse.json({ error: 'Cervejaria, valor e mês de referência são obrigatórios' }, { status: 400 });
    }

    const payment = await prisma.saasSubscriptionPayment.create({
      data: {
        breweryId,
        amount: parseFloat(amount),
        referenceMonth,
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        paidDate: status === 'PAGO' ? (paidDate ? new Date(paidDate) : new Date()) : null,
        status: status || 'PAGO',
        paymentMethod: paymentMethod || 'PIX',
        notes,
      },
      include: { brewery: true },
    });

    // Se o pagamento for confirmado como PAGO, atualiza a cervejaria para EM_DIA
    if (status === 'PAGO') {
      await prisma.brewery.update({
        where: { id: breweryId },
        data: { billingStatus: 'EM_DIA' },
      });
    }

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    console.error('Record SaaS payment error:', error);
    return NextResponse.json({ error: 'Erro ao registrar pagamento de assinatura' }, { status: 500 });
  }
}
