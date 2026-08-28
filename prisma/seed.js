const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando povoamento do banco de dados PintTech SaaS...');

  // Limpar tabelas
  await prisma.saasSubscriptionPayment.deleteMany();
  await prisma.financialTransaction.deleteMany();
  await prisma.orderEquipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.kegMovement.deleteMany();
  await prisma.keg.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.tank.deleteMany();
  await prisma.beerRecipe.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.client.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.brewery.deleteMany();

  const passwordHash = await bcrypt.hash('admin123', 10);

  // 1. Criar Cervejarias Clientes do SaaS (Tenants)
  const brewery1 = await prisma.brewery.create({
    data: {
      name: 'Cervejaria PintTech Artesanal',
      slug: 'pinttech',
      document: '12.345.678/0001-90',
      email: 'contato@pinttech.com.br',
      phone: '(11) 98765-4321',
      address: 'Rua dos Cervejeiros, 100',
      city: 'São Paulo',
      state: 'SP',
      plan: 'ENTERPRISE',
      monthlyPrice: 499.0,
      billingStatus: 'EM_DIA',
      nextBillingDate: new Date('2026-03-25'),
      active: true,
    },
  });

  const brewery2 = await prisma.brewery.create({
    data: {
      name: 'BierHaus Santa Catarina',
      slug: 'bierhaus',
      document: '98.765.432/0001-10',
      email: 'contato@bierhaus.com.br',
      phone: '(47) 99888-7766',
      address: 'Av. das Cervejas, 500',
      city: 'Blumenau',
      state: 'SC',
      plan: 'PRO',
      monthlyPrice: 299.0,
      billingStatus: 'EM_DIA',
      nextBillingDate: new Date('2026-03-10'),
      active: true,
    },
  });

  const brewery3 = await prisma.brewery.create({
    data: {
      name: 'Hop Garden Brewery MG',
      slug: 'hop-garden',
      document: '45.123.890/0001-44',
      email: 'admin@hopgarden.com.br',
      phone: '(31) 98877-6655',
      address: 'Rodovia dos Inconfidentes, KM 12',
      city: 'Nova Lima',
      state: 'MG',
      plan: 'STARTER',
      monthlyPrice: 199.0,
      billingStatus: 'PENDENTE',
      nextBillingDate: new Date('2026-02-28'),
      active: true,
    },
  });

  console.log('✅ Cervejarias clientes criadas:', brewery1.name, brewery2.name, brewery3.name);

  // 2. Histórico de Pagamentos das Mensalidades do SaaS para o Proprietário
  await prisma.saasSubscriptionPayment.createMany({
    data: [
      {
        breweryId: brewery1.id,
        amount: 499.0,
        referenceMonth: '02/2026',
        dueDate: new Date('2026-02-25'),
        paidDate: new Date('2026-02-24'),
        status: 'PAGO',
        paymentMethod: 'PIX',
        notes: 'Mensalidade Plano Enterprise',
      },
      {
        breweryId: brewery2.id,
        amount: 299.0,
        referenceMonth: '02/2026',
        dueDate: new Date('2026-02-10'),
        paidDate: new Date('2026-02-10'),
        status: 'PAGO',
        paymentMethod: 'BOLETO',
        notes: 'Mensalidade Plano Pro',
      },
      {
        breweryId: brewery3.id,
        amount: 199.0,
        referenceMonth: '02/2026',
        dueDate: new Date('2026-02-28'),
        status: 'PENDENTE',
        paymentMethod: 'PIX',
        notes: 'Aguardando liquidação',
      },
    ],
  });

  console.log('✅ Pagamentos SaaS registrados.');

  // 3. Usuários por Perfil
  await prisma.user.createMany({
    data: [
      // PROPRIETÁRIO DO SISTEMA (MASTER / SAAS OWNER)
      {
        name: 'Pedro Cardoso (Proprietário SaaS)',
        email: 'owner@pinttech.com',
        password: passwordHash,
        role: 'SUPER_ADMIN',
        breweryId: null,
        phone: '(11) 99999-0001',
      },
      {
        name: 'Admin Global PintTech',
        email: 'super@pinttech.com',
        password: passwordHash,
        role: 'SUPER_ADMIN',
        breweryId: null,
        phone: '(11) 90000-0000',
      },
      // USUÁRIOS DA CERVEJARIA 1 (PintTech)
      {
        name: 'Carlos Gestor (Admin)',
        email: 'admin@pinttech.com',
        password: passwordHash,
        role: 'ADMIN',
        breweryId: brewery1.id,
        phone: '(11) 98888-0001',
      },
      {
        name: 'Mestre Bruno (Cervejeiro)',
        email: 'mestre@pinttech.com',
        password: passwordHash,
        role: 'BREWER',
        breweryId: brewery1.id,
        phone: '(11) 98888-0002',
      },
      {
        name: 'Lucas Entregador (Logística & Scanner)',
        email: 'entregas@pinttech.com',
        password: passwordHash,
        role: 'LOGISTICS',
        breweryId: brewery1.id,
        phone: '(11) 98888-0003',
      },
      {
        name: 'Juliana Vendedora',
        email: 'vendas@pinttech.com',
        password: passwordHash,
        role: 'SALES',
        breweryId: brewery1.id,
        phone: '(11) 98888-0004',
      },
      {
        name: 'Fernando Financeiro',
        email: 'financeiro@pinttech.com',
        password: passwordHash,
        role: 'FINANCE',
        breweryId: brewery1.id,
        phone: '(11) 98888-0005',
      },
      // USUÁRIOS DA CERVEJARIA 2 (BierHaus)
      {
        name: 'Hans Müller (Gestor BierHaus)',
        email: 'hans@bierhaus.com.br',
        password: passwordHash,
        role: 'ADMIN',
        breweryId: brewery2.id,
        phone: '(47) 99111-2233',
      },
      {
        name: 'Fritz Cervejeiro',
        email: 'fritz@bierhaus.com.br',
        password: passwordHash,
        role: 'BREWER',
        breweryId: brewery2.id,
        phone: '(47) 99111-4455',
      },
    ],
  });

  console.log('✅ Usuários configurados com sucesso.');

  // 4. Receitas
  const ipa = await prisma.beerRecipe.create({
    data: {
      breweryId: brewery1.id,
      name: 'Hop Storm IPA',
      style: 'American IPA',
      og: 1.062,
      fg: 1.012,
      abv: 6.5,
      ibu: 58,
      ebc: 14,
      suggestedPricePerLiter: 24.0,
      description: 'American IPA aromática com lúpulos Citra, Mosaic e Simcoe.',
    },
  });

  const pilsen = await prisma.beerRecipe.create({
    data: {
      breweryId: brewery1.id,
      name: 'Ouro Puro Pilsen',
      style: 'German Pilsner',
      og: 1.046,
      fg: 1.008,
      abv: 4.8,
      ibu: 22,
      ebc: 6,
      suggestedPricePerLiter: 16.0,
      description: 'Pilsen refrescante, puro malte.',
    },
  });

  // 5. Tanques
  const tank1 = await prisma.tank.create({
    data: {
      breweryId: brewery1.id,
      name: 'F-01 (500L)',
      capacityLiters: 500,
      type: 'FERMENTADOR_ISOTERMICO',
      status: 'OCUPADO',
    },
  });

  const tank3 = await prisma.tank.create({
    data: {
      breweryId: brewery1.id,
      name: 'BBT-01 (1000L)',
      capacityLiters: 1000,
      type: 'BBT_BRITE_TANK',
      status: 'OCUPADO',
    },
  });

  // 6. Lotes
  const batch1 = await prisma.productionBatch.create({
    data: {
      breweryId: brewery1.id,
      recipeId: ipa.id,
      batchNumber: 'LOTE-2026-001',
      tankId: tank3.id,
      status: 'PRONTO_ENVASE',
      volumePlannedLiters: 500,
      volumeProducedLiters: 480,
      brewDate: new Date('2026-02-01'),
      measuredOg: 1.063,
      measuredFg: 1.012,
      measuredAbv: 6.6,
    },
  });

  // 7. Clientes
  const client1 = await prisma.client.create({
    data: {
      breweryId: brewery1.id,
      name: 'Bar e Choperia do Zé Ltda',
      tradeName: 'Bar do Zé',
      document: '23.456.789/0001-01',
      email: 'contato@bardoze.com.br',
      phone: '(11) 97777-1111',
      city: 'São Paulo',
      state: 'SP',
      retainedKegsCount: 2,
    },
  });

  // 8. Equipamentos
  const equip1 = await prisma.equipment.create({
    data: {
      breweryId: brewery1.id,
      code: 'CHOP-EL-01',
      name: 'Chopeira Elétrica Memo 2 Vias 220V',
      type: 'CHOPEIRA_ELETRICA',
      status: 'EM_USO_CLIENTE',
      currentClientId: client1.id,
      voltage: '220V',
    },
  });

  // 9. Barris
  const kegsData = [
    { code: 'BAR-50L-001', capacity: 50, status: 'NO_CLIENTE', currentBatchId: batch1.id, currentBeerName: 'Hop Storm IPA', currentClientId: client1.id },
    { code: 'BAR-50L-002', capacity: 50, status: 'NO_CLIENTE', currentBatchId: batch1.id, currentBeerName: 'Hop Storm IPA', currentClientId: client1.id },
    { code: 'BAR-50L-003', capacity: 50, status: 'EM_ESTOQUE', currentBatchId: batch1.id, currentBeerName: 'Hop Storm IPA', currentClientId: null },
    { code: 'BAR-50L-004', capacity: 50, status: 'HIGIENIZADO', currentBatchId: null, currentBeerName: null, currentClientId: null },
    { code: 'BAR-50L-005', capacity: 50, status: 'VAZIO_SUJO', currentBatchId: null, currentBeerName: null, currentClientId: null },
  ];

  for (const k of kegsData) {
    await prisma.keg.create({
      data: {
        breweryId: brewery1.id,
        code: k.code,
        capacity: k.capacity,
        kegType: 'INOX_EURO',
        status: k.status,
        currentBatchId: k.currentBatchId,
        currentBeerName: k.currentBeerName,
        currentClientId: k.currentClientId,
      },
    });
  }

  // 10. Barris da BierHaus
  await prisma.keg.createMany({
    data: [
      { breweryId: brewery2.id, code: 'BH-50L-01', capacity: 50, status: 'EM_ESTOQUE', currentBeerName: 'BierHaus Weizen' },
      { breweryId: brewery2.id, code: 'BH-50L-02', capacity: 50, status: 'HIGIENIZADO' },
      { breweryId: brewery2.id, code: 'BH-30L-01', capacity: 30, status: 'VAZIO_SUJO' },
    ],
  });

  console.log('🎉 Povoamento completo concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
