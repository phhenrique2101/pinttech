import { NextRequest, NextResponse } from 'next/server';
import { dispatchTelegramUpdate } from '@/lib/telegram/dispatcher';
import { TelegramUpdate } from '@/lib/telegram/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();

    // Processa a mensagem de forma assíncrona ou direta
    await dispatchTelegramUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Telegram Webhook Error]', err);
    // Sempre retorna 200 para o Telegram para evitar reenvios infinitos em caso de erro de lógica
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'PintTech Telegram Webhook',
    timestamp: new Date().toISOString(),
  });
}
