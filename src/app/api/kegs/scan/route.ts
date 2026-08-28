import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      code,
      action,
      batchId,
      clientId,
      volumeLiters,
      returnCondition,
      returnVolumeLiters,
      notes,
      driverName,
    } = body;

    if (!code) {
      return NextResponse.json({ error: 'Código de barras / QR é obrigatório' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Procurar se é um Barril ou um Equipamento
    const keg = await prisma.keg.findFirst({
      where: {
        code: cleanCode,
        ...(session.breweryId ? { breweryId: session.breweryId } : {}),
      },
      include: {
        currentBatch: { include: { recipe: true } },
        currentClient: true,
        movements: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { toClient: true, batch: true },
        },
      },
    });

    const equipment = !keg
      ? await prisma.equipment.findFirst({
          where: {
            code: cleanCode,
            ...(session.breweryId ? { breweryId: session.breweryId } : {}),
          },
          include: {
            currentClient: true,
            movements: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: { toClient: true },
            },
          },
        })
      : null;

    if (!keg && !equipment) {
      return NextResponse.json({
        found: false,
        error: `Nenhum barril ou equipamento cadastrado com o código "${cleanCode}"`,
      }, { status: 404 });
    }

    // Se a ação for apenas LOOKUP (Consulta rápida)
    if (!action || action === 'LOOKUP') {
      return NextResponse.json({
        found: true,
        type: keg ? 'KEG' : 'EQUIPMENT',
        item: keg || equipment,
      });
    }

    // ----------------------------------------------------
    // PROCESSAR AÇÕES EM BARRIL
    // ----------------------------------------------------
    if (keg) {
      const breweryId = keg.breweryId;

      switch (action) {
        case 'SANITIZE': {
          // Higienização
          const updated = await prisma.keg.update({
            where: { id: keg.id },
            data: {
              status: 'HIGIENIZADO',
              lastSanitizedAt: new Date(),
              currentBatchId: null,
              currentBeerName: null,
              currentClientId: null,
              currentVolumeLiters: null,
              notes: notes || keg.notes,
            },
          });

          await prisma.kegMovement.create({
            data: {
              breweryId,
              kegId: keg.id,
              action: 'HIGIENIZACAO',
              fromStatus: keg.status,
              toStatus: 'HIGIENIZADO',
              userId: session.userId,
              userName: session.name,
              notes: notes || 'Barril lavado e sanitizado para novo envase',
            },
          });

          return NextResponse.json({ success: true, message: `Barril ${cleanCode} higienizado e pronto para envase!`, item: updated });
        }

        case 'FILL': {
          // Envase de Lote (Com suporte a volume cheio ou parcial)
          if (!batchId) {
            return NextResponse.json({ error: 'Selecione um lote de produção para envasar' }, { status: 400 });
          }

          const batch = await prisma.productionBatch.findUnique({
            where: { id: batchId },
            include: { recipe: true },
          });

          if (!batch) {
            return NextResponse.json({ error: 'Lote de produção não encontrado' }, { status: 404 });
          }

          const beerName = batch.recipe?.name || 'Cerveja Artesanal';
          const envasadoLitros = volumeLiters ? parseFloat(volumeLiters) : keg.capacity;
          const isPartial = envasadoLitros < keg.capacity;

          const updated = await prisma.keg.update({
            where: { id: keg.id },
            data: {
              status: 'EM_ESTOQUE',
              currentBatchId: batch.id,
              currentBeerName: beerName,
              currentVolumeLiters: envasadoLitros,
              lastFilledAt: new Date(),
              currentClientId: null,
              notes: isPartial
                ? `Envase Parcial: ${envasadoLitros}L de ${keg.capacity}L. ${notes || ''}`
                : notes || keg.notes,
            },
          });

          await prisma.kegMovement.create({
            data: {
              breweryId,
              kegId: keg.id,
              batchId: batch.id,
              action: isPartial ? 'ENVASE_PARCIAL' : 'ENVASE',
              volumeLiters: envasadoLitros,
              fromStatus: keg.status,
              toStatus: 'EM_ESTOQUE',
              userId: session.userId,
              userName: session.name,
              notes: notes || `Envasado lote ${batch.batchNumber} (${beerName}) - Volume: ${envasadoLitros}L`,
            },
          });

          return NextResponse.json({
            success: true,
            message: isPartial
              ? `Barril ${cleanCode} envasado parcialmente (${envasadoLitros}L de ${keg.capacity}L)!`
              : `Barril ${cleanCode} envasado com sucesso (${envasadoLitros}L de ${beerName})!`,
            item: updated,
          });
        }

        case 'EXPEDITION': {
          // Expedição / Carregamento no caminhão
          const updated = await prisma.keg.update({
            where: { id: keg.id },
            data: {
              status: 'EM_TRANSITO',
              notes: notes || keg.notes,
            },
          });

          await prisma.kegMovement.create({
            data: {
              breweryId,
              kegId: keg.id,
              action: 'EXPEDICAO',
              fromStatus: keg.status,
              toStatus: 'EM_TRANSITO',
              userId: session.userId,
              userName: session.name,
              driverName: driverName || session.name,
              notes: notes || 'Carregado no veículo para entrega',
            },
          });

          return NextResponse.json({ success: true, message: `Barril ${cleanCode} expedido para rota!`, item: updated });
        }

        case 'DELIVER': {
          // Entrega no Cliente
          if (!clientId) {
            return NextResponse.json({ error: 'Selecione o cliente de destino da entrega' }, { status: 400 });
          }

          const client = await prisma.client.findUnique({ where: { id: clientId } });
          if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

          const updated = await prisma.keg.update({
            where: { id: keg.id },
            data: {
              status: 'NO_CLIENTE',
              currentClientId: client.id,
              lastDeliveredAt: new Date(),
              notes: notes || keg.notes,
            },
          });

          // Atualizar saldo de barris em posse do cliente
          await prisma.client.update({
            where: { id: client.id },
            data: { retainedKegsCount: { increment: 1 } },
          });

          await prisma.kegMovement.create({
            data: {
              breweryId,
              kegId: keg.id,
              toClientId: client.id,
              action: 'ENTREGA',
              fromStatus: keg.status,
              toStatus: 'NO_CLIENTE',
              volumeLiters: keg.currentVolumeLiters || keg.capacity,
              userId: session.userId,
              userName: session.name,
              driverName: driverName || session.name,
              notes: notes || `Entregue no cliente ${client.tradeName || client.name}`,
            },
          });

          return NextResponse.json({ success: true, message: `Barril ${cleanCode} entregue em ${client.tradeName || client.name}!`, item: updated });
        }

        case 'RETURN': {
          // Recolha de Barril (Com suporte a Vazio/Sujo, Parcialmente Cheio ou Cheio Retornado ao Estoque)
          const previousClientId = keg.currentClientId;
          const condition = returnCondition || 'VAZIO_SUJO'; // VAZIO_SUJO, PARCIALMENTE_CHEIO, CHEIO_RETORNADO
          const clientBillingMode = body.billingMode || 'FULL'; // FULL (Cobrar 100%) ou PARTIAL (Cobrar apenas litros consumidos)

          let newStatus = 'VAZIO_SUJO';
          let updatedBatchId = null;
          let updatedBeerName = null;
          let updatedVolumeLiters = null;
          let actionName = 'RECOLHA';
          let message = `Barril ${cleanCode} vazio recolhido e retornado ao pátio.`;

          if (condition === 'PARCIALMENTE_CHEIO') {
            newStatus = 'EM_ESTOQUE'; // Retorna ao estoque na câmara fria
            updatedBatchId = keg.currentBatchId;
            updatedBeerName = keg.currentBeerName;
            updatedVolumeLiters = returnVolumeLiters ? parseFloat(returnVolumeLiters) : 20.0;
            actionName = 'RECOLHA_PARCIAL';
          } else if (condition === 'CHEIO_RETORNADO') {
            newStatus = 'EM_ESTOQUE';
            updatedBatchId = keg.currentBatchId;
            updatedBeerName = keg.currentBeerName;
            updatedVolumeLiters = keg.capacity;
            actionName = 'RECOLHA_CHEIO';
          }

          const updated = await prisma.keg.update({
            where: { id: keg.id },
            data: {
              status: newStatus,
              currentClientId: null,
              currentBatchId: updatedBatchId,
              currentBeerName: updatedBeerName,
              currentVolumeLiters: updatedVolumeLiters,
              lastReturnedAt: new Date(),
              notes: notes || (condition !== 'VAZIO_SUJO' ? `Retorno ${condition} com ${updatedVolumeLiters}L (${clientBillingMode === 'PARTIAL' ? 'Cobrança Parcial' : 'Cobrança Integral'})` : keg.notes),
            },
          });

          if (previousClientId) {
            await prisma.client.update({
              where: { id: previousClientId },
              data: { retainedKegsCount: { decrement: 1 } },
            }).catch(() => {});
          }

          // Se o barril voltou com chopp (Parcial ou Cheio), processar a cobrança do pedido do cliente
          if (condition !== 'VAZIO_SUJO') {
            const remainingLiters = updatedVolumeLiters || 0;
            const consumedLiters = Math.max(0, keg.capacity - remainingLiters);

            // Procurar pedido recente do cliente
            const activeOrder = previousClientId
              ? await prisma.order.findFirst({
                  where: {
                    clientId: previousClientId,
                    breweryId,
                    status: { in: ['CONFIRMADO', 'EM_SEPARACAO', 'EM_ROTA', 'ENTREGUE', 'CONCLUIDO'] },
                  },
                  include: { items: { include: { recipe: true } }, transactions: true },
                  orderBy: { createdAt: 'desc' },
                })
              : null;

            if (clientBillingMode === 'PARTIAL') {
              // Calcular preço do litro do chopp
              let pricePerLiter = 18.0;
              if (activeOrder && activeOrder.items.length > 0) {
                const matchedItem = activeOrder.items.find((it) => it.kegId === keg.id || (it.recipe && it.recipe.name === keg.currentBeerName)) || activeOrder.items[0];
                if (matchedItem) {
                  pricePerLiter = matchedItem.recipe?.salePricePerLiter || (matchedItem.totalPrice / (matchedItem.quantity * (keg.capacity || 50))) || 18.0;
                }
              }

              const creditDiscount = parseFloat((remainingLiters * pricePerLiter).toFixed(2));

              if (activeOrder) {
                const newDiscount = (activeOrder.discount || 0) + creditDiscount;
                const newTotal = Math.max(0, activeOrder.totalAmount - creditDiscount);
                const newRemaining = Math.max(0, newTotal - (activeOrder.paidAmount || 0));

                const noteAppend = `\n[Retorno Parcial ${cleanCode}]: ${remainingLiters}L retornados ao estoque. Cobrado ${consumedLiters}L consumidos. Abatimento de R$ ${creditDiscount.toFixed(2)} aplicado.`;

                await prisma.order.update({
                  where: { id: activeOrder.id },
                  data: {
                    discount: newDiscount,
                    totalAmount: newTotal,
                    remainingAmount: newRemaining,
                    notes: (activeOrder.notes || '') + noteAppend,
                  },
                });

                // Atualizar transação financeira vinculada se estiver pendente
                const pendingTx = activeOrder.transactions?.find((t) => t.status === 'PENDING' && t.type === 'INCOME');
                if (pendingTx) {
                  await prisma.financialTransaction.update({
                    where: { id: pendingTx.id },
                    data: { amount: newRemaining },
                  }).catch(() => {});
                }

                message = `Barril ${cleanCode} retornado ao estoque com ${remainingLiters}L! Pedido #${activeOrder.orderNumber} atualizado: cobrado apenas ${consumedLiters}L consumidos (Abatimento de R$ ${creditDiscount.toFixed(2)}).`;
              } else {
                message = `Barril ${cleanCode} retornado ao estoque com ${remainingLiters}L! Cobrança proporcional registrada para ${consumedLiters}L consumidos.`;
              }
            } else {
              message = `Barril ${cleanCode} retornado ao estoque com ${remainingLiters}L! Cobrança integral do barril mantida (100%).`;
            }
          }

          await prisma.kegMovement.create({
            data: {
              breweryId,
              kegId: keg.id,
              fromClientId: previousClientId,
              action: actionName,
              fromStatus: keg.status,
              toStatus: newStatus,
              volumeLiters: updatedVolumeLiters,
              userId: session.userId,
              userName: session.name,
              driverName: driverName || session.name,
              notes: notes || `Recolha (${condition}) com ${updatedVolumeLiters || 0}L - Modo cobrança: ${clientBillingMode === 'PARTIAL' ? 'Parcial' : 'Integral'}`,
            },
          });

          return NextResponse.json({ success: true, message, item: updated });
        }

        default:
          return NextResponse.json({ error: `Ação "${action}" desconhecida` }, { status: 400 });
      }
    }

    // ----------------------------------------------------
    // PROCESSAR AÇÕES EM EQUIPAMENTO (Chopeira / CO2)
    // ----------------------------------------------------
    if (equipment) {
      const breweryId = equipment.breweryId;

      if (action === 'DELIVER') {
        if (!clientId) return NextResponse.json({ error: 'Selecione o cliente' }, { status: 400 });
        const client = await prisma.client.findUnique({ where: { id: clientId } });

        const updated = await prisma.equipment.update({
          where: { id: equipment.id },
          data: {
            status: 'EM_USO_CLIENTE',
            currentClientId: clientId,
          },
        });

        await prisma.kegMovement.create({
          data: {
            breweryId,
            equipmentId: equipment.id,
            toClientId: clientId,
            action: 'ENTREGA',
            fromStatus: equipment.status,
            toStatus: 'EM_USO_CLIENTE',
            userId: session.userId,
            userName: session.name,
            driverName: driverName || session.name,
            notes: notes || `Equipamento entregue em comodato para ${client?.tradeName || client?.name}`,
          },
        });

        return NextResponse.json({ success: true, message: `Equipamento ${cleanCode} (${equipment.name}) entregue em ${client?.tradeName || client?.name}!`, item: updated });
      }

      if (action === 'RETURN') {
        const previousClientId = equipment.currentClientId;

        const updated = await prisma.equipment.update({
          where: { id: equipment.id },
          data: {
            status: 'DISPONIVEL',
            currentClientId: null,
          },
        });

        await prisma.kegMovement.create({
          data: {
            breweryId,
            equipmentId: equipment.id,
            fromClientId: previousClientId,
            action: 'RECOLHA',
            fromStatus: equipment.status,
            toStatus: 'DISPONIVEL',
            userId: session.userId,
            userName: session.name,
            driverName: driverName || session.name,
            notes: notes || 'Equipamento devolvido ao estoque da cervejaria',
          },
        });

        return NextResponse.json({ success: true, message: `Equipamento ${cleanCode} (${equipment.name}) recolhido com sucesso!`, item: updated });
      }
    }

    return NextResponse.json({ error: 'Ação não suportada para este item' }, { status: 400 });
  } catch (error: any) {
    console.error('Scan API error:', error);
    return NextResponse.json({ error: 'Erro ao processar leitura do código' }, { status: 500 });
  }
}
