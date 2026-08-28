import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao proprietário do sistema' }, { status: 403 });
    }

    const body = await req.json();
    const newPassword = body.newPassword || 'admin123';

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { brewery: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });

    return NextResponse.json({
      success: true,
      message: `Senha do usuário ${user.name} (${user.email}) foi alterada com sucesso!`,
      newPassword,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        breweryName: user.brewery?.name || 'Super Admin Global',
      },
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Erro ao redefinir senha do usuário' }, { status: 500 });
  }
}
