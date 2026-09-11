import { prisma } from '@/lib/prisma';
import { sendMessage, sendInlineKeyboard } from '../client';
import { formatCurrency } from '@/lib/utils';

export async function handleListTanks(chatId: string, user: any) {
  if (!user.breweryId) {
    await sendMessage(chatId, '❌ Nenhuma cervejaria vinculada à sua conta.');
    return;
  }

  const tanks = await prisma.tank.findMany({
    where: { breweryId: user.breweryId },
    orderBy: { name: 'asc' },
  });

  if (tanks.length === 0) {
    await sendInlineKeyboard(
      chatId,
      '🏺 <b>Nenhum tanque cadastrado no momento.</b>\n\nCadastre tanques no PintTech web.',
      [[{ text: '🔙 Menu Principal', callback_data: 'nav:menu' }]]
    );
    return;
  }

  // Busca lotes ativos associados a tanques
  const activeBatches = await prisma.productionBatch.findMany({
    where: {
      breweryId: user.breweryId,
      tankId: { in: tanks.map((t) => t.id) },
      status: { notIn: ['FINALIZADO', 'CANCELADO'] },
    },
    include: { recipe: true },
  });

  const batchByTankId = new Map<string, any>();
  for (const b of activeBatches) {
    if (b.tankId) batchByTankId.set(b.tankId, b);
  }

  let text = `🏺 <b>Adega & Fermentadores (${tanks.length} tanques):</b>\n\n`;
  const buttons: any[][] = [];

  for (const tank of tanks) {
    const batch = batchByTankId.get(tank.id);
    let statusIcon = '⚪';
    let statusLabel = 'LIVRE';
    let desc = `Capacidade: ${tank.capacityLiters}L`;

    if (batch) {
      if (batch.status === 'FERMENTANDO') statusIcon = '🟡';
      else if (batch.status === 'MATURANDO') statusIcon = '🔵';
      else if (batch.status === 'PRONTO_ENVASE') statusIcon = '🟢';
      else statusIcon = '🟠';

      statusLabel = batch.status;
      const brewDate = new Date(batch.brewDate);
      const days = Math.floor((Date.now() - brewDate.getTime()) / (1000 * 60 * 60 * 24));
      
      desc = `<b>${batch.recipe?.name || 'Cerveja'}</b> (#${batch.batchNumber})\n` +
             `   • Status: ${batch.status} (${days} dias)\n` +
             `   • OG: ${batch.measuredOg ? batch.measuredOg.toFixed(3) : '—'} | FG: ${batch.measuredFg ? batch.measuredFg.toFixed(3) : '—'}\n` +
             `   • Temp: ${batch.tempFermentation || batch.tempMaturation || '—'}°C | Vol: ${batch.volumeProducedLiters || batch.volumePlannedLiters}L`;
      
      buttons.push([
        { text: `${statusIcon} ${tank.name}: ${batch.recipe?.name || 'Lote'}`, callback_data: `tank:view:${tank.id}` }
      ]);
    } else {
      buttons.push([
        { text: `⚪ ${tank.name} (${tank.capacityLiters}L - Livre)`, callback_data: `tank:view:${tank.id}` }
      ]);
    }

    text += `${statusIcon} <b>${tank.name}</b> (${tank.capacityLiters}L) — <i>${statusLabel}</i>\n${desc}\n\n`;
  }

  buttons.push([{ text: '🔙 Menu Principal', callback_data: 'nav:menu' }]);

  await sendInlineKeyboard(chatId, text, buttons);
}

export async function handleTankDetail(chatId: string, user: any, tankId: string) {
  const tank = await prisma.tank.findFirst({
    where: { id: tankId, breweryId: user.breweryId },
  });

  if (!tank) {
    await sendMessage(chatId, '❌ Tanque não encontrado.');
    return;
  }

  const batch = await prisma.productionBatch.findFirst({
    where: {
      tankId: tank.id,
      breweryId: user.breweryId,
      status: { notIn: ['FINALIZADO', 'CANCELADO'] },
    },
    include: { recipe: true },
  });

  if (!batch) {
    await sendInlineKeyboard(
      chatId,
      `🏺 <b>Tanque: ${tank.name}</b>\n\n` +
      `• Capacidade: <b>${tank.capacityLiters} Litros</b>\n` +
      `• Status: ⚪ <b>LIVRE</b>\n` +
      `• Nenhuma produção em andamento neste fermentador.`,
      [
        [{ text: '🔙 Voltar aos Tanques', callback_data: 'nav:tanks' }],
        [{ text: '🏠 Menu Principal', callback_data: 'nav:menu' }],
      ]
    );
    return;
  }

  const brewDate = new Date(batch.brewDate);
  const days = Math.floor((Date.now() - brewDate.getTime()) / (1000 * 60 * 60 * 24));
  const volume = batch.volumeProducedLiters || batch.volumePlannedLiters || 0;

  const text =
    `🏺 <b>Tanque: ${tank.name}</b> (${tank.capacityLiters}L)\n` +
    `🍺 Receita: <b>${batch.recipe?.name || 'Receita'}</b> (Estilo: ${batch.recipe?.style || '—'})\n` +
    `🔖 Lote: <code>#${batch.batchNumber}</code>\n` +
    `📅 Brassagem: ${brewDate.toLocaleDateString('pt-BR')} (<b>${days} dias de tanque</b>)\n\n` +
    `📊 <b>Físico-Química Atual:</b>\n` +
    `• Status: <b>${batch.status}</b>\n` +
    `• OG Medida: <b>${batch.measuredOg ? batch.measuredOg.toFixed(3) : '—'} SG</b>\n` +
    `• FG Atual: <b>${batch.measuredFg ? batch.measuredFg.toFixed(3) : '—'} SG</b>\n` +
    `• ABV Calculado: <b>${batch.measuredAbv ? `${batch.measuredAbv}%` : '—'}</b>\n` +
    `• Atenuação: <b>${batch.attenuationPercent ? `${batch.attenuationPercent}%` : '—'}</b>\n` +
    `• Temp Atual: <b>${batch.tempFermentation || batch.tempMaturation || '—'} °C</b>\n` +
    `• Volume no Tanque: <b>${volume} Litros</b>\n` +
    `• CPV / Custo por Litro: <b>R$ ${batch.costPerLiter?.toFixed(2) || '0.00'}/L</b>\n\n` +
    `O que deseja fazer com este tanque?`;

  const buttons = [
    [
      { text: '🧪 Nova Medição (SG/Temp)', callback_data: `measure:tank:${tank.id}` },
      { text: '📋 Tarefas do Lote', callback_data: `task:batch:${batch.id}` },
    ],
    [
      { text: '🛢️ Registrar Envase', callback_data: `pkg:tank:${tank.id}` },
    ],
    [
      { text: '🔙 Voltar aos Tanques', callback_data: 'nav:tanks' },
      { text: '🏠 Menu Principal', callback_data: 'nav:menu' },
    ],
  ];

  await sendInlineKeyboard(chatId, text, buttons);
}
