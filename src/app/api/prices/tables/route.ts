import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const breweryId = session.breweryId;

    // Buscar tabelas de preço da cervejaria
    let tables = await prisma.priceTable.findMany({
      where: { breweryId },
      include: {
        items: true,
        _count: {
          select: {
            items: true,
            clients: true,
            orders: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    // Se a cervejaria ainda não possuir nenhuma tabela, cria a Tabela Padrão automaticamente
    if (tables.length === 0) {
      const defaultTable = await prisma.priceTable.create({
        data: {
          breweryId,
          name: 'Tabela Padrão (PDV / Bares)',
          description: 'Preços regulares praticados para bares, restaurantes e clientes em geral.',
          type: 'STANDARD',
          isDefault: true,
          active: true,
        },
        include: {
          items: true,
          _count: {
            select: {
              items: true,
              clients: true,
              orders: true,
            },
          },
        },
      });
      tables = [defaultTable];
    }

    return NextResponse.json(tables);
  } catch (error: any) {
    console.error('Error fetching price tables:', error);
    return NextResponse.json({ error: 'Erro ao buscar tabelas de preço' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN' && session.role !== 'SALES' && session.role !== 'FINANCE') {
      return NextResponse.json({ error: 'Permissão negada para criar tabelas de preço' }, { status: 403 });
    }

    const breweryId = session.breweryId;
    const body = await req.json().catch(() => ({}));
    const { name, description, type = 'CUSTOM', adjustmentPercent = 0, isDefault = false, items = [] } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'O nome da tabela de preço é obrigatório.' }, { status: 400 });
    }

    // Se marcada como padrão, desmarca outras da mesma cervejaria
    if (isDefault) {
      await prisma.priceTable.updateMany({
        where: { breweryId },
        data: { isDefault: false },
      });
    }

    const priceTable = await prisma.priceTable.create({
      data: {
        breweryId,
        name: name.trim(),
        description: description?.trim() || null,
        type,
        adjustmentPercent: parseFloat(adjustmentPercent) || 0,
        isDefault: Boolean(isDefault),
        active: true,
        items: {
          create: items
            .filter((it: any) => it.recipeId && it.pricePerLiter !== undefined)
            .map((it: any) => ({
              recipeId: it.recipeId,
              pricePerLiter: parseFloat(it.pricePerLiter) || 0,
              notes: it.notes || null,
            })),
        },
      },
      include: {
        items: {
          include: { recipe: true },
        },
        _count: {
          select: { clients: true, orders: true, items: true },
        },
      },
    });

    await prisma.actionLog.create({
      data: {
        breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'PRICE_TABLE_CREATE',
        description: `Criação da tabela de preços "${priceTable.name}"`,
        entityType: 'PriceTable',
        entityId: priceTable.id,
        canUndo: false,
        newData: JSON.stringify({ name: priceTable.name, type: priceTable.type }),
      },
    });

    return NextResponse.json(priceTable, { status: 201 });
  } catch (error: any) {
    console.error('Error creating price table:', error);
    return NextResponse.json({ error: 'Erro ao criar tabela de preço: ' + error.message }, { status: 500 });
  }
}
