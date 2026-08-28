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

    const transactions = await prisma.financialTransaction.findMany({
      where,
      include: {
        order: {
          include: { client: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const totalIncome = transactions
      .filter((t) => t.type === 'RECEITA' && t.status === 'PAGO')
      .reduce((acc, t) => acc + t.amount, 0);

    const pendingIncome = transactions
      .filter((t) => t.type === 'RECEITA' && t.status === 'PENDENTE')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'DESPESA')
      .reduce((acc, t) => acc + t.amount, 0);

    return NextResponse.json({
      transactions,
      summary: {
        totalIncome,
        pendingIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados financeiros' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { type, category, description, amount, dueDate, status, paymentMethod } = body;

    if (!type || !description || !amount || !dueDate) {
      return NextResponse.json({ error: 'Tipo, descrição, valor e data de vencimento são obrigatórios' }, { status: 400 });
    }

    const transaction = await prisma.financialTransaction.create({
      data: {
        breweryId: session.breweryId,
        type,
        category: category || 'OUTROS',
        description,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        status: status || 'PENDENTE',
        paymentMethod: paymentMethod || 'PIX',
        paymentDate: status === 'PAGO' ? new Date() : null,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cadastrar transação financeira' }, { status: 500 });
  }
}
