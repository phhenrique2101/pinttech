import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const item = await prisma.inventoryItem.findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });

    const body = await req.json();
    const {
      type,
      quantity,
      costPerUnit,
      supplierLot,
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
    const newQuantity = Math.max(0, item.currentQuantity + qty);

    const updateData: any = {
      currentQuantity: newQuantity,
    };

    if (costPerUnit !== undefined && parseFloat(costPerUnit) > 0) {
      updateData.costPerUnit = parseFloat(costPerUnit);
    }
    if (supplierLot && supplierLot.trim()) {
      updateData.supplierLot = supplierLot.trim();
    }
    if (expirationDate) {
      updateData.expirationDate = new Date(expirationDate);
    }
    if (harvestYear && harvestYear.trim()) {
      updateData.harvestYear = harvestYear.trim();
    }
    if (supplierId) {
      updateData.supplierId = supplierId;
    }

    const [updatedItem, movement] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: params.id },
        data: updateData,
        include: { supplier: true },
      }),
      prisma.inventoryMovement.create({
        data: {
          breweryId: session.breweryId,
          inventoryItemId: item.id,
          type: movementType,
          quantity: qty,
          costPerUnit: costPerUnit ? parseFloat(costPerUnit) : item.costPerUnit,
          supplierLot: supplierLot?.trim() || item.supplierLot,
          userId: session.userId,
          userName: session.name,
          notes: notes?.trim() || (movementType === 'ENTRADA' ? 'Entrada de lote no estoque' : 'Ajuste de estoque'),
        },
      }),
    ]);

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'INVENTORY_MOVEMENT',
        description: `Movimentação de estoque em ${item.name}: ${qty > 0 ? '+' : ''}${qty} ${item.unit} (${movementType}) - Saldo: ${newQuantity} ${item.unit}`,
        entityType: 'InventoryItem',
        entityId: item.id,
        newData: JSON.stringify({ movement, newQuantity }),
      },
    });

    return NextResponse.json({ item: updatedItem, movement });
  } catch (error) {
    console.error('Error creating inventory movement:', error);
    return NextResponse.json({ error: 'Erro ao registrar movimentação de estoque' }, { status: 500 });
  }
}
