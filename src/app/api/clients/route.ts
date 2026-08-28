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

    const clients = await prisma.client.findMany({
      where,
      include: {
        kegs: {
          select: { id: true, code: true, capacity: true, currentBeerName: true, status: true, lastDeliveredAt: true },
        },
        equipment: {
          select: { id: true, code: true, name: true, type: true, status: true },
        },
        _count: {
          select: { orders: true, kegs: true, equipment: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { name, tradeName, document, email, phone, address, number, complement, neighborhood, city, state, zipCode, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome / Razão Social é obrigatório' }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        breweryId: session.breweryId,
        name,
        tradeName,
        document,
        email,
        phone,
        address,
        number,
        complement,
        neighborhood,
        city,
        state,
        zipCode,
        notes,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cadastrar cliente' }, { status: 500 });
  }
}
