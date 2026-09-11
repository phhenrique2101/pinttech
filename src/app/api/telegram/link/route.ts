import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { getMe } from '@/lib/telegram/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        telegramActive: true,
        telegramUsername: true,
        telegramChatId: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const botInfo = await getMe();
    const botUsername = botInfo?.result?.username || null;

    return NextResponse.json({
      connected: !!user.telegramActive && !!user.telegramChatId,
      username: user.telegramUsername || null,
      botUsername,
      botConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Gera token de 6 caracteres alfanuméricos
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const linkToken = `PT-${randomHex}`;

    await prisma.user.update({
      where: { id: session.userId },
      data: { telegramLinkToken: linkToken },
    });

    const botInfo = await getMe();
    const botUsername = botInfo?.result?.username || process.env.TELEGRAM_BOT_USERNAME || 'saboresdomaltebot';

    return NextResponse.json({
      token: linkToken,
      botUsername,
      link: `https://t.me/${botUsername}?start=${linkToken}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramActive: false,
        telegramLinkToken: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
