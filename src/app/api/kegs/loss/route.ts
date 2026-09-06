import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

const LOSS_REASONS: Record<string, string> = {
  CONTAMINACAO: 'Contaminação / Azedamento / Off-flavor',
  VAZAMENTO_VALVULA: 'Vazamento na Válvula / Sifão Danificado',
  ESPUMA_SANGRIA: 'Espumamento / Sangria Excessiva / Borra',
  OXIDACAO: 'Oxidação / Cerveja Choca / Validade Vencida',
  AVARIA_FISICA: 'Avaria Mecânica / Queda / Deformação',
  AJUSTE_INVENTARIO: 'Ajuste de Inventário / Furo de Estoque',
  OUTRO: 'Outro Motivo',
};

// GET: Retorna as últimas perdas registradas na cervejaria
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const breweryId = session.breweryId;
    if (!breweryId) {
      return NextResponse.json({ error: 'Cervejaria não informada' }, { status: 400 });
    }

    const losses = await prisma.kegMovement.findMany({
      where: {
        breweryId,
        action: 'PERDA',
      },
      include: {
        keg: {
          select: {
            id: true,
            code: true,
            capacity: true,
            status: true,
            currentBeerName: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            recipe: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return NextResponse.json(losses);
  } catch (error: any) {
    console.error('Error fetching keg losses:', error);
    return NextResponse.json({ error: error.message || 'Erro ao consultar perdas' }, { status: 500 });
  }
}

// POST: Registra uma nova perda total ou parcial em um barril
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      kegId,
      kegCode,
      lossType = 'TOTAL', // 'TOTAL' | 'PARTIAL'
      volumeLiters,
      reason = 'OUTRO',
      reasonDetails = '',
      targetKegStatus = 'VAZIO_SUJO', // 'VAZIO_SUJO' | 'MANUTENCAO' | 'INATIVO'
      notes = '',
    } = body;

    if (!kegId && !kegCode) {
      return NextResponse.json({ error: 'Informe o barril para registrar a perda' }, { status: 400 });
    }

    // 1. Localizar barril
    const keg = await prisma.keg.findFirst({
      where: {
        ...(kegId ? { id: kegId } : { code: kegCode.trim().toUpperCase() }),
        ...(session.breweryId ? { breweryId: session.breweryId } : {}),
      },
      include: {
        currentBatch: { include: { recipe: true } },
      },
    });

    if (!keg) {
      return NextResponse.json({ error: 'Barril não encontrado nesta cervejaria' }, { status: 404 });
    }

    const breweryId = keg.breweryId;

    // Calcular volume atual disponível no barril
    const currentAvailableVol = keg.currentVolumeLiters !== null && keg.currentVolumeLiters !== undefined
      ? keg.currentVolumeLiters
      : (['EM_ESTOQUE', 'ENVASADO', 'NO_CLIENTE'].includes(keg.status) ? keg.capacity : 0);

    if (currentAvailableVol <= 0) {
      return NextResponse.json({
        error: `O barril ${keg.code} já se encontra vazio ou sem saldo de volume registrado`,
      }, { status: 400 });
    }

    // 2. Definir litragem perdida
    const isTotalLoss = lossType === 'TOTAL';
    let lostVolume = 0;
    let remainingVolume = 0;
    let newStatus = keg.status;
    let newBeerName = keg.currentBeerName;
    let newBatchId = keg.currentBatchId;

    if (isTotalLoss) {
      lostVolume = currentAvailableVol;
      remainingVolume = 0;
      newStatus = ['MANUTENCAO', 'INATIVO'].includes(targetKegStatus) ? targetKegStatus : 'VAZIO_SUJO';
      newBeerName = null;
      newBatchId = null;
    } else {
      // Perda Parcial
      const requestedLoss = parseFloat(volumeLiters);
      if (isNaN(requestedLoss) || requestedLoss <= 0) {
        return NextResponse.json({ error: 'Informe uma litragem de perda parcial válida maior que zero' }, { status: 400 });
      }

      if (requestedLoss >= currentAvailableVol) {
        // Se a perda parcial for maior ou igual ao volume total, converte para perda total
        lostVolume = currentAvailableVol;
        remainingVolume = 0;
        newStatus = ['MANUTENCAO', 'INATIVO'].includes(targetKegStatus) ? targetKegStatus : 'VAZIO_SUJO';
        newBeerName = null;
        newBatchId = null;
      } else {
        lostVolume = requestedLoss;
        remainingVolume = currentAvailableVol - lostVolume;
        // Permanece em estoque com o saldo restante
        newStatus = keg.status === 'VAZIO_SUJO' ? 'EM_ESTOQUE' : keg.status;
      }
    }

    const reasonLabel = LOSS_REASONS[reason] || reason || 'Outro';
    const combinedReasonText = reasonDetails.trim()
      ? `${reasonLabel} (${reasonDetails.trim()})`
      : reasonLabel;

    // 3. Executar transação atômica
    const result = await prisma.$transaction(async (tx) => {
      // A. Atualizar o barril
      const updatedKeg = await tx.keg.update({
        where: { id: keg.id },
        data: {
          status: newStatus,
          currentVolumeLiters: remainingVolume,
          currentBeerName: newBeerName,
          currentBatchId: newBatchId,
          lastReturnedAt: remainingVolume <= 0 ? new Date() : keg.lastReturnedAt,
          notes: notes.trim()
            ? `Perda ${isTotalLoss ? 'Total' : 'Parcial'} (${lostVolume}L): ${combinedReasonText}. Obs: ${notes.trim()}`
            : `Perda ${isTotalLoss ? 'Total' : 'Parcial'} (${lostVolume}L): ${combinedReasonText}`,
        },
      });

      // B. Criar histórico de movimentação
      const movement = await tx.kegMovement.create({
        data: {
          breweryId,
          kegId: keg.id,
          action: 'PERDA',
          fromStatus: keg.status,
          toStatus: newStatus,
          volumeLiters: lostVolume,
          batchId: keg.currentBatchId,
          userId: session.userId,
          userName: session.name,
          notes: `Perda ${isTotalLoss ? 'Total' : 'Parcial'}: ${lostVolume}L de "${keg.currentBeerName || 'Chopp'}". Motivo: ${combinedReasonText}.${remainingVolume > 0 ? ` Restam ${remainingVolume}L no barril.` : ''}${notes.trim() ? ` Detalhes: ${notes.trim()}` : ''}`,
        },
      });

      return { updatedKeg, movement };
    });

    return NextResponse.json({
      success: true,
      message: isTotalLoss || remainingVolume <= 0
        ? `Perda total de ${lostVolume}L registrada no barril ${keg.code}. Status alterado para ${newStatus}.`
        : `Perda parcial de ${lostVolume}L registrada no barril ${keg.code}. Restam ${remainingVolume}L em estoque.`,
      keg: result.updatedKeg,
      lostVolume,
      remainingVolume,
      lossType: isTotalLoss || remainingVolume <= 0 ? 'TOTAL' : 'PARTIAL',
    });
  } catch (error: any) {
    console.error('Error registering keg loss:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar perda no barril' }, { status: 500 });
  }
}
