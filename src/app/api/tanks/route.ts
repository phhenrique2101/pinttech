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

    const tanks = await prisma.tank.findMany({
      where,
      include: {
        batches: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { recipe: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(tanks);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar tanques' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { name, capacityLiters, type, notes } = body;

    if (!name || !capacityLiters) {
      return NextResponse.json({ error: 'Nome e capacidade do tanque em litros são obrigatórios' }, { status: 400 });
    }

    const existing = await prisma.tank.findUnique({
      where: {
        breweryId_name: {
          breweryId: session.breweryId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Já existe um tanque com este nome nesta cervejaria' }, { status: 400 });
    }

    const tank = await prisma.tank.create({
      data: {
        breweryId: session.breweryId,
        name: name.trim(),
        capacityLiters: parseFloat(capacityLiters),
        type: type || 'FERMENTADOR_ISOTERMICO',
        status: 'LIVRE',
        notes,
      },
    });

    return NextResponse.json(tank);
  } catch (error: any) {
    console.error('Tank create error:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar tanque' }, { status: 500 });
  }
}
