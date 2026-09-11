import { prisma } from '@/lib/prisma';
import { sendInlineKeyboard } from '../client';

export async function handleStockSummary(chatId: string, user: any) {
  if (!user.breweryId) return;

  // Busca barris cheios / em estoque
  const filledKegs = await prisma.keg.findMany({
    where: {
      breweryId: user.breweryId,
      status: { in: ['ENVASADO', 'EM_ESTOQUE'] },
    },
    include: {
      currentBatch: {
        include: { recipe: true },
      },
    },
  });

  if (filledKegs.length === 0) {
    await sendInlineKeyboard(
      chatId,
      '📦 <b>Nenhum barril cheio em estoque no momento.</b>\n\nTodos os barris estão vazios, entregues ou na rua.',
      [
        [{ text: '🛢️ Registrar Envase', callback_data: 'nav:package' }],
        [{ text: '🏠 Menu Principal', callback_data: 'nav:menu' }],
      ]
    );
    return;
  }

  // Agrupa por cerveja e capacidade
  const stockMap = new Map<string, { [capacity: number]: number; totalLiters: number }>();
  let grandTotalLiters = 0;

  for (const keg of filledKegs) {
    const beerName = keg.currentBatch?.recipe?.name || 'Chopp em Estoque';
    const entry = stockMap.get(beerName) || { totalLiters: 0 };
    const cap = keg.capacity || 50;

    entry[cap] = (entry[cap] || 0) + 1;
    entry.totalLiters += cap;
    grandTotalLiters += cap;

    stockMap.set(beerName, entry);
  }

  let text = `📦 <b>Estoque de Chopp Pronto (${grandTotalLiters} Litros):</b>\n\n`;

  for (const [beer, data] of Array.from(stockMap.entries())) {
    text += `🍺 <b>${beer}</b> — <i>${data.totalLiters}L</i>\n`;
    for (const [cap, qty] of Object.entries(data)) {
      if (cap !== 'totalLiters') {
        text += `   • ${qty}x Barris de ${cap}L\n`;
      }
    }
    text += `\n`;
  }

  await sendInlineKeyboard(chatId, text, [
    [{ text: '🛢️ Registrar Novo Envase', callback_data: 'nav:package' }],
    [{ text: '🏠 Menu Principal', callback_data: 'nav:menu' }],
  ]);
}
