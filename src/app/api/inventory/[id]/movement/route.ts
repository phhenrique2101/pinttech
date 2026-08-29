import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const breweryId = session.breweryId;

    const item = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
      include: { supplier: true },
    });
    if (!item) return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });

    const body = await req.json();
    const {
      type,
      quantity,
      costPerUnit,
      supplierLot,
      inventoryLotId,
      expirationDate,
      harvestYear,
      supplierId,
      notes,
    } = body;

    const qty = parseFloat(quantity) || 0;
    if (qty === 0) {
      return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });
    }

    const movementType = type || (qty > 0 ? 'ENTRADA' : 'AJUSTE_PERDA');
    const unitCost = costPerUnit !== undefined && parseFloat(costPerUnit) > 0 ? parseFloat(costPerUnit) : item.costPerUnit;
    const lotCode = (supplierLot?.trim() || item.supplierLot || `LOTE-${new Date().getFullYear()}-001`).toUpperCase();

    const result = await prisma.$transaction(async (tx) => {
      let targetLot: any = null;

      if (movementType === 'ENTRADA' && qty > 0) {
        // Find if lot with same lotNumber already exists for this item
        const existingLot = await tx.inventoryLot.findUnique({
          where: {
            breweryId_inventoryItemId_lotNumber: {
              breweryId,
              inventoryItemId: item.id,
              lotNumber: lotCode,
            },
          },
        });

        if (existingLot) {
          targetLot = await tx.inventoryLot.update({
            where: { id: existingLot.id },
            data: {
              initialQuantity: existingLot.initialQuantity + qty,
              currentQuantity: existingLot.currentQuantity + qty,
              costPerUnit: unitCost,
              expirationDate: expirationDate ? new Date(expirationDate) : existingLot.expirationDate,
              harvestYear: harvestYear?.trim() || existingLot.harvestYear,
              supplierId: supplierId || existingLot.supplierId,
              status: 'ATIVO',
            },
          });
        } else {
          targetLot = await tx.inventoryLot.create({
            data: {
              breweryId,
              inventoryItemId: item.id,
              lotNumber: lotCode,
              initialQuantity: qty,
              currentQuantity: qty,
              costPerUnit: unitCost,
              supplierId: supplierId || item.supplierId,
              supplierName: item.supplier?.name || null,
              expirationDate: expirationDate ? new Date(expirationDate) : null,
              harvestYear: harvestYear?.trim() || item.harvestYear,
              brand: item.brand,
              location: item.location,
              status: 'ATIVO',
              notes: notes?.trim() || null,
            },
          });
        }
      } else if (qty < 0 || movementType === 'AJUSTE_PERDA') {
        // Deduct from specified lot or oldest active lot
        const deductionQty = Math.abs(qty);
        if (inventoryLotId) {
          const lot = await tx.inventoryLot.findUnique({ where: { id: inventoryLotId } });
          if (lot) {
            const newLotQty = Math.max(0, lot.currentQuantity - deductionQty);
            targetLot = await tx.inventoryLot.update({
              where: { id: lot.id },
              data: {
                currentQuantity: newLotQty,
                status: newLotQty <= 0 ? 'ESGOTADO' : 'ATIVO',
              },
            });
          }
        } else {
          // Find first active lot
          const firstLot = await tx.inventoryLot.findFirst({
            where: { inventoryItemId: item.id, currentQuantity: { gt: 0 } },
            orderBy: [{ expirationDate: 'asc' }, { createdAt: 'asc' }],
          });
          if (firstLot) {
            const newLotQty = Math.max(0, firstLot.currentQuantity - deductionQty);
            targetLot = await tx.inventoryLot.update({
              where: { id: firstLot.id },
              data: {
                currentQuantity: newLotQty,
                status: newLotQty <= 0 ? 'ESGOTADO' : 'ATIVO',
              },
            });
          }
        }
      }

      // Recalculate total item currentQuantity by summing all active lots
      const allLots = await tx.inventoryLot.findMany({
        where: { inventoryItemId: item.id },
      });
      const totalQuantity = allLots.length > 0
        ? allLots.reduce((sum, l) => sum + Math.max(0, l.currentQuantity), 0)
        : Math.max(0, item.currentQuantity + qty);

      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentQuantity: totalQuantity,
          costPerUnit: unitCost,
          supplierLot: lotCode,
          supplierId: supplierId || item.supplierId,
          expirationDate: expirationDate ? new Date(expirationDate) : item.expirationDate,
          harvestYear: harvestYear?.trim() || item.harvestYear,
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

      const movement = await tx.inventoryMovement.create({
        data: {
          breweryId,
          inventoryItemId: item.id,
          inventoryLotId: targetLot?.id || null,
          type: movementType,
          quantity: qty,
          costPerUnit: unitCost,
          supplierLot: lotCode,
          userId: session.userId,
          userName: session.name,
          notes: notes?.trim() || (movementType === 'ENTRADA' ? `Entrada de ${qty} ${item.unit} no Lote ${lotCode}` : 'Ajuste de perda de estoque'),
        },
      });

      return { item: updatedItem, movement, lot: targetLot };
    });

    await prisma.actionLog.create({
      data: {
        breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'INVENTORY_MOVEMENT',
        description: `Entrada/Movimentação em ${item.name}: ${qty > 0 ? '+' : ''}${qty} ${item.unit} (Lote: ${lotCode}) - Novo Saldo Total: ${result.item.currentQuantity} ${item.unit}`,
        entityType: 'InventoryItem',
        entityId: item.id,
        newData: JSON.stringify({ movement: result.movement, newQuantity: result.item.currentQuantity, lot: result.lot }),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating inventory movement:', error);
    return NextResponse.json({ error: 'Erro ao registrar movimentação de estoque' }, { status: 500 });
  }
}
