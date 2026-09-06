import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      targetKegId,
      targetKegCode,
      sourceKegs,
      isBlend = false,
      beerName,
      batchNumber,
      notes,
    } = body;

    // sourceKegs must be an array of { kegId or code, volumeLiters }
    if (!Array.isArray(sourceKegs) || sourceKegs.length === 0) {
      return NextResponse.json({ error: 'Informe ao menos um barril de origem para transferir' }, { status: 400 });
    }

    if (!targetKegId && !targetKegCode) {
      return NextResponse.json({ error: 'Barril de destino não especificado' }, { status: 400 });
    }

    // 1. Localizar barril de destino
    const target = await prisma.keg.findFirst({
      where: {
        ...(targetKegId ? { id: targetKegId } : { code: targetKegCode.trim().toUpperCase() }),
        ...(session.breweryId ? { breweryId: session.breweryId } : {}),
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'Barril de destino não encontrado nesta cervejaria' }, { status: 404 });
    }

    const breweryId = target.breweryId;

    // Volume já existente no barril de destino (caso já tenha chopp e vá ser completado)
    const targetExistingVol = target.currentVolumeLiters !== null && target.currentVolumeLiters !== undefined
      ? target.currentVolumeLiters
      : (['EM_ESTOQUE', 'ENVASADO'].includes(target.status) ? target.capacity : 0);

    const availableSpaceInTarget = Math.max(0, target.capacity - targetExistingVol);

    // 2. Localizar e validar barris de origem
    const resolvedSources: any[] = [];
    let totalVolumeToTransfer = 0;

    for (const src of sourceKegs) {
      const srcKeg = await prisma.keg.findFirst({
        where: {
          ...(src.kegId ? { id: src.kegId } : { code: src.code?.trim().toUpperCase() }),
          breweryId,
        },
      });

      if (!srcKeg) {
        return NextResponse.json({ error: `Barril de origem "${src.code || src.kegId}" não encontrado` }, { status: 404 });
      }

      if (srcKeg.id === target.id) {
        return NextResponse.json({ error: `O barril de origem ${srcKeg.code} não pode ser o mesmo de destino` }, { status: 400 });
      }

      const availableVol = srcKeg.currentVolumeLiters !== null && srcKeg.currentVolumeLiters !== undefined
        ? srcKeg.currentVolumeLiters
        : (['EM_ESTOQUE', 'ENVASADO', 'NO_CLIENTE'].includes(srcKeg.status) ? srcKeg.capacity : 0);

      if (availableVol <= 0) {
        return NextResponse.json({ error: `O barril ${srcKeg.code} está vazio ou sem volume registrado` }, { status: 400 });
      }

      const volToTake = src.volumeLiters !== undefined && src.volumeLiters !== null
        ? Math.min(availableVol, Math.max(0.1, parseFloat(src.volumeLiters)))
        : availableVol;

      resolvedSources.push({
        keg: srcKeg,
        availableVol,
        volToTake,
      });

      totalVolumeToTransfer += volToTake;
    }

    if (totalVolumeToTransfer <= 0) {
      return NextResponse.json({ error: 'Volume total a transferir deve ser maior que zero' }, { status: 400 });
    }

    // Validação de capacidade do destino (considerando o volume já existente no barril receptor)
    const newTotalTargetVolume = targetExistingVol + totalVolumeToTransfer;
    if (newTotalTargetVolume > target.capacity * 1.05) {
      return NextResponse.json({
        error: `O volume resultante (${newTotalTargetVolume.toFixed(1)}L = ${targetExistingVol.toFixed(1)}L existentes + ${totalVolumeToTransfer.toFixed(1)}L transferidos) excede a capacidade do barril destino ${target.code} (${target.capacity}L). Espaço livre disponível: ${availableSpaceInTarget.toFixed(1)}L.`,
      }, { status: 400 });
    }

    // 3. Determinar Nome da Cerveja e Lote resultante
    let finalBeerName = beerName?.trim();
    let finalBatchNumber = batchNumber?.trim();
    let finalBatchId = target.currentBatchId || null;

    if (isBlend) {
      if (!finalBeerName) {
        const allNames = [
          ...(targetExistingVol > 0 && target.currentBeerName ? [target.currentBeerName] : []),
          ...resolvedSources.map((s) => s.keg.currentBeerName || 'Chopp'),
        ];
        finalBeerName = `Blend Especial (${Array.from(new Set(allNames)).join(' + ')})`;
      }
      finalBatchId = null;
    } else {
      // Transferência / Consolidação / Completar barril
      if (!finalBeerName) {
        // Se o barril destino já tem chopp, mantém o nome da cerveja dele
        finalBeerName = target.currentBeerName || resolvedSources[0].keg.currentBeerName || 'Chopp Artesanal';
      }
      // Se todos os barris vierem do mesmo lote, herda o batchId
      const firstBatchId = target.currentBatchId || resolvedSources[0].keg.currentBatchId;
      const allSameBatch = resolvedSources.every((s) => s.keg.currentBatchId === firstBatchId) &&
        (!target.currentBatchId || target.currentBatchId === firstBatchId);
      if (allSameBatch) {
        finalBatchId = firstBatchId;
      }
    }

    const effectiveVolume = Math.min(target.capacity, newTotalTargetVolume);

    // 4. Executar transação atômica
    const sourceCodesSummary = resolvedSources.map((s) => `${s.keg.code} (${s.volToTake}L)`).join(', ');

    await prisma.$transaction(async (tx) => {
      // A. Atualizar barril de destino
      await tx.keg.update({
        where: { id: target.id },
        data: {
          status: 'EM_ESTOQUE',
          currentVolumeLiters: effectiveVolume,
          currentBeerName: finalBeerName,
          currentBatchId: finalBatchId,
          lastFilledAt: new Date(),
          currentClientId: null,
          notes: notes
            ? `${isBlend ? 'Blend' : 'Trasfega'}: ${notes}. Origens: ${sourceCodesSummary}.${targetExistingVol > 0 ? ` Completou ${targetExistingVol}L pré-existentes.` : ''}`
            : `${isBlend ? 'Blend' : 'Trasfega'}: recebeu ${totalVolumeToTransfer}L de: ${sourceCodesSummary}.${targetExistingVol > 0 ? ` Completou ${targetExistingVol}L pré-existentes.` : ''}`,
        },
      });

      // B. Criar histórico no barril destino
      await tx.kegMovement.create({
        data: {
          breweryId,
          kegId: target.id,
          action: isBlend ? 'BLEND' : 'TRANSFERENCIA',
          fromStatus: target.status,
          toStatus: 'EM_ESTOQUE',
          volumeLiters: totalVolumeToTransfer,
          batchId: finalBatchId,
          userId: session.userId,
          userName: session.name,
          notes: isBlend
            ? `Blend Criado: "${finalBeerName}" (Lote: ${finalBatchNumber || 'N/A'}). Recebeu ${totalVolumeToTransfer}L de: ${sourceCodesSummary}. Volume final: ${effectiveVolume}L/${target.capacity}L.`
            : `Recebeu ${totalVolumeToTransfer}L transferidos de: ${sourceCodesSummary}.${targetExistingVol > 0 ? ` (Completou ${targetExistingVol}L já existentes).` : ''} Volume final: ${effectiveVolume}L/${target.capacity}L.`,
        },
      });

      // C. Atualizar cada barril de origem
      for (const item of resolvedSources) {
        const remaining = item.availableVol - item.volToTake;
        const isEmptied = remaining <= 0.5;

        await tx.keg.update({
          where: { id: item.keg.id },
          data: {
            status: isEmptied ? 'VAZIO_SUJO' : item.keg.status,
            currentVolumeLiters: isEmptied ? 0 : remaining,
            currentBeerName: isEmptied ? null : item.keg.currentBeerName,
            currentBatchId: isEmptied ? null : item.keg.currentBatchId,
            lastReturnedAt: isEmptied ? new Date() : item.keg.lastReturnedAt,
            notes: isEmptied
              ? `Esvaziado por trasfega para ${target.code} (${item.volToTake}L)`
              : `Parcialmente trasfegado: -${item.volToTake}L p/ ${target.code}. Restam ${remaining}L.`,
          },
        });

        await tx.kegMovement.create({
          data: {
            breweryId,
            kegId: item.keg.id,
            action: 'TRANSFERENCIA',
            fromStatus: item.keg.status,
            toStatus: isEmptied ? 'VAZIO_SUJO' : item.keg.status,
            volumeLiters: item.volToTake,
            userId: session.userId,
            userName: session.name,
            notes: `Transferido ${item.volToTake}L para o barril ${target.code} (${isBlend ? 'Blend' : 'Consolidação'})`,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: targetExistingVol > 0
        ? `Barril ${target.code} completado com sucesso! Recebeu +${totalVolumeToTransfer}L (total agora: ${effectiveVolume}L/${target.capacity}L de "${finalBeerName}").`
        : isBlend
        ? `Blend "${finalBeerName}" criado com sucesso no barril ${target.code} (${effectiveVolume}L)!`
        : `Transferência de ${effectiveVolume}L para o barril ${target.code} concluída com sucesso!`,
      targetKegCode: target.code,
      totalVolume: effectiveVolume,
      transferredVolume: totalVolumeToTransfer,
      existingVolume: targetExistingVol,
      beerName: finalBeerName,
      batchNumber: finalBatchNumber,
    });
  } catch (error: any) {
    console.error('Error executing keg transfer/blend:', error);
    return NextResponse.json({ error: error.message || 'Erro ao realizar transferência de chopp' }, { status: 500 });
  }
}
