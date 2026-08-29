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
        lots: {
          where: { currentQuantity: { gt: 0 } },
          include: { supplier: true },
          orderBy: [{ expirationDate: 'asc' }, { createdAt: 'asc' }],
        },
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

    // Auto-backfill any item that has currentQuantity > 0 but no lots created yet
    for (const item of items) {
      if (item.currentQuantity > 0 && (!item.lots || item.lots.length === 0)) {
        try {
          const autoLot = await prisma.inventoryLot.create({
            data: {
              breweryId: item.breweryId,
              inventoryItemId: item.id,
              lotNumber: item.supplierLot || `LOTE-${new Date(item.createdAt).getFullYear()}-001`,
              initialQuantity: item.currentQuantity,
              currentQuantity: item.currentQuantity,
              costPerUnit: item.costPerUnit,
              supplierId: item.supplierId,
              supplierName: item.supplier?.name || null,
              expirationDate: item.expirationDate,
              harvestYear: item.harvestYear,
              brand: item.brand,
              location: item.location,
              status: 'ATIVO',
              notes: 'Lote inicial migrado automaticamente',
            },
            include: { supplier: true },
          });
          (item.lots as any) = [autoLot];
        } catch (e) {
          // If lot already exists or conflict, ignore
        }
      }
    }

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
    const lotNumberClean = supplierLot?.trim() || `LOTE-${new Date().getFullYear()}-001`;

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
        supplierLot: lotNumberClean,
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

    // If initial quantity was entered, create initial InventoryLot and Movement
    if (qty > 0) {
      const lot = await prisma.inventoryLot.create({
        data: {
          breweryId: session.breweryId,
          inventoryItemId: item.id,
          lotNumber: lotNumberClean,
          initialQuantity: qty,
          currentQuantity: qty,
          costPerUnit: cost,
          supplierId: supplierId || null,
          supplierName: item.supplier?.name || null,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          harvestYear: harvestYear?.trim() || null,
          brand: brand?.trim() || null,
          location: location?.trim() || null,
          status: 'ATIVO',
          notes: 'Cadastro inicial de estoque',
        },
      });

      await prisma.inventoryMovement.create({
        data: {
          breweryId: session.breweryId,
          inventoryItemId: item.id,
          inventoryLotId: lot.id,
          type: 'ENTRADA',
          quantity: qty,
          costPerUnit: cost,
          supplierLot: lotNumberClean,
          userId: session.userId,
          userName: session.name,
          notes: `Entrada inicial do lote ${lotNumberClean}`,
        },
      });
    }

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'INVENTORY_CREATE',
        description: `Cadastrado insumo ${item.name} (${item.category}) - ${qty} ${item.unit} em estoque (Lote: ${lotNumberClean})`,
        entityType: 'InventoryItem',
        entityId: item.id,
        newData: JSON.stringify(item),
      },
    });

    // Return item with lots included
    const fullItem = await prisma.inventoryItem.findUnique({
      where: { id: item.id },
      include: {
        supplier: true,
        lots: { include: { supplier: true } },
      },
    });

    return NextResponse.json(fullItem || item);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar insumo no estoque' }, { status: 500 });
  }
}
