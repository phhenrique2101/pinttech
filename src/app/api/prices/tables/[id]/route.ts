import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const table = await prisma.priceTable.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            recipe: true,
          },
        },
        _count: {
          select: {
            clients: true,
            orders: true,
            items: true,
          },
        },
      },
    });

    if (!table || table.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Tabela de preço não encontrada' }, { status: 404 });
    }

    return NextResponse.json(table);
  } catch (error: any) {
    console.error('Error fetching price table details:', error);
    return NextResponse.json({ error: 'Erro ao buscar detalhes da tabela' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'BREWER', 'SALES', 'FINANCE'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'Permissão negada para editar tabelas de preço' }, { status: 403 });
    }

    const breweryId = session.breweryId;
    const existing = await prisma.priceTable.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.breweryId !== breweryId) {
      return NextResponse.json({ error: 'Tabela de preço não encontrada' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, description, type, adjustmentPercent, isDefault, active, items } = body;

    if (isDefault) {
      await prisma.priceTable.updateMany({
        where: { breweryId, id: { not: params.id } },
        data: { isDefault: false },
      });
    }

    const updatedTable = await prisma.$transaction(async (tx) => {
      // 1. Atualizar dados cadastrais da tabela
      const table = await tx.priceTable.update({
        where: { id: params.id },
        data: {
          name: name ? name.trim() : existing.name,
          description: description !== undefined ? (description?.trim() || null) : existing.description,
          type: type || existing.type,
          adjustmentPercent: adjustmentPercent !== undefined ? parseFloat(adjustmentPercent) : existing.adjustmentPercent,
          isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
          active: active !== undefined ? Boolean(active) : existing.active,
        },
      });

      // 2. Se a lista de itens foi enviada, sincroniza os itens
      if (Array.isArray(items)) {
        // Remover itens que não estão mais na lista
        await tx.priceTableItem.deleteMany({
          where: { priceTableId: params.id },
        });

        // Inserir os novos preços (deduplicados por recipeId)
        const seenRecipes = new Set<string>();
        const sanitizedItems: any[] = [];
        for (const it of items) {
          if (it.recipeId && it.pricePerLiter !== undefined && !seenRecipes.has(it.recipeId)) {
            seenRecipes.add(it.recipeId);
            sanitizedItems.push({
              priceTableId: params.id,
              recipeId: it.recipeId,
              pricePerLiter: parseFloat(it.pricePerLiter) || 0,
              notes: it.notes || null,
            });
          }
        }

        if (sanitizedItems.length > 0) {
          await tx.priceTableItem.createMany({
            data: sanitizedItems,
          });
        }
      }

      return table;
    });

    const fullTable = await prisma.priceTable.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { recipe: true } },
        _count: { select: { clients: true, orders: true, items: true } },
      },
    });

    return NextResponse.json(fullTable);
  } catch (error: any) {
    console.error('Error updating price table:', error);
    return NextResponse.json({ error: 'Erro ao atualizar tabela de preço: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem excluir tabelas de preço' }, { status: 403 });
    }

    const existing = await prisma.priceTable.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Tabela de preço não encontrada' }, { status: 404 });
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: 'Não é permitido excluir a tabela padrão do sistema. Defina outra tabela como padrão antes de excluir esta.' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Desvincular clientes que usavam essa tabela
      await tx.client.updateMany({
        where: { priceTableId: params.id },
        data: { priceTableId: null },
      });

      // Desvincular pedidos que usavam essa tabela
      await tx.order.updateMany({
        where: { priceTableId: params.id },
        data: { priceTableId: null },
      });

      // Remover itens da tabela
      await tx.priceTableItem.deleteMany({
        where: { priceTableId: params.id },
      });

      // Excluir tabela
      await tx.priceTable.delete({
        where: { id: params.id },
      });

      await tx.actionLog.create({
        data: {
          breweryId: session.breweryId!,
          userId: session.userId,
          userName: session.name,
          actionType: 'PRICE_TABLE_DELETE',
          description: `Exclusão da tabela de preços "${existing.name}"`,
          entityType: 'PriceTable',
          entityId: existing.id,
          canUndo: false,
          newData: null,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Tabela de preço excluída com sucesso.' });
  } catch (error: any) {
    console.error('Error deleting price table:', error);
    return NextResponse.json({ error: 'Erro ao excluir tabela de preço: ' + error.message }, { status: 500 });
  }
}
