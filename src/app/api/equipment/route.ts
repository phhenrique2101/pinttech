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

    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        currentClient: true,
        movements: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: { toClient: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar equipamentos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { code, name, type, voltage, serialNumber, notes, prefix, count, startNumber } = body;

    // Cadastro em Lote de Equipamentos (ex: CHOP-EL-01 a CHOP-EL-10)
    if (prefix && count && parseInt(count, 10) > 1) {
      const totalCount = parseInt(count, 10);
      const start = parseInt(startNumber, 10) || 1;
      const createdItems = [];

      for (let i = 0; i < totalCount; i++) {
        const currentNum = start + i;
        const paddedNum = String(currentNum).padStart(2, '0');
        const itemCode = `${prefix.trim().toUpperCase()}${paddedNum}`;

        try {
          const item = await prisma.equipment.create({
            data: {
              breweryId: session.breweryId,
              code: itemCode,
              name: name ? `${name} #${paddedNum}` : `Equipamento ${itemCode}`,
              type: type || 'CHOPEIRA_ELETRICA',
              voltage: voltage || '220V',
              status: 'DISPONIVEL',
              notes,
            },
          });

          await prisma.kegMovement.create({
            data: {
              breweryId: session.breweryId,
              equipmentId: item.id,
              action: 'CADASTRO_LOTE',
              toStatus: 'DISPONIVEL',
              userName: session.name,
              notes: 'Equipamento cadastrado em lote',
            },
          });

          createdItems.push(item);
        } catch (e) {
          // Se já existir, ignora duplicata
        }
      }

      return NextResponse.json({
        success: true,
        count: createdItems.length,
        items: createdItems,
      });
    }

    // Cadastro Individual
    if (!code || !name) {
      return NextResponse.json({ error: 'Código e nome do equipamento são obrigatórios' }, { status: 400 });
    }

    const item = await prisma.equipment.create({
      data: {
        breweryId: session.breweryId,
        code: code.trim().toUpperCase(),
        name,
        type: type || 'CHOPEIRA_ELETRICA',
        voltage,
        serialNumber,
        notes,
        status: 'DISPONIVEL',
      },
    });

    await prisma.kegMovement.create({
      data: {
        breweryId: session.breweryId,
        equipmentId: item.id,
        action: 'CADASTRO',
        toStatus: 'DISPONIVEL',
        userName: session.name,
        notes: 'Equipamento cadastrado',
      },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao cadastrar equipamento' }, { status: 500 });
  }
}
