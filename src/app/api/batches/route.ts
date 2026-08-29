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

    const batches = await prisma.productionBatch.findMany({
      where,
      include: {
        recipe: {
          include: {
            ingredients: true,
          },
        },
        tank: true,
        kegs: true,
        ingredients: {
          include: {
            supplier: true,
            inventoryItem: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { kegs: true, ingredients: true } },
      },
      orderBy: { brewDate: 'desc' },
    });

    return NextResponse.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    return NextResponse.json({ error: 'Erro ao buscar lotes de produção' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const breweryId = session.breweryId;
    const body = await req.json();
    const {
      recipeId,
      batchNumber,
      tankId,
      volumePlannedLiters,
      volumeProducedLiters,
      status,
      measuredOg,
      costPerLiter,
      totalCost,
      notes,
      ingredients,
      deductStock,
    } = body;

    if (!recipeId || !batchNumber || !volumePlannedLiters) {
      return NextResponse.json({ error: 'Receita, número do lote e volume planejado são obrigatórios' }, { status: 400 });
    }

    const volPlanned = parseFloat(volumePlannedLiters) || 0;
    const volProd = volumeProducedLiters ? parseFloat(volumeProducedLiters) : volPlanned;
    const numCostPerLiter = costPerLiter !== undefined ? parseFloat(costPerLiter) : 0;
    const numTotalCost = totalCost !== undefined ? parseFloat(totalCost) : (numCostPerLiter * (volProd || volPlanned));

    const cleanBatchNumber = batchNumber.trim().toUpperCase();

    // Check if batch number already exists for this brewery
    const existing = await prisma.productionBatch.findUnique({
      where: {
        breweryId_batchNumber: {
          breweryId,
          batchNumber: cleanBatchNumber,
        },
      },
    });
    if (existing) {
      return NextResponse.json({ error: `Já existe um lote com o número ${cleanBatchNumber}` }, { status: 400 });
    }

    const batch: any = await prisma.$transaction(async (tx) => {
      const createdBatch = await tx.productionBatch.create({
        data: {
          breweryId,
          recipeId,
          batchNumber: cleanBatchNumber,
          tankId: tankId || null,
          status: status || 'BRASSAGEM',
          volumePlannedLiters: volPlanned,
          volumeProducedLiters: volProd,
          costPerLiter: numCostPerLiter,
          totalCost: numTotalCost,
          measuredOg: measuredOg ? parseFloat(measuredOg) : null,
          notes: notes ? String(notes).trim() : null,
          ingredients: Array.isArray(ingredients) && ingredients.length > 0
            ? {
                create: ingredients.map((ing: any) => ({
                  inventoryItemId: ing.inventoryItemId || null,
                  inventoryLotId: ing.inventoryLotId || null,
                  supplierId: ing.supplierId || null,
                  name: ing.name?.trim() || 'Insumo',
                  category: ing.category || 'MALTE',
                  quantityUsed: parseFloat(ing.quantityUsed || ing.amount) || 0,
                  unit: (ing.unit || 'KG').toUpperCase(),
                  supplierName: ing.supplierName?.trim() || ing.supplier?.name || null,
                  supplierLot: ing.supplierLot?.trim() || null,
                  costPerUnit: ing.costPerUnit ? parseFloat(ing.costPerUnit) : 0,
                  totalCost: ing.totalCost
                    ? parseFloat(ing.totalCost)
                    : (parseFloat(ing.quantityUsed || ing.amount) || 0) * (parseFloat(ing.costPerUnit) || 0),
                  expirationDate: ing.expirationDate ? new Date(ing.expirationDate) : null,
                  harvestYear: ing.harvestYear?.trim() || null,
                  stage: ing.stage || 'MOSTURA',
                  notes: ing.notes?.trim() || null,
                })),
              }
            : undefined,
        },
        include: {
          recipe: true,
          tank: true,
          ingredients: {
            include: { supplier: true, inventoryItem: true, inventoryLot: true },
          },
        },
      });

      // Update Tank status if assigned
      if (tankId) {
        await tx.tank.update({
          where: { id: tankId },
          data: { status: 'OCUPADO', currentBatchId: createdBatch.id },
        });
      }

      // Deduct stock if requested
      if (deductStock !== false && Array.isArray(ingredients)) {
        for (const ing of ingredients) {
          const qtyUsed = parseFloat(ing.quantityUsed || ing.amount) || 0;
          if (ing.inventoryItemId && qtyUsed > 0) {
            const stockItem = await tx.inventoryItem.findUnique({
              where: { id: ing.inventoryItemId },
            });

            if (stockItem) {
              // Find target lot to deduct from
              let targetLot: any = null;
              if (ing.inventoryLotId) {
                targetLot = await tx.inventoryLot.findUnique({ where: { id: ing.inventoryLotId } });
              } else if (ing.supplierLot) {
                targetLot = await tx.inventoryLot.findFirst({
                  where: { inventoryItemId: stockItem.id, lotNumber: ing.supplierLot.trim() },
                });
              }

              if (!targetLot) {
                targetLot = await tx.inventoryLot.findFirst({
                  where: { inventoryItemId: stockItem.id, currentQuantity: { gt: 0 } },
                  orderBy: [{ expirationDate: 'asc' }, { createdAt: 'asc' }],
                });
              }

              if (targetLot) {
                const newLotQty = Math.max(0, targetLot.currentQuantity - qtyUsed);
                await tx.inventoryLot.update({
                  where: { id: targetLot.id },
                  data: {
                    currentQuantity: newLotQty,
                    status: newLotQty <= 0 ? 'ESGOTADO' : 'ATIVO',
                  },
                });
              }

              // Recalculate item total current quantity from all lots
              const allLots = await tx.inventoryLot.findMany({
                where: { inventoryItemId: stockItem.id },
              });
              const newStockQty = allLots.length > 0
                ? allLots.reduce((sum, l) => sum + Math.max(0, l.currentQuantity), 0)
                : Math.max(0, stockItem.currentQuantity - qtyUsed);

              await tx.inventoryItem.update({
                where: { id: stockItem.id },
                data: { currentQuantity: newStockQty },
              });

              await tx.inventoryMovement.create({
                data: {
                  breweryId,
                  inventoryItemId: stockItem.id,
                  inventoryLotId: targetLot?.id || null,
                  type: 'SAIDA_BRASSAGEM',
                  quantity: -qtyUsed,
                  costPerUnit: ing.costPerUnit ? parseFloat(ing.costPerUnit) : (targetLot?.costPerUnit || stockItem.costPerUnit),
                  supplierLot: ing.supplierLot || targetLot?.lotNumber || stockItem.supplierLot || null,
                  batchId: createdBatch.id,
                  userId: session.userId || null,
                  userName: session.name || null,
                  notes: `Consumo na brassagem do lote #${createdBatch.batchNumber} (Lote Insumo: ${targetLot?.lotNumber || ing.supplierLot || 'N/A'})`,
                },
              });
            }
          }
        }
      }

      return createdBatch;
    });

    await prisma.actionLog.create({
      data: {
        breweryId,
        userId: session.userId || null,
        userName: session.name || null,
        actionType: 'BATCH_CREATE',
        description: `Criado lote ${batch.batchNumber} (${batch.recipe?.name || 'Cerveja'}) - ${volPlanned}L com ${batch.ingredients?.length || 0} insumos registrados e rastreados`,
        entityType: 'ProductionBatch',
        entityId: batch.id,
        previousData: null,
        newData: JSON.stringify(batch),
      },
    });

    return NextResponse.json(batch);
  } catch (error: any) {
    console.error('Batch create error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar lote de produção' }, { status: 500 });
  }
}
