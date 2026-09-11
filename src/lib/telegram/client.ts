import {
  TelegramInlineKeyboardButton,
  TelegramInlineKeyboardMarkup,
  TelegramReplyKeyboardMarkup,
} from './types';

const BASE_URL = 'https://api.telegram.org';

export function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN não configurado no ambiente.');
  }
  return token || '';
}

async function callTelegramApi(method: string, payload: Record<string, any>) {
  const token = getBotToken();
  if (!token) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN_MISSING' };
  }

  try {
    const res = await fetch(`${BASE_URL}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.error(`[TelegramBot] Erro ao chamar ${method}:`, err);
    return { ok: false, description: err.message };
  }
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_markup?: TelegramInlineKeyboardMarkup | TelegramReplyKeyboardMarkup;
  }
) {
  return callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options?.parse_mode || 'HTML',
    reply_markup: options?.reply_markup,
    disable_web_page_preview: true,
  });
}

export async function sendInlineKeyboard(
  chatId: number | string,
  text: string,
  buttons: TelegramInlineKeyboardButton[][],
  parse_mode: 'HTML' | 'Markdown' = 'HTML'
) {
  return sendMessage(chatId, text, {
    parse_mode,
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

export async function sendReplyKeyboard(
  chatId: number | string,
  text: string,
  buttons: string[][],
  placeholder?: string
) {
  return sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: {
      keyboard: buttons.map((row) => row.map((text) => ({ text }))),
      resize_keyboard: true,
      input_field_placeholder: placeholder,
    },
  });
}

export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  buttons?: TelegramInlineKeyboardButton[][],
  parse_mode: 'HTML' | 'Markdown' = 'HTML'
) {
  return callTelegramApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode,
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
    disable_web_page_preview: true,
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
) {
  return callTelegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

export async function setWebhook(url: string, secretToken?: string) {
  return callTelegramApi('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
}

export async function getWebhookInfo() {
  return callTelegramApi('getWebhookInfo', {});
}

export async function deleteWebhook() {
  return callTelegramApi('deleteWebhook', { drop_pending_updates: true });
}

export async function getMe() {
  return callTelegramApi('getMe', {});
}
