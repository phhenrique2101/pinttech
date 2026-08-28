import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const capacity = searchParams.get('capacity');

    const where: any = {};

    if (session.role !== 'SUPER_ADMIN' || session.breweryId) {
      if (session.breweryId) {
        where.breweryId = session.breweryId;
      }
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (capacity && capacity !== 'ALL') {
      where.capacity = parseInt(capacity, 10);
    }

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { currentBeerName: { contains: search } },
        { currentClient: { name: { contains: search } } },
      ];
    }

    const kegs = await prisma.keg.findMany({
      where,
      include: {
        currentBatch: {
          include: { recipe: true },
        },
        currentClient: true,
        _count: {
          select: { movements: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(kegs);
  } catch (error: any) {
    console.error('Error fetching kegs:', error);
    return NextResponse.json({ error: 'Erro ao buscar barris' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { code, capacity, kegType, notes, count, prefix } = body;

    // Batch creation of multiple kegs (e.g. 3001 -> 3001, 3002, 3003... or BAR-3001 -> BAR-3001, BAR-3002...)
    if (count && count >= 1 && (prefix || body.startCode)) {
      const inputStr = (body.startCode || prefix || '').trim();
      const numCapacity = parseInt(capacity, 10) || 50;
      const numCount = parseInt(count, 10) || 1;

      // Intelligent parser for prefix and start number
      let basePrefix = '';
      let startNumber = 1;
      let padLength = 3;

      const match = inputStr.match(/^(.*?)(\d+)$/);
      if (match) {
        basePrefix = match[1];
        startNumber = parseInt(match[2], 10);
        padLength = match[2].length;
      } else {
        basePrefix = inputStr ? (inputStr.endsWith('-') ? inputStr : `${inputStr}-`) : 'BAR-';
        startNumber = 1;
        padLength = 3;
      }

      const createdKegs = [];
      for (let i = 0; i < numCount; i++) {
        const currentNum = startNumber + i;
        const paddedNum = String(currentNum).padStart(padLength, '0');
        const generatedCode = `${basePrefix}${paddedNum}`.toUpperCase();

        try {
          const keg = await prisma.keg.create({
            data: {
              breweryId: session.breweryId,
              code: generatedCode,
              capacity: numCapacity,
              kegType: kegType || 'INOX_EURO',
              status: 'VAZIO_SUJO',
              notes,
            },
          });

          await prisma.kegMovement.create({
            data: {
              breweryId: session.breweryId,
              kegId: keg.id,
              action: 'CADASTRO',
              toStatus: 'VAZIO_SUJO',
              userName: session.name,
              notes: 'Barril cadastrado no sistema em lote',
            },
          });

          createdKegs.push(keg);
        } catch (err) {
          // If code already exists, skip duplicate
        }
      }

      if (createdKegs.length > 0) {
        await prisma.actionLog.create({
          data: {
            breweryId: session.breweryId,
            userId: session.userId,
            userName: session.name,
            actionType: 'KEG_BATCH_CREATE',
            description: `Cadastro em lote de ${createdKegs.length} barris (${createdKegs[0].code} até ${createdKegs[createdKegs.length - 1].code})`,
            entityType: 'Keg',
            entityId: createdKegs[0].id,
            previousData: null,
            newData: JSON.stringify({ kegIds: createdKegs.map((k) => k.id) }),
          },
        });
      }

      return NextResponse.json({ success: true, count: createdKegs.length, kegs: createdKegs });
    }

    // Single keg creation
    if (!code) {
      return NextResponse.json({ error: 'Código do barril é obrigatório' }, { status: 400 });
    }

    const existing = await prisma.keg.findUnique({
      where: {
        breweryId_code: {
          breweryId: session.breweryId,
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Já existe um barril com este código nesta cervejaria' }, { status: 400 });
    }

    const keg = await prisma.keg.create({
      data: {
        breweryId: session.breweryId,
        code: code.trim().toUpperCase(),
        capacity: parseInt(capacity, 10) || 50,
        kegType: kegType || 'INOX_EURO',
        status: 'VAZIO_SUJO',
        notes,
      },
    });

    await prisma.kegMovement.create({
      data: {
        breweryId: session.breweryId,
        kegId: keg.id,
        action: 'CADASTRO',
        toStatus: 'VAZIO_SUJO',
        userName: session.name,
        notes: 'Barril cadastrado no sistema',
      },
    });

    await prisma.actionLog.create({
      data: {
        breweryId: session.breweryId,
        userId: session.userId,
        userName: session.name,
        actionType: 'KEG_CREATE',
        description: `Cadastro do barril ${keg.code} (${keg.capacity}L)`,
        entityType: 'Keg',
        entityId: keg.id,
        previousData: null,
        newData: JSON.stringify({ id: keg.id, code: keg.code }),
      },
    });

    return NextResponse.json(keg);
  } catch (error: any) {
    console.error('Error creating keg:', error);
    return NextResponse.json({ error: 'Erro ao criar barril' }, { status: 500 });
  }
}
