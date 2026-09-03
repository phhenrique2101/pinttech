const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🍺 Iniciando verificação de segurança do banco de dados...');

  // Trava de segurança contra perda de dados acidental em produção/homologação
  const existingBreweries = await prisma.brewery.count();
  if (existingBreweries > 0 && process.env.ALLOW_DB_RESET !== 'true') {
    console.warn('\n⚠️ [SEGURANÇA ATIVADA] O banco de dados já possui registros cadastrados!');
    console.warn('⚠️ Operação cancelada para evitar qualquer perda de dados.');
    console.warn('⚠️ Se você realmente desejar resetar e repovoar do zero, defina: ALLOW_DB_RESET=true node prisma/seed.js\n');
    return;
  }

  console.log('🍺 Povoando a Cervejaria Teste de Demonstração PintTech...');

  // 0. Limpar tabelas existentes para garantir integridade e consistência
  await prisma.actionLog.deleteMany();
  await prisma.saasSubscriptionPayment.deleteMany();
  await prisma.financialTransaction.deleteMany();
  await prisma.orderEquipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.kegMovement.deleteMany();
  await prisma.keg.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.batchIngredient.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryLot.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.tank.deleteMany();
  await prisma.beerRecipe.deleteMany();
  await prisma.client.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.brewery.deleteMany();

  const passwordHash = await bcrypt.hash('admin123', 10);

  // ============================================================================
  // 1. CERVEJARIA PRINCIPAL DE DEMONSTRAÇÃO (TENANT DEMO)
  // ============================================================================
  const demoBrewery = await prisma.brewery.create({
    data: {
      name: 'Cervejaria Artesanal PintTech Demo',
      slug: 'cervejaria-demo',
      document: '12.345.678/0001-90',
      email: 'demo@pinttech.com.br',
      phone: '(16) 99876-5432',
      address: 'Av. dos Mestres Cervejeiros, 1500 - Distrito Industrial',
      city: 'Ribeirão Preto',
      state: 'SP',
      plan: 'ENTERPRISE',
      monthlyPrice: 499.0,
      billingStatus: 'EM_DIA',
      nextBillingDate: new Date('2026-04-10'),
      active: true,
    },
  });

  // Segunda cervejaria auxiliar para testar o multi-tenant do SaaS
  const secondBrewery = await prisma.brewery.create({
    data: {
      name: 'Cervejaria Maltópolis Brasil',
      slug: 'maltopolis',
      document: '98.765.432/0001-10',
      email: 'contato@maltopolis.demo',
      phone: '(47) 99888-7766',
      address: 'Rua do Lúpulo Imperial, 320',
      city: 'Blumenau',
      state: 'SC',
      plan: 'PRO',
      monthlyPrice: 299.0,
      billingStatus: 'EM_DIA',
      nextBillingDate: new Date('2026-03-25'),
      active: true,
    },
  });

  console.log('✅ Cervejarias criadas:', demoBrewery.name, '|', secondBrewery.name);

  // ============================================================================
  // 2. HISTÓRICO DE MENSALIDADES SAAS (Para o Proprietário Master)
  // ============================================================================
  await prisma.saasSubscriptionPayment.createMany({
    data: [
      {
        breweryId: demoBrewery.id,
        amount: 499.0,
        referenceMonth: '02/2026',
        dueDate: new Date('2026-02-10'),
        paidDate: new Date('2026-02-09'),
        status: 'PAGO',
        paymentMethod: 'PIX',
        notes: 'Mensalidade Plano Enterprise PintTech Demo',
      },
      {
        breweryId: demoBrewery.id,
        amount: 499.0,
        referenceMonth: '03/2026',
        dueDate: new Date('2026-03-10'),
        paidDate: new Date('2026-03-09'),
        status: 'PAGO',
        paymentMethod: 'PIX',
        notes: 'Mensalidade Plano Enterprise PintTech Demo',
      },
      {
        breweryId: secondBrewery.id,
        amount: 299.0,
        referenceMonth: '03/2026',
        dueDate: new Date('2026-03-25'),
        paidDate: new Date('2026-03-24'),
        status: 'PAGO',
        paymentMethod: 'BOLETO',
        notes: 'Mensalidade Plano Pro Maltópolis',
      },
    ],
  });

  // ============================================================================
  // 3. USUÁRIOS POR PERFIL (DEMONSTRAÇÃO PRONTA PARA CLIENTES)
  // ============================================================================
  const userAdmin = await prisma.user.create({
    data: {
      name: 'Gestor PintTech (Admin Demo)',
      email: 'admin@demo.com',
      password: passwordHash,
      role: 'ADMIN',
      breweryId: demoBrewery.id,
      phone: '(16) 99888-0001',
      mustChangePassword: false,
      active: true,
    },
  });

  const userBrewer = await prisma.user.create({
    data: {
      name: 'Mestre Bruno (Cervejeiro)',
      email: 'mestre@demo.com',
      password: passwordHash,
      role: 'BREWER',
      breweryId: demoBrewery.id,
      phone: '(16) 99888-0002',
      mustChangePassword: false,
      active: true,
    },
  });

  const userSales = await prisma.user.create({
    data: {
      name: 'Juliana Vendas (Comercial)',
      email: 'vendas@demo.com',
      password: passwordHash,
      role: 'SALES',
      breweryId: demoBrewery.id,
      phone: '(16) 99888-0003',
      mustChangePassword: false,
      active: true,
    },
  });

  const userLogistics = await prisma.user.create({
    data: {
      name: 'Lucas Entregador (Logística & Scanner)',
      email: 'logistica@demo.com',
      password: passwordHash,
      role: 'LOGISTICS',
      breweryId: demoBrewery.id,
      phone: '(16) 99888-0004',
      mustChangePassword: false,
      active: true,
    },
  });

  const userFinance = await prisma.user.create({
    data: {
      name: 'Fernando Financeiro',
      email: 'financeiro@demo.com',
      password: passwordHash,
      role: 'FINANCE',
      breweryId: demoBrewery.id,
      phone: '(16) 99888-0005',
      mustChangePassword: false,
      active: true,
    },
  });

  // Usuários Master / Super Admin
  await prisma.user.createMany({
    data: [
      {
        name: 'Pedro Cardoso (Proprietário SaaS)',
        email: 'owner@pinttech.com',
        password: passwordHash,
        role: 'SUPER_ADMIN',
        breweryId: null,
        phone: '(11) 99999-0001',
        mustChangePassword: false,
      },
      {
        name: 'Admin Global PintTech',
        email: 'super@pinttech.com',
        password: passwordHash,
        role: 'SUPER_ADMIN',
        breweryId: null,
        phone: '(11) 90000-0000',
        mustChangePassword: false,
      },
      {
        name: 'Hans Müller (Gestor Maltópolis)',
        email: 'gestor@maltopolis.demo',
        password: passwordHash,
        role: 'ADMIN',
        breweryId: secondBrewery.id,
        phone: '(47) 99111-2233',
        mustChangePassword: false,
      },
    ],
  });

  console.log('✅ Usuários de demonstração criados (Senha padrão: admin123):');
  console.log('   - admin@demo.com (Gestor Geral)');
  console.log('   - mestre@demo.com (Produção e Tanques)');
  console.log('   - vendas@demo.com (Comercial e Pedidos)');
  console.log('   - logistica@demo.com (Scanner & Entregas)');
  console.log('   - financeiro@demo.com (Financeiro)');

  // ============================================================================
  // 4. FORNECEDORES DE INSUMOS
  // ============================================================================
  const supplierAgraria = await prisma.supplier.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Agrária Malte & Cevada Brasil',
      tradeName: 'Agrária Malte',
      document: '77.888.999/0001-55',
      email: 'pedidos@agraria.com.br',
      phone: '(42) 3625-8000',
      category: 'MALTE',
      address: 'Entre Rios, Guarapuava - PR',
    },
  });

  const supplierBarth = await prisma.supplier.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'BarthHaas Hopsteiner Brasil Lúpulos',
      tradeName: 'BarthHaas Brasil',
      document: '44.555.666/0001-33',
      email: 'comercial@barthhaas.com.br',
      phone: '(11) 3456-7890',
      category: 'LUPULO',
      address: 'Av. Paulista, 1000 - São Paulo - SP',
    },
  });

  const supplierFermentis = await prisma.supplier.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'LNF Latino Americana / Fermentis',
      tradeName: 'Fermentis / LNF',
      document: '33.222.111/0001-88',
      email: 'vendas@lnf.com.br',
      phone: '(54) 3455-1234',
      category: 'LEVEDURA',
      address: 'Bento Gonçalves - RS',
    },
  });

  const supplierWhiteMartins = await prisma.supplier.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'White Martins Gases Industriais Ltda',
      tradeName: 'White Martins CO2',
      document: '11.222.333/0001-99',
      email: 'atendimento@whitemartins.com.br',
      phone: '(16) 3600-9900',
      category: 'GAS_CO2',
      address: 'Distrito Industrial, Ribeirão Preto - SP',
    },
  });

  console.log('✅ Fornecedores cadastrados com sucesso.');

  // ============================================================================
  // 5. ESTOQUE DE INSUMOS & LOTES SEGREGADOS (INVENTORY ITEMS & LOTS)
  // ============================================================================
  // Malte Pilsen
  const itemMaltePilsen = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Malte Pilsen Agrária',
      category: 'MALTE',
      unit: 'KG',
      currentQuantity: 2850.0,
      minimumQuantity: 500.0,
      costPerUnit: 4.8,
      supplierId: supplierAgraria.id,
      supplierLot: 'AGR-PIL-2026-08',
      expirationDate: new Date('2027-02-15'),
      harvestYear: '2025/2026',
      brand: 'Agrária Malte',
      location: 'Galpão A - Palete 01 e 02',
      notes: 'Malte base de altíssima conversão enzimática.',
    },
  });

  const lotPilsen1 = await prisma.inventoryLot.create({
    data: {
      breweryId: demoBrewery.id,
      inventoryItemId: itemMaltePilsen.id,
      lotNumber: 'AGR-PIL-2026-08',
      initialQuantity: 3000.0,
      currentQuantity: 2850.0,
      costPerUnit: 4.8,
      supplierId: supplierAgraria.id,
      supplierName: 'Agrária Malte',
      expirationDate: new Date('2027-02-15'),
      harvestYear: '2025/2026',
      brand: 'Agrária Malte',
      location: 'Galpão A - Palete 01',
      status: 'ATIVO',
    },
  });

  // Malte Munich
  const itemMalteMunich = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Malte Munich Weyermann Type 1',
      category: 'MALTE',
      unit: 'KG',
      currentQuantity: 450.0,
      minimumQuantity: 100.0,
      costPerUnit: 9.5,
      supplierId: supplierAgraria.id,
      supplierLot: 'WEY-MUN-2026-01',
      expirationDate: new Date('2027-01-20'),
      harvestYear: '2025',
      brand: 'Weyermann',
      location: 'Galpão A - Palete 04',
    },
  });

  const lotMunich1 = await prisma.inventoryLot.create({
    data: {
      breweryId: demoBrewery.id,
      inventoryItemId: itemMalteMunich.id,
      lotNumber: 'WEY-MUN-2026-01',
      initialQuantity: 500.0,
      currentQuantity: 450.0,
      costPerUnit: 9.5,
      supplierId: supplierAgraria.id,
      supplierName: 'Agrária Malte',
      expirationDate: new Date('2027-01-20'),
      harvestYear: '2025',
      brand: 'Weyermann',
      location: 'Galpão A - Palete 04',
      status: 'ATIVO',
    },
  });

  // Malte de Trigo
  const itemMalteTrigo = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Malte de Trigo Claro Agrária',
      category: 'MALTE',
      unit: 'KG',
      currentQuantity: 600.0,
      minimumQuantity: 150.0,
      costPerUnit: 5.6,
      supplierId: supplierAgraria.id,
      supplierLot: 'AGR-TRI-2026-03',
      expirationDate: new Date('2027-03-01'),
      harvestYear: '2025/2026',
      brand: 'Agrária Malte',
      location: 'Galpão A - Palete 03',
    },
  });

  // Malte Caramelo
  const itemMalteCara = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Malte Caraamber Weyermann',
      category: 'MALTE',
      unit: 'KG',
      currentQuantity: 180.0,
      minimumQuantity: 50.0,
      costPerUnit: 11.2,
      supplierId: supplierAgraria.id,
      supplierLot: 'WEY-CARA-992',
      expirationDate: new Date('2026-12-31'),
      harvestYear: '2025',
      brand: 'Weyermann',
      location: 'Galpão A - Prateleira Especialidades',
    },
  });

  // Lúpulo Citra T90
  const itemLupuloCitra = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Lúpulo Citra T90 Pellet (EUA)',
      category: 'LUPULO',
      unit: 'KG',
      currentQuantity: 38.5,
      minimumQuantity: 10.0,
      costPerUnit: 240.0,
      supplierId: supplierBarth.id,
      supplierLot: 'BH-CIT-2025-77',
      expirationDate: new Date('2027-10-30'),
      harvestYear: '2025',
      brand: 'BarthHaas',
      location: 'Câmara Fria Insumos (-4°C)',
      notes: 'Pacotes laminados a vácuo com nitrogênio.',
    },
  });

  const lotCitra1 = await prisma.inventoryLot.create({
    data: {
      breweryId: demoBrewery.id,
      inventoryItemId: itemLupuloCitra.id,
      lotNumber: 'BH-CIT-2025-77',
      initialQuantity: 50.0,
      currentQuantity: 38.5,
      costPerUnit: 240.0,
      supplierId: supplierBarth.id,
      supplierName: 'BarthHaas Brasil',
      expirationDate: new Date('2027-10-30'),
      harvestYear: '2025',
      brand: 'BarthHaas',
      location: 'Câmara Fria Insumos (-4°C)',
      status: 'ATIVO',
    },
  });

  // Lúpulo Mosaic T90
  const itemLupuloMosaic = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Lúpulo Mosaic T90 Pellet',
      category: 'LUPULO',
      unit: 'KG',
      currentQuantity: 24.0,
      minimumQuantity: 5.0,
      costPerUnit: 235.0,
      supplierId: supplierBarth.id,
      supplierLot: 'BH-MOS-2025-12',
      expirationDate: new Date('2027-09-15'),
      harvestYear: '2025',
      brand: 'BarthHaas',
      location: 'Câmara Fria Insumos (-4°C)',
    },
  });

  // Lúpulo Magnum
  const itemLupuloMagnum = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Lúpulo Magnum T90 (Amargor Limpo)',
      category: 'LUPULO',
      unit: 'KG',
      currentQuantity: 42.0,
      minimumQuantity: 10.0,
      costPerUnit: 165.0,
      supplierId: supplierBarth.id,
      supplierLot: 'BH-MAG-2025-04',
      expirationDate: new Date('2027-11-20'),
      harvestYear: '2025',
      brand: 'BarthHaas',
      location: 'Câmara Fria Insumos (-4°C)',
    },
  });

  // Lúpulo Saaz
  const itemLupuloSaaz = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Lúpulo Saaz T90 Checo',
      category: 'LUPULO',
      unit: 'KG',
      currentQuantity: 30.0,
      minimumQuantity: 8.0,
      costPerUnit: 195.0,
      supplierId: supplierBarth.id,
      supplierLot: 'BH-SAAZ-2025-01',
      expirationDate: new Date('2027-08-10'),
      harvestYear: '2025',
      brand: 'BarthHaas',
      location: 'Câmara Fria Insumos (-4°C)',
    },
  });

  // Levedura Fermentis SafAle US-05
  const itemLevUS05 = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Levedura Fermentis SafAle US-05 (500g)',
      category: 'LEVEDURA',
      unit: 'PACOTE',
      currentQuantity: 28.0,
      minimumQuantity: 5.0,
      costPerUnit: 420.0,
      supplierId: supplierFermentis.id,
      supplierLot: 'FERM-US05-881',
      expirationDate: new Date('2028-01-30'),
      brand: 'Fermentis',
      location: 'Geladeira Laboratório (4°C)',
    },
  });

  // Levedura Fermentis Saflager W-34/70
  const itemLevW3470 = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Levedura Fermentis Saflager W-34/70 (500g)',
      category: 'LEVEDURA',
      unit: 'PACOTE',
      currentQuantity: 18.0,
      minimumQuantity: 5.0,
      costPerUnit: 530.0,
      supplierId: supplierFermentis.id,
      supplierLot: 'FERM-W3470-442',
      expirationDate: new Date('2028-02-15'),
      brand: 'Fermentis',
      location: 'Geladeira Laboratório (4°C)',
    },
  });

  // Químicos: Soda Cáustica
  const itemSoda = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Soda Cáustica Escamas 99% (Saco 25kg)',
      category: 'QUIMICO_LIMPEZA',
      unit: 'KG',
      currentQuantity: 225.0,
      minimumQuantity: 50.0,
      costPerUnit: 8.9,
      supplierId: supplierWhiteMartins.id,
      supplierLot: 'QUIM-SOD-2026-02',
      expirationDate: new Date('2028-12-31'),
      brand: 'Unipar',
      location: 'Depósito Químico Ventilado',
    },
  });

  // Químicos: Ácido Peracético
  const itemPeracetico = await prisma.inventoryItem.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Ácido Peracético 15% Sanitizante (Bombona 20L)',
      category: 'QUIMICO_LIMPEZA',
      unit: 'L',
      currentQuantity: 80.0,
      minimumQuantity: 20.0,
      costPerUnit: 26.5,
      supplierId: supplierWhiteMartins.id,
      supplierLot: 'PERAC-2026-01',
      expirationDate: new Date('2027-06-30'),
      brand: 'Kalykim',
      location: 'Depósito Químico Ventilado',
    },
  });

  // Histórico de Movimentações de Entrada do Estoque
  await prisma.inventoryMovement.createMany({
    data: [
      {
        breweryId: demoBrewery.id,
        inventoryItemId: itemMaltePilsen.id,
        inventoryLotId: lotPilsen1.id,
        type: 'ENTRADA',
        quantity: 3000.0,
        costPerUnit: 4.8,
        supplierLot: 'AGR-PIL-2026-08',
        userId: userAdmin.id,
        userName: userAdmin.name,
        notes: 'Recebimento NF-e 44820 - Agrária Malte',
        createdAt: new Date('2026-02-01'),
      },
      {
        breweryId: demoBrewery.id,
        inventoryItemId: itemLupuloCitra.id,
        inventoryLotId: lotCitra1.id,
        type: 'ENTRADA',
        quantity: 50.0,
        costPerUnit: 240.0,
        supplierLot: 'BH-CIT-2025-77',
        userId: userAdmin.id,
        userName: userAdmin.name,
        notes: 'Recebimento NF-e 11928 - BarthHaas',
        createdAt: new Date('2026-02-03'),
      },
      {
        breweryId: demoBrewery.id,
        inventoryItemId: itemMaltePilsen.id,
        inventoryLotId: lotPilsen1.id,
        type: 'SAIDA_BRASSAGEM',
        quantity: -150.0,
        costPerUnit: 4.8,
        supplierLot: 'AGR-PIL-2026-08',
        userId: userBrewer.id,
        userName: userBrewer.name,
        notes: 'Baixa de malte para brassagem Lote LOTE-2026-041',
        createdAt: new Date('2026-02-12'),
      },
    ],
  });

  console.log('✅ Estoque de insumos e lotes estruturados com sucesso.');

  // ============================================================================
  // 6. RECEITAS CERVEJEIRAS PROFISSIONAIS (BEER RECIPES)
  // ============================================================================
  const recipeIpa = await prisma.beerRecipe.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Hop Storm IPA Tropical',
      style: 'American IPA',
      og: 1.062,
      fg: 1.012,
      abv: 6.6,
      ibu: 58,
      ebc: 14.0,
      batchYieldLiters: 1000.0,
      targetPhMash: 5.3,
      targetPhFinal: 4.35,
      mapaRegistration: 'SP 001234-5.000001',
      commercialDenomination: 'Cerveja Forte Clara Tipo American IPA',
      description: 'American IPA intensa e refrescante, carregada com lúpulos Citra, Mosaic e Simcoe no Whirlpool e Dry Hopping.',
      costPerLiter: 6.8,
      suggestedPricePerLiter: 22.0,
      salePricePerLiter: 22.0,
      pricingModel: 'MARKUP',
      profitMarginPercent: 69.0,
      styleCategory: 'PREMIUM',
    },
  });

  const recipePilsen = await prisma.beerRecipe.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Ouro Real Pilsen Puro Malte',
      style: 'German Pilsner',
      og: 1.046,
      fg: 1.008,
      abv: 4.8,
      ibu: 22,
      ebc: 6.0,
      batchYieldLiters: 1000.0,
      targetPhMash: 5.4,
      targetPhFinal: 4.25,
      mapaRegistration: 'SP 001234-5.000002',
      commercialDenomination: 'Cerveja Clara Puro Malte Tipo Pilsen',
      description: 'Pilsen alemã cristalina, puro malte, com amargor limpo e floral do lúpulo nobre Saaz. Altíssima drinkability.',
      costPerLiter: 3.9,
      suggestedPricePerLiter: 15.0,
      salePricePerLiter: 15.0,
      pricingModel: 'MARKUP',
      profitMarginPercent: 74.0,
      styleCategory: 'STANDARD',
    },
  });

  const recipeStout = await prisma.beerRecipe.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Veludo Negro Imperial Stout',
      style: 'Russian Imperial Stout',
      og: 1.088,
      fg: 1.020,
      abv: 9.2,
      ibu: 65,
      ebc: 90.0,
      batchYieldLiters: 500.0,
      targetPhMash: 5.5,
      targetPhFinal: 4.45,
      mapaRegistration: 'SP 001234-5.000003',
      commercialDenomination: 'Cerveja Extra Escura Tipo Imperial Stout com Cacau e Café',
      description: 'Imperial Stout encorpada e complexa, com maltes torrados, nibs de cacau da Bahia e infusão de café especial.',
      costPerLiter: 9.5,
      suggestedPricePerLiter: 32.0,
      salePricePerLiter: 32.0,
      pricingModel: 'MARKUP',
      profitMarginPercent: 70.0,
      styleCategory: 'HIGH_GRAVITY',
    },
  });

  const recipeWeiss = await prisma.beerRecipe.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Baviera Weissbier Tradicional',
      style: 'German Hefeweizen',
      og: 1.050,
      fg: 1.011,
      abv: 5.2,
      ibu: 14,
      ebc: 9.0,
      batchYieldLiters: 1000.0,
      targetPhMash: 5.4,
      targetPhFinal: 4.3,
      mapaRegistration: 'SP 001234-5.000004',
      commercialDenomination: 'Cerveja de Trigo Tipo Weissbier',
      description: 'Cerveja de trigo bávara com aroma clássico de banana e cravo, corpo sedoso e final refrescante.',
      costPerLiter: 4.6,
      suggestedPricePerLiter: 17.5,
      salePricePerLiter: 17.5,
      pricingModel: 'MARKUP',
      profitMarginPercent: 73.0,
      styleCategory: 'STANDARD',
    },
  });

  const recipeSession = await prisma.beerRecipe.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Brisa Leve Session IPA',
      style: 'Session IPA',
      og: 1.042,
      fg: 1.009,
      abv: 4.3,
      ibu: 38,
      ebc: 10.0,
      batchYieldLiters: 1000.0,
      targetPhMash: 5.35,
      targetPhFinal: 4.3,
      mapaRegistration: 'SP 001234-5.000005',
      commercialDenomination: 'Cerveja Clara Leve Tipo Session IPA',
      description: 'Session IPA com altíssimo aroma de frutas cítricas, baixo teor alcoólico e excelente amargor de suporte.',
      costPerLiter: 5.2,
      suggestedPricePerLiter: 18.0,
      salePricePerLiter: 18.0,
      pricingModel: 'MARKUP',
      profitMarginPercent: 71.0,
      styleCategory: 'PREMIUM',
    },
  });

  const recipeSour = await prisma.beerRecipe.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Rubi Tropical Catharina Sour',
      style: 'Catharina Sour',
      og: 1.044,
      fg: 1.009,
      abv: 4.5,
      ibu: 8,
      ebc: 8.0,
      batchYieldLiters: 500.0,
      targetPhMash: 5.2,
      targetPhFinal: 3.4,
      mapaRegistration: 'SP 001234-5.000006',
      commercialDenomination: 'Cerveja Ácida Tipo Catharina Sour com Amora e Pitaya',
      description: 'Estilo brasileiro refrescante com acidez lática limpa e adição generosa de polpa de amora e pitaya vermelha.',
      costPerLiter: 6.4,
      suggestedPricePerLiter: 24.0,
      salePricePerLiter: 24.0,
      pricingModel: 'MARKUP',
      profitMarginPercent: 73.0,
      styleCategory: 'ESPECIAL',
    },
  });

  console.log('✅ 6 Receitas cervejeiras criadas.');

  // ============================================================================
  // 7. TANQUES CERVEJEIROS & LOTES DE PRODUÇÃO (TANKS & BATCHES)
  // ============================================================================
  const tankF01 = await prisma.tank.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'F-01 (1000L)',
      capacityLiters: 1000,
      type: 'FERMENTADOR_ISOTERMICO',
      status: 'OCUPADO',
      notes: 'Jaqueta dupla de glicol individual. Termopar calibrado em jan/2026.',
    },
  });

  const tankF02 = await prisma.tank.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'F-02 (1000L)',
      capacityLiters: 1000,
      type: 'FERMENTADOR_ISOTERMICO',
      status: 'OCUPADO',
      notes: 'Em maturação e clarificação a 0.5°C.',
    },
  });

  const tankF03 = await prisma.tank.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'F-03 (500L)',
      capacityLiters: 500,
      type: 'FERMENTADOR_ISOTERMICO',
      status: 'OCUPADO',
      notes: 'Brassagem do dia transferida para fermentação.',
    },
  });

  const tankF04 = await prisma.tank.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'F-04 (500L)',
      capacityLiters: 500,
      type: 'FERMENTADOR_ISOTERMICO',
      status: 'LIVRE',
      notes: 'Tanque limpo e disponível para próxima produção.',
    },
  });

  const tankBBT01 = await prisma.tank.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'BBT-01 (1000L)',
      capacityLiters: 1000,
      type: 'BBT_BRITE_TANK',
      status: 'OCUPADO',
      notes: 'Brite Tank pressurizado a 1.2 bar e carbonatado a 2.5 vol CO2.',
    },
  });

  const tankBBT02 = await prisma.tank.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'BBT-02 (2000L)',
      capacityLiters: 2000,
      type: 'BBT_BRITE_TANK',
      status: 'HIGIENIZANDO',
      notes: 'Ciclo CIP em andamento com ácido peracético.',
    },
  });

  // Criar Lotes de Produção em diferentes fases
  // Lote 1: IPA Fermentando no F-01
  const batchIpa = await prisma.productionBatch.create({
    data: {
      breweryId: demoBrewery.id,
      recipeId: recipeIpa.id,
      batchNumber: 'LOTE-2026-042',
      tankId: tankF01.id,
      status: 'FERMENTANDO',
      volumePlannedLiters: 1000,
      volumeProducedLiters: 980,
      costPerLiter: 6.8,
      totalCost: 6664.0,
      brewDate: new Date('2026-02-22'),
      fermentationStartDate: new Date('2026-02-22'),
      measuredOg: 1.063,
      measuredFg: 1.018,
      measuredAbv: 5.9,
      measuredIbu: 58,
      measuredEbc: 14.0,
      attenuationPercent: 71.4,
      phMash: 5.32,
      phBoil: 5.15,
      phFermentationStart: 5.08,
      tempMash: 66.0,
      tempFermentation: 18.5,
      yeastStrain: 'Fermentis SafAle US-05',
      yeastGeneration: 2,
      yeastLot: 'FERM-US05-881',
      mapaRegistration: 'SP 001234-5.000001',
      commercialDenomination: 'Cerveja Forte Clara Tipo American IPA',
      technicalResponsible: 'Mestre Bruno (CRQ 0441298)',
      sensoryNotes: 'Intensa explosão aromática de maracujá, manga e grapefruit. Fermentação vigorosa e límpida.',
      notes: 'Dry Hopping programado para o 7º dia com Citra e Mosaic.',
    },
  });

  // Lote 2: Pilsen Maturando no F-02
  const batchPilsen = await prisma.productionBatch.create({
    data: {
      breweryId: demoBrewery.id,
      recipeId: recipePilsen.id,
      batchNumber: 'LOTE-2026-041',
      tankId: tankF02.id,
      status: 'MATURANDO',
      volumePlannedLiters: 1000,
      volumeProducedLiters: 990,
      costPerLiter: 3.9,
      totalCost: 3861.0,
      brewDate: new Date('2026-02-12'),
      fermentationStartDate: new Date('2026-02-12'),
      maturationStartDate: new Date('2026-02-20'),
      measuredOg: 1.046,
      measuredFg: 1.008,
      measuredAbv: 4.85,
      measuredIbu: 22,
      measuredEbc: 6.2,
      attenuationPercent: 82.6,
      phMash: 5.4,
      phBoil: 5.2,
      phFermentationStart: 5.1,
      phFinal: 4.25,
      tempMash: 65.0,
      tempFermentation: 11.0,
      tempMaturation: 0.5,
      yeastStrain: 'Fermentis Saflager W-34/70',
      yeastGeneration: 1,
      yeastLot: 'FERM-W3470-442',
      mapaRegistration: 'SP 001234-5.000002',
      commercialDenomination: 'Cerveja Clara Puro Malte Tipo Pilsen',
      technicalResponsible: 'Mestre Bruno (CRQ 0441298)',
      sensoryNotes: 'Cerveja muito límpida, notas de malte fresco e biscoito com amargor refinado. Quase pronta para o envase.',
      notes: 'Cold crash realizado com sucesso. Purga de levedura executada no 8º dia.',
    },
  });

  // Lote 3: Weissbier em Brassagem no F-03
  const batchWeiss = await prisma.productionBatch.create({
    data: {
      breweryId: demoBrewery.id,
      recipeId: recipeWeiss.id,
      batchNumber: 'LOTE-2026-043',
      tankId: tankF03.id,
      status: 'BRASSAGEM',
      volumePlannedLiters: 500,
      volumeProducedLiters: 500,
      costPerLiter: 4.6,
      totalCost: 2300.0,
      brewDate: new Date('2026-02-28'),
      measuredOg: 1.051,
      tempMash: 67.0,
      phMash: 5.38,
      phBoil: 5.2,
      yeastStrain: 'WB-06',
      yeastGeneration: 1,
      technicalResponsible: 'Mestre Bruno (CRQ 0441298)',
      sensoryNotes: 'Mosto doce e muito aromático com notas de trigo maltado.',
    },
  });

  // Lote 4: Imperial Stout Pronta no BBT-01 para envase
  const batchStout = await prisma.productionBatch.create({
    data: {
      breweryId: demoBrewery.id,
      recipeId: recipeStout.id,
      batchNumber: 'LOTE-2026-039',
      tankId: tankBBT01.id,
      status: 'PRONTO_ENVASE',
      volumePlannedLiters: 1000,
      volumeProducedLiters: 970,
      costPerLiter: 9.5,
      totalCost: 9215.0,
      brewDate: new Date('2026-01-20'),
      fermentationStartDate: new Date('2026-01-20'),
      maturationStartDate: new Date('2026-01-30'),
      measuredOg: 1.089,
      measuredFg: 1.020,
      measuredAbv: 9.3,
      measuredIbu: 65,
      measuredEbc: 92.0,
      attenuationPercent: 77.5,
      phFinal: 4.42,
      tempMaturation: 1.0,
      yeastStrain: 'Fermentis SafAle US-05',
      yeastGeneration: 1,
      technicalResponsible: 'Mestre Bruno (CRQ 0441298)',
      sensoryNotes: 'Cerveja licorosa, notas potentes de chocolate meio amargo, café expresso e final levemente aquecedor.',
      notes: 'Carbonatação estabilizada em 2.5 volumes. Pronta para carregar barris.',
    },
  });

  // Lote 5: Lote Histórico 100% Envasado (Pilsen)
  const batchPilsenOld = await prisma.productionBatch.create({
    data: {
      breweryId: demoBrewery.id,
      recipeId: recipePilsen.id,
      batchNumber: 'LOTE-2026-037',
      tankId: null,
      status: 'ENVASADO',
      volumePlannedLiters: 1000,
      volumeProducedLiters: 995,
      costPerLiter: 3.9,
      totalCost: 3880.5,
      brewDate: new Date('2026-01-10'),
      packagingDate: new Date('2026-01-28'),
      measuredOg: 1.046,
      measuredFg: 1.008,
      measuredAbv: 4.8,
      measuredIbu: 22,
      measuredEbc: 6.0,
      phFinal: 4.25,
      technicalResponsible: 'Mestre Bruno (CRQ 0441298)',
    },
  });

  // Lote 6: Lote Histórico 100% Envasado (Session IPA)
  const batchSessionOld = await prisma.productionBatch.create({
    data: {
      breweryId: demoBrewery.id,
      recipeId: recipeSession.id,
      batchNumber: 'LOTE-2026-038',
      tankId: null,
      status: 'ENVASADO',
      volumePlannedLiters: 500,
      volumeProducedLiters: 490,
      costPerLiter: 5.2,
      totalCost: 2548.0,
      brewDate: new Date('2026-01-15'),
      packagingDate: new Date('2026-02-02'),
      measuredOg: 1.042,
      measuredFg: 1.009,
      measuredAbv: 4.3,
      measuredIbu: 38,
      measuredEbc: 10.0,
      phFinal: 4.3,
      technicalResponsible: 'Mestre Bruno (CRQ 0441298)',
    },
  });

  // Vincular os tanques aos lotes
  await prisma.tank.update({ where: { id: tankF01.id }, data: { currentBatchId: batchIpa.id } });
  await prisma.tank.update({ where: { id: tankF02.id }, data: { currentBatchId: batchPilsen.id } });
  await prisma.tank.update({ where: { id: tankF03.id }, data: { currentBatchId: batchWeiss.id } });
  await prisma.tank.update({ where: { id: tankBBT01.id }, data: { currentBatchId: batchStout.id } });

  console.log('✅ Tanques e lotes de produção associados.');

  // ============================================================================
  // 8. CLIENTES FICTÍCIOS E PONTOS DE VENDA (CLIENTS)
  // ============================================================================
  const clientTaphouse = await prisma.client.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Taphouse & Chopperia Imperial Ltda',
      tradeName: 'Taphouse Imperial',
      document: '23.456.789/0001-01',
      email: 'compras@imperialtaphouse.demo',
      phone: '(16) 99777-1111',
      address: 'Av. Presidente Vargas',
      number: '1280',
      complement: 'Salas 04 e 05',
      neighborhood: 'Alto da Boa Vista',
      city: 'Ribeirão Preto',
      state: 'SP',
      zipCode: '14025-000',
      creditLimit: 15000.0,
      retainedKegsCount: 4,
      notes: 'Cliente premium. Recebimento de chopp todas as quintas pela manhã.',
    },
  });

  const clientSteakhouse = await prisma.client.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Restaurante & Steakhouse Fogo Nobre Eireli',
      tradeName: 'Steakhouse Fogo Nobre',
      document: '34.567.890/0001-22',
      email: 'gerencia@fogonobresteak.demo',
      phone: '(16) 98888-2222',
      address: 'Rua das Palmeiras',
      number: '450',
      complement: 'Esquina com Av. Brasil',
      neighborhood: 'Jardim Paulista',
      city: 'Ribeirão Preto',
      state: 'SP',
      zipCode: '14090-000',
      creditLimit: 10000.0,
      retainedKegsCount: 3,
      notes: 'Consumo constante de Chopp Pilsen e IPA. Chopeira Memo 2 Vias instalada no balcão principal.',
    },
  });

  const clientPubDubliner = await prisma.client.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Dubliner Irish Pub & Gastronomia',
      tradeName: 'Dubliner Pub',
      document: '45.678.901/0001-33',
      email: 'bar@dublinerpub.demo',
      phone: '(16) 99111-3333',
      address: 'Rua Itacolomi',
      number: '820',
      neighborhood: 'Jardim Sumaré',
      city: 'Ribeirão Preto',
      state: 'SP',
      zipCode: '14025-250',
      creditLimit: 12000.0,
      retainedKegsCount: 3,
      notes: 'Foco em Stout e IPA. Eventos de Saint Patrick e shows acústicos.',
    },
  });

  const clientArenaSports = await prisma.client.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Arena Beach Tennis & Sports Bar',
      tradeName: 'Arena Beach Club',
      document: '56.789.012/0001-44',
      email: 'eventos@arenabeachsports.demo',
      phone: '(16) 99222-4444',
      address: 'Rodovia Prefeito Antônio Duarte Nogueira, KM 318',
      number: 'S/N',
      neighborhood: 'Recreio das Acácias',
      city: 'Ribeirão Preto',
      state: 'SP',
      zipCode: '14098-000',
      creditLimit: 8000.0,
      retainedKegsCount: 2,
      notes: 'Alto volume de chopp leve (Pilsen e Session IPA) nos torneios de fim de semana.',
    },
  });

  const clientEmporioVilla = await prisma.client.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Empório & Choperia Villa Madalena',
      tradeName: 'Empório Villa Madalena',
      document: '67.890.123/0001-55',
      email: 'contato@villamadalena.demo',
      phone: '(16) 99333-5555',
      address: 'Rua Fiúsa',
      number: '2100',
      neighborhood: 'Jardim São Luiz',
      city: 'Ribeirão Preto',
      state: 'SP',
      zipCode: '14020-000',
      creditLimit: 6000.0,
      retainedKegsCount: 0,
      notes: 'Ponto de venda com growler station.',
    },
  });

  const clientCasamentoSilveira = await prisma.client.create({
    data: {
      breweryId: demoBrewery.id,
      name: 'Rodrigo Silveira (Pessoa Física / Evento Privado)',
      tradeName: 'Casamento Família Silveira',
      document: '381.928.192-00',
      email: 'rodrigo.silveira@email.demo',
      phone: '(16) 99444-6666',
      address: 'Chácara Solar das Flores - Estrada Municipal',
      number: '420',
      neighborhood: 'Zona Rural',
      city: 'Bonfim Paulista',
      state: 'SP',
      zipCode: '14110-000',
      creditLimit: 3000.0,
      retainedKegsCount: 2,
      notes: 'Evento no sábado. Locação com chopeira a gelo e pagamento de caução.',
    },
  });

  console.log('✅ 6 Clientes e Pontos de Venda cadastrados.');

  // ============================================================================
  // 9. EQUIPAMENTOS E COMODATOS (EQUIPMENT)
  // ============================================================================
  const equipMemo1 = await prisma.equipment.create({
    data: {
      breweryId: demoBrewery.id,
      code: 'CHOP-MEMO-01',
      name: 'Chopeira Elétrica Memo 2 Vias 220V Inox',
      type: 'CHOPEIRA_ELETRICA',
      status: 'EM_USO_CLIENTE',
      currentClientId: clientTaphouse.id,
      serialNumber: 'MEMO-220V-9981',
      voltage: '220V',
      lastMaintenanceAt: new Date('2026-01-15'),
      notes: 'Instalada na torneira principal do Taphouse Imperial.',
    },
  });

  const equipMemo2 = await prisma.equipment.create({
    data: {
      breweryId: demoBrewery.id,
      code: 'CHOP-MEMO-02',
      name: 'Chopeira Elétrica Memo 2 Vias 220V Inox',
      type: 'CHOPEIRA_ELETRICA',
      status: 'EM_USO_CLIENTE',
      currentClientId: clientSteakhouse.id,
      serialNumber: 'MEMO-220V-9982',
      voltage: '220V',
      lastMaintenanceAt: new Date('2026-01-18'),
      notes: 'Instalada no bar da varanda da Steakhouse.',
    },
  });

  const equipMemo3 = await prisma.equipment.create({
    data: {
      breweryId: demoBrewery.id,
      code: 'CHOP-MEMO-03',
      name: 'Chopeira Elétrica Memo 2 Vias 220V Inox',
      type: 'CHOPEIRA_ELETRICA',
      status: 'DISPONIVEL',
      currentClientId: null,
      serialNumber: 'MEMO-220V-9983',
      voltage: '220V',
      lastMaintenanceAt: new Date('2026-02-10'),
      notes: 'Revisada e disponível no depósito para comodato.',
    },
  });

  const equipCelli1 = await prisma.equipment.create({
    data: {
      breweryId: demoBrewery.id,
      code: 'CHOP-CEL-01',
      name: 'Chopeira Elétrica Celli 1 Via 110V Compacta',
      type: 'CHOPEIRA_ELETRICA',
      status: 'EM_USO_CLIENTE',
      currentClientId: clientPubDubliner.id,
      serialNumber: 'CEL-110V-4421',
      voltage: '110V',
      lastMaintenanceAt: new Date('2026-01-22'),
    },
  });

  const equipGelo1 = await prisma.equipment.create({
    data: {
      breweryId: demoBrewery.id,
      code: 'CHOP-GELO-01',
      name: 'Chopeira a Gelo 50L 2 Torneiras Italianas',
      type: 'CHOPEIRA_GELO',
      status: 'DISPONIVEL',
      currentClientId: null,
      serialNumber: 'GELO-50L-01',
      notes: 'Perfeita para eventos e locações de fim de semana.',
    },
  });

  const equipGelo2 = await prisma.equipment.create({
    data: {
      breweryId: demoBrewery.id,
      code: 'CHOP-GELO-02',
      name: 'Chopeira a Gelo 50L 2 Torneiras Italianas',
      type: 'CHOPEIRA_GELO',
      status: 'EM_USO_CLIENTE',
      currentClientId: clientCasamentoSilveira.id,
      serialNumber: 'GELO-50L-02',
      notes: 'Locada para casamento Rodrigo Silveira.',
    },
  });

  const equipCo2_1 = await prisma.equipment.create({
    data: {
      breweryId: demoBrewery.id,
      code: 'CIL-CO2-01',
      name: 'Cilindro CO2 6kg Alumínio Leve',
      type: 'CILINDRO_CO2',
      status: 'EM_USO_CLIENTE',
      currentClientId: clientTaphouse.id,
      serialNumber: 'CO2-AL-6011',
      notes: 'Carga cheia entregue em 20/02/2026.',
    },
  });

  const equipCo2_2 = await prisma.equipment.create({
    data: {
      breweryId: demoBrewery.id,
      code: 'CIL-CO2-02',
      name: 'Cilindro CO2 6kg Alumínio Leve',
      type: 'CILINDRO_CO2',
      status: 'EM_USO_CLIENTE',
      currentClientId: clientSteakhouse.id,
      serialNumber: 'CO2-AL-6012',
    },
  });

  const equipCo2_3 = await prisma.equipment.create({
    data: {
      breweryId: demoBrewery.id,
      code: 'CIL-CO2-03',
      name: 'Cilindro CO2 6kg Alumínio Leve',
      type: 'CILINDRO_CO2',
      status: 'DISPONIVEL',
      currentClientId: null,
      serialNumber: 'CO2-AL-6013',
    },
  });

  const equipManometro1 = await prisma.equipment.create({
    data: {
      breweryId: demoBrewery.id,
      code: 'MAN-REG-01',
      name: 'Regulador de Pressão Duplo Micromatic CO2',
      type: 'MANOMETRO',
      status: 'EM_USO_CLIENTE',
      currentClientId: clientTaphouse.id,
      serialNumber: 'MICRO-REG-882',
    },
  });

  console.log('✅ Equipamentos cadastrados e vinculados a comodatos.');

  // ============================================================================
  // 10. BARRIS (KEGS) COM TODOS OS STATUS E RASTREABILIDADE
  // ============================================================================
  const kegsData = [
    // --- Barris no Cliente Taphouse Imperial ---
    { code: 'BAR-50L-001', capacity: 50, status: 'NO_CLIENTE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: clientTaphouse },
    { code: 'BAR-50L-002', capacity: 50, status: 'NO_CLIENTE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: clientTaphouse },
    { code: 'BAR-50L-003', capacity: 50, status: 'NO_CLIENTE', batch: batchSessionOld, beer: 'Hop Storm IPA Tropical', client: clientTaphouse },
    { code: 'BAR-30L-001', capacity: 30, status: 'NO_CLIENTE', batch: batchSessionOld, beer: 'Brisa Leve Session IPA', client: clientTaphouse },

    // --- Barris na Steakhouse Fogo Nobre ---
    { code: 'BAR-50L-004', capacity: 50, status: 'NO_CLIENTE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: clientSteakhouse },
    { code: 'BAR-50L-005', capacity: 50, status: 'NO_CLIENTE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: clientSteakhouse },
    { code: 'BAR-50L-006', capacity: 50, status: 'NO_CLIENTE', batch: batchSessionOld, beer: 'Hop Storm IPA Tropical', client: clientSteakhouse },

    // --- Barris no Dubliner Irish Pub ---
    { code: 'BAR-50L-007', capacity: 50, status: 'NO_CLIENTE', batch: batchSessionOld, beer: 'Veludo Negro Imperial Stout', client: clientPubDubliner },
    { code: 'BAR-50L-008', capacity: 50, status: 'NO_CLIENTE', batch: batchSessionOld, beer: 'Hop Storm IPA Tropical', client: clientPubDubliner },
    { code: 'BAR-30L-002', capacity: 30, status: 'NO_CLIENTE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: clientPubDubliner },

    // --- Barris no Arena Beach Tennis ---
    { code: 'BAR-50L-009', capacity: 50, status: 'NO_CLIENTE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: clientArenaSports },
    { code: 'BAR-50L-010', capacity: 50, status: 'NO_CLIENTE', batch: batchSessionOld, beer: 'Brisa Leve Session IPA', client: clientArenaSports },

    // --- Barris no Casamento Silveira ---
    { code: 'BAR-30L-003', capacity: 30, status: 'NO_CLIENTE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: clientCasamentoSilveira },
    { code: 'BAR-30L-004', capacity: 30, status: 'NO_CLIENTE', batch: batchSessionOld, beer: 'Hop Storm IPA Tropical', client: clientCasamentoSilveira },

    // --- Barris EM TRÂNSITO / EM ROTA (No caminhão de entrega do Lucas) ---
    { code: 'BAR-50L-011', capacity: 50, status: 'EM_TRANSITO', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: null },
    { code: 'BAR-50L-012', capacity: 50, status: 'EM_TRANSITO', batch: batchSessionOld, beer: 'Hop Storm IPA Tropical', client: null },
    { code: 'BAR-30L-005', capacity: 30, status: 'EM_TRANSITO', batch: batchSessionOld, beer: 'Veludo Negro Imperial Stout', client: null },

    // --- Barris NA CÂMARA FRIA / EM ESTOQUE (Cheios, prontos para venda) ---
    { code: 'BAR-50L-013', capacity: 50, status: 'EM_ESTOQUE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: null },
    { code: 'BAR-50L-014', capacity: 50, status: 'EM_ESTOQUE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: null },
    { code: 'BAR-50L-015', capacity: 50, status: 'EM_ESTOQUE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: null },
    { code: 'BAR-50L-016', capacity: 50, status: 'EM_ESTOQUE', batch: batchSessionOld, beer: 'Hop Storm IPA Tropical', client: null },
    { code: 'BAR-50L-017', capacity: 50, status: 'EM_ESTOQUE', batch: batchSessionOld, beer: 'Hop Storm IPA Tropical', client: null },
    { code: 'BAR-50L-018', capacity: 50, status: 'EM_ESTOQUE', batch: batchSessionOld, beer: 'Hop Storm IPA Tropical', client: null },
    { code: 'BAR-30L-006', capacity: 30, status: 'EM_ESTOQUE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: null },
    { code: 'BAR-30L-007', capacity: 30, status: 'EM_ESTOQUE', batch: batchSessionOld, beer: 'Brisa Leve Session IPA', client: null },
    { code: 'BAR-30L-008', capacity: 30, status: 'EM_ESTOQUE', batch: batchSessionOld, beer: 'Veludo Negro Imperial Stout', client: null },
    { code: 'BAR-20L-001', capacity: 20, status: 'EM_ESTOQUE', batch: batchSessionOld, beer: 'Hop Storm IPA Tropical', client: null },
    { code: 'BAR-20L-002', capacity: 20, status: 'EM_ESTOQUE', batch: batchPilsenOld, beer: 'Ouro Real Pilsen Puro Malte', client: null },

    // --- Barris HIGIENIZADOS (Vazios limpos, esterilizados e pressurizados com CO2) ---
    { code: 'BAR-50L-019', capacity: 50, status: 'HIGIENIZADO', batch: null, beer: null, client: null },
    { code: 'BAR-50L-020', capacity: 50, status: 'HIGIENIZADO', batch: null, beer: null, client: null },
    { code: 'BAR-50L-021', capacity: 50, status: 'HIGIENIZADO', batch: null, beer: null, client: null },
    { code: 'BAR-50L-022', capacity: 50, status: 'HIGIENIZADO', batch: null, beer: null, client: null },
    { code: 'BAR-30L-009', capacity: 30, status: 'HIGIENIZADO', batch: null, beer: null, client: null },
    { code: 'BAR-30L-010', capacity: 30, status: 'HIGIENIZADO', batch: null, beer: null, client: null },
    { code: 'BAR-20L-003', capacity: 20, status: 'HIGIENIZADO', batch: null, beer: null, client: null },
    { code: 'BAR-20L-004', capacity: 20, status: 'HIGIENIZADO', batch: null, beer: null, client: null },

    // --- Barris VAZIOS E SUJOS (Retornados de clientes aguardando processo CIP de lavagem) ---
    { code: 'BAR-50L-023', capacity: 50, status: 'VAZIO_SUJO', batch: null, beer: null, client: null },
    { code: 'BAR-50L-024', capacity: 50, status: 'VAZIO_SUJO', batch: null, beer: null, client: null },
    { code: 'BAR-50L-025', capacity: 50, status: 'VAZIO_SUJO', batch: null, beer: null, client: null },
    { code: 'BAR-30L-011', capacity: 30, status: 'VAZIO_SUJO', batch: null, beer: null, client: null },
    { code: 'BAR-30L-012', capacity: 30, status: 'VAZIO_SUJO', batch: null, beer: null, client: null },
    { code: 'BAR-20L-005', capacity: 20, status: 'VAZIO_SUJO', batch: null, beer: null, client: null },

    // --- Barris EM MANUTENÇÃO ---
    { code: 'BAR-50L-026', capacity: 50, status: 'MANUTENCAO', batch: null, beer: null, client: null, notes: 'Substituição do anel de vedação e válvula extratora' },
    { code: 'BAR-30L-013', capacity: 30, status: 'MANUTENCAO', batch: null, beer: null, client: null, notes: 'Amassado na alça superior reparado' },
  ];

  const createdKegs = [];
  for (const k of kegsData) {
    const keg = await prisma.keg.create({
      data: {
        breweryId: demoBrewery.id,
        code: k.code,
        capacity: k.capacity,
        currentVolumeLiters: k.status === 'EM_ESTOQUE' || k.status === 'NO_CLIENTE' || k.status === 'EM_TRANSITO' ? k.capacity : 0,
        kegType: 'INOX_EURO',
        status: k.status,
        currentBatchId: k.batch ? k.batch.id : null,
        currentBeerName: k.beer,
        currentClientId: k.client ? k.client.id : null,
        lastSanitizedAt: new Date('2026-02-15'),
        lastFilledAt: k.beer ? new Date('2026-02-18') : null,
        lastDeliveredAt: k.client ? new Date('2026-02-20') : null,
        notes: k.notes,
      },
    });
    createdKegs.push(keg);

    // Criar histórico de movimentações para demonstrar rastreabilidade
    if (k.status === 'NO_CLIENTE') {
      await prisma.kegMovement.createMany({
        data: [
          {
            breweryId: demoBrewery.id,
            kegId: keg.id,
            action: 'HIGIENIZACAO',
            fromStatus: 'VAZIO_SUJO',
            toStatus: 'HIGIENIZADO',
            userId: userBrewer.id,
            userName: userBrewer.name,
            notes: 'Higienização CIP com soda e ácido peracético.',
            createdAt: new Date('2026-02-15T09:00:00Z'),
          },
          {
            breweryId: demoBrewery.id,
            kegId: keg.id,
            batchId: k.batch?.id,
            action: 'ENVASE',
            fromStatus: 'HIGIENIZADO',
            toStatus: 'EM_ESTOQUE',
            volumeLiters: k.capacity,
            userId: userBrewer.id,
            userName: userBrewer.name,
            notes: `Envasado com chopp ${k.beer}.`,
            createdAt: new Date('2026-02-18T14:30:00Z'),
          },
          {
            breweryId: demoBrewery.id,
            kegId: keg.id,
            action: 'ENTREGA',
            fromStatus: 'EM_ESTOQUE',
            toStatus: 'NO_CLIENTE',
            toClientId: k.client?.id,
            userId: userLogistics.id,
            userName: userLogistics.name,
            driverName: 'Lucas Entregador',
            notes: `Entregue e instalado no cliente ${k.client?.tradeName}.`,
            createdAt: new Date('2026-02-20T11:15:00Z'),
          },
        ],
      });
    } else if (k.status === 'EM_ESTOQUE') {
      await prisma.kegMovement.createMany({
        data: [
          {
            breweryId: demoBrewery.id,
            kegId: keg.id,
            action: 'HIGIENIZACAO',
            fromStatus: 'VAZIO_SUJO',
            toStatus: 'HIGIENIZADO',
            userId: userBrewer.id,
            userName: userBrewer.name,
            createdAt: new Date('2026-02-16T10:00:00Z'),
          },
          {
            breweryId: demoBrewery.id,
            kegId: keg.id,
            batchId: k.batch?.id,
            action: 'ENVASE',
            fromStatus: 'HIGIENIZADO',
            toStatus: 'EM_ESTOQUE',
            volumeLiters: k.capacity,
            userId: userBrewer.id,
            userName: userBrewer.name,
            notes: `Envasado no tanque e armazenado na câmara fria (2°C).`,
            createdAt: new Date('2026-02-19T16:00:00Z'),
          },
        ],
      });
    }
  }

  console.log(`✅ ${createdKegs.length} Barris criados e histórico de rastreabilidade gerado.`);

  // ============================================================================
  // 11. PEDIDOS E VENDAS COMPLETOS (ORDERS & FINANCIALS)
  // ============================================================================

  // --- PEDIDO 1: ENTREGUE / CONCLUÍDO (Taphouse Imperial) ---
  const order1 = await prisma.order.create({
    data: {
      breweryId: demoBrewery.id,
      orderNumber: 'PED-2026-0001',
      clientId: clientTaphouse.id,
      status: 'ENTREGUE',
      deliveryDate: new Date('2026-02-20T11:00:00Z'),
      estimatedReturnDate: new Date('2026-03-05T18:00:00Z'),
      deliveryAddress: 'Av. Presidente Vargas, 1280 - Alto da Boa Vista, Ribeirão Preto - SP',
      subtotal: 5200.0,
      discount: 200.0,
      deliveryFee: 60.0,
      cautionDeposit: 0.0,
      totalAmount: 5060.0,
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
      paidAmount: 5060.0,
      remainingAmount: 0.0,
      driverUserId: userLogistics.id,
      notes: 'Entrega pontual realizada. Chopeira e cilindro instalados e testados no balcão.',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        recipeId: recipePilsen.id,
        kegId: createdKegs[0].id,
        description: 'Barril 50L - Ouro Real Pilsen Puro Malte',
        quantity: 2,
        unitPrice: 750.0,
        totalPrice: 1500.0,
      },
      {
        orderId: order1.id,
        recipeId: recipeIpa.id,
        kegId: createdKegs[2].id,
        description: 'Barril 50L - Hop Storm IPA Tropical',
        quantity: 2,
        unitPrice: 1100.0,
        totalPrice: 2200.0,
      },
      {
        orderId: order1.id,
        recipeId: recipeSession.id,
        kegId: createdKegs[3].id,
        description: 'Barril 30L - Brisa Leve Session IPA',
        quantity: 2,
        unitPrice: 540.0,
        totalPrice: 1080.0,
      },
    ],
  });

  await prisma.orderEquipment.createMany({
    data: [
      {
        orderId: order1.id,
        equipmentId: equipMemo1.id,
        returned: false,
        conditionNotes: 'Chopeira Memo 2 Vias entregue limpa e higienizada.',
      },
      {
        orderId: order1.id,
        equipmentId: equipCo2_1.id,
        returned: false,
        conditionNotes: 'Cilindro CO2 6kg lacrado e cheio.',
      },
      {
        orderId: order1.id,
        equipmentId: equipManometro1.id,
        returned: false,
        conditionNotes: 'Manômetro duplo regulado para 1.5 bar.',
      },
    ],
  });

  await prisma.financialTransaction.create({
    data: {
      breweryId: demoBrewery.id,
      orderId: order1.id,
      type: 'RECEITA',
      category: 'VENDA_CERVEJA',
      description: `Recebimento PIX - Pedido PED-2026-0001 (Taphouse Imperial)`,
      amount: 5060.0,
      dueDate: new Date('2026-02-20'),
      paymentDate: new Date('2026-02-20'),
      status: 'PAGO',
      paymentMethod: 'PIX',
      documentNumber: 'PIX-E2E-20260220-99881',
    },
  });

  // --- PEDIDO 2: ENTREGUE (Steakhouse Fogo Nobre) ---
  const order2 = await prisma.order.create({
    data: {
      breweryId: demoBrewery.id,
      orderNumber: 'PED-2026-0002',
      clientId: clientSteakhouse.id,
      status: 'ENTREGUE',
      deliveryDate: new Date('2026-02-22T14:30:00Z'),
      estimatedReturnDate: new Date('2026-03-08T18:00:00Z'),
      deliveryAddress: 'Rua das Palmeiras, 450 - Jardim Paulista, Ribeirão Preto - SP',
      subtotal: 3350.0,
      discount: 100.0,
      deliveryFee: 50.0,
      cautionDeposit: 0.0,
      totalAmount: 3300.0,
      paymentMethod: 'BOLETO',
      paymentStatus: 'PAGO',
      paidAmount: 3300.0,
      remainingAmount: 0.0,
      driverUserId: userLogistics.id,
      notes: 'Faturamento quinzenal conforme contrato corporativo.',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order2.id,
        recipeId: recipePilsen.id,
        kegId: createdKegs[4].id,
        description: 'Barril 50L - Ouro Real Pilsen Puro Malte',
        quantity: 2,
        unitPrice: 750.0,
        totalPrice: 1500.0,
      },
      {
        orderId: order2.id,
        recipeId: recipeIpa.id,
        kegId: createdKegs[6].id,
        description: 'Barril 50L - Hop Storm IPA Tropical',
        quantity: 1,
        unitPrice: 1100.0,
        totalPrice: 1100.0,
      },
      {
        orderId: order2.id,
        recipeId: recipePilsen.id,
        kegId: createdKegs[5].id,
        description: 'Barril 50L - Ouro Real Pilsen Puro Malte',
        quantity: 1,
        unitPrice: 750.0,
        totalPrice: 750.0,
      },
    ],
  });

  await prisma.orderEquipment.createMany({
    data: [
      {
        orderId: order2.id,
        equipmentId: equipMemo2.id,
        returned: false,
        conditionNotes: 'Chopeira Memo 220V em comodato contínuo.',
      },
      {
        orderId: order2.id,
        equipmentId: equipCo2_2.id,
        returned: false,
        conditionNotes: 'Cilindro CO2 6kg.',
      },
    ],
  });

  await prisma.financialTransaction.create({
    data: {
      breweryId: demoBrewery.id,
      orderId: order2.id,
      type: 'RECEITA',
      category: 'VENDA_CERVEJA',
      description: `Boleto Faturado Liquidado - Pedido PED-2026-0002 (Fogo Nobre)`,
      amount: 3300.0,
      dueDate: new Date('2026-02-27'),
      paymentDate: new Date('2026-02-26'),
      status: 'PAGO',
      paymentMethod: 'BOLETO',
      documentNumber: 'BOL-2026-00219',
    },
  });

  // --- PEDIDO 3: EM ROTA DE ENTREGA (Dubliner Irish Pub) ---
  const order3 = await prisma.order.create({
    data: {
      breweryId: demoBrewery.id,
      orderNumber: 'PED-2026-0003',
      clientId: clientPubDubliner.id,
      status: 'EM_ROTA',
      deliveryDate: new Date('2026-02-28T16:00:00Z'),
      estimatedReturnDate: new Date('2026-03-15T18:00:00Z'),
      deliveryAddress: 'Rua Itacolomi, 820 - Jardim Sumaré, Ribeirão Preto - SP',
      subtotal: 3800.0,
      discount: 0.0,
      deliveryFee: 50.0,
      cautionDeposit: 0.0,
      totalAmount: 3850.0,
      paymentMethod: 'PIX',
      paymentStatus: 'PARCIAL',
      paidAmount: 1500.0,
      remainingAmount: 2350.0,
      driverUserId: userLogistics.id,
      notes: 'Motorista Lucas em rota de entrega com os barris 11, 12 e 30L-005.',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order3.id,
        recipeId: recipeStout.id,
        kegId: createdKegs[16].id,
        description: 'Barril 30L - Veludo Negro Imperial Stout',
        quantity: 1,
        unitPrice: 960.0,
        totalPrice: 960.0,
      },
      {
        orderId: order3.id,
        recipeId: recipeIpa.id,
        kegId: createdKegs[15].id,
        description: 'Barril 50L - Hop Storm IPA Tropical',
        quantity: 1,
        unitPrice: 1100.0,
        totalPrice: 1100.0,
      },
      {
        orderId: order3.id,
        recipeId: recipePilsen.id,
        kegId: createdKegs[14].id,
        description: 'Barril 50L - Ouro Real Pilsen Puro Malte',
        quantity: 2,
        unitPrice: 750.0,
        totalPrice: 1500.0,
      },
    ],
  });

  await prisma.financialTransaction.createMany({
    data: [
      {
        breweryId: demoBrewery.id,
        orderId: order3.id,
        type: 'RECEITA',
        category: 'VENDA_CERVEJA',
        description: `Sinal 40% PIX - Pedido PED-2026-0003 (Dubliner Pub)`,
        amount: 1500.0,
        dueDate: new Date('2026-02-27'),
        paymentDate: new Date('2026-02-27'),
        status: 'PAGO',
        paymentMethod: 'PIX',
        documentNumber: 'PIX-SINAL-3391',
      },
      {
        breweryId: demoBrewery.id,
        orderId: order3.id,
        type: 'RECEITA',
        category: 'VENDA_CERVEJA',
        description: `Saldo Restante - Pedido PED-2026-0003 (Dubliner Pub)`,
        amount: 2350.0,
        dueDate: new Date('2026-03-01'),
        status: 'PENDENTE',
        paymentMethod: 'PIX',
      },
    ],
  });

  // --- PEDIDO 4: EM SEPARAÇÃO (Evento Família Silveira) ---
  const order4 = await prisma.order.create({
    data: {
      breweryId: demoBrewery.id,
      orderNumber: 'PED-2026-0004',
      clientId: clientCasamentoSilveira.id,
      status: 'EM_SEPARACAO',
      deliveryDate: new Date('2026-03-01T10:00:00Z'),
      estimatedReturnDate: new Date('2026-03-02T16:00:00Z'),
      deliveryAddress: 'Chácara Solar das Flores - Estrada Municipal, 420 - Bonfim Paulista - SP',
      subtotal: 1650.0,
      discount: 50.0,
      deliveryFee: 100.0,
      cautionDeposit: 300.0,
      totalAmount: 2000.0,
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
      paidAmount: 2000.0,
      remainingAmount: 0.0,
      driverUserId: userLogistics.id,
      notes: 'Locação completa para evento de casamento: 2 barris 30L + Chopeira a Gelo + Caução R$ 300.',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order4.id,
        recipeId: recipePilsen.id,
        description: 'Barril 30L - Ouro Real Pilsen Puro Malte',
        quantity: 1,
        unitPrice: 450.0,
        totalPrice: 450.0,
      },
      {
        orderId: order4.id,
        recipeId: recipeIpa.id,
        description: 'Barril 30L - Hop Storm IPA Tropical',
        quantity: 1,
        unitPrice: 660.0,
        totalPrice: 660.0,
      },
      {
        orderId: order4.id,
        description: 'Taxa de Locação Chopeira a Gelo 50L 2 Vias',
        quantity: 1,
        unitPrice: 150.0,
        totalPrice: 150.0,
      },
    ],
  });

  await prisma.orderEquipment.create({
    data: {
      orderId: order4.id,
      equipmentId: equipGelo2.id,
      returned: false,
      conditionNotes: 'Chopeira a gelo limpa, com mangueiras e engates rápidos.',
    },
  });

  await prisma.financialTransaction.create({
    data: {
      breweryId: demoBrewery.id,
      orderId: order4.id,
      type: 'RECEITA',
      category: 'VENDA_CERVEJA',
      description: `Locação e Chopp com Caução - Pedido PED-2026-0004 (Casamento Silveira)`,
      amount: 2000.0,
      dueDate: new Date('2026-02-28'),
      paymentDate: new Date('2026-02-28'),
      status: 'PAGO',
      paymentMethod: 'PIX',
      documentNumber: 'PIX-CASAMENTO-889',
    },
  });

  // --- PEDIDO 5: CONFIRMADO (Arena Beach Tennis) ---
  const order5 = await prisma.order.create({
    data: {
      breweryId: demoBrewery.id,
      orderNumber: 'PED-2026-0005',
      clientId: clientArenaSports.id,
      status: 'CONFIRMADO',
      deliveryDate: new Date('2026-03-05T09:00:00Z'),
      estimatedReturnDate: new Date('2026-03-12T18:00:00Z'),
      deliveryAddress: 'Rodovia Prefeito Antônio Duarte Nogueira, KM 318 - Recreio das Acácias',
      subtotal: 4250.0,
      discount: 150.0,
      deliveryFee: 60.0,
      cautionDeposit: 0.0,
      totalAmount: 4160.0,
      paymentMethod: 'PIX',
      paymentStatus: 'PENDENTE',
      paidAmount: 0.0,
      remainingAmount: 4160.0,
      notes: 'Torneio de Beach Tennis etapa regional. 5 barris 50L de Pilsen e Session IPA.',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order5.id,
        recipeId: recipePilsen.id,
        description: 'Barril 50L - Ouro Real Pilsen Puro Malte',
        quantity: 3,
        unitPrice: 750.0,
        totalPrice: 2250.0,
      },
      {
        orderId: order5.id,
        recipeId: recipeSession.id,
        description: 'Barril 50L - Brisa Leve Session IPA',
        quantity: 2,
        unitPrice: 900.0,
        totalPrice: 1800.0,
      },
    ],
  });

  // --- PEDIDO 6: ORÇAMENTO (Empório Villa Madalena) ---
  const order6 = await prisma.order.create({
    data: {
      breweryId: demoBrewery.id,
      orderNumber: 'PED-2026-0006',
      clientId: clientEmporioVilla.id,
      status: 'ORCAMENTO',
      deliveryDate: new Date('2026-03-10T14:00:00Z'),
      deliveryAddress: 'Rua Fiúsa, 2100 - Jardim São Luiz, Ribeirão Preto - SP',
      subtotal: 3900.0,
      discount: 200.0,
      deliveryFee: 40.0,
      cautionDeposit: 0.0,
      totalAmount: 3740.0,
      paymentMethod: 'BOLETO',
      paymentStatus: 'PENDENTE',
      paidAmount: 0.0,
      remainingAmount: 3740.0,
      notes: 'Orçamento para abastecimento do Growler Station na reinauguração.',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order6.id,
        recipeId: recipeSour.id,
        description: 'Barril 30L - Rubi Tropical Catharina Sour',
        quantity: 2,
        unitPrice: 720.0,
        totalPrice: 1440.0,
      },
      {
        orderId: order6.id,
        recipeId: recipeIpa.id,
        description: 'Barril 50L - Hop Storm IPA Tropical',
        quantity: 2,
        unitPrice: 1100.0,
        totalPrice: 2200.0,
      },
    ],
  });

  // ============================================================================
  // 12. TRANSAÇÕES FINANCEIRAS DE DESPESAS (CUSTOS OPERACIONAIS & INSUMOS)
  // ============================================================================
  await prisma.financialTransaction.createMany({
    data: [
      {
        breweryId: demoBrewery.id,
        type: 'DESPESA',
        category: 'COMPRA_INSUMO',
        description: 'Compra de 3.000kg Malte Pilsen - NF 44820 Agrária',
        amount: 14400.0,
        dueDate: new Date('2026-02-25'),
        paymentDate: new Date('2026-02-24'),
        status: 'PAGO',
        paymentMethod: 'BOLETO',
        documentNumber: 'NF-44820',
      },
      {
        breweryId: demoBrewery.id,
        type: 'DESPESA',
        category: 'COMPRA_INSUMO',
        description: 'Compra de Lúpulos Citra e Mosaic - BarthHaas',
        amount: 8500.0,
        dueDate: new Date('2026-02-28'),
        paymentDate: new Date('2026-02-28'),
        status: 'PAGO',
        paymentMethod: 'PIX',
        documentNumber: 'NF-11928',
      },
      {
        breweryId: demoBrewery.id,
        type: 'DESPESA',
        category: 'MANUTENCAO',
        description: 'Manutenção preventiva e calibração de chopeiras Memo',
        amount: 680.0,
        dueDate: new Date('2026-02-20'),
        paymentDate: new Date('2026-02-20'),
        status: 'PAGO',
        paymentMethod: 'PIX',
        documentNumber: 'OS-8821',
      },
      {
        breweryId: demoBrewery.id,
        type: 'DESPESA',
        category: 'FIXO',
        description: 'Energia Elétrica Câmara Fria e Fábrica - CPFL Paulista',
        amount: 2850.0,
        dueDate: new Date('2026-03-10'),
        status: 'PENDENTE',
        paymentMethod: 'BOLETO',
        documentNumber: 'CPFL-022026',
      },
    ],
  });

  // ============================================================================
  // 13. LOGS DE AUDITORIA E DESFAZER AÇÕES (ACTION LOGS)
  // ============================================================================
  await prisma.actionLog.createMany({
    data: [
      {
        breweryId: demoBrewery.id,
        userId: userBrewer.id,
        userName: userBrewer.name,
        actionType: 'BATCH_STATUS',
        description: 'Alterou status do Lote LOTE-2026-041 para MATURANDO no tanque F-02 (1000L).',
        entityType: 'ProductionBatch',
        entityId: batchPilsen.id,
        canUndo: true,
        undone: false,
      },
      {
        breweryId: demoBrewery.id,
        userId: userLogistics.id,
        userName: userLogistics.name,
        actionType: 'KEG_STATUS',
        description: 'Registrou entrega de 4 barris e chopeira no cliente Taphouse Imperial (Pedido PED-2026-0001).',
        entityType: 'Order',
        entityId: order1.id,
        canUndo: true,
        undone: false,
      },
      {
        breweryId: demoBrewery.id,
        userId: userFinance.id,
        userName: userFinance.name,
        actionType: 'PAYMENT_RECORD',
        description: 'Confirmou liquidação de pagamento PIX R$ 5.060,00 do Pedido PED-2026-0001.',
        entityType: 'FinancialTransaction',
        entityId: order1.id,
        canUndo: true,
        undone: false,
      },
    ],
  });

  console.log('🎉 Povoamento completo da Cervejaria Teste finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
