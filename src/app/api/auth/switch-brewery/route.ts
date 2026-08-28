import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, signJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const { breweryId } = await req.json();

    let breweryName = undefined;
    let brewerySlug = undefined;

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
      breweryName,
      brewerySlug,
    };

    const token = signJwtToken(newPayload);

    const res = NextResponse.json({ success: true, user: newPayload });
    res.cookies.set('pinttech_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao trocar organização' }, { status: 500 });
  }
}
