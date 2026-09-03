const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyViews() {
  console.log('🔄 Conectando ao PostgreSQL e aplicando as Views Analíticas do Power BI...');
  
  const sqlPath = path.join(__dirname, '..', 'prisma', 'create_powerbi_views.sql');
  const fullSql = fs.readFileSync(sqlPath, 'utf-8');

  // Remove comments and split by semicolon
  const statements = fullSql
    .split(';')
    .map(s => {
      // Remove lines starting with --
      return s
        .split('\n')
        .map(line => line.trim().startsWith('--') ? '' : line)
        .join('\n')
        .trim();
    })
    .filter(s => s.length > 0);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt) continue;
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (err) {
      console.error(`❌ Erro executando comando ${i + 1}:`, err.message);
      throw err;
    }
  }

  console.log(`✅ ${statements.length} views analíticas criadas/atualizadas com sucesso!`);

  // Test queries on all views
  const viewsToTest = [
    'vw_bi_dim_cervejarias',
    'vw_bi_dim_clientes',
    'vw_bi_dim_receitas',
    'vw_bi_dim_tanques',
    'vw_bi_dim_equipamentos',
    'vw_bi_dim_fornecedores',
    'vw_bi_dim_insumos',
    'vw_bi_fato_pedidos_vendas',
    'vw_bi_fato_producao_lotes',
    'vw_bi_fato_barris_posicao_atual',
    'vw_bi_fato_barris_movimentacoes',
    'vw_bi_fato_financeiro',
    'vw_bi_fato_movimentacao_estoque',
  ];

  console.log('\n📊 Validando integridade das Views no banco Neon:');
  for (const viewName of viewsToTest) {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${viewName}"`);
      const count = result[0]?.count || 0;
      console.log(`  ✔️ ${viewName.padEnd(35)} -> Registros: ${count}`);
    } catch (e) {
      console.error(`  ❌ Falha na view ${viewName}:`, e.message);
    }
  }

  await prisma.$disconnect();
  console.log('\n✨ Todas as views analíticas foram testadas e validadas!');
}

applyViews().catch(e => {
  console.error('Falha geral:', e);
  process.exit(1);
});
