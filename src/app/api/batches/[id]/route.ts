import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const batch = await prisma.productionBatch.findUnique({
      where: { id: params.id },
      include: {
        recipe: true,
        tank: true,
        kegs: {
          include: { currentClient: true },
        },
        movements: true,
      },
    });

    if (!batch) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    return NextResponse.json(batch);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar lote' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.productionBatch.findUnique({
      where: { id: params.id },
      include: { recipe: true, tank: true },
    });

    if (!existing) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });

    const body = await req.json();
    const {
      status,
      volumePlannedLiters,
      volumeProducedLiters,
      costPerLiter,
      totalCost,
      tankId,
      notes,
      measuredOg,
      measuredFg,
      measuredAbv,
      packagingDate,
      fermentationStartDate,
      maturationStartDate,
    } = body;

    const volPlanned = volumePlannedLiters !== undefined ? parseFloat(volumePlannedLiters) : existing.volumePlannedLiters;
    const volProd = volumeProducedLiters !== undefined ? parseFloat(volumeProducedLiters) : existing.volumeProducedLiters;
    const numCostPerLiter = costPerLiter !== undefined ? parseFloat(costPerLiter) : existing.costPerLiter;
    const numTotalCost = totalCost !== undefined
      ? parseFloat(totalCost)
      : (numCostPerLiter !== null && numCostPerLiter !== undefined && (volProd || volPlanned))
      ? numCostPerLiter * (volProd || volPlanned)
      : existing.totalCost;

    const updated = await prisma.productionBatch.update({
      where: { id: params.id },
      data: {
        status: status ?? existing.status,
        volumePlannedLiters: volPlanned,
        volumeProducedLiters: volProd,
        costPerLiter: numCostPerLiter,
        totalCost: numTotalCost,
        tankId: tankId !== undefined ? tankId : existing.tankId,
        notes: notes !== undefined ? notes : existing.notes,
        measuredOg: measuredOg !== undefined ? (measuredOg ? parseFloat(measuredOg) : null) : existing.measuredOg,
        measuredFg: measuredFg !== undefined ? (measuredFg ? parseFloat(measuredFg) : null) : existing.measuredFg,
        measuredAbv: measuredAbv !== undefined ? (measuredAbv ? parseFloat(measuredAbv) : null) : existing.measuredAbv,
        packagingDate: packagingDate !== undefined ? (packagingDate ? new Date(packagingDate) : null) : existing.packagingDate,
        fermentationStartDate: fermentationStartDate !== undefined ? (fermentationStartDate ? new Date(fermentationStartDate) : null) : existing.fermentationStartDate,
        maturationStartDate: maturationStartDate !== undefined ? (maturationStartDate ? new Date(maturationStartDate) : null) : existing.maturationStartDate,
      },
      include: { recipe: true, tank: true },
    });

    // If status changed to FINALIZADO or tank released, free the tank
    if (status === 'FINALIZADO' && existing.tankId) {
      await prisma.tank.update({
        where: { id: existing.tankId },
        data: { status: 'LIVRE', currentBatchId: null },
      });
    }

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'BATCH_UPDATE',
        description: `Atualizado lote ${existing.batchNumber} (${existing.recipe.name}) - Status: ${status || existing.status} | Custo: R$ ${numCostPerLiter?.toFixed(2) || '0.00'}/L`,
        entityType: 'ProductionBatch',
        entityId: existing.id,
        previousData: JSON.stringify({
          status: existing.status,
          volumePlannedLiters: existing.volumePlannedLiters,
          volumeProducedLiters: existing.volumeProducedLiters,
          costPerLiter: existing.costPerLiter,
          totalCost: existing.totalCost,
        }),
        newData: JSON.stringify({
          status: updated.status,
          volumePlannedLiters: updated.volumePlannedLiters,
          volumeProducedLiters: updated.volumeProducedLiters,
          costPerLiter: updated.costPerLiter,
          totalCost: updated.totalCost,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Batch update error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar lote' }, { status: 500 });
  }
}
