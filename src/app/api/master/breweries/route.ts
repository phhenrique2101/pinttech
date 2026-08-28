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

    const breweries = await prisma.brewery.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            phone: true,
            createdAt: true,
          },
        },
        saasPayments: {
          orderBy: { dueDate: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            kegs: true,
            equipment: true,
            orders: true,
            users: true,
            batches: true,
            clients: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalMRR = breweries
      .filter((b) => b.active)
      .reduce((acc, b) => acc + (b.monthlyPrice || 0), 0);

    const totalKegsPlatform = breweries.reduce((acc, b) => acc + b._count.kegs, 0);
    const totalUsersPlatform = breweries.reduce((acc, b) => acc + b._count.users, 0);

    return NextResponse.json({
      breweries,
      metrics: {
        totalBreweries: breweries.length,
        activeBreweries: breweries.filter((b) => b.active).length,
        totalMRR,
        totalKegsPlatform,
        totalUsersPlatform,
      },
    });
  } catch (error: any) {
    console.error('Error fetching master breweries:', error);
    return NextResponse.json({ error: 'Erro ao buscar cervejarias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao proprietário do sistema' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      slug,
      document,
      email,
      phone,
      city,
      state,
      plan,
      monthlyPrice,
      billingStatus,
      adminName,
      adminEmail,
      adminPassword,
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome da cervejaria e e-mail são obrigatórios' }, { status: 400 });
    }

    const generatedSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const existingBrewery = await prisma.brewery.findUnique({ where: { slug: generatedSlug } });
    if (existingBrewery) {
      return NextResponse.json({ error: 'Já existe uma cervejaria com este identificador (slug)' }, { status: 400 });
    }

    // Criar a cervejaria
    const brewery = await prisma.brewery.create({
      data: {
        name,
        slug: generatedSlug,
        document,
        email,
        phone,
        city: city || 'São Paulo',
        state: state || 'SP',
        plan: plan || 'PRO',
        monthlyPrice: parseFloat(monthlyPrice) || 299.0,
        billingStatus: billingStatus || 'EM_DIA',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        active: true,
      },
    });

    // Se informou dados do primeiro administrador da cervejaria, cria o usuário
    if (adminEmail && adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          breweryId: brewery.id,
          name: adminName || 'Administrador',
          email: adminEmail.toLowerCase().trim(),
          password: passwordHash,
          role: 'ADMIN',
          phone,
          active: true,
        },
      });
    }

    // Registrar primeiro pagamento inicial se estiver EM_DIA
    if (billingStatus === 'EM_DIA') {
      await prisma.saasSubscriptionPayment.create({
        data: {
          breweryId: brewery.id,
          amount: brewery.monthlyPrice,
          referenceMonth: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
          dueDate: new Date(),
          paidDate: new Date(),
          status: 'PAGO',
          paymentMethod: 'PIX',
          notes: 'Mensalidade inicial de ativação do plano',
        },
      });
    }

    return NextResponse.json({ success: true, brewery });
  } catch (error: any) {
    console.error('Error creating master brewery:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar cervejaria cliente' }, { status: 500 });
  }
}
