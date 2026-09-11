import { prisma } from '@/lib/prisma';
import { sendMessage, sendInlineKeyboard } from '../client';
import { brixToSg, parseBreweryGravity, sgToBrix } from '@/lib/brewing/calculations';

// Sessão temporária em memória para guiar o fluxo passo-a-passo (ChatId -> { tankId, step })
export const measurementSessions = new Map<string, { tankId: string; batchId: string }>();

export async function handleStartMeasurement(chatId: string, user: any, specificTankId?: string) {
  if (!user.breweryId) return;

  const tanks = await prisma.tank.findMany({
    where: { breweryId: user.breweryId },
    orderBy: { name: 'asc' },
  });

  const activeBatches = await prisma.productionBatch.findMany({
    where: {
      breweryId: user.breweryId,
      tankId: { in: tanks.map((t) => t.id) },
      status: { notIn: ['FINALIZADO', 'CANCELADO'] },
    },
    include: { recipe: true, tank: true },
  });

  if (activeBatches.length === 0) {
    await sendInlineKeyboard(
      chatId,
      '⚠️ <b>Nenhum lote ativo em fermentação nos tanques no momento.</b>',
      [[{ text: '🔙 Menu Principal', callback_data: 'nav:menu' }]]
    );
    return;
  }

  // Se já foi especificado o tanque
  if (specificTankId) {
    const targetBatch = activeBatches.find((b) => b.tankId === specificTankId);
    if (targetBatch) {
      measurementSessions.set(chatId, { tankId: specificTankId, batchId: targetBatch.id });
      await sendMessage(
        chatId,
        `🧪 <b>Nova Medição — ${targetBatch.tank?.name || 'Tanque'}</b>\n` +
        `🍺 Lote: <b>${targetBatch.recipe?.name}</b> (#${targetBatch.batchNumber})\n` +
        `OG Base: <b>${targetBatch.measuredOg ? targetBatch.measuredOg.toFixed(3) : '—'} SG</b>\n\n` +
        `Envie a <b>Densidade</b> e <b>Temperatura</b>.\n\n` +
        `<i>Exemplos aceitos:</i>\n` +
        `• <code>1016 18</code> <i>(1.016 SG a 18°C)</i>\n` +
        `• <code>1.016 17.5</code>\n` +
        `• <code>4.2 brix 18</code> <i>(converte Brix automaticamente)</i>`
      );
      return;
    }
  }

  // Lista os tanques ocupados para escolher
  const buttons: any[][] = [];
  for (const b of activeBatches) {
    buttons.push([
      {
        text: `🏺 ${b.tank?.name || 'Tanque'}: ${b.recipe?.name || 'Cerveja'} (#${b.batchNumber})`,
        callback_data: `measure:tank:${b.tankId}`,
      },
    ]);
  }
  buttons.push([{ text: '🔙 Cancelar', callback_data: 'nav:menu' }]);

  await sendInlineKeyboard(
    chatId,
    `🧪 <b>Registrar Medição Diária:</b>\n\nEscolha em qual tanque deseja registrar a densidade e temperatura de hoje:`,
    buttons
  );
}

