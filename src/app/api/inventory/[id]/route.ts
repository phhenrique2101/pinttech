import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const item = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        lots: {
          include: { supplier: true },
          orderBy: [{ expirationDate: 'asc' }, { createdAt: 'asc' }],
        },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            batch: {
              include: {
                recipe: true,
              },
            },
            inventoryLot: true,
          },
        },
        recipeIngredients: {
          include: {
            recipe: true,
          },
        },
        batchIngredients: {
          include: {
            inventoryLot: true,
            batch: {
              include: {
                recipe: true,
                tank: true,
                kegs: {
                  include: {
                    currentClient: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!item) return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching inventory item details:', error);
    return NextResponse.json({ error: 'Erro ao buscar detalhes do insumo' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.inventoryItem.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });

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

    const newQty = currentQuantity !== undefined ? parseFloat(currentQuantity) : existing.currentQuantity;
    const diffQty = newQty - existing.currentQuantity;

    const updated = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        category: category !== undefined ? category : existing.category,
        unit: unit !== undefined ? unit.toUpperCase() : existing.unit,
        currentQuantity: newQty,
        minimumQuantity: minimumQuantity !== undefined ? parseFloat(minimumQuantity) : existing.minimumQuantity,
        costPerUnit: costPerUnit !== undefined ? parseFloat(costPerUnit) : existing.costPerUnit,
        supplierId: supplierId !== undefined ? (supplierId || null) : existing.supplierId,
        supplierLot: supplierLot !== undefined ? (supplierLot?.trim() || null) : existing.supplierLot,
        expirationDate: expirationDate !== undefined ? (expirationDate ? new Date(expirationDate) : null) : existing.expirationDate,
        harvestYear: harvestYear !== undefined ? (harvestYear?.trim() || null) : existing.harvestYear,
        brand: brand !== undefined ? (brand?.trim() || null) : existing.brand,
        location: location !== undefined ? (location?.trim() || null) : existing.location,
        notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
      },
      include: {
        supplier: true,
      },
    });

    // If quantity was changed manually, record an adjustment movement
    if (Math.abs(diffQty) > 0.001) {
      await prisma.inventoryMovement.create({
        data: {
          breweryId: session.breweryId,
          inventoryItemId: updated.id,
          type: diffQty > 0 ? 'ENTRADA' : 'AJUSTE_PERDA',
          quantity: diffQty,
          costPerUnit: updated.costPerUnit,
          supplierLot: updated.supplierLot,
          userId: session.userId,
          userName: session.name,
          notes: 'Ajuste manual de estoque via edição',
        },
      });
    }

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'INVENTORY_UPDATE',
        description: `Atualizado insumo ${updated.name} - Estoque: ${updated.currentQuantity} ${updated.unit} (Custo: R$ ${updated.costPerUnit.toFixed(2)})`,
        entityType: 'InventoryItem',
        entityId: updated.id,
        previousData: JSON.stringify(existing),
        newData: JSON.stringify(updated),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json({ error: 'Erro ao atualizar insumo' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { batchIngredients: true, recipeIngredients: true },
        },
      },
    });
    if (!existing) return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });

    await prisma.inventoryItem.delete({ where: { id: params.id } });

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'INVENTORY_DELETE',
        description: `Excluído insumo ${existing.name}`,
        entityType: 'InventoryItem',
        entityId: params.id,
        previousData: JSON.stringify(existing),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: 'Erro ao excluir insumo' }, { status: 500 });
  }
}
