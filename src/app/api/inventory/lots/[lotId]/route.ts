import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { lotId: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const lot = await prisma.inventoryLot.findUnique({
      where: { id: params.lotId },
      include: {
        supplier: true,
        inventoryItem: true,
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        batchIngredients: {
          include: {
            batch: {
              include: {
                recipe: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lot) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    return NextResponse.json(lot);
  } catch (error) {
    console.error('Error fetching inventory lot:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados do lote' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { lotId: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const breweryId = session.breweryId;

    const lot = await prisma.inventoryLot.findUnique({
      where: { id: params.lotId },
      include: { inventoryItem: true },
    });
    if (!lot) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });

    const body = await req.json();
    const {
      lotNumber,
      currentQuantity,
      initialQuantity,
      costPerUnit,
      expirationDate,
      harvestYear,
      supplierId,
      location,
      status,
      notes,
    } = body;

    const newLotNumber = (lotNumber?.trim() || lot.lotNumber).toUpperCase();
    const newCurrentQty = currentQuantity !== undefined ? Math.max(0, parseFloat(currentQuantity)) : lot.currentQuantity;
    const newCost = costPerUnit !== undefined ? parseFloat(costPerUnit) : lot.costPerUnit;

    const result = await prisma.$transaction(async (tx) => {
      // Update the lot
      const updatedLot = await tx.inventoryLot.update({
        where: { id: params.lotId },
        data: {
          lotNumber: newLotNumber,
          currentQuantity: newCurrentQty,
          initialQuantity: initialQuantity !== undefined ? parseFloat(initialQuantity) : lot.initialQuantity,
          costPerUnit: newCost,
          expirationDate: expirationDate ? new Date(expirationDate) : (expirationDate === null ? null : lot.expirationDate),
          harvestYear: harvestYear !== undefined ? (harvestYear?.trim() || null) : lot.harvestYear,
          supplierId: supplierId !== undefined ? (supplierId || null) : lot.supplierId,
          location: location !== undefined ? (location?.trim() || null) : lot.location,
          status: status || (newCurrentQty <= 0 ? 'ESGOTADO' : 'ATIVO'),
          notes: notes !== undefined ? (notes?.trim() || null) : lot.notes,
        },
        include: { supplier: true },
      });

      // Recalculate parent item total quantity from all active lots
      const allLots = await tx.inventoryLot.findMany({
        where: { inventoryItemId: lot.inventoryItemId },
      });
      const totalQuantity = allLots.reduce((sum, l) => sum + Math.max(0, l.currentQuantity), 0);

      const updatedItem = await tx.inventoryItem.update({
        where: { id: lot.inventoryItemId },
        data: {
          currentQuantity: totalQuantity,
          supplierLot: newLotNumber,
          costPerUnit: newCost,
        },
        include: {
          supplier: true,
          lots: {
            where: { currentQuantity: { gt: 0 } },
            include: { supplier: true },
            orderBy: [{ expirationDate: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });

      return { lot: updatedLot, item: updatedItem };
    });

    await prisma.actionLog.create({
      data: {
        breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'INVENTORY_LOT_UPDATE',
        description: `Editado lote ${newLotNumber} de ${lot.inventoryItem.name}: Saldo ajustado para ${newCurrentQty} ${lot.inventoryItem.unit}`,
        entityType: 'InventoryLot',
        entityId: lot.id,
        newData: JSON.stringify(result.lot),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating inventory lot:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados do lote' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { lotId: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const breweryId = session.breweryId;

    const lot = await prisma.inventoryLot.findUnique({
      where: { id: params.lotId },
      include: {
        inventoryItem: true,
        _count: {
          select: { batchIngredients: true, movements: true },
        },
      },
    });
    if (!lot) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // If lot is linked to batch ingredients or movements, decouple or mark as deleted
      if (lot._count.batchIngredients > 0 || lot._count.movements > 0) {
        await tx.inventoryMovement.updateMany({
          where: { inventoryLotId: lot.id },
          data: { inventoryLotId: null },
        });
        await tx.batchIngredient.updateMany({
          where: { inventoryLotId: lot.id },
          data: { inventoryLotId: null },
        });
      }

      await tx.inventoryLot.delete({
        where: { id: lot.id },
      });

      // Recalculate parent item total quantity
      const remainingLots = await tx.inventoryLot.findMany({
        where: { inventoryItemId: lot.inventoryItemId },
      });
      const totalQuantity = remainingLots.reduce((sum, l) => sum + Math.max(0, l.currentQuantity), 0);

      await tx.inventoryItem.update({
        where: { id: lot.inventoryItemId },
        data: { currentQuantity: totalQuantity },
      });
    });

    await prisma.actionLog.create({
      data: {
        breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'INVENTORY_LOT_DELETE',
        description: `Excluído lote ${lot.lotNumber} do insumo ${lot.inventoryItem.name}`,
        entityType: 'InventoryLot',
        entityId: lot.id,
      },
    });

    return NextResponse.json({ success: true, message: 'Lote excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting inventory lot:', error);
    return NextResponse.json({ error: 'Erro ao excluir lote' }, { status: 500 });
  }
}
