import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const where: any = {};
    if (session.role !== 'SUPER_ADMIN' || session.breweryId) {
      if (session.breweryId) where.breweryId = session.breweryId;
    }

    const recipes = await prisma.beerRecipe.findMany({
      where,
      include: {
        _count: { select: { batches: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(recipes);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar receitas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { name, style, og, fg, abv, ibu, ebc, description, suggestedPricePerLiter } = body;

    if (!name || !style) {
      return NextResponse.json({ error: 'Nome e estilo da cerveja são obrigatórios' }, { status: 400 });
    }

    const recipe = await prisma.beerRecipe.create({
      data: {
        breweryId: session.breweryId,
        name,
        style,
        og: og ? parseFloat(og) : null,
        fg: fg ? parseFloat(fg) : null,
        abv: abv ? parseFloat(abv) : null,
        ibu: ibu ? parseInt(ibu, 10) : null,
        ebc: ebc ? parseFloat(ebc) : null,
        description,
        suggestedPricePerLiter: suggestedPricePerLiter ? parseFloat(suggestedPricePerLiter) : 18.0,
      },
    });

    return NextResponse.json(recipe);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cadastrar receita' }, { status: 500 });
  }
}
