import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, signJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { breweryId } = body;

    let breweryName: string | undefined = undefined;
    let brewerySlug: string | undefined = undefined;

    if (breweryId) {
      const brewery = await prisma.brewery.findUnique({ where: { id: breweryId } });
      if (brewery) {
        breweryName = brewery.name;
        brewerySlug = brewery.slug;
      }
    }

    const newPayload = {
      ...session,
      breweryId: breweryId || null,
      breweryName: breweryName || undefined,
      brewerySlug: brewerySlug || undefined,
    };

    const token = signJwtToken(newPayload);

    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    const res = NextResponse.json({ success: true, user: newPayload });
    res.cookies.set('pinttech_token', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (error: any) {
    console.error('Error switching brewery:', error);
    return NextResponse.json({ error: 'Erro ao trocar organização' }, { status: 500 });
  }
}
