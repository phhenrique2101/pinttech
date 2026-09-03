import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const batch = await prisma.productionBatch.findUnique({
      where: { id: params.id },
      include: {
        recipe: {
          include: {
            ingredients: true,
          },
        },
        tank: true,
        kegs: {
          include: { currentClient: true },
        },
        ingredients: {
          include: {
            supplier: true,
            inventoryItem: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        inventoryMovements: true,
        movements: true,
      },
    });

    if (!batch) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    return NextResponse.json(batch);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar lote' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.productionBatch.findUnique({
      where: { id: params.id },
      include: { recipe: true, tank: true, ingredients: true },
    });

    if (!existing) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });

    const body = await req.json();
    const {
      batchNumber,
      status,
      volumePlannedLiters,
      volumeProducedLiters,
      costPerLiter,
      totalCost,
      tankId,
      notes,
      measuredOg,
      measuredFg,
      measuredAbv,
      measuredIbu,
      measuredEbc,
      attenuationPercent,
      phMash,
      phBoil,
      phFermentationStart,
      phFinal,
      tempMash,
      tempFermentation,
      tempMaturation,
      yeastStrain,
      yeastGeneration,
      yeastLot,
      mapaRegistration,
      commercialDenomination,
      technicalResponsible,
      sensoryNotes,
      packagingDate,
      fermentationStartDate,
      maturationStartDate,
      tankTasksJson,
      fermentationLogsJson,
      customRecipeDataJson,
      brewDate,
      ingredients,
    } = body;

    const volPlanned = volumePlannedLiters !== undefined ? parseFloat(volumePlannedLiters) : existing.volumePlannedLiters;
    const volProd = volumeProducedLiters !== undefined ? parseFloat(volumeProducedLiters) : existing.volumeProducedLiters;
    const numCostPerLiter = costPerLiter !== undefined ? parseFloat(costPerLiter) : existing.costPerLiter;
    const numTotalCost = totalCost !== undefined
      ? parseFloat(totalCost)
      : (numCostPerLiter !== null && numCostPerLiter !== undefined && (volProd || volPlanned))
      ? numCostPerLiter * (volProd || volPlanned)
      : existing.totalCost;

    const numOg = measuredOg !== undefined ? (measuredOg ? parseFloat(measuredOg) : null) : existing.measuredOg;
    const numFg = measuredFg !== undefined ? (measuredFg ? parseFloat(measuredFg) : null) : existing.measuredFg;
    let calcAbv = measuredAbv !== undefined ? (measuredAbv ? parseFloat(measuredAbv) : null) : existing.measuredAbv;
    let calcAtt = attenuationPercent !== undefined ? (attenuationPercent ? parseFloat(attenuationPercent) : null) : existing.attenuationPercent;

    if (numOg && numFg && numOg > 1.0 && numFg >= 0.99) {
      if (measuredAbv === undefined && !calcAbv) calcAbv = Math.round(((numOg - numFg) * 131.25) * 10) / 10;
      if (attenuationPercent === undefined && !calcAtt && numOg > 1.0) calcAtt = Math.round(((numOg - numFg) / (numOg - 1.0)) * 1000) / 10;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Sincronização Bidirecional de Estoque (Saída/Devolução de Insumos)
      if (Array.isArray(ingredients)) {
        // 1. Mapear consumo anterior por item de estoque
        const prevStockMap = new Map<string, { qty: number; lotId?: string | null; unit: string }>();
        for (const prev of existing.ingredients) {
          if (prev.inventoryItemId) {
            const current = prevStockMap.get(prev.inventoryItemId) || { qty: 0, lotId: prev.inventoryLotId, unit: prev.unit };
            // Normalizar quantidade para a unidade base
            current.qty += prev.quantityUsed;
            prevStockMap.set(prev.inventoryItemId, current);
          }
        }

        // 2. Mapear novo consumo por item de estoque
        const newStockMap = new Map<string, { qty: number; lotId?: string | null; supplierLot?: string | null; unit: string; costPerUnit: number; name: string }>();
        for (const next of ingredients) {
          const invId = next.inventoryItemId;
          const nextQty = parseFloat(next.quantityUsed || next.amount) || 0;
          if (invId && nextQty > 0) {
            const current = newStockMap.get(invId) || {
              qty: 0,
              lotId: next.inventoryLotId,
              supplierLot: next.supplierLot,
              unit: (next.unit || 'KG').toUpperCase(),
              costPerUnit: parseFloat(next.costPerUnit) || 0,
              name: next.name || 'Insumo',
            };
            current.qty += nextQty;
            newStockMap.set(invId, current);
          }
        }

        // 3. Processar deltas para todos os itens afetados (anteriores e novos)
        const allItemIds = new Set([...Array.from(prevStockMap.keys()), ...Array.from(newStockMap.keys())]);

        for (const itemId of Array.from(allItemIds)) {
          const item = await tx.inventoryItem.findUnique({
            where: { id: itemId },
            include: {
              lots: {
                orderBy: [{ expirationDate: 'asc' }, { createdAt: 'asc' }],
              },
            },
          });

          if (!item) continue;

          const prevData = prevStockMap.get(itemId);
          const newData = newStockMap.get(itemId);

          // Converter para a unidade de medida do inventário (ex: G -> KG)
          let prevQty = prevData?.qty || 0;
          if (prevData?.unit === 'G' && item.unit === 'KG') prevQty = prevQty / 1000;

          let newQty = newData?.qty || 0;
          if (newData?.unit === 'G' && item.unit === 'KG') newQty = newQty / 1000;

          const delta = Math.round((newQty - prevQty) * 10000) / 10000;

          if (delta > 0) {
            // AUMENTOU CONSUMO -> Baixar do estoque (Saída)
            const qtyToDeduct = delta;
            let targetLot: any = null;

            if (newData?.lotId) {
              targetLot = item.lots.find((l) => l.id === newData.lotId);
            } else if (newData?.supplierLot) {
              targetLot = item.lots.find((l) => l.lotNumber === newData.supplierLot?.trim());
            }
            if (!targetLot) {
              targetLot = item.lots.find((l) => l.currentQuantity > 0) || item.lots[0];
            }

            if (targetLot) {
              const updatedLotQty = Math.max(0, targetLot.currentQuantity - qtyToDeduct);
              await tx.inventoryLot.update({
                where: { id: targetLot.id },
                data: {
                  currentQuantity: updatedLotQty,
                  status: updatedLotQty <= 0 ? 'ESGOTADO' : 'ATIVO',
                },
              });
            }

            const updatedItemQty = Math.max(0, item.currentQuantity - qtyToDeduct);
            await tx.inventoryItem.update({
              where: { id: item.id },
              data: { currentQuantity: updatedItemQty },
            });

            await tx.inventoryMovement.create({
              data: {
                breweryId: existing.breweryId,
                inventoryItemId: item.id,
                inventoryLotId: targetLot?.id || null,
                type: 'SAIDA_BRASSAGEM',
                quantity: -qtyToDeduct,
                costPerUnit: item.costPerUnit,
                supplierLot: targetLot?.lotNumber || newData?.supplierLot || null,
                batchId: existing.id,
                userId: session.userId,
                userName: session.name,
                notes: `Consumo ajustado no lote ${existing.batchNumber} (${qtyToDeduct.toFixed(2)} ${item.unit})`,
              },
            });
          } else if (delta < 0) {
            // REDUZIU CONSUMO OU REMOVEU INSUMO -> Devolver ao estoque (Entrada)
            const qtyToReturn = Math.abs(delta);
            let targetLot: any = null;

            if (prevData?.lotId) {
              targetLot = item.lots.find((l) => l.id === prevData.lotId);
            }
            if (!targetLot) {
              targetLot = item.lots[0];
            }

            if (targetLot) {
              await tx.inventoryLot.update({
                where: { id: targetLot.id },
                data: {
                  currentQuantity: targetLot.currentQuantity + qtyToReturn,
                  status: 'ATIVO',
                },
              });
            }

            await tx.inventoryItem.update({
              where: { id: item.id },
              data: { currentQuantity: item.currentQuantity + qtyToReturn },
            });

            await tx.inventoryMovement.create({
              data: {
                breweryId: existing.breweryId,
                inventoryItemId: item.id,
                inventoryLotId: targetLot?.id || null,
                type: 'ENTRADA',
                quantity: qtyToReturn,
                costPerUnit: item.costPerUnit,
                supplierLot: targetLot?.lotNumber || null,
                batchId: existing.id,
                userId: session.userId,
                userName: session.name,
                notes: `Devolução / estorno de insumo no lote ${existing.batchNumber} (${qtyToReturn.toFixed(2)} ${item.unit})`,
              },
            });
          }
        }

        // Recriar registros de insumos do lote
        await tx.batchIngredient.deleteMany({
          where: { batchId: params.id },
        });

        if (ingredients.length > 0) {
          await tx.batchIngredient.createMany({
            data: ingredients.map((ing: any) => ({
              batchId: params.id,
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
          });
        }
      }

      return tx.productionBatch.update({
        where: { id: params.id },
        data: {
          batchNumber: batchNumber?.trim() || existing.batchNumber,
          status: status ?? existing.status,
          volumePlannedLiters: volPlanned,
          volumeProducedLiters: volProd,
          costPerLiter: numCostPerLiter,
          totalCost: numTotalCost,
          brewDate: brewDate !== undefined ? (brewDate ? new Date(brewDate) : existing.brewDate) : existing.brewDate,
          tankId: tankId !== undefined ? tankId : existing.tankId,
          notes: notes !== undefined ? notes : existing.notes,
          measuredOg: numOg,
          measuredFg: numFg,
          measuredAbv: calcAbv,
          measuredIbu: measuredIbu !== undefined ? (measuredIbu ? parseInt(measuredIbu, 10) : null) : existing.measuredIbu,
          measuredEbc: measuredEbc !== undefined ? (measuredEbc ? parseFloat(measuredEbc) : null) : existing.measuredEbc,
          attenuationPercent: calcAtt,
          phMash: phMash !== undefined ? (phMash ? parseFloat(phMash) : null) : existing.phMash,
          phBoil: phBoil !== undefined ? (phBoil ? parseFloat(phBoil) : null) : existing.phBoil,
          phFermentationStart: phFermentationStart !== undefined ? (phFermentationStart ? parseFloat(phFermentationStart) : null) : existing.phFermentationStart,
          phFinal: phFinal !== undefined ? (phFinal ? parseFloat(phFinal) : null) : existing.phFinal,
          tempMash: tempMash !== undefined ? (tempMash ? parseFloat(tempMash) : null) : existing.tempMash,
          tempFermentation: tempFermentation !== undefined ? (tempFermentation ? parseFloat(tempFermentation) : null) : existing.tempFermentation,
          tempMaturation: tempMaturation !== undefined ? (tempMaturation ? parseFloat(tempMaturation) : null) : existing.tempMaturation,
          yeastStrain: yeastStrain !== undefined ? (yeastStrain?.trim() || null) : existing.yeastStrain,
          yeastGeneration: yeastGeneration !== undefined ? (yeastGeneration ? parseInt(yeastGeneration, 10) : null) : existing.yeastGeneration,
          yeastLot: yeastLot !== undefined ? (yeastLot?.trim() || null) : existing.yeastLot,
          mapaRegistration: mapaRegistration !== undefined ? (mapaRegistration?.trim() || null) : existing.mapaRegistration,
          commercialDenomination: commercialDenomination !== undefined ? (commercialDenomination?.trim() || null) : existing.commercialDenomination,
          technicalResponsible: technicalResponsible !== undefined ? (technicalResponsible?.trim() || null) : existing.technicalResponsible,
          sensoryNotes: sensoryNotes !== undefined ? (sensoryNotes?.trim() || null) : existing.sensoryNotes,
          packagingDate: packagingDate !== undefined ? (packagingDate ? new Date(packagingDate) : null) : existing.packagingDate,
          fermentationStartDate: fermentationStartDate !== undefined ? (fermentationStartDate ? new Date(fermentationStartDate) : null) : existing.fermentationStartDate,
          maturationStartDate: maturationStartDate !== undefined ? (maturationStartDate ? new Date(maturationStartDate) : null) : existing.maturationStartDate,
          tankTasksJson: tankTasksJson !== undefined ? (tankTasksJson ? (typeof tankTasksJson === 'string' ? tankTasksJson : JSON.stringify(tankTasksJson)) : null) : existing.tankTasksJson,
          fermentationLogsJson: fermentationLogsJson !== undefined ? (fermentationLogsJson ? (typeof fermentationLogsJson === 'string' ? fermentationLogsJson : JSON.stringify(fermentationLogsJson)) : null) : existing.fermentationLogsJson,
          customRecipeDataJson: customRecipeDataJson !== undefined ? (customRecipeDataJson ? (typeof customRecipeDataJson === 'string' ? customRecipeDataJson : JSON.stringify(customRecipeDataJson)) : null) : existing.customRecipeDataJson,
        },
        include: {
          recipe: true,
          tank: true,
          ingredients: {
            include: { supplier: true, inventoryItem: true },
          },
        },
      });
    });

    // If status changed to FINALIZADO or tank released, free the tank
    if (status === 'FINALIZADO' && existing.tankId) {
      await prisma.tank.update({
        where: { id: existing.tankId },
        data: { status: 'LIVRE', currentBatchId: null },
      });
    }

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'BATCH_UPDATE',
        description: `Atualizado lote ${existing.batchNumber} (${existing.recipe.name}) - Status: ${status || existing.status} | Custo: R$ ${numCostPerLiter?.toFixed(2) || '0.00'}/L`,
        entityType: 'ProductionBatch',
        entityId: existing.id,
        previousData: JSON.stringify({
          status: existing.status,
          volumePlannedLiters: existing.volumePlannedLiters,
          volumeProducedLiters: existing.volumeProducedLiters,
          costPerLiter: existing.costPerLiter,
          totalCost: existing.totalCost,
        }),
        newData: JSON.stringify({
          status: updated.status,
          volumePlannedLiters: updated.volumePlannedLiters,
          volumeProducedLiters: updated.volumeProducedLiters,
          costPerLiter: updated.costPerLiter,
          totalCost: updated.totalCost,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Batch update error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar lote' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.productionBatch.findUnique({
      where: { id: params.id },
      include: { tank: true },
    });
    if (!existing) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });

    if (existing.breweryId !== session.breweryId && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso não permitido' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated BatchIngredient records
      await tx.batchIngredient.deleteMany({ where: { batchId: params.id } });

      // 2. Unlink any kegs that were assigned to this batch
      await tx.keg.updateMany({
        where: { currentBatchId: params.id },
        data: { currentBatchId: null },
      });

      // 3. Delete inventory movements linked to batch
      await tx.inventoryMovement.deleteMany({ where: { batchId: params.id } });

      // 4. If batch was in a tank, free the tank if no other active batch is in it
      if (existing.tankId) {
        const otherBatches = await tx.productionBatch.count({
          where: {
            tankId: existing.tankId,
            id: { not: params.id },
            status: { notIn: ['FINALIZADO', 'ENVASADO'] },
          },
        });
        if (otherBatches === 0) {
          await tx.tank.update({
            where: { id: existing.tankId },
            data: { status: 'LIVRE' },
          });
        }
      }

      // 5. Delete the batch
      await tx.productionBatch.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting batch:', error);
    return NextResponse.json({ error: 'Erro ao excluir lote: ' + (error.message || '') }, { status: 500 });
  }
}
