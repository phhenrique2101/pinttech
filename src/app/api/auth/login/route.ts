import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJwtToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { brewery: true },
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: 'Credenciais inválidas ou usuário inativo' }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const tokenPayload = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role as any,
      breweryId: user.breweryId,
      breweryName: user.brewery?.name,
      brewerySlug: user.brewery?.slug,
    };

    const token = signJwtToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      user: tokenPayload,
    });

    // Set HTTP-only cookie
    response.cookies.set('pinttech_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro interno ao realizar login' }, { status: 500 });
  }
}
