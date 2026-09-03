import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken, getSessionFromCookies } from '@/lib/auth';

// Mapping from dataset name to view name
const DATASET_VIEW_MAP: Record<string, { view: string; label: string; tenantField: string }> = {
  vendas: { view: 'vw_bi_fato_pedidos_vendas', label: 'Vendas & Pedidos (Fato)', tenantField: 'brewery_id' },
  producao: { view: 'vw_bi_fato_producao_lotes', label: 'Produção & Brassagens (Fato)', tenantField: 'brewery_id' },
  barris: { view: 'vw_bi_fato_barris_posicao_atual', label: 'Barris Posição Atual (Fato)', tenantField: 'brewery_id' },
  movimentacoes: { view: 'vw_bi_fato_barris_movimentacoes', label: 'Movimentações de Barris (Fato)', tenantField: 'brewery_id' },
  financeiro: { view: 'vw_bi_fato_financeiro', label: 'Financeiro & Fluxo de Caixa (Fato)', tenantField: 'brewery_id' },
  estoque: { view: 'vw_bi_fato_movimentacao_estoque', label: 'Movimentação de Estoque (Fato)', tenantField: 'brewery_id' },
  insumos: { view: 'vw_bi_dim_insumos', label: 'Insumos de Estoque (Dimensão)', tenantField: 'brewery_id' },
  clientes: { view: 'vw_bi_dim_clientes', label: 'Clientes & PDVs (Dimensão)', tenantField: 'brewery_id' },
  receitas: { view: 'vw_bi_dim_receitas', label: 'Receitas & Cervejas (Dimensão)', tenantField: 'brewery_id' },
  tanques: { view: 'vw_bi_dim_tanques', label: 'Tanques & Adega (Dimensão)', tenantField: 'brewery_id' },
  equipamentos: { view: 'vw_bi_dim_equipamentos', label: 'Equipamentos & Chopeiras (Dimensão)', tenantField: 'brewery_id' },
  fornecedores: { view: 'vw_bi_dim_fornecedores', label: 'Fornecedores (Dimensão)', tenantField: 'brewery_id' },
  cervejarias: { view: 'vw_bi_dim_cervejarias', label: 'Cervejarias (Dimensão Tenant)', tenantField: 'brewery_id' },
};

// CORS headers helper
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With, Accept',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cors = getCorsHeaders();

  // 1. Authenticate via URL parameter, Header, or Cookie
  const tokenParam = searchParams.get('token');
  const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
  const rawToken = tokenParam || authHeader;

  let session = rawToken ? verifyJwtToken(rawToken) : null;
  if (!session) {
    session = getSessionFromCookies();
  }

  if (!session) {
    return NextResponse.json(
      {
        error: 'Não autorizado. Forneça um token válido no parâmetro ?token=... ou no Header Authorization: Bearer ...',
        hint: 'Você pode gerar o seu Token de Integração Power BI na aba Relatórios > Power BI do PintTech.',
      },
      { status: 401, headers: cors }
    );
  }

  const isSuperAdmin = session.role === 'SUPER_ADMIN';
  // Super admin can specify a specific brewery via query param, or sees all
  const targetBreweryId = searchParams.get('breweryId') || session.breweryId;

  const dataset = searchParams.get('dataset')?.toLowerCase();
  const format = searchParams.get('format')?.toLowerCase() || 'json';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20000', 10), 50000);

  // 2. If no dataset specified, return discovery catalog for Power BI
  if (!dataset) {
    const catalog = Object.entries(DATASET_VIEW_MAP).map(([key, config]) => {
      const baseUrl = req.nextUrl.origin;
      return {
        dataset: key,
        label: config.label,
        view: config.view,
        powerBiJsonUrl: `${baseUrl}/api/bi?dataset=${key}&token=${rawToken || 'SEU_TOKEN'}`,
        powerBiCsvUrl: `${baseUrl}/api/bi?dataset=${key}&format=csv&token=${rawToken || 'SEU_TOKEN'}`,
      };
    });

    return NextResponse.json(
      {
        system: 'PintTech Power BI Analytical API',
        version: '1.0.0',
        authenticatedAs: {
          name: session.name,
          role: session.role,
          breweryId: targetBreweryId || 'TODAS (MASTER)',
        },
        datasets: catalog,
      },
      { headers: cors }
    );
  }

  // 3. Validate requested dataset
  const targetConfig = DATASET_VIEW_MAP[dataset];
  if (!targetConfig) {
    return NextResponse.json(
      {
        error: `Dataset '${dataset}' não encontrado.`,
        availableDatasets: Object.keys(DATASET_VIEW_MAP),
      },
      { status: 400, headers: cors }
    );
  }

  try {
    // 4. Query the analytical view safely
    let rows: any[] = [];
    if (targetBreweryId) {
      // Filter by tenant
      rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${targetConfig.view}" WHERE "${targetConfig.tenantField}" = $1 LIMIT $2`,
        targetBreweryId,
        limit
      );
    } else if (isSuperAdmin) {
      // Global view for Super Admin
      rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${targetConfig.view}" LIMIT $1`,
        limit
      );
    } else {
      rows = [];
    }

    // Convert BigInts or dates for JSON serialization if necessary
    const sanitizedRows = rows.map((r) => {
      const cleanObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(r)) {
        if (typeof val === 'bigint') {
          cleanObj[key] = Number(val);
        } else {
          cleanObj[key] = val;
        }
      }
      return cleanObj;
    });

    // 5. Return CSV if requested
    if (format === 'csv') {
      if (sanitizedRows.length === 0) {
        return new NextResponse('', {
          headers: {
            ...cors,
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="pinttech_${dataset}.csv"`,
          },
        });
      }

      const headers = Object.keys(sanitizedRows[0]);
      const csvLines = [
        headers.join(';'),
        ...sanitizedRows.map((row) =>
          headers
            .map((h) => {
              const val = row[h];
              if (val === null || val === undefined) return '';
              const str = String(val).replace(/"/g, '""');
              return `"${str}"`;
            })
            .join(';')
        ),
      ];

      return new NextResponse(csvLines.join('\n'), {
        headers: {
          ...cors,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="pinttech_${dataset}.csv"`,
        },
      });
    }

    // Default JSON
    return NextResponse.json(sanitizedRows, { headers: cors });
  } catch (error: any) {
    console.error(`Erro ao consultar view ${targetConfig.view}:`, error);
    return NextResponse.json(
      {
        error: `Erro ao buscar dados do dataset ${dataset}`,
        details: error.message,
      },
      { status: 500, headers: cors }
    );
  }
}
