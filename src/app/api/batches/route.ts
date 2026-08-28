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
    const { recipeId, batchNumber, tankId, volumePlannedLiters, volumeProducedLiters, status, measuredOg, costPerLiter, totalCost, notes } = body;

    if (!recipeId || !batchNumber || !volumePlannedLiters) {
      return NextResponse.json({ error: 'Receita, número do lote e volume planejado são obrigatórios' }, { status: 400 });
    }

    const volPlanned = parseFloat(volumePlannedLiters) || 0;
    const volProd = volumeProducedLiters ? parseFloat(volumeProducedLiters) : volPlanned;
    const numCostPerLiter = costPerLiter !== undefined ? parseFloat(costPerLiter) : 0;
    const numTotalCost = totalCost !== undefined ? parseFloat(totalCost) : (numCostPerLiter * (volProd || volPlanned));

    const batch = await prisma.productionBatch.create({
      data: {
        breweryId: session.breweryId,
        recipeId,
        batchNumber: batchNumber.trim().toUpperCase(),
        tankId: tankId || null,
        status: status || 'BRASSAGEM',
        volumePlannedLiters: volPlanned,
        volumeProducedLiters: volProd,
        costPerLiter: numCostPerLiter,
        totalCost: numTotalCost,
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

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'BATCH_CREATE',
        description: `Criado lote ${batch.batchNumber} (${batch.recipe.name}) - ${volPlanned}L com custo R$ ${numCostPerLiter.toFixed(2)}/L`,
        entityType: 'ProductionBatch',
        entityId: batch.id,
        previousData: null,
        newData: JSON.stringify(batch),
      },
    });

    return NextResponse.json(batch);
  } catch (error: any) {
    console.error('Batch create error:', error);
    return NextResponse.json({ error: 'Erro ao criar lote de produção' }, { status: 500 });
  }
}
