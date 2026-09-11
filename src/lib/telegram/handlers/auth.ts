import { prisma } from '@/lib/prisma';
import { sendMessage, sendInlineKeyboard } from '../client';
import { TelegramMessage } from '../types';

export async function handleStartCommand(message: TelegramMessage, tokenArg?: string) {
  const chatId = String(message.chat.id);
  const username = message.from?.username || message.from?.first_name || '';

  // Se veio token (ex: /start PT-123456)
  if (tokenArg && tokenArg.trim()) {
    const cleanToken = tokenArg.trim().toUpperCase();

    // Busca usuário com esse token
    const user = await prisma.user.findFirst({
      where: { telegramLinkToken: cleanToken },
      include: { brewery: true },
    });

    if (!user) {
      await sendMessage(
        chatId,
        '❌ <b>Código de ativação inválido ou expirado.</b>\n\nAcesse o PintTech no navegador e gere um novo código de vinculação na tela de Usuários.'
      );
      return;
    }

    // Vincula o telegramChatId
    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: chatId,
        telegramUsername: username,
        telegramActive: true,
        telegramLinkToken: null, // Consome o token
      },
    });

    const breweryName = user.brewery?.name || 'Cervejaria PintTech';

    await sendMessage(
      chatId,
      `🎉 <b>Conta vinculada com sucesso!</b>\n\n` +
      `Olá, <b>${user.name}</b>!\n` +
      `🏢 Cervejaria: <b>${breweryName}</b>\n` +
      `🛡️ Perfil: <b>${user.role}</b>\n\n` +
      `Agora você pode registrar medições, acompanhar seus tanques, tarefas e estoque direto pelo Telegram.`
    );

    await sendMainMenu(chatId, user);
    return;
  }

  // Verifica se já está vinculado
  const existingUser = await prisma.user.findFirst({
    where: { telegramChatId: chatId },
    include: { brewery: true },
  });

  if (existingUser) {
    await sendMainMenu(chatId, existingUser);
    return;
  }

  // Não está vinculado
  await sendMessage(
    chatId,
    `👋 <b>Bem-vindo ao PintTech Bot!</b>\n\n` +
    `Este robô permite que cervejeiros e equipes de fábrica acompanhem tanques, lancem medições de fermentação, tarefas e envases de barris com <b>custo zero</b>.\n\n` +
    `🔑 <b>Para conectar sua conta:</b>\n` +
    `1. Acesse o PintTech no navegador em <b>pinttech.com.br</b>\n` +
    `2. Vá em <b>Usuários & Permissões</b>\n` +
    `3. Clique em <b>"Conectar Telegram"</b> e copie seu código de 6 dígitos.\n` +
    `4. Envie o código aqui neste chat (exemplo: <code>PT-123456</code>) ou clique no link gerado!`
  );
}

export async function sendMainMenu(chatId: string, user: any) {
  const role = user.role || 'BREWER';
  const breweryName = user.brewery?.name || 'Sua Cervejaria';

  let buttons: any[][] = [];

  if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'BREWER') {
    buttons.push([
      { text: '🏺 Tanques & Adega', callback_data: 'nav:tanks' },
      { text: '🧪 Registrar Medição', callback_data: 'nav:measure' },
    ]);
    buttons.push([
      { text: '📋 Tarefas do Lote', callback_data: 'nav:tasks' },
      { text: '🛢️ Registrar Envase', callback_data: 'nav:package' },
    ]);
    buttons.push([
      { text: '📦 Estoque de Chopp', callback_data: 'nav:stock' },
    ]);
  } else if (role === 'LOGISTICS') {
    buttons.push([
      { text: '🛢️ Barris & Entregas', callback_data: 'nav:kegs' },
      { text: '📦 Estoque de Chopp', callback_data: 'nav:stock' },
    ]);
  } else if (role === 'SALES') {
    buttons.push([
      { text: '📦 Estoque Disponível', callback_data: 'nav:stock' },
    ]);
  }

  // Botão de ajuda e conta
  buttons.push([
    { text: '⚙️ Minha Conta', callback_data: 'nav:me' },
    { text: '❓ Ajuda', callback_data: 'nav:help' },
  ]);

  await sendInlineKeyboard(
    chatId,
    `🍺 <b>PintTech — Painel de Controle</b>\n` +
    `🏢 <i>${breweryName}</i> | Operador: <b>${user.name}</b>\n\n` +
    `Escolha uma das ações abaixo para gerenciar a fábrica:`,
    buttons
  );
}

export async function handleHelp(chatId: string) {
  await sendMessage(
    chatId,
    `💡 <b>Comandos Rápidos no PintTech Bot:</b>\n\n` +
    `• <code>/tanques</code> — Exibe status de todos os tanques e lotes ativos\n` +
    `• <code>/medir</code> — Registra densidade e temperatura de um tanque\n` +
    `• <code>/tarefas</code> — Lista e conclui tarefas programadas da adega\n` +
    `• <code>/envase</code> — Envasa barris de chopp e abate o volume do tanque\n` +
    `• <code>/estoque</code> — Saldo de barris cheios prontos para venda\n` +
    `• <code>/menu</code> — Abre o menu principal com botões interativos\n\n` +
    `⚡ <b>Atalho de Medição Rápida:</b>\n` +
    `Você pode digitar em uma única linha:\n` +
    `<code>tq 1 1014 18</code> <i>(Tanque 1, densidade 1.014, temp 18°C)</i>`
  );
}
