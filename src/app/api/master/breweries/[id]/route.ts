import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao proprietário do sistema' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, city, state, address, document, mapaEstablishment, plan, monthlyPrice, billingStatus, active } = body;

    const existing = await prisma.brewery.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cervejaria não encontrada' }, { status: 404 });
    }

    const updated = await prisma.brewery.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        email: email !== undefined ? email : existing.email,
        phone: phone !== undefined ? phone : existing.phone,
        address: address !== undefined ? address : existing.address,
        document: document !== undefined ? document : existing.document,
        mapaEstablishment: mapaEstablishment !== undefined ? mapaEstablishment : existing.mapaEstablishment,
        city: city !== undefined ? city : existing.city,
        state: state !== undefined ? state : existing.state,
        plan: plan !== undefined ? plan : existing.plan,
        monthlyPrice: monthlyPrice !== undefined ? parseFloat(monthlyPrice) : existing.monthlyPrice,
        billingStatus: billingStatus !== undefined ? billingStatus : existing.billingStatus,
        active: active !== undefined ? active : existing.active,
      },
    });

    return NextResponse.json({ success: true, brewery: updated });
  } catch (error: any) {
    console.error('Error updating master brewery:', error);
    return NextResponse.json({ error: 'Erro ao atualizar cervejaria' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao proprietário do sistema' }, { status: 403 });
    }

    await prisma.brewery.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: 'Cervejaria e todos os seus dados foram excluídos' });
  } catch (error: any) {
    console.error('Error deleting brewery:', error);
    return NextResponse.json({ error: 'Erro ao excluir cervejaria' }, { status: 500 });
  }
}