export async function processMeasurementText(
  chatId: string,
  user: any,
  rawText: string,
  sessionTarget?: { tankId: string; batchId: string }
) {
  const text = rawText.trim().toLowerCase();

  let targetTankNumber = '';
  let gravityPart = '';
  let tempPart = '';

  // Formato A: atalho rápido tipo "tq 2 1016 18" ou "tq2 1016 18" ou "tanque 2 1016 18"
  const quickMatch = text.match(/(?:tq|tanque)\s*([a-z0-9_-]+)\s+([0-9.,]+(?:\s*brix)?)\s*([0-9.,]+)?/i);
  if (quickMatch) {
    targetTankNumber = quickMatch[1];
    gravityPart = quickMatch[2];
    tempPart = quickMatch[3] || '';
  } else if (sessionTarget) {
    // Formato B: já estava em sessão aguardando "1016 18" ou "1.016 18"
    const parts = text.split(/\s+/);
    if (parts.length >= 1) {
      gravityPart = parts[0];
      tempPart = parts[1] || '';
    }
  } else {
    // Tenta formato simplificado de 2 números: "1016 18" quando só há 1 tanque ativo
    const parts = text.split(/\s+/);
    if (parts.length >= 1 && !isNaN(parseFloat(parts[0].replace(',', '.')))) {
      gravityPart = parts[0];
      tempPart = parts[1] || '';
    }
  }

  if (!gravityPart) {
    return false; // Não é uma medição reconhecida
  }

  // Identifica o lote alvo
  let batch: any = null;

  if (targetTankNumber) {
    const cleanTank = targetTankNumber.trim().toUpperCase();
    const tank = await prisma.tank.findFirst({
      where: {
        breweryId: user.breweryId,
        OR: [
          { name: { contains: cleanTank, mode: 'insensitive' } },
          { id: cleanTank },
        ],
      },
    });

    if (tank) {
      batch = await prisma.productionBatch.findFirst({
        where: {
          tankId: tank.id,
          breweryId: user.breweryId,
          status: { notIn: ['FINALIZADO', 'CANCELADO'] },
        },
        include: { recipe: true, tank: true },
      });
    }
  } else if (sessionTarget) {
    batch = await prisma.productionBatch.findFirst({
      where: { id: sessionTarget.batchId, breweryId: user.breweryId },
      include: { recipe: true, tank: true },
    });
  } else {
    // Se só tem 1 lote ativo na cervejaria toda, aplica nele
    const batches = await prisma.productionBatch.findMany({
      where: {
        breweryId: user.breweryId,
        status: { notIn: ['FINALIZADO', 'CANCELADO'] },
      },
      include: { recipe: true, tank: true },
    });
    if (batches.length === 1) {
      batch = batches[0];
    }
  }

  if (!batch) {
    await sendMessage(
      chatId,
      `⚠️ <b>Não foi possível identificar o tanque para essa medição.</b>\n\n` +
      `Use o comando com o número do tanque, por exemplo:\n` +
      `<code>tq 1 1016 18</code> <i>(Tanque 1, densidade 1.016, temperatura 18°C)</i>`
    );
    return true;
  }

  // Parse da Densidade
  let finalSg: number | null = null;
  if (gravityPart.includes('brix')) {
    const numBrix = parseFloat(gravityPart.replace('brix', '').replace(',', '.').trim());
    if (!isNaN(numBrix)) {
      finalSg = brixToSg(numBrix);
    }
  } else {
    finalSg = parseBreweryGravity(gravityPart);
  }

  if (!finalSg || finalSg < 0.980 || finalSg > 1.200) {
    await sendMessage(
      chatId,
      `❌ <b>Densidade inválida (${gravityPart}).</b>\n` +
      `Por favor envie valores válidos como <code>1016</code> ou <code>1.016</code> ou <code>4.2 brix</code>.`
    );
    return true;
  }

  // Parse da Temperatura
  let finalTemp: number | null = null;
  if (tempPart) {
    const numT = parseFloat(tempPart.replace(',', '.'));
    if (!isNaN(numT) && numT >= -5 && numT <= 45) {
      finalTemp = numT;
    }
  }

  // Carrega histórico de medições existente
  let logs: any[] = [];
  if (batch.fermentationLogsJson) {
    try {
      const parsed = JSON.parse(batch.fermentationLogsJson);
      if (Array.isArray(parsed)) logs = parsed;
    } catch (e) {}
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const newLogEntry = {
    id: `log-${Date.now()}`,
    date: todayStr,
    gravity: Math.round(finalSg * 1000) / 1000,
    tempCelsius: finalTemp !== null ? String(finalTemp) : undefined,
    notes: 'Registrado via Telegram',
  };

  logs.push(newLogEntry);

  // Recálculo de ABV e Atenuação se tiver OG
  const og = batch.measuredOg || 1.050;
  let calcAbv = batch.measuredAbv;
  let calcAtt = batch.attenuationPercent;

  if (og && og > 1.0 && finalSg >= 0.990) {
    calcAbv = Math.round((og - finalSg) * 131.25 * 10) / 10;
    calcAtt = Math.round(((og - finalSg) / (og - 1.0)) * 1000) / 10;
  }

  // Atualiza no banco de dados
  await prisma.productionBatch.update({
    where: { id: batch.id },
    data: {
      measuredFg: finalSg,
      measuredAbv: calcAbv,
      attenuationPercent: calcAtt,
      tempFermentation: finalTemp !== null ? finalTemp : batch.tempFermentation,
      fermentationLogsJson: JSON.stringify(logs),
    },
  });

  // Grava auditoria
  await prisma.actionLog.create({
    data: {
      breweryId: user.breweryId,
      userId: user.id,
      userName: user.name,
      actionType: 'TELEGRAM_BATCH_MEASUREMENT',
      description: `Medição via Telegram no tanque ${batch.tank?.name || 'Adega'} (${batch.recipe?.name}): FG ${finalSg.toFixed(3)} | Temp: ${finalTemp !== null ? `${finalTemp}°C` : '—'}`,
      entityType: 'ProductionBatch',
      entityId: batch.id,
    },
  });

  // Limpa sessão pendente
  measurementSessions.delete(chatId);

  const brixEquiv = sgToBrix(finalSg).toFixed(1);

  await sendInlineKeyboard(
    chatId,
    `✅ <b>Medição Registrada com Sucesso!</b>\n\n` +
    `🏺 Tanque: <b>${batch.tank?.name || 'Tanque'}</b>\n` +
    `🍺 Lote: <b>${batch.recipe?.name}</b> (<code>#${batch.batchNumber}</code>)\n\n` +
    `📈 <b>Métricas de Hoje:</b>\n` +
    `• Densidade: <b>${finalSg.toFixed(3)} SG</b> (~${brixEquiv} °Bx)\n` +
    `• Temperatura: <b>${finalTemp !== null ? `${finalTemp.toFixed(1)} °C` : 'Não informada'}</b>\n` +
    `• Atenuação Atual: <b>${calcAtt ? `${calcAtt.toFixed(1)}%` : '—'}</b>\n` +
    `• Teor Alcoólico: <b>${calcAbv ? `${calcAbv.toFixed(1)}% ABV` : '—'}</b>\n\n` +
    `<i>Curva de fermentação atualizada no PintTech web.</i>`,
    [
      [
        { text: '🏺 Ver Tanque', callback_data: `tank:view:${batch.tankId}` },
        { text: '🧪 Outra Medição', callback_data: 'nav:measure' },
      ],
      [{ text: '🏠 Menu Principal', callback_data: 'nav:menu' }],
    ]
  );

  return true;
}
