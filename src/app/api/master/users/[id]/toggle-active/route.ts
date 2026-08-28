import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao proprietário do sistema' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { active: !user.active },
    });

    return NextResponse.json({
      success: true,
      active: updated.active,
      message: `Usuário ${updated.name} foi ${updated.active ? 'ativado' : 'bloqueado'} com sucesso.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao alterar status do usuário' }, { status: 500 });
  }
}
