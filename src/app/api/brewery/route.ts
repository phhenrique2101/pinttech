import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, getSessionFromCookies } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req) || getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const breweryId = session.breweryId;
    if (!breweryId) {
      if (session.role === 'SUPER_ADMIN') {
        const first = await prisma.brewery.findFirst({ orderBy: { name: 'asc' } });
        return NextResponse.json(first || null);
      }
      return NextResponse.json({ error: 'Nenhuma cervejaria vinculada à sessão' }, { status: 404 });
    }

    const brewery = await prisma.brewery.findUnique({
      where: { id: breweryId },
      select: {
        id: true,
        name: true,
        slug: true,
        document: true,
        mapaEstablishment: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        logoUrl: true,
        plan: true,
        billingStatus: true,
      },
    });

    if (!brewery) {
      return NextResponse.json({ error: 'Cervejaria não encontrada' }, { status: 404 });
    }

    return NextResponse.json(brewery);
  } catch (error: any) {
    console.error('Erro ao buscar cervejaria:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar cervejaria' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req) || getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const isAuthorized = session.role === 'SUPER_ADMIN' || session.role === 'ADMIN' || session.role === 'BREWER';
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Apenas gestores ou administradores podem alterar o cadastro da cervejaria' }, { status: 403 });
    }

    const body = await req.json();
    const {
      breweryId: requestedBreweryId,
      name,
      document,
      mapaEstablishment,
      phone,
      email,
      address,
      city,
      state,
    } = body;

    const targetBreweryId = session.role === 'SUPER_ADMIN' && requestedBreweryId ? requestedBreweryId : session.breweryId;

    if (!targetBreweryId) {
      return NextResponse.json({ error: 'ID da cervejaria não informado' }, { status: 400 });
    }

    const updated = await prisma.brewery.update({
      where: { id: targetBreweryId },
      data: {
        ...(name && { name: name.trim() }),
        ...(document !== undefined && { document: document ? document.trim() : null }),
        ...(mapaEstablishment !== undefined && { mapaEstablishment: mapaEstablishment ? mapaEstablishment.trim() : null }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
        ...(email !== undefined && { email: email ? email.trim() : undefined }),
        ...(address !== undefined && { address: address ? address.trim() : null }),
        ...(city !== undefined && { city: city ? city.trim() : null }),
        ...(state !== undefined && { state: state ? state.trim() : null }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Cadastro da cervejaria atualizado com sucesso!',
      brewery: updated,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar cadastro da cervejaria:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar cervejaria' }, { status: 500 });
  }
}
