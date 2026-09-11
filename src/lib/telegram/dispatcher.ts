import { prisma } from '@/lib/prisma';
import { answerCallbackQuery, sendMessage } from './client';
import { TelegramUpdate } from './types';
import { handleStartCommand, sendMainMenu, handleHelp } from './handlers/auth';
import { handleListTanks, handleTankDetail } from './handlers/tanks';
import {
  handleStartMeasurement,
  processMeasurementText,
  measurementSessions,
} from './handlers/measurements';
import { handleListTasks, handleCompleteTask } from './handlers/tasks';
import {
  handleStartPackaging,
  handleSelectFormat,
  processPackagingTextInput,
  packagingSessions,
} from './handlers/packaging';
import { handleStockSummary } from './handlers/stock';

export async function dispatchTelegramUpdate(update: TelegramUpdate) {
  try {
    // 1. PROCESSAMENTO DE CALLBACK QUERIES (Cliques em botões inline)
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = String(cq.message?.chat.id || cq.from.id);
      const data = cq.data || '';

      await answerCallbackQuery(cq.id);

      const user = await prisma.user.findFirst({
        where: { telegramChatId: chatId, active: true },
        include: { brewery: true },
      });

      if (!user) {
        await sendMessage(
          chatId,
          '🔒 <b>Conta não vinculada.</b>\nEnvie seu código de ativação do PintTech (ex: <code>PT-123456</code>).'
        );
        return;
      }

      // Roteamento dos Callbacks
      if (data === 'nav:menu') {
        await sendMainMenu(chatId, user);
      } else if (data === 'nav:tanks') {
        await handleListTanks(chatId, user);
      } else if (data === 'nav:measure') {
        await handleStartMeasurement(chatId, user);
      } else if (data === 'nav:tasks') {
        await handleListTasks(chatId, user);
      } else if (data === 'nav:package') {
        await handleStartPackaging(chatId, user);
      } else if (data === 'nav:stock') {
        await handleStockSummary(chatId, user);
      } else if (data === 'nav:help') {
        await handleHelp(chatId);
      } else if (data === 'nav:me') {
        await sendMessage(
          chatId,
          `👤 <b>Minha Conta PintTech:</b>\n\n` +
          `• Nome: <b>${user.name}</b>\n` +
          `• E-mail: <code>${user.email}</code>\n` +
          `• Cervejaria: <b>${user.brewery?.name || '—'}</b>\n` +
          `• Perfil: <b>${user.role}</b>\n` +
          `• Status: 🟢 <b>Ativo & Conectado</b>`
        );
      } else if (data.startsWith('tank:view:')) {
        const tankId = data.replace('tank:view:', '');
        await handleTankDetail(chatId, user, tankId);
      } else if (data.startsWith('measure:tank:')) {
        const tankId = data.replace('measure:tank:', '');
        await handleStartMeasurement(chatId, user, tankId);
      } else if (data.startsWith('task:done:')) {
        const parts = data.replace('task:done:', '').split(':');
        const batchId = parts[0];
        const taskId = parts[1];
        await handleCompleteTask(chatId, user, batchId, taskId);
      } else if (data.startsWith('task:batch:')) {
        const batchId = data.replace('task:batch:', '');
        await handleListTasks(chatId, user, batchId);
      } else if (data.startsWith('pkg:tank:')) {
        const tankId = data.replace('pkg:tank:', '');
        await handleStartPackaging(chatId, user, tankId);
      } else if (data.startsWith('pkg:fmt:')) {
        const parts = data.replace('pkg:fmt:', '').split(':');
        const batchId = parts[0];
        const capacity = parseInt(parts[1], 10) || 50;
        await handleSelectFormat(chatId, batchId, capacity);
      }
      return;
    }

    // 2. PROCESSAMENTO DE MENSAGENS DE TEXTO
    if (update.message) {
      const msg = update.message;
      const chatId = String(msg.chat.id);
      const text = msg.text?.trim() || '';

      if (!text) return;

      // Comando /start
      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const tokenArg = parts[1] || '';
        await handleStartCommand(msg, tokenArg);
        return;
      }

      // Se o usuário digitou diretamente um token tipo "PT-123456"
      if (/^PT-[A-Z0-9]{4,10}$/i.test(text)) {
        await handleStartCommand(msg, text);
        return;
      }

      // Busca usuário autenticado
      const user = await prisma.user.findFirst({
        where: { telegramChatId: chatId, active: true },
        include: { brewery: true },
      });

      if (!user) {
        await sendMessage(
          chatId,
          '🔒 <b>Conta não vinculada.</b>\n\n' +
          'Para usar o bot, acesse o PintTech web, vá em Usuários, clique em <b>"Conectar Telegram"</b> e cole o código de ativação aqui.'
        );
        return;
      }

      // Comandos de Barra
      const lower = text.toLowerCase();
      if (lower === '/menu') {
        await sendMainMenu(chatId, user);
        return;
      }
      if (lower === '/tanques') {
        await handleListTanks(chatId, user);
        return;
      }
      if (lower === '/medir') {
        await handleStartMeasurement(chatId, user);
        return;
      }
      if (lower === '/tarefas') {
        await handleListTasks(chatId, user);
        return;
      }
      if (lower === '/envase') {
        await handleStartPackaging(chatId, user);
        return;
      }
      if (lower === '/estoque') {
        await handleStockSummary(chatId, user);
        return;
      }
      if (lower === '/ajuda' || lower === '/help') {
        await handleHelp(chatId);
        return;
      }

      // 3. SESSÃO ATIVA DE ENVASE
      const packagingSession = packagingSessions.get(chatId);
      if (packagingSession) {
        const handled = await processPackagingTextInput(chatId, user, text, packagingSession);
        if (handled) return;
      }

      // 4. SESSÃO ATIVA DE MEDIÇÃO OU ATALHO RÁPIDO (Ex: "tq 1 1016 18" ou "1016 18")
      const measureSession = measurementSessions.get(chatId);
      const isMeasurement = await processMeasurementText(chatId, user, text, measureSession);
      if (isMeasurement) return;

      // Mensagem genérica não reconhecida -> Apresenta o menu
      await sendMessage(
        chatId,
        `❓ <b>Não entendi o comando "${text}".</b>\n\n` +
        `Use os botões do menu ou digite um comando como <code>/medir</code>, <code>/tanques</code> ou <code>/tarefas</code>.`
      );
      await sendMainMenu(chatId, user);
    }
  } catch (err: any) {
    console.error('[TelegramDispatcher] Erro fatal no processamento:', err);
  }
}
