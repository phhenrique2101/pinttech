import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN' && session.role !== 'BREWER')) {
      return NextResponse.json({ error: 'Não autorizado a excluir tanques' }, { status: 403 });
    }

    const tank = await prisma.tank.findUnique({
      where: { id: params.id },
      include: { batches: true },
    });

    if (!tank) {
      return NextResponse.json({ error: 'Tanque não encontrado' }, { status: 404 });
    }

    // Desvincular lotes vinculados ao tanque antes de deletar
    await prisma.productionBatch.updateMany({
      where: { tankId: tank.id },
      data: { tankId: null },
    });

    await prisma.tank.delete({
      where: { id: tank.id },
    });

    return NextResponse.json({ success: true, message: `Tanque ${tank.name} excluído com sucesso.` });
  } catch (error: any) {
    console.error('Error deleting tank:', error);
    return NextResponse.json({ error: 'Erro ao excluir tanque' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();
    const {
      name,
      capacityLiters,
      type,
      status,
      notes,
      batchId, // ID do lote para vincular (ou null / '' para desvincular)
      packagingDate,
      batchStatus,
      fermentationStartDate,
      volumeProducedLiters,
      measuredOg,
      measuredFg,
      measuredAbv,
    } = body;

    const existingTank = await prisma.tank.findUnique({
      where: { id: params.id },
      include: { batches: { where: { status: { not: 'FINALIZADO' } }, orderBy: { createdAt: 'desc' } } },
    });

    if (!existingTank) return NextResponse.json({ error: 'Tanque não encontrado' }, { status: 404 });

    let finalStatus = status !== undefined ? status : existingTank.status;

    // Gerenciamento de alocação de lote no tanque
    if (batchId !== undefined) {
      if (!batchId) {
        // Desvincular lotes ativos deste tanque
        await prisma.productionBatch.updateMany({
          where: { tankId: existingTank.id, status: { not: 'FINALIZADO' } },
          data: { tankId: null },
        });
        if (finalStatus === 'OCUPADO') finalStatus = 'LIVRE';
      } else {
        // Desvincular de outros tanques e vincular ao tanque atual
        await prisma.productionBatch.update({
          where: { id: batchId },
          data: {
            tankId: existingTank.id,
            ...(packagingDate !== undefined ? { packagingDate: packagingDate ? new Date(packagingDate) : null } : {}),
            ...(batchStatus !== undefined ? { status: batchStatus } : {}),
            ...(fermentationStartDate !== undefined ? { fermentationStartDate: fermentationStartDate ? new Date(fermentationStartDate) : null } : {}),
            ...(volumeProducedLiters !== undefined ? { volumeProducedLiters: volumeProducedLiters ? parseFloat(volumeProducedLiters) : null } : {}),
            ...(measuredOg !== undefined ? { measuredOg: measuredOg ? parseFloat(measuredOg) : null } : {}),
            ...(measuredFg !== undefined ? { measuredFg: measuredFg ? parseFloat(measuredFg) : null } : {}),
            ...(measuredAbv !== undefined ? { measuredAbv: measuredAbv ? parseFloat(measuredAbv) : null } : {}),
          },
        });
        if (finalStatus === 'LIVRE') finalStatus = 'OCUPADO';
      }
    } else {
      // Se não passou batchId mas passou campos de atualização do lote ativo existente no tanque
      const activeBatch = existingTank.batches[0];
      if (activeBatch) {
        const batchUpdateData: any = {};
        if (packagingDate !== undefined) batchUpdateData.packagingDate = packagingDate ? new Date(packagingDate) : null;
        if (batchStatus !== undefined) batchUpdateData.status = batchStatus;
        if (fermentationStartDate !== undefined) batchUpdateData.fermentationStartDate = fermentationStartDate ? new Date(fermentationStartDate) : null;
        if (volumeProducedLiters !== undefined) batchUpdateData.volumeProducedLiters = volumeProducedLiters ? parseFloat(volumeProducedLiters) : null;
        if (measuredOg !== undefined) batchUpdateData.measuredOg = measuredOg ? parseFloat(measuredOg) : null;
        if (measuredFg !== undefined) batchUpdateData.measuredFg = measuredFg ? parseFloat(measuredFg) : null;
        if (measuredAbv !== undefined) batchUpdateData.measuredAbv = measuredAbv ? parseFloat(measuredAbv) : null;

        if (Object.keys(batchUpdateData).length > 0) {
          await prisma.productionBatch.update({
            where: { id: activeBatch.id },
            data: batchUpdateData,
          });
        }
      }
    }

    const tank = await prisma.tank.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        capacityLiters: capacityLiters !== undefined ? parseFloat(capacityLiters) : undefined,
        type: type !== undefined ? type : undefined,
        status: finalStatus,
        notes: notes !== undefined ? notes : undefined,
      },
      include: {
        batches: {
          orderBy: { createdAt: 'desc' },
          include: { recipe: true },
        },
      },
    });

    return NextResponse.json(tank);
  } catch (error: any) {
    console.error('Error updating tank:', error);
    return NextResponse.json({ error: 'Erro ao atualizar tanque' }, { status: 500 });
  }
}
