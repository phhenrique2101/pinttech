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

    // Batch creation of multiple kegs (e.g. BAR-50L-001 to BAR-50L-020)
    if (count && count > 1 && prefix) {
      const createdKegs = [];
      const numCapacity = parseInt(capacity, 10) || 50;

      for (let i = 1; i <= count; i++) {
        const paddedNum = String(i).padStart(3, '0');
        const generatedCode = `${prefix}-${paddedNum}`;

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
          // If code already exists, skip or continue
        }
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

    return NextResponse.json(keg);
  } catch (error: any) {
    console.error('Error creating keg:', error);
    return NextResponse.json({ error: 'Erro ao criar barril' }, { status: 500 });
  }
}
