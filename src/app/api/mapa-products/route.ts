import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    let breweryId = session.breweryId;
    const { searchParams } = new URL(req.url);
    const targetBreweryId = searchParams.get('breweryId');
    const search = searchParams.get('search')?.trim().toLowerCase();
    const status = searchParams.get('status')?.trim();

    if (session.role === 'SUPER_ADMIN' && targetBreweryId) {
      breweryId = targetBreweryId;
    }

    if (!breweryId) {
      return NextResponse.json({ error: 'Cervejaria não especificada' }, { status: 400 });
    }

    const where: any = { breweryId };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mapaRegistration: { contains: search, mode: 'insensitive' } },
        { commercialDenomination: { contains: search, mode: 'insensitive' } },
        { style: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.mapaProduct.findMany({
      where,
      include: {
        _count: {
          select: { recipes: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching mapa products:', error);
    return NextResponse.json({ error: 'Erro ao buscar registros MAPA' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    let breweryId = session.breweryId;
    const body = await req.json();
    const { name, mapaRegistration, commercialDenomination, style, status, notes, targetBreweryId } = body;

    if (session.role === 'SUPER_ADMIN' && targetBreweryId) {
      breweryId = targetBreweryId;
    }

    if (!breweryId) {
      return NextResponse.json({ error: 'Cervejaria não especificada' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'O nome do produto / rótulo é obrigatório.' }, { status: 400 });
    }

    if (!mapaRegistration || !mapaRegistration.trim()) {
      return NextResponse.json({ error: 'O número do registro MAPA é obrigatório.' }, { status: 400 });
    }

    const trimmedMapa = mapaRegistration.trim();

    // Check for existing product with same MAPA registration in this brewery
    const existing = await prisma.mapaProduct.findFirst({
      where: {
        breweryId,
        mapaRegistration: { equals: trimmedMapa, mode: 'insensitive' },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Já existe um produto cadastrado com o número MAPA "${trimmedMapa}" (${existing.name}).` },
        { status: 409 }
      );
    }

    const created = await prisma.mapaProduct.create({
      data: {
        breweryId,
        name: name.trim(),
        mapaRegistration: trimmedMapa,
        commercialDenomination: commercialDenomination?.trim() || null,
        style: style?.trim() || null,
        status: status || 'ATIVO',
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating mapa product:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar registro MAPA' }, { status: 500 });
  }
}
