import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const where: any = {};
    if (session.role !== 'SUPER_ADMIN' || session.breweryId) {
      if (session.breweryId) where.breweryId = session.breweryId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        active: true,
        permissions: true,
        mustChangePassword: true,
        createdAt: true,
        brewery: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Apenas administradores podem criar usuários' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, phone, permissions, mustChangePassword, breweryId } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios' }, { status: 400 });
    }

    const targetBreweryId = session.role === 'SUPER_ADMIN' && breweryId ? breweryId : session.breweryId;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Já existe um usuário cadastrado com este e-mail' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const permissionsStr = Array.isArray(permissions) ? JSON.stringify(permissions) : permissions || null;

    const user = await prisma.user.create({
      data: {
        breweryId: targetBreweryId,
        name,
        email: email.toLowerCase(),
        password: passwordHash,
        role: role || 'LOGISTICS',
        phone,
        permissions: permissionsStr,
        mustChangePassword: mustChangePassword !== undefined ? mustChangePassword : true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        permissions: true,
        mustChangePassword: true,
        active: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
}
