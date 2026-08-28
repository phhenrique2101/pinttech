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

    const batches = await prisma.productionBatch.findMany({
      where,
      include: {
        recipe: true,
        tank: true,
        kegs: true,
        _count: { select: { kegs: true } },
      },
      orderBy: { brewDate: 'desc' },
    });

    return NextResponse.json(batches);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar lotes de produção' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { recipeId, batchNumber, tankId, volumePlannedLiters, status, measuredOg, notes } = body;

    if (!recipeId || !batchNumber || !volumePlannedLiters) {
      return NextResponse.json({ error: 'Receita, número do lote e volume planejado são obrigatórios' }, { status: 400 });
    }

    const batch = await prisma.productionBatch.create({
      data: {
        breweryId: session.breweryId,
        recipeId,
        batchNumber: batchNumber.trim().toUpperCase(),
        tankId: tankId || null,
        status: status || 'BRASSAGEM',
        volumePlannedLiters: parseFloat(volumePlannedLiters),
        measuredOg: measuredOg ? parseFloat(measuredOg) : null,
        notes,
      },
      include: { recipe: true, tank: true },
    });

    if (tankId) {
      await prisma.tank.update({
        where: { id: tankId },
        data: { status: 'OCUPADO', currentBatchId: batch.id },
      });
    }

    return NextResponse.json(batch);
  } catch (error: any) {
    console.error('Batch create error:', error);
    return NextResponse.json({ error: 'Erro ao criar lote de produção' }, { status: 500 });
  }
}
