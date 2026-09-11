import { prisma } from '@/lib/prisma';
import { sendMessage, sendInlineKeyboard } from '../client';

export const packagingSessions = new Map<
  string,
  { tankId: string; batchId: string; capacity: number }
>();

export async function handleStartPackaging(chatId: string, user: any, specificTankId?: string) {
  if (!user.breweryId) return;

  const tanks = await prisma.tank.findMany({
    where: { breweryId: user.breweryId },
    orderBy: { name: 'asc' },
  });

  const batches = await prisma.productionBatch.findMany({
    where: {
      breweryId: user.breweryId,
      tankId: { in: tanks.map((t) => t.id) },
      status: { notIn: ['FINALIZADO', 'CANCELADO'] },
    },
    include: { recipe: true, tank: true },
  });

  if (batches.length === 0) {
    await sendInlineKeyboard(
      chatId,
      '⚠️ <b>Nenhum lote disponível para envase no momento.</b>',
      [[{ text: '🔙 Menu Principal', callback_data: 'nav:menu' }]]
    );
    return;
  }

  // Se já foi especificado o tanque
  if (specificTankId) {
    const targetBatch = batches.find((b) => b.tankId === specificTankId);
    if (targetBatch) {
      await sendInlineKeyboard(
        chatId,
        `🛢️ <b>Registrar Envase — ${targetBatch.tank?.name || 'Tanque'}</b>\n` +
        `🍺 Lote: <b>${targetBatch.recipe?.name}</b> (<code>#${targetBatch.batchNumber}</code>)\n` +
        `Saldo no Tanque: <b>${targetBatch.volumeProducedLiters || targetBatch.volumePlannedLiters}L</b>\n\n` +
        `Escolha o formato do envase:`,
        [
          [
            { text: '🛢️ Barril 50 Litros', callback_data: `pkg:fmt:${targetBatch.id}:50` },
            { text: '🛢️ Barril 30 Litros', callback_data: `pkg:fmt:${targetBatch.id}:30` },
          ],
          [
            { text: '🛢️ Barril 20 Litros', callback_data: `pkg:fmt:${targetBatch.id}:20` },
            { text: '🍾 Garrafas / Latas', callback_data: `pkg:fmt:${targetBatch.id}:1` },
          ],
          [{ text: '🔙 Cancelar', callback_data: 'nav:tanks' }],
        ]
      );
      return;
    }
  }

  const buttons: any[][] = [];
  for (const b of batches) {
    buttons.push([
      {
        text: `🏺 ${b.tank?.name || 'Tanque'}: ${b.recipe?.name || 'Cerveja'} (${b.volumeProducedLiters || b.volumePlannedLiters}L)`,
        callback_data: `pkg:tank:${b.tankId}`,
      },
    ]);
  }
  buttons.push([{ text: '🔙 Cancelar', callback_data: 'nav:menu' }]);

  await sendInlineKeyboard(
    chatId,
    `🛢️ <b>Registrar Envase de Cerveja:</b>\n\nEscolha o tanque que está sendo envasado:`,
    buttons
  );
}

export async function handleSelectFormat(
  chatId: string,
  batchId: string,
  capacity: number
) {
  const batch = await prisma.productionBatch.findUnique({
    where: { id: batchId },
    include: { recipe: true, tank: true },
  });

  if (!batch) return;

  packagingSessions.set(chatId, {
    tankId: batch.tankId || '',
    batchId: batch.id,
    capacity,
  });

  const formatName = capacity === 1 ? 'Garrafas / Latas (Litros)' : `Barril de ${capacity}L`;

  await sendMessage(
    chatId,
    `🛢️ <b>Envase Selecionado: ${formatName}</b>\n` +
    `🍺 Cerveja: <b>${batch.recipe?.name}</b> (#${batch.batchNumber})\n\n` +
    `Digite os <b>códigos dos barris</b> envasados:\n\n` +
    `<i>Exemplos aceitos:</i>\n` +
    `• <code>101, 102, 103, 104</code> <i>(Lista de códigos)</i>\n` +
    `• <code>101 a 106</code> <i>(Intervalo sequencial: envasa 101, 102, 103, 104, 105, 106)</i>\n` +
    `• Ou apenas a quantidade: <code>5</code> <i>(Gera 5 barris automaticamente)</i>`
  );
}

