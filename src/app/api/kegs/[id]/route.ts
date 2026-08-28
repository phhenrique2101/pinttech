import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const keg = await prisma.keg.findUnique({
      where: { id: params.id },
      include: {
        currentBatch: {
          include: { recipe: true },
        },
        currentClient: true,
        movements: {
          include: {
            toClient: true,
            batch: {
              include: { recipe: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!keg) {
      return NextResponse.json({ error: 'Barril não encontrado' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && keg.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json(keg);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao obter dados do barril' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();
    const { status, currentClientId, currentBatchId, currentBeerName, notes } = body;

    const existingKeg = await prisma.keg.findUnique({ where: { id: params.id } });
    if (!existingKeg) return NextResponse.json({ error: 'Barril não encontrado' }, { status: 404 });

    const updatedKeg = await prisma.keg.update({
      where: { id: params.id },
      data: {
        status: status ?? existingKeg.status,
        currentClientId: currentClientId !== undefined ? currentClientId : existingKeg.currentClientId,
        currentBatchId: currentBatchId !== undefined ? currentBatchId : existingKeg.currentBatchId,
        currentBeerName: currentBeerName !== undefined ? currentBeerName : existingKeg.currentBeerName,
        notes: notes !== undefined ? notes : existingKeg.notes,
      },
    });

    // Register movement if status changed
    if (status && status !== existingKeg.status) {
      await prisma.kegMovement.create({
        data: {
          breweryId: existingKeg.breweryId,
          kegId: existingKeg.id,
          action: 'AJUSTE_MANUAL',
          fromStatus: existingKeg.status,
          toStatus: status,
          userName: session.name,
          notes: notes || 'Alteração manual de status',
        },
      });

      await prisma.actionLog.create({
        data: {
          breweryId: existingKeg.breweryId,
          userId: session.userId,
          userName: session.name,
          actionType: 'KEG_STATUS',
          description: `Alteração do barril ${existingKeg.code} de ${existingKeg.status} para ${status}`,
          entityType: 'Keg',
          entityId: existingKeg.id,
          previousData: JSON.stringify({
            status: existingKeg.status,
            currentClientId: existingKeg.currentClientId,
            currentBatchId: existingKeg.currentBatchId,
            currentBeerName: existingKeg.currentBeerName,
          }),
          newData: JSON.stringify({
            status,
            currentClientId,
            currentBatchId,
            currentBeerName,
          }),
        },
      });
    }

    return NextResponse.json(updatedKeg);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar barril' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Apenas administradores podem excluir barris' }, { status: 403 });
    }

    await prisma.keg.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao excluir barril' }, { status: 500 });
  }
}
