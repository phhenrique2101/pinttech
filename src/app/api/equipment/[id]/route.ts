import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const item = await prisma.equipment.findUnique({
      where: { id: params.id },
      include: {
        currentClient: true,
        movements: {
          orderBy: { createdAt: 'desc' },
          include: { toClient: true },
        },
        orderEquipments: {
          include: {
            order: {
              include: { client: true },
            },
          },
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Equipamento não encontrado' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && item.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao obter dados do equipamento' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();
    const { name, type, voltage, serialNumber, status, notes, currentClientId } = body;

    const existing = await prisma.equipment.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Equipamento não encontrado' }, { status: 404 });

    if (session.role !== 'SUPER_ADMIN' && existing.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const updated = await prisma.equipment.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        type: type !== undefined ? type : existing.type,
        voltage: voltage !== undefined ? voltage : existing.voltage,
        serialNumber: serialNumber !== undefined ? serialNumber : existing.serialNumber,
        status: status !== undefined ? status : existing.status,
        notes: notes !== undefined ? notes : existing.notes,
        currentClientId: currentClientId !== undefined ? currentClientId : existing.currentClientId,
      },
    });

    // Register movement if status changed
    if (status && status !== existing.status) {
      await prisma.kegMovement.create({
        data: {
          breweryId: existing.breweryId,
          equipmentId: existing.id,
          action: status === 'INATIVO' ? 'INATIVACAO' : status === 'DISPONIVEL' ? 'REATIVACAO' : 'AJUSTE_STATUS',
          fromStatus: existing.status,
          toStatus: status,
          userName: session.name,
          notes: notes || `Status alterado para ${status}`,
        },
      });

      await prisma.actionLog.create({
        data: {
          breweryId: existing.breweryId,
          userId: session.userId,
          userName: session.name,
          actionType: 'EQUIPMENT_STATUS',
          description: `Alteração do equipamento ${existing.code} (${existing.name}) de ${existing.status} para ${status}`,
          entityType: 'Equipment',
          entityId: existing.id,
          previousData: JSON.stringify({ status: existing.status }),
          newData: JSON.stringify({ status }),
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating equipment:', error);
    return NextResponse.json({ error: 'Erro ao atualizar equipamento' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const existing = await prisma.equipment.findUnique({
      where: { id: params.id },
      include: {
        orderEquipments: {
          where: { returned: false },
          include: { order: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Equipamento não encontrado' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && existing.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Check if currently with a client
    if (existing.status === 'EM_USO_CLIENTE' || existing.orderEquipments.some((oe) => oe.order.status !== 'CANCELADO')) {
      return NextResponse.json(
        {
          error:
            'Não é possível excluir este equipamento pois ele está em comodato com um cliente ou vinculado a um pedido ativo. Dê baixa no comodato ou inative o equipamento.',
        },
        { status: 400 }
      );
    }

    // Delete movements and order equipments history if needed or cascade delete
    await prisma.kegMovement.deleteMany({ where: { equipmentId: params.id } });
    await prisma.orderEquipment.deleteMany({ where: { equipmentId: params.id } });
    await prisma.equipment.delete({ where: { id: params.id } });

    await prisma.actionLog.create({
      data: {
        breweryId: existing.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'EQUIPMENT_DELETE',
        description: `Exclusão do equipamento ${existing.code} (${existing.name})`,
        entityType: 'Equipment',
        entityId: existing.id,
        previousData: JSON.stringify(existing),
        newData: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting equipment:', error);
    return NextResponse.json({ error: 'Erro ao excluir equipamento' }, { status: 500 });
  }
}
