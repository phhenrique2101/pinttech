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

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: { inventoryItems: true, batchIngredients: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { name, tradeName, document, email, phone, category, address } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome do fornecedor é obrigatório' }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        breweryId: session.breweryId,
        name: name.trim(),
        tradeName: tradeName?.trim() || null,
        document: document?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        category: category?.trim() || 'INSUMOS_GERAL',
        address: address?.trim() || null,
      },
    });

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'SUPPLIER_CREATE',
        description: `Cadastrado fornecedor ${supplier.name} (${supplier.category || 'Geral'})`,
        entityType: 'Supplier',
        entityId: supplier.id,
        newData: JSON.stringify(supplier),
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar fornecedor' }, { status: 500 });
  }
}
