import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        kegs: true,
        equipment: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.breweryId && client.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar cliente' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const client = await prisma.client.findUnique({ where: { id: params.id } });
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.breweryId && client.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      tradeName,
      document,
      email,
      phone,
      address,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      notes,
      creditLimit,
    } = body;

    if (!name && !tradeName) {
      return NextResponse.json({ error: 'Nome ou Razão Social é obrigatório' }, { status: 400 });
    }

    const updated = await prisma.client.update({
      where: { id: params.id },
      data: {
        name: name || client.name,
        tradeName: tradeName !== undefined ? tradeName : client.tradeName,
        document: document !== undefined ? document : client.document,
        email: email !== undefined ? email : client.email,
        phone: phone !== undefined ? phone : client.phone,
        address: address !== undefined ? address : client.address,
        number: number !== undefined ? number : client.number,
        complement: complement !== undefined ? complement : client.complement,
        neighborhood: neighborhood !== undefined ? neighborhood : client.neighborhood,
        city: city !== undefined ? city : client.city,
        state: state !== undefined ? state : client.state,
        zipCode: zipCode !== undefined ? zipCode : client.zipCode,
        notes: notes !== undefined ? notes : client.notes,
        creditLimit: creditLimit !== undefined ? (creditLimit ? parseFloat(creditLimit) : null) : client.creditLimit,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados do cliente' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        kegs: true,
        equipment: true,
        _count: { select: { orders: true } },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && session.breweryId && client.breweryId !== session.breweryId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    if (client.kegs.length > 0 || client.equipment.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir: este cliente possui barris ou equipamentos em comodato ativos.' },
        { status: 400 }
      );
    }

    await prisma.client.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Cliente removido com sucesso' });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Erro ao excluir cliente. Verifique se existem pedidos vinculados.' }, { status: 500 });
  }
}
