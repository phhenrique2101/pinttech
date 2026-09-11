import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getMe, getWebhookInfo, setWebhook, deleteWebhook } from '@/lib/telegram/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const [botInfo, webhookInfo] = await Promise.all([getMe(), getWebhookInfo()]);

    return NextResponse.json({
      botTokenConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
      bot: botInfo?.result || null,
      webhook: webhookInfo?.result || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const host = req.headers.get('host') || 'pinttech.com.br';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const defaultUrl = `${protocol}://${host}/api/webhook/telegram`;

    const body = await req.json().catch(() => ({}));
    const webhookUrl = body.url || process.env.APP_URL ? `${process.env.APP_URL}/api/webhook/telegram` : defaultUrl;

    const result = await setWebhook(webhookUrl);

    return NextResponse.json({
      success: result?.ok,
      webhookUrl,
      telegramResponse: result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const result = await deleteWebhook();
    return NextResponse.json({ success: result?.ok, telegramResponse: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
