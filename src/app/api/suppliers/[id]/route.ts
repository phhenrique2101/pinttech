import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        inventoryItems: true,
        batchIngredients: {
          include: {
            batch: {
              include: { recipe: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    return NextResponse.json(supplier);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar fornecedor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });

    const body = await req.json();
    const { name, tradeName, document, email, phone, category, address } = body;

    const updated = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        tradeName: tradeName !== undefined ? tradeName?.trim() || null : existing.tradeName,
        document: document !== undefined ? document?.trim() || null : existing.document,
        email: email !== undefined ? email?.trim() || null : existing.email,
        phone: phone !== undefined ? phone?.trim() || null : existing.phone,
        category: category !== undefined ? category?.trim() || null : existing.category,
        address: address !== undefined ? address?.trim() || null : existing.address,
      },
    });

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'SUPPLIER_UPDATE',
        description: `Atualizado fornecedor ${updated.name}`,
        entityType: 'Supplier',
        entityId: updated.id,
        previousData: JSON.stringify(existing),
        newData: JSON.stringify(updated),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ error: 'Erro ao atualizar fornecedor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: { _count: { select: { inventoryItems: true, batchIngredients: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });

    await prisma.supplier.delete({ where: { id: params.id } });

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'SUPPLIER_DELETE',
        description: `Excluído fornecedor ${existing.name}`,
        entityType: 'Supplier',
        entityId: params.id,
        previousData: JSON.stringify(existing),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ error: 'Erro ao excluir fornecedor' }, { status: 500 });
  }
}
