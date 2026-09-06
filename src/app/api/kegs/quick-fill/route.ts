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
      kegCodes,
      beerName,
      batchNumber,
      volumeLiters,
      notes,
    } = body;

    if (!Array.isArray(kegCodes) || kegCodes.length === 0) {
      return NextResponse.json({ error: 'Informe ao menos um código de barril para envasar' }, { status: 400 });
    }

    if (!beerName || !beerName.trim()) {
      return NextResponse.json({ error: 'O nome da cerveja é obrigatório para o envase avulso' }, { status: 400 });
    }

    const breweryId = session.breweryId;
    const cleanBeerName = beerName.trim();
    const cleanBatch = batchNumber?.trim() || null;
    const customVol = volumeLiters ? parseFloat(volumeLiters) : null;

    const results: any[] = [];
    const errors: string[] = [];

    for (const rawCode of kegCodes) {
      const code = String(rawCode).trim().toUpperCase();
      if (!code) continue;

      const keg = await prisma.keg.findFirst({
        where: {
          code,
          ...(breweryId ? { breweryId } : {}),
        },
      });

      if (!keg) {
        errors.push(`Barril "${code}" não encontrado`);
        continue;
      }

      const effectiveVolume = customVol && customVol > 0 ? Math.min(keg.capacity, customVol) : keg.capacity;
      const isPartial = effectiveVolume < keg.capacity;

      const updated = await prisma.keg.update({
        where: { id: keg.id },
        data: {
          status: 'EM_ESTOQUE',
          currentBeerName: cleanBeerName,
          currentBatchId: null,
          currentVolumeLiters: effectiveVolume,
          lastFilledAt: new Date(),
          currentClientId: null,
          notes: notes
            ? `Envase Avulso (${cleanBeerName}${cleanBatch ? ` - Lote ${cleanBatch}` : ''}): ${notes}`
            : `Envase Avulso: ${cleanBeerName}${cleanBatch ? ` (Lote: ${cleanBatch})` : ''}`,
        },
      });

      await prisma.kegMovement.create({
        data: {
          breweryId: keg.breweryId,
          kegId: keg.id,
          action: isPartial ? 'ENVASE_PARCIAL' : 'ENVASE_AVULSO',
          fromStatus: keg.status,
          toStatus: 'EM_ESTOQUE',
          volumeLiters: effectiveVolume,
          userId: session.userId,
          userName: session.name,
          notes: `Envase Avulso / Ajuste: ${cleanBeerName} (${cleanBatch ? `Lote: ${cleanBatch}` : 'Sem lote'}) - ${effectiveVolume}L${notes ? ` • ${notes}` : ''}`,
        },
      });

      results.push(updated);
    }

    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} barril(is) envasado(s) com sucesso com "${cleanBeerName}"!`,
      envasados: results.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error in quick-fill:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar envase avulso' }, { status: 500 });
  }
}
