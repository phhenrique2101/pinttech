import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies, getSessionFromRequest, signBiApiToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req) || getSessionFromCookies();

  if (!session) {
    return NextResponse.json({ error: 'Não autorizado. Faça login no sistema.' }, { status: 401 });
  }

  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Acesso negado. A integração analítica com o Power BI é restrita exclusivamente ao proprietário da plataforma.' },
      { status: 403 }
    );
  }

  // Generate a long-lived 365-day analytical token for Power BI
  const biToken = signBiApiToken(session);

  // Parse connection info from DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || '';
  let dbInfo = {
    host: 'ep-proud-silence-axkarls5.us-east-2.aws.neon.tech',
    port: 5432,
    database: 'neondb',
    username: 'neondb_owner',
    sslMode: 'require',
  };

  try {
    const parsed = new URL(dbUrl);
    dbInfo = {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      database: parsed.pathname.replace('/', '') || 'neondb',
      username: parsed.username || 'neondb_owner',
      sslMode: parsed.searchParams.get('sslmode') || 'require',
    };
  } catch {
    // Keep defaults if parsing fails
  }

  // Get brewery name if applicable
  let breweryName = 'Todas as Cervejarias (Visão Master)';
  if (session.breweryId) {
    const brewery = await prisma.brewery.findUnique({
      where: { id: session.breweryId },
      select: { name: true },
    });
    if (brewery) breweryName = brewery.name;
  }

  const baseUrl = req.nextUrl.origin;

  const datasets = [
    { key: 'vendas', name: 'Fato Vendas & Pedidos', view: 'vw_bi_fato_pedidos_vendas' },
    { key: 'producao', name: 'Fato Produção & Lotes', view: 'vw_bi_fato_producao_lotes' },
    { key: 'barris', name: 'Fato Barris (Posição Atual)', view: 'vw_bi_fato_barris_posicao_atual' },
    { key: 'movimentacoes', name: 'Fato Histórico de Barris', view: 'vw_bi_fato_barris_movimentacoes' },
    { key: 'financeiro', name: 'Fato Financeiro & Fluxo', view: 'vw_bi_fato_financeiro' },
    { key: 'estoque', name: 'Fato Movimentação de Estoque', view: 'vw_bi_fato_movimentacao_estoque' },
    { key: 'insumos', name: 'Dimensão Insumos & Matéria-Prima', view: 'vw_bi_dim_insumos' },
    { key: 'clientes', name: 'Dimensão Clientes & PDVs', view: 'vw_bi_dim_clientes' },
    { key: 'receitas', name: 'Dimensão Receitas & Cervejas', view: 'vw_bi_dim_receitas' },
    { key: 'tanques', name: 'Dimensão Tanques', view: 'vw_bi_dim_tanques' },
    { key: 'equipamentos', name: 'Dimensão Equipamentos & Chopeiras', view: 'vw_bi_dim_equipamentos' },
    { key: 'fornecedores', name: 'Dimensão Fornecedores', view: 'vw_bi_dim_fornecedores' },
    { key: 'cervejarias', name: 'Dimensão Cervejarias', view: 'vw_bi_dim_cervejarias' },
  ].map((d) => ({
    ...d,
    url: `${baseUrl}/api/bi?dataset=${d.key}&token=${biToken}`,
    csvUrl: `${baseUrl}/api/bi?dataset=${d.key}&format=csv&token=${biToken}`,
  }));

  return NextResponse.json({
    token: biToken,
    user: {
      name: session.name,
      email: session.email,
      role: session.role,
      breweryId: session.breweryId,
      breweryName,
    },
    directConnection: dbInfo,
    datasets,
  });
}
