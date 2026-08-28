import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Apenas Super Administradores podem listar todas as cervejarias' }, { status: 403 });
    }

    const breweries = await prisma.brewery.findMany({
      include: {
        _count: {
          select: {
            users: true,
            kegs: true,
            equipment: true,
            orders: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(breweries);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar cervejarias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Apenas Super Administradores podem criar novas cervejarias' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, document, email, phone, city, state, plan } = body;

    if (!name || !slug || !email) {
      return NextResponse.json({ error: 'Nome, slug e e-mail são obrigatórios' }, { status: 400 });
    }

    const brewery = await prisma.brewery.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        document,
        email,
        phone,
        city,
        state,
        plan: plan || 'PRO',
      },
    });

    return NextResponse.json(brewery);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar cervejaria' }, { status: 500 });
  }
}
