import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN' && session.role !== 'BREWER')) {
      return NextResponse.json({ error: 'Não autorizado a excluir tanques' }, { status: 403 });
    }

    const tank = await prisma.tank.findUnique({
      where: { id: params.id },
      include: { batches: true },
    });

    if (!tank) {
      return NextResponse.json({ error: 'Tanque não encontrado' }, { status: 404 });
    }

    // Desvincular lotes vinculados ao tanque antes de deletar
    await prisma.productionBatch.updateMany({
      where: { tankId: tank.id },
      data: { tankId: null },
    });

    await prisma.tank.delete({
      where: { id: tank.id },
    });

    return NextResponse.json({ success: true, message: `Tanque ${tank.name} excluído com sucesso.` });
  } catch (error: any) {
    console.error('Error deleting tank:', error);
    return NextResponse.json({ error: 'Erro ao excluir tanque' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();
    const { name, capacityLiters, type, status, notes } = body;

    const tank = await prisma.tank.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : undefined,
        capacityLiters: capacityLiters !== undefined ? parseFloat(capacityLiters) : undefined,
        type: type !== undefined ? type : undefined,
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json(tank);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar tanque' }, { status: 500 });
  }
}
