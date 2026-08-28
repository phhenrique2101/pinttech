import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao proprietário do sistema' }, { status: 403 });
    }

    const breweryId = params.id;
    const body = await req.json().catch(() => ({}));
    const { resetUsers = false, resetRecipes = true, resetTanks = true } = body;

    const brewery = await prisma.brewery.findUnique({
      where: { id: breweryId },
      include: {
        _count: {
          select: {
            kegs: true,
            equipment: true,
            orders: true,
            users: true,
            batches: true,
            tanks: true,
            recipes: true,
            inventory: true,
            clients: true,
          },
        },
      },
    });

    if (!brewery) {
      return NextResponse.json({ error: 'Cervejaria não encontrada' }, { status: 404 });
    }

    // Executar limpeza em transação segura
    await prisma.$transaction(async (tx) => {
      // 1. Logs de Ação & Financeiro
      await tx.actionLog.deleteMany({ where: { breweryId } });
      await tx.financialTransaction.deleteMany({ where: { breweryId } });

      // 2. Movimentações de Barris & Equipamentos
      await tx.kegMovement.deleteMany({ where: { breweryId } });

      // 3. Itens e Equipamentos de Pedidos
      await tx.orderItem.deleteMany({ where: { order: { breweryId } } });
      await tx.orderEquipment.deleteMany({ where: { order: { breweryId } } });

      // 4. Pedidos
      await tx.order.deleteMany({ where: { breweryId } });

      // 5. Desvincular relações cruzadas de barris, tanques e lotes
      await tx.keg.updateMany({
        where: { breweryId },
        data: { currentBatchId: null, currentClientId: null },
      });

      await tx.equipment.updateMany({
        where: { breweryId },
        data: { currentClientId: null },
      });

      await tx.productionBatch.updateMany({
        where: { breweryId },
        data: { tankId: null },
      });

      await tx.tank.updateMany({
        where: { breweryId },
        data: { currentBatchId: null },
      });

      // 6. Barris e Equipamentos
      await tx.keg.deleteMany({ where: { breweryId } });
      await tx.equipment.deleteMany({ where: { breweryId } });

      // 7. Produção (Lotes)
      await tx.productionBatch.deleteMany({ where: { breweryId } });

      // 8. Tanques (se solicitado)
      if (resetTanks) {
        await tx.tank.deleteMany({ where: { breweryId } });
      }

      // 9. Receitas de Cerveja (se solicitado)
      if (resetRecipes) {
        await tx.beerRecipe.deleteMany({ where: { breweryId } });
      }

      // 10. Estoque de Insumos, Fornecedores e Clientes
      await tx.inventoryItem.deleteMany({ where: { breweryId } });
      await tx.client.deleteMany({ where: { breweryId } });
      await tx.supplier.deleteMany({ where: { breweryId } });

      // 11. Usuários da Cervejaria (opcional)
      if (resetUsers) {
        await tx.user.deleteMany({
          where: {
            breweryId,
            role: { not: 'SUPER_ADMIN' },
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Todos os dados operacionais da cervejaria "${brewery.name}" foram zerados com sucesso!`,
      summary: {
        breweryName: brewery.name,
        clearedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error resetting brewery data:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao zerar dados da cervejaria' },
      { status: 500 }
    );
  }
}
