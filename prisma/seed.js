const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando povoamento do banco de dados PintTech SaaS com dados fictícios...');

  // Limpar tabelas
  await prisma.actionLog.deleteMany();
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

  // 1. Criar Cervejarias Clientes do SaaS (Tenants Fictícios)
  const brewery1 = await prisma.brewery.create({
    data: {
      name: 'Cervejaria Vale Dourado (Fictícia)',
      slug: 'vale-dourado',
      document: '12.345.678/0001-90',
      email: 'contato@valedourado.demo',
      phone: '(11) 98765-4321',
      address: 'Av. das Castanheiras, 1500 - Distrito Industrial',
      city: 'Ribeirão Preto',
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
      name: 'Cervejaria Maltópolis Brasil (Fictícia)',
      slug: 'maltopolis',
      document: '98.765.432/0001-10',
      email: 'contato@maltopolis.demo',
      phone: '(47) 99888-7766',
      address: 'Rua do Lúpulo Imperial, 320 - Bairro das Colinas',
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
      name: 'Cervejaria Serra dos Montes (Fictícia)',
      slug: 'serra-montes',
      document: '45.123.890/0001-44',
      email: 'admin@serramontes.demo',
      phone: '(31) 98877-6655',
      address: 'Rodovia das Araucárias, KM 45',
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
      // USUÁRIOS DA CERVEJARIA 1 (Vale Dourado - Fictícia)
      {
        name: 'Carlos Gestor (Admin)',
        email: 'gestor@valedourado.demo',
        password: passwordHash,
        role: 'ADMIN',
        breweryId: brewery1.id,
        phone: '(11) 98888-0001',
      },
      {
        name: 'Mestre Bruno (Cervejeiro)',
        email: 'mestre@valedourado.demo',
        password: passwordHash,
        role: 'BREWER',
        breweryId: brewery1.id,
        phone: '(11) 98888-0002',
      },
      {
        name: 'Lucas Entregador (Logística & Scanner)',
        email: 'entregas@valedourado.demo',
        password: passwordHash,
        role: 'LOGISTICS',
        breweryId: brewery1.id,
        phone: '(11) 98888-0003',
      },
      {
        name: 'Juliana Vendedora',
        email: 'vendas@valedourado.demo',
        password: passwordHash,
        role: 'SALES',
        breweryId: brewery1.id,
        phone: '(11) 98888-0004',
      },
      {
        name: 'Fernando Financeiro',
        email: 'financeiro@valedourado.demo',
        password: passwordHash,
        role: 'FINANCE',
        breweryId: brewery1.id,
        phone: '(11) 98888-0005',
      },
      // USUÁRIOS DA CERVEJARIA 2 (Maltópolis - Fictícia)
      {
        name: 'Hans Müller (Gestor Maltópolis)',
        email: 'gestor@maltopolis.demo',
        password: passwordHash,
        role: 'ADMIN',
        breweryId: brewery2.id,
        phone: '(47) 99111-2233',
      },
      {
        name: 'Fritz Cervejeiro',
        email: 'mestre@maltopolis.demo',
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
      costPerLiter: 7.5,
      suggestedPricePerLiter: 24.0,
      salePricePerLiter: 24.0,
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
      costPerLiter: 4.8,
      suggestedPricePerLiter: 16.0,
      salePricePerLiter: 16.0,
      description: 'Pilsen refrescante, puro malte e alta drinkability.',
    },
  });

  const stout = await prisma.beerRecipe.create({
    data: {
      breweryId: brewery1.id,
      name: 'Veludo Negro Stout',
      style: 'Oatmeal Stout',
      og: 1.058,
      fg: 1.014,
      abv: 5.8,
      ibu: 35,
      ebc: 65,
      costPerLiter: 6.2,
      suggestedPricePerLiter: 22.0,
      salePricePerLiter: 22.0,
      description: 'Stout aveludada com notas marcantes de café e cacau.',
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

  const batch2 = await prisma.productionBatch.create({
    data: {
      breweryId: brewery1.id,
      recipeId: pilsen.id,
      batchNumber: 'LOTE-2026-002',
      tankId: tank1.id,
      status: 'ENVASADO',
      volumePlannedLiters: 500,
      volumeProducedLiters: 495,
      brewDate: new Date('2026-02-05'),
      measuredOg: 1.046,
      measuredFg: 1.008,
      measuredAbv: 4.8,
    },
  });

  // 7. Clientes Fictícios
  const client1 = await prisma.client.create({
    data: {
      breweryId: brewery1.id,
      name: 'Bar & Restaurante Estrela Azul (Fictício)',
      tradeName: 'Bar Estrela Azul',
      document: '23.456.789/0001-01',
      email: 'contato@estrelaazul.demo',
      phone: '(16) 99777-1111',
      address: 'Rua das Palmeiras',
      number: '450',
      complement: 'Esquina com Av. Brasil',
      neighborhood: 'Jardim Paulista',
      city: 'Ribeirão Preto',
      state: 'SP',
      zipCode: '14090-000',
      creditLimit: 5000.0,
      retainedKegsCount: 2,
      notes: 'Horário preferencial de entrega das 10h às 15h.',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      breweryId: brewery1.id,
      name: 'Espaço Gourmet & Chopp Imperial (Fictício)',
      tradeName: 'Chopp Imperial Taphouse',
      document: '34.567.890/0001-22',
      email: 'eventos@imperialtap.demo',
      phone: '(16) 98888-2222',
      address: 'Av. Presidente Vargas',
      number: '1280',
      complement: 'Loja 04',
      neighborhood: 'Alto da Boa Vista',
      city: 'Ribeirão Preto',
      state: 'SP',
      zipCode: '14025-000',
      creditLimit: 8000.0,
      retainedKegsCount: 1,
      notes: 'Recebimento de chopeiras pela lateral do estacionamento.',
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
      serialNumber: 'MEMO-2024-8841',
      voltage: '220V',
      notes: 'Chopeira revisada e higienizada em jan/2026',
    },
  });

  const equip2 = await prisma.equipment.create({
    data: {
      breweryId: brewery1.id,
      code: 'CIL-CO2-01',
      name: 'Cilindro CO2 6kg Alumínio',
      type: 'CILINDRO_CO2',
      status: 'EM_USO_CLIENTE',
      currentClientId: client1.id,
      serialNumber: 'CO2-AL-6019',
      notes: 'Carga cheia 6kg',
    },
  });

  const equip3 = await prisma.equipment.create({
    data: {
      breweryId: brewery1.id,
      code: 'CHOP-EL-02',
      name: 'Chopeira Elétrica Celli 1 Via 110V',
      type: 'CHOPEIRA_ELETRICA',
      status: 'DISPONIVEL',
      currentClientId: null,
      serialNumber: 'CEL-110-3320',
      voltage: '110V',
      notes: 'Disponível no depósito para comodato',
    },
  });

  // 9. Barris
  const kegsData = [
    { code: 'BAR-50L-001', capacity: 50, status: 'NO_CLIENTE', currentBatchId: batch1.id, currentBeerName: 'Hop Storm IPA', currentClientId: client1.id },
    { code: 'BAR-50L-002', capacity: 50, status: 'NO_CLIENTE', currentBatchId: batch1.id, currentBeerName: 'Hop Storm IPA', currentClientId: client1.id },
    { code: 'BAR-30L-001', capacity: 30, status: 'NO_CLIENTE', currentBatchId: batch2.id, currentBeerName: 'Ouro Puro Pilsen', currentClientId: client2.id },
    { code: 'BAR-50L-003', capacity: 50, status: 'EM_ESTOQUE', currentBatchId: batch1.id, currentBeerName: 'Hop Storm IPA', currentClientId: null },
    { code: 'BAR-50L-004', capacity: 50, status: 'HIGIENIZADO', currentBatchId: null, currentBeerName: null, currentClientId: null },
    { code: 'BAR-30L-002', capacity: 30, status: 'HIGIENIZADO', currentBatchId: null, currentBeerName: null, currentClientId: null },
    { code: 'BAR-20L-001', capacity: 20, status: 'HIGIENIZADO', currentBatchId: null, currentBeerName: null, currentClientId: null },
    { code: 'BAR-50L-005', capacity: 50, status: 'VAZIO_SUJO', currentBatchId: null, currentBeerName: null, currentClientId: null },
  ];

  const createdKegs = [];
  for (const k of kegsData) {
    const keg = await prisma.keg.create({
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
    createdKegs.push(keg);
  }

  // 10. Barris da Cervejaria Maltópolis
  await prisma.keg.createMany({
    data: [
      { breweryId: brewery2.id, code: 'MT-50L-01', capacity: 50, status: 'EM_ESTOQUE', currentBeerName: 'Maltópolis Weizen' },
      { breweryId: brewery2.id, code: 'MT-50L-02', capacity: 50, status: 'HIGIENIZADO' },
      { breweryId: brewery2.id, code: 'MT-30L-01', capacity: 30, status: 'VAZIO_SUJO' },
    ],
  });

  // 11. Pedidos Fictícios com Dados Ricos e Completos
  const order1 = await prisma.order.create({
    data: {
      breweryId: brewery1.id,
      orderNumber: 'PED-2026-0001',
      clientId: client1.id,
      status: 'ENTREGUE',
      deliveryDate: new Date('2026-02-20T14:00:00Z'),
      estimatedReturnDate: new Date('2026-02-28T18:00:00Z'),
      deliveryAddress: 'Rua das Palmeiras, 450 - Jardim Paulista, Ribeirão Preto - SP (Bar Estrela Azul)',
      subtotal: 2400.0,
      deliveryFee: 50.0,
      cautionDeposit: 200.0,
      discount: 100.0,
      totalAmount: 2550.0,
      paidAmount: 2550.0,
      remainingAmount: 0.0,
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
      notes: 'Entrega para o evento de final de semana. Chopeira e barris instalados no balcão principal.',
    },
  });

  // Itens do Pedido 1
  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        recipeId: ipa.id,
        kegId: createdKegs[0].id,
        description: 'Barril 50L - Hop Storm IPA (American IPA)',
        quantity: 2,
        unitPrice: 1200.0,
        totalPrice: 2400.0,
      },
    ],
  });

  // Equipamentos Comodatados no Pedido 1
  await prisma.orderEquipment.createMany({
    data: [
      {
        orderId: order1.id,
        equipmentId: equip1.id,
        returned: false,
        conditionNotes: 'Entregue em perfeito estado com cabos e conexões',
      },
      {
        orderId: order1.id,
        equipmentId: equip2.id,
        returned: false,
        conditionNotes: 'Cilindro CO2 6kg lacrado',
      },
    ],
  });

  // Transação Financeira do Pedido 1
  await prisma.financialTransaction.create({
    data: {
      breweryId: brewery1.id,
      orderId: order1.id,
      type: 'RECEITA',
      category: 'VENDA_CERVEJA',
      description: `Venda PED-2026-0001 - Bar Estrela Azul`,
      amount: 2550.0,
      dueDate: new Date('2026-02-20'),
      paymentDate: new Date('2026-02-20'),
      status: 'PAGO',
      paymentMethod: 'PIX',
      documentNumber: 'PIX-9821839218',
    },
  });

  // Pedido 2: Em Separação / Rota
  const order2 = await prisma.order.create({
    data: {
      breweryId: brewery1.id,
      orderNumber: 'PED-2026-0002',
      clientId: client2.id,
      status: 'EM_SEPARACAO',
      deliveryDate: new Date('2026-03-01T10:00:00Z'),
      estimatedReturnDate: new Date('2026-03-08T18:00:00Z'),
      deliveryAddress: 'Av. Presidente Vargas, 1280, Loja 04 - Alto da Boa Vista, Ribeirão Preto - SP',
      subtotal: 1280.0,
      deliveryFee: 40.0,
      cautionDeposit: 150.0,
      discount: 0.0,
      totalAmount: 1470.0,
      paidAmount: 500.0,
      remainingAmount: 970.0,
      paymentMethod: 'PIX',
      paymentStatus: 'PARCIAL',
      notes: 'Sinal de R$ 500,00 pago na confirmação. Saldo restante a pagar na entrega.',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order2.id,
        recipeId: pilsen.id,
        description: 'Barril 50L - Ouro Puro Pilsen',
        quantity: 1,
        unitPrice: 800.0,
        totalPrice: 800.0,
      },
      {
        orderId: order2.id,
        recipeId: pilsen.id,
        kegId: createdKegs[2].id,
        description: 'Barril 30L - Ouro Puro Pilsen',
        quantity: 1,
        unitPrice: 480.0,
        totalPrice: 480.0,
      },
    ],
  });

  await prisma.financialTransaction.createMany({
    data: [
      {
        breweryId: brewery1.id,
        orderId: order2.id,
        type: 'RECEITA',
        category: 'VENDA_CERVEJA',
        description: `Sinal 50% PED-2026-0002 - Chopp Imperial`,
        amount: 500.0,
        dueDate: new Date('2026-02-27'),
        paymentDate: new Date('2026-02-27'),
        status: 'PAGO',
        paymentMethod: 'PIX',
        documentNumber: 'PIX-SINAL-4412',
      },
      {
        breweryId: brewery1.id,
        orderId: order2.id,
        type: 'RECEITA',
        category: 'VENDA_CERVEJA',
        description: `Saldo Restante PED-2026-0002 - Chopp Imperial`,
        amount: 970.0,
        dueDate: new Date('2026-03-01'),
        status: 'PENDENTE',
        paymentMethod: 'PIX',
      },
    ],
  });

  console.log('🎉 Povoamento completo concluído com dados 100% fictícios!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
