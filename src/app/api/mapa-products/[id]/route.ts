import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    const product = await prisma.mapaProduct.findUnique({
      where: { id },
      include: {
        recipes: {
          select: { id: true, name: true, style: true, abv: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto MAPA não encontrado' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && product.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching mapa product:', error);
    return NextResponse.json({ error: 'Erro ao buscar registro MAPA' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.mapaProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Produto MAPA não encontrado' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && existing.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, mapaRegistration, commercialDenomination, style, status, notes } = body;

    const trimmedMapa = mapaRegistration !== undefined ? mapaRegistration?.trim() : existing.mapaRegistration;

    if (!trimmedMapa) {
      return NextResponse.json({ error: 'O número do registro MAPA não pode ser vazio.' }, { status: 400 });
    }

    // If changing mapaRegistration, ensure uniqueness
    if (trimmedMapa.toLowerCase() !== existing.mapaRegistration.toLowerCase()) {
      const duplicate = await prisma.mapaProduct.findFirst({
        where: {
          breweryId: existing.breweryId,
          id: { not: id },
          mapaRegistration: { equals: trimmedMapa, mode: 'insensitive' },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `Já existe outro produto cadastrado com o número MAPA "${trimmedMapa}" (${duplicate.name}).` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.mapaProduct.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        mapaRegistration: trimmedMapa,
        commercialDenomination: commercialDenomination !== undefined ? (commercialDenomination?.trim() || null) : existing.commercialDenomination,
        style: style !== undefined ? (style?.trim() || null) : existing.style,
        status: status !== undefined ? status : existing.status,
        notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating mapa product:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar registro MAPA' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.mapaProduct.findUnique({
      where: { id },
      include: { _count: { select: { recipes: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Produto MAPA não encontrado' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && existing.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    await prisma.mapaProduct.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Registro MAPA excluído com sucesso.' });
  } catch (error: any) {
    console.error('Error deleting mapa product:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir registro MAPA' }, { status: 500 });
  }
}
