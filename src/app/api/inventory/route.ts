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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    if (category && category !== 'ALL') {
      where.category = category;
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        supplier: true,
        _count: {
          select: {
            recipeIngredients: true,
            batchIngredients: true,
            movements: true,
          },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json({ error: 'Erro ao buscar insumos no estoque' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const {
      name,
      category,
      unit,
      currentQuantity,
      minimumQuantity,
      costPerUnit,
      supplierId,
      supplierLot,
      expirationDate,
      harvestYear,
      brand,
      location,
      notes,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome do insumo é obrigatório' }, { status: 400 });
    }

    const qty = currentQuantity !== undefined ? parseFloat(currentQuantity) : 0;
    const minQty = minimumQuantity !== undefined ? parseFloat(minimumQuantity) : 0;
    const cost = costPerUnit !== undefined ? parseFloat(costPerUnit) : 0;

    const item = await prisma.inventoryItem.create({
      data: {
        breweryId: session.breweryId,
        name: name.trim(),
        category: category || 'MALTE',
        unit: (unit || 'KG').toUpperCase(),
        currentQuantity: qty,
        minimumQuantity: minQty,
        costPerUnit: cost,
        supplierId: supplierId || null,
        supplierLot: supplierLot?.trim() || null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        harvestYear: harvestYear?.trim() || null,
        brand: brand?.trim() || null,
        location: location?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        supplier: true,
      },
    });

    // If initial quantity was entered, record an initial InventoryMovement
    if (qty > 0) {
      await prisma.inventoryMovement.create({
        data: {
          breweryId: session.breweryId,
          inventoryItemId: item.id,
          type: 'ENTRADA',
          quantity: qty,
          costPerUnit: cost,
          supplierLot: supplierLot?.trim() || null,
          userId: session.userId,
          userName: session.name,
          notes: 'Cadastro inicial de estoque',
        },
      });
    }

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'INVENTORY_CREATE',
        description: `Cadastrado insumo ${item.name} (${item.category}) - ${qty} ${item.unit} em estoque (Lote: ${supplierLot || 'N/A'})`,
        entityType: 'InventoryItem',
        entityId: item.id,
        newData: JSON.stringify(item),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar insumo no estoque' }, { status: 500 });
  }
}
