import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, signJwtToken, getAuthCookieOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { brewery: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // If user is not in forced change mode, verify current password
    if (!user.mustChangePassword && currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        mustChangePassword: false,
      },
    });

    // Re-sign token with updated mustChangePassword = false
    const tokenPayload = {
      userId: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role as any,
      breweryId: updatedUser.breweryId,
      breweryName: user.brewery?.name,
      brewerySlug: user.brewery?.slug,
      mustChangePassword: false,
    };

    const token = signJwtToken(tokenPayload);

    const res = NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso!',
      user: tokenPayload,
    });

    const cookieOptions = getAuthCookieOptions(req);
    res.cookies.set('pinttech_token', token, cookieOptions);

    return res;
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao alterar senha.' },
      { status: 500 }
    );
  }
}
