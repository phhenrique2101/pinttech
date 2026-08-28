import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { actionId } = body;

    const action = actionId
      ? await prisma.actionLog.findUnique({ where: { id: actionId } })
      : await prisma.actionLog.findFirst({
          where: {
            breweryId: session.breweryId,
            undone: false,
            canUndo: true,
          },
          orderBy: { createdAt: 'desc' },
        });

    if (!action || action.undone) {
      return NextResponse.json({ error: 'Nenhuma ação recente para desfazer' }, { status: 404 });
    }

    if (action.breweryId !== session.breweryId && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Reversion logic by actionType
    switch (action.actionType) {
      case 'KEG_STATUS': {
        if (action.previousData) {
          const prev = JSON.parse(action.previousData);
          await prisma.keg.update({
            where: { id: action.entityId },
            data: {
              status: prev.status,
              currentClientId: prev.currentClientId,
              currentBatchId: prev.currentBatchId,
              currentBeerName: prev.currentBeerName,
            },
          });
          await prisma.kegMovement.create({
            data: {
              breweryId: session.breweryId,
              kegId: action.entityId,
              action: 'DESFAZER_ACAO',
              toStatus: prev.status,
              userName: session.name,
              notes: `Ação desfeita: retorno para o status ${prev.status}`,
            },
          });
        }
        break;
      }

      case 'KEG_BATCH_CREATE': {
        if (action.newData) {
          const data = JSON.parse(action.newData);
          if (Array.isArray(data.kegIds)) {
            await prisma.keg.deleteMany({
              where: { id: { in: data.kegIds } },
            });
          }
        }
        break;
      }

      case 'KEG_CREATE': {
        await prisma.keg.deleteMany({ where: { id: action.entityId } });
        break;
      }

      case 'BATCH_CREATE': {
        const batch = await prisma.productionBatch.findUnique({ where: { id: action.entityId } });
        if (batch?.tankId) {
          await prisma.tank.update({
            where: { id: batch.tankId },
            data: { status: 'LIVRE', currentBatchId: null },
          });
        }
        await prisma.productionBatch.deleteMany({ where: { id: action.entityId } });
        break;
      }

      case 'BATCH_UPDATE': {
        if (action.previousData) {
          const prev = JSON.parse(action.previousData);
          await prisma.productionBatch.update({
            where: { id: action.entityId },
            data: {
              status: prev.status,
              volumePlannedLiters: prev.volumePlannedLiters,
              volumeProducedLiters: prev.volumeProducedLiters,
              costPerLiter: prev.costPerLiter,
              totalCost: prev.totalCost,
            },
          });
        }
        break;
      }

      case 'RECIPE_CREATE': {
        await prisma.beerRecipe.deleteMany({ where: { id: action.entityId } });
        break;
      }

      case 'PAYMENT_RECORD': {
        // Delete the created financial transaction
        await prisma.financialTransaction.deleteMany({ where: { id: action.entityId } });
        if (action.previousData) {
          const prev = JSON.parse(action.previousData);
          const newData = action.newData ? JSON.parse(action.newData) : {};
          if (newData.orderId) {
            await prisma.order.update({
              where: { id: newData.orderId },
              data: {
                paidAmount: prev.paidAmount || 0,
                remainingAmount: prev.remainingAmount || 0,
                paymentStatus: prev.paymentStatus || 'PENDENTE',
              },
            });
          }
        }
        break;
      }

      default:
        break;
    }

    // Mark action as undone
    await prisma.actionLog.update({
      where: { id: action.id },
      data: { undone: true },
    });

    return NextResponse.json({
      success: true,
      message: `Ação "${action.description}" foi desfeita com sucesso.`,
      undoneAction: action,
    });
  } catch (error: any) {
    console.error('Undo action error:', error);
    return NextResponse.json({ error: 'Erro ao desfazer ação' }, { status: 500 });
  }
}
