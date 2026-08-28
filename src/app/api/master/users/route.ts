import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao proprietário do sistema' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const breweryId = searchParams.get('breweryId');
    const search = searchParams.get('search');

    const where: any = {};
    if (breweryId && breweryId !== 'ALL') {
      where.breweryId = breweryId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { brewery: { name: { contains: search } } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        brewery: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            billingStatus: true,
            active: true,
          },
        },
      },
      orderBy: [{ breweryId: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Master users fetch error:', error);
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao proprietário do sistema' }, { status: 403 });
    }

    const body = await req.json();
    const { breweryId, name, email, password, role, phone } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: 'Já existe um usuário cadastrado com este e-mail' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        breweryId: breweryId || null,
        name,
        email: email.toLowerCase().trim(),
        password: passwordHash,
        role: role || 'ADMIN',
        phone,
        active: true,
      },
      include: { brewery: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Master user create error:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar usuário' }, { status: 500 });
  }
}
