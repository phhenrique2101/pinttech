import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Apenas administradores podem editar usuários.' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, email, password, role, phone, permissions, mustChangePassword, active } = body;

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Tenant check if not super admin
    if (session.role !== 'SUPER_ADMIN' && existing.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado para este usuário.' }, { status: 403 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) {
      const emailTaken = await prisma.user.findFirst({
        where: { email: email.toLowerCase(), id: { not: id } },
      });
      if (emailTaken) {
        return NextResponse.json({ error: 'Este e-mail já está sendo utilizado por outro usuário.' }, { status: 400 });
      }
      updateData.email = email.toLowerCase();
    }
    if (password && password.trim().length >= 6) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }
    if (role) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (active !== undefined) updateData.active = Boolean(active);
    if (mustChangePassword !== undefined) updateData.mustChangePassword = Boolean(mustChangePassword);
    if (permissions !== undefined) {
      updateData.permissions = Array.isArray(permissions) ? JSON.stringify(permissions) : permissions;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
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
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar usuário.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Apenas administradores podem excluir usuários.' }, { status: 403 });
    }

    const { id } = params;

    if (session.userId === id) {
      return NextResponse.json({ error: 'Você não pode excluir o seu próprio usuário logado.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && existing.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado para este usuário.' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir usuário.' },
      { status: 500 }
    );
  }
}
