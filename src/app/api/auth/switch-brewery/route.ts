import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, signJwtToken, getAuthCookieOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const { searchParams } = new URL(req.url);
    const breweryId = searchParams.get('breweryId');
    const redirectTo = searchParams.get('redirect') || '/';

    let breweryName: string | undefined = undefined;
    let brewerySlug: string | undefined = undefined;

    if (breweryId && breweryId !== '' && breweryId !== 'null') {
      const brewery = await prisma.brewery.findUnique({ where: { id: breweryId } });
      if (brewery) {
        breweryName = brewery.name;
        brewerySlug = brewery.slug;
      }
    }

    const newPayload = {
      ...session,
      breweryId: (breweryId && breweryId !== '' && breweryId !== 'null') ? breweryId : null,
      breweryName: breweryName || undefined,
      brewerySlug: brewerySlug || undefined,
    };

    const token = signJwtToken(newPayload);

    // Create redirect response
    const redirectUrl = new URL(redirectTo, req.url);
    const res = NextResponse.redirect(redirectUrl);

    const cookieOptions = getAuthCookieOptions(req);
    res.cookies.set('pinttech_token', token, cookieOptions);

    return res;
  } catch (error: any) {
    console.error('Error in switch-brewery GET:', error);
    return NextResponse.redirect(new URL('/master/cervejarias', req.url));
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const breweryId = body.breweryId;

    let breweryName: string | undefined = undefined;
    let brewerySlug: string | undefined = undefined;

    if (breweryId && breweryId !== '' && breweryId !== 'null') {
      const brewery = await prisma.brewery.findUnique({ where: { id: breweryId } });
      if (brewery) {
        breweryName = brewery.name;
        brewerySlug = brewery.slug;
      }
    }

    const newPayload = {
      ...session,
      breweryId: (breweryId && breweryId !== '' && breweryId !== 'null') ? breweryId : null,
      breweryName: breweryName || undefined,
      brewerySlug: brewerySlug || undefined,
    };

    const token = signJwtToken(newPayload);

    const res = NextResponse.json({ success: true, user: newPayload });
    const cookieOptions = getAuthCookieOptions(req);
    res.cookies.set('pinttech_token', token, cookieOptions);

    return res;
  } catch (error: any) {
    console.error('Error switching brewery POST:', error);
    return NextResponse.json({ error: 'Erro ao trocar organização' }, { status: 500 });
  }
}
