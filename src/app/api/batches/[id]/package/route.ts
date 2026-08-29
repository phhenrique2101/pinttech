import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const batch = await prisma.productionBatch.findUnique({
      where: { id: params.id },
      include: { recipe: true, tank: true },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const {
      packagingDate,
      lines,
      wastageLiters = 0,
      tankAction = 'LIBERAR',
      notes,
    } = body;

    const parsedPackagingDate = packagingDate ? new Date(packagingDate) : new Date();
    const numWastage = parseFloat(wastageLiters) || 0;

    let totalPackagedLiters = 0;
    const createdFinishedGoods: any[] = [];

    for (const line of (lines || [])) {
      const quantity = parseFloat(line.quantityUnits) || 0;
      const unitVol = parseFloat(line.unitVolumeLiters) || 0;
      if (quantity <= 0 || unitVol <= 0) continue;

      const lineTotalLiters = quantity * unitVol;
      totalPackagedLiters += lineTotalLiters;

      const packageType = line.packageType || 'LATA';
      const sizeLabel = line.sizeLabel || `${Math.round(unitVol * 1000)}ml`;
      const packagingCost = parseFloat(line.unitPackagingCost) || 0;
      const liquidCostPerUnit = (batch.costPerLiter || 0) * unitVol;
      const totalCostPerUnit = liquidCostPerUnit + packagingCost;
      const salePrice = parseFloat(line.salePriceUnit) || ((batch.recipe?.salePricePerLiter || 20) * unitVol);

      if (packageType !== 'BARRIL') {
        const typeLabel = packageType === 'LATA' ? 'Lata' : packageType === 'GARRAFA' ? 'Garrafa' : 'Growler';
        const productName = `${batch.recipe.name} - ${typeLabel} ${sizeLabel}`;

        let productItem = await prisma.inventoryItem.findFirst({
          where: {
            breweryId: session.breweryId,
            name: productName,
            category: 'PRODUTO_FINAL',
          },
        });

        if (!productItem) {
          productItem = await prisma.inventoryItem.create({
            data: {
              breweryId: session.breweryId,
              name: productName,
              category: 'PRODUTO_FINAL',
              unit: 'UN',
              currentQuantity: quantity,
              costPerUnit: totalCostPerUnit,
              notes: `Produto acabado envasado. Estilo: ${batch.recipe.style}. Lote: ${batch.batchNumber}`,
            },
          });
        } else {
          await prisma.inventoryItem.update({
            where: { id: productItem.id },
            data: {
              currentQuantity: { increment: quantity },
              costPerUnit: totalCostPerUnit,
            },
          });
        }

        const expirationDate = new Date(parsedPackagingDate);
        expirationDate.setMonth(expirationDate.getMonth() + 6);

        const lotNumber = batch.batchNumber;
        const existingLot = await prisma.inventoryLot.findUnique({
          where: {
            breweryId_inventoryItemId_lotNumber: {
              breweryId: session.breweryId,
              inventoryItemId: productItem.id,
              lotNumber: lotNumber,
            },
          },
        });

        let savedLot;
        if (existingLot) {
          savedLot = await prisma.inventoryLot.update({
            where: { id: existingLot.id },
            data: {
              currentQuantity: { increment: quantity },
              initialQuantity: { increment: quantity },
              costPerUnit: totalCostPerUnit,
              expirationDate: expirationDate,
            },
          });
        } else {
          savedLot = await prisma.inventoryLot.create({
            data: {
              breweryId: session.breweryId,
              inventoryItemId: productItem.id,
              lotNumber: lotNumber,
              initialQuantity: quantity,
              currentQuantity: quantity,
              costPerUnit: totalCostPerUnit,
              expirationDate: expirationDate,
              status: 'ATIVO',
              notes: `Envase do Lote ${batch.batchNumber}`,
            },
          });
        }

        await prisma.inventoryMovement.create({
          data: {
            breweryId: session.breweryId,
            inventoryItemId: productItem.id,
            inventoryLotId: savedLot.id,
            type: 'ENTRADA',
            quantity: quantity,
            costPerUnit: totalCostPerUnit,
            batchId: batch.id,
            notes: `Envase do Lote ${batch.batchNumber}: ${quantity}x ${typeLabel} ${sizeLabel} (${lineTotalLiters.toFixed(1)}L)`,
            userName: session.name || 'Cervejeiro',
          },
        });

        if (line.packagingInventoryItemId) {
          const emptyPkg = await prisma.inventoryItem.findUnique({
            where: { id: line.packagingInventoryItemId },
          });
          if (emptyPkg) {
            await prisma.inventoryItem.update({
              where: { id: emptyPkg.id },
              data: {
                currentQuantity: { decrement: quantity },
              },
            });
            await prisma.inventoryMovement.create({
              data: {
                breweryId: session.breweryId,
                inventoryItemId: emptyPkg.id,
                type: 'SAIDA_BRASSAGEM',
                quantity: -quantity,
                costPerUnit: emptyPkg.costPerUnit || 0,
                batchId: batch.id,
                notes: `Baixa de embalagens no envase do Lote ${batch.batchNumber}`,
                userName: session.name || 'Cervejeiro',
              },
            });
          }
        }

        createdFinishedGoods.push({
          productName,
          quantity,
          unitVol,
          totalLiters: lineTotalLiters,
          costPerUnit: totalCostPerUnit,
          salePrice,
        });
      }
    }

    const updatedVolumeProduced = (batch.volumeProducedLiters || 0) + totalPackagedLiters + numWastage;
    const isBatchFinished = tankAction !== 'MANTER_OCUPADO';

    await prisma.productionBatch.update({
      where: { id: batch.id },
      data: {
        volumeProducedLiters: updatedVolumeProduced,
        packagingDate: parsedPackagingDate,
        status: isBatchFinished ? 'ENVASADO' : 'PRONTO_ENVASE',
        notes: notes ? (batch.notes ? `${batch.notes}\n${notes}` : notes) : batch.notes,
      },
    });

    if (batch.tankId) {
      if (tankAction === 'LIBERAR') {
        await prisma.tank.update({
          where: { id: batch.tankId },
          data: {
            status: 'LIVRE',
            currentBatchId: null,
            notes: `Lote ${batch.batchNumber} envasado em ${parsedPackagingDate.toLocaleDateString('pt-BR')}. Tanque liberado.`,
          },
        });
      } else if (tankAction === 'CIP') {
        await prisma.tank.update({
          where: { id: batch.tankId },
          data: {
            status: 'HIGIENIZANDO',
            currentBatchId: null,
            notes: `Lote ${batch.batchNumber} envasado em ${parsedPackagingDate.toLocaleDateString('pt-BR')}. Tanque aguardando CIP/Limpeza.`,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Envase registrado com sucesso! ${totalPackagedLiters.toFixed(1)}L envasados.`,
      totalPackagedLiters,
      wastageLiters: numWastage,
      finishedGoods: createdFinishedGoods,
    });
  } catch (error: any) {
    console.error('Error packaging batch:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar envase do lote' }, { status: 500 });
  }
}