export async function processPackagingTextInput(
  chatId: string,
  user: any,
  text: string,
  session: { tankId: string; batchId: string; capacity: number }
) {
  const batch = await prisma.productionBatch.findFirst({
    where: { id: session.batchId, breweryId: user.breweryId },
    include: { recipe: true, tank: true },
  });

  if (!batch) {
    await sendMessage(chatId, '❌ Lote não encontrado ou finalizado.');
    packagingSessions.delete(chatId);
    return true;
  }

  const cleanText = text.trim();
  let kegCodes: string[] = [];

  // Padrão A: intervalo sequencial (ex: "101 a 105" ou "101 ate 105")
  const rangeMatch = cleanText.match(/^([a-z0-9_-]+)\s*(?:a|ate|-)\s*([a-z0-9_-]+)$/i);
  if (rangeMatch) {
    const startNum = parseInt(rangeMatch[1], 10);
    const endNum = parseInt(rangeMatch[2], 10);

    if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum && endNum - startNum <= 50) {
      for (let i = startNum; i <= endNum; i++) {
        kegCodes.push(String(i));
      }
    }
  }

  // Padrão B: lista separada por vírgula ou espaço (ex: "101, 102, 103")
  if (kegCodes.length === 0 && cleanText.includes(',')) {
    kegCodes = cleanText
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
  }

  // Padrão C: apenas um número inteiro representando a quantidade de barris
  if (kegCodes.length === 0) {
    const qtyOnly = parseInt(cleanText, 10);
    if (!isNaN(qtyOnly) && qtyOnly > 0 && qtyOnly <= 50 && !cleanText.includes(' ')) {
      // Gera códigos sequenciais com base no timestamp
      const prefix = `B${session.capacity}-`;
      for (let i = 1; i <= qtyOnly; i++) {
        kegCodes.push(`${prefix}${Date.now().toString().slice(-4)}${i}`);
      }
    } else {
      // Código único digitado
      kegCodes = [cleanText];
    }
  }

  if (kegCodes.length === 0) {
    await sendMessage(chatId, '❌ Códigos de barris não reconhecidos. Envie novamente.');
    return true;
  }

  const totalLiters = kegCodes.length * session.capacity;

  // Atualiza ou cria cada barril no banco
  for (const code of kegCodes) {
    const existingKeg = await prisma.keg.findFirst({
      where: { code, breweryId: user.breweryId },
    });

    if (existingKeg) {
      await prisma.keg.update({
        where: { id: existingKeg.id },
        data: {
          status: 'ENVASADO',
          currentBatchId: batch.id,
          capacity: session.capacity,
        },
      });
    } else {
      await prisma.keg.create({
        data: {
          breweryId: user.breweryId,
          code,
          capacity: session.capacity,
          status: 'ENVASADO',
          currentBatchId: batch.id,
          kegType: 'INOX_EURO',
        },
      });
    }
  }

  // Grava log de auditoria
  await prisma.actionLog.create({
    data: {
      breweryId: user.breweryId,
      userId: user.id,
      userName: user.name,
      actionType: 'TELEGRAM_BATCH_PACKAGING',
      description: `Envase via Telegram: ${kegCodes.length} barris de ${session.capacity}L (${totalLiters}L) da cerveja ${batch.recipe?.name} (Lote #${batch.batchNumber}). Códigos: ${kegCodes.join(', ')}`,
      entityType: 'ProductionBatch',
      entityId: batch.id,
    },
  });

  packagingSessions.delete(chatId);

  await sendInlineKeyboard(
    chatId,
    `🎉 <b>Envase Registrado com Sucesso!</b>\n\n` +
    `🍺 Cerveja: <b>${batch.recipe?.name}</b> (#${batch.batchNumber})\n` +
    `🛢️ Total Envasado: <b>${kegCodes.length}x Barris de ${session.capacity}L (${totalLiters} Litros)</b>\n` +
    `🏷️ Códigos: <code>${kegCodes.slice(0, 15).join(', ')}${kegCodes.length > 15 ? '...' : ''}</code>\n\n` +
    `<i>Os barris já estão disponíveis no módulo de Barris & Estoque de Chopp.</i>`,
    [
      [{ text: '🛢️ Envasar Mais', callback_data: `pkg:tank:${batch.tankId}` }],
      [{ text: '🏺 Ver Tanques', callback_data: 'nav:tanks' }],
      [{ text: '🏠 Menu Principal', callback_data: 'nav:menu' }],
    ]
  );

  return true;
}
