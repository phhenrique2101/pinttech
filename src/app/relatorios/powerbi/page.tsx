'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Database,
  Key,
  Copy,
  Check,
  ExternalLink,
  FileCode,
  Download,
  RefreshCw,
  Table as TableIcon,
  BookOpen,
  ShieldCheck,
  Layers,
  Sparkles,
  ArrowRight,
  Cylinder,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Eye,
  EyeOff,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface BiDatasetInfo {
  key: string;
  name: string;
  view: string;
  url: string;
  csvUrl: string;
}

interface BiConfigData {
  token: string;
  user: {
    name: string;
    email: string;
    role: string;
    breweryId: string | null;
    breweryName: string;
  };
  directConnection: {
    host: string;
    port: number;
    database: string;
    username: string;
    sslMode: string;
  };
  datasets: BiDatasetInfo[];
}

export default function PowerBiIntegrationPage() {
  const [activeTab, setActiveTab] = useState<'CREDENTIALS' | 'EXPLORER' | 'POWERQUERY' | 'DAX' | 'TUTORIAL'>('CREDENTIALS');
  const [config, setConfig] = useState<BiConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  // Data preview state
  const [selectedDataset, setSelectedDataset] = useState('vendas');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // DAX Category filter
  const [daxCategory, setDaxCategory] = useState<'ALL' | 'VENDAS' | 'PRODUCAO' | 'BARRIS' | 'FINANCEIRO'>('ALL');

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'EXPLORER' && config?.token) {
      loadPreview(selectedDataset);
    }
  }, [activeTab, selectedDataset, config?.token]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bi/token');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações do Power BI:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (datasetKey: string) => {
    if (!config?.token) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/bi?dataset=${datasetKey}&token=${config.token}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(Array.isArray(data) ? data : []);
      } else {
        setPreviewData([]);
      }
    } catch (err) {
      console.error('Erro ao carregar prévia:', err);
      setPreviewData([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const DAX_ITEMS = [
    {
      title: 'Faturamento Bruto (R$)',
      category: 'VENDAS',
      desc: 'Soma do valor de todos os itens e barris faturados.',
      formula: 'Faturamento Total = SUM(Fato_Vendas_Pedidos[item_total_price])',
    },
    {
      title: 'Volume Total Vendido (Litros)',
      category: 'VENDAS',
      desc: 'Soma dos litros entregues em pedidos confirmados.',
      formula: 'Volume Vendido (Litros) = SUM(Fato_Vendas_Pedidos[total_volume_liters])',
    },
    {
      title: 'Ticket Médio por Pedido (R$)',
      category: 'VENDAS',
      desc: 'Faturamento dividido pelo total de pedidos distintos.',
      formula: 'Ticket Médio = DIVIDE([Faturamento Total], DISTINCTCOUNT(Fato_Vendas_Pedidos[order_id]), 0)',
    },
    {
      title: 'Preço Médio por Litro (R$/L)',
      category: 'VENDAS',
      desc: 'Faturamento total dividido pelo volume total vendido.',
      formula: 'Preço Médio / Litro = DIVIDE([Faturamento Total], [Volume Vendido (Litros)], 0)',
    },
    {
      title: 'Margem Bruta Comercial (%)',
      category: 'VENDAS',
      desc: 'Lucro bruto estimado sobre o faturamento.',
      formula: 'Margem Bruta (%) = DIVIDE(SUM(Fato_Vendas_Pedidos[estimated_gross_profit]), [Faturamento Total], 0)',
    },
    {
      title: 'Volume Total Brassado (Litros)',
      category: 'PRODUCAO',
      desc: 'Soma do volume efetivo de cerveja produzida nos lotes.',
      formula: 'Volume Brassado (Litros) = SUM(Fato_Producao_Lotes[effective_volume_liters])',
    },
    {
      title: 'Custo Médio por Litro Brassado (R$/L)',
      category: 'PRODUCAO',
      desc: 'Custo total de produção dividido pelos litros brassados.',
      formula: 'Custo Médio / Litro = DIVIDE(SUM(Fato_Producao_Lotes[total_cost]), [Volume Brassado (Litros)], 0)',
    },
    {
      title: 'Eficiência de Volume Produzido (%)',
      category: 'PRODUCAO',
      desc: 'Relação entre volume real envasado vs planejado na receita.',
      formula: 'Eficiência Volume (%) = DIVIDE(SUM(Fato_Producao_Lotes[volume_produced_liters]), SUM(Fato_Producao_Lotes[volume_planned_liters]), 0)',
    },
    {
      title: 'Total de Barris no Parque (Frota)',
      category: 'BARRIS',
      desc: 'Contagem total de vasilhames cadastrados.',
      formula: 'Total Barris Frota = COUNTROWS(Fato_Barris_Posicao)',
    },
    {
      title: 'Barris em Clientes (Em Campo)',
      category: 'BARRIS',
      desc: 'Quantidade de barris que estão atualmente em posse de clientes.',
      formula: 'Barris em Clientes = CALCULATE(COUNTROWS(Fato_Barris_Posicao), Fato_Barris_Posicao[current_status] = "NO_CLIENTE")',
    },
    {
      title: 'Barris Disponíveis Cheios (Câmara Fria)',
      category: 'BARRIS',
      desc: 'Barris envasados prontos para venda ou entrega imediata.',
      formula: 'Barris Disponíveis = CALCULATE(COUNTROWS(Fato_Barris_Posicao), Fato_Barris_Posicao[current_status] IN {"EM_ESTOQUE", "ENVASADO"})',
    },
    {
      title: 'Tempo Médio no Cliente (Dias de Giro)',
      category: 'BARRIS',
      desc: 'Média de dias que cada barril permanece no PDV até recolha.',
      formula: 'Dias Médios no Cliente = CALCULATE(AVERAGE(Fato_Barris_Posicao[days_at_client]), Fato_Barris_Posicao[current_status] = "NO_CLIENTE")',
    },
    {
      title: 'Barris com Alerta Crítico (> 30 Dias)',
      category: 'BARRIS',
      desc: 'Barris que ultrapassaram 30 dias de permanência no cliente.',
      formula: 'Barris Alerta 30D = CALCULATE(COUNTROWS(Fato_Barris_Posicao), Fato_Barris_Posicao[current_status] = "NO_CLIENTE", Fato_Barris_Posicao[days_at_client] > 30)',
    },
    {
      title: 'Receitas Liquidadas (R$)',
      category: 'FINANCEIRO',
      desc: 'Total de contas a receber efetivamente pagas.',
      formula: 'Receitas Realizadas = CALCULATE(SUM(Fato_Financeiro[amount]), Fato_Financeiro[transaction_type] = "RECEITA", Fato_Financeiro[payment_status] = "PAGO")',
    },
    {
      title: 'Despesas Pagas (R$)',
      category: 'FINANCEIRO',
      desc: 'Total de contas pagas e custos liquidados.',
      formula: 'Despesas Pagas = CALCULATE(SUM(Fato_Financeiro[amount]), Fato_Financeiro[transaction_type] = "DESPESA", Fato_Financeiro[payment_status] = "PAGO")',
    },
    {
      title: 'Resultado Operacional de Caixa (R$)',
      category: 'FINANCEIRO',
      desc: 'Saldo financeiro líquido (Receitas pagas - Despesas pagas).',
      formula: 'Resultado de Caixa = [Receitas Realizadas] - [Despesas Pagas]',
    },
    {
      title: 'Inadimplência / Títulos Vencidos (R$)',
      category: 'FINANCEIRO',
      desc: 'Valores pendentes com data de vencimento ultrapassada.',
      formula: 'Inadimplência Vencida = CALCULATE(SUM(Fato_Financeiro[amount]), Fato_Financeiro[payment_status] = "PENDENTE", Fato_Financeiro[days_overdue] > 0)',
    },
  ];

  const filteredDax = daxCategory === 'ALL' ? DAX_ITEMS : DAX_ITEMS.filter((d) => d.category === daxCategory);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 p-8 text-white shadow-2xl border border-amber-500/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Business Intelligence Nativo</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <BarChart3 className="w-9 h-9 text-amber-300" />
              <span>Integração Microsoft Power BI</span>
            </h1>
            <p className="text-slate-200 max-w-2xl text-sm md:text-base leading-relaxed">
              Conecte 100% dos dados operacionais da cervejaria (Vendas, Lotes de Produção, Giro de Barris, Estoque e Financeiro)
              ao Power BI Desktop e Power BI Cloud com atualização automática.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/relatorios"
              className="px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900/80 border border-white/20 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <span>Voltar aos Relatórios</span>
            </Link>
            <a
              href="/powerbi/README.md"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ver Documentação Completa</span>
            </a>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-1">
        {[
          { id: 'CREDENTIALS', label: 'Conexão & Credenciais', icon: Key },
          { id: 'EXPLORER', label: 'Explorador de Dados (Prévia)', icon: TableIcon },
          { id: 'POWERQUERY', label: 'Scripts Power Query (M)', icon: FileCode },
          { id: 'DAX', label: 'Medidas DAX Prontas', icon: Layers },
          { id: 'TUTORIAL', label: 'Guia Passo a Passo', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold rounded-xl transition whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CREDENCIAIS E LINKS DE CONEXÃO */}
      {activeTab === 'CREDENTIALS' && (
        <div className="space-y-6">
          {/* Tenant summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ambiente & Segurança Multi-Tenant</span>
                <h3 className="text-base font-bold text-white">
                  {config?.user.breweryName || 'Cervejaria Identificada'}
                </h3>
                <p className="text-xs text-slate-400">
                  Usuário conectado: <span className="text-amber-400 font-semibold">{config?.user.name}</span> ({config?.user.role})
                </p>
              </div>
            </div>

            <button
              onClick={fetchConfig}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar Credenciais</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Opção A: Conexão Web / API Feed */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Opção 1: Web Feed / API REST</h3>
                    <p className="text-xs text-emerald-400 font-medium">Recomendado para Power BI Service (Nuvem sem Gateway)</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 uppercase">Automático</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Permite que seus relatórios no PowerBI.com sejam atualizados automaticamente todo dia ou a cada hora,
                sem instalar gateways em seu computador.
              </p>

              {/* Token Display */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Seu Token de Acesso BI (Válido por 365 dias):</span>
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showToken ? 'Ocultar' : 'Visualizar'}</span>
                  </button>
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-slate-300">
                  <input
                    type={showToken ? 'text' : 'password'}
                    readOnly
                    value={config?.token || 'Carregando token...'}
                    className="bg-transparent flex-1 outline-none text-slate-200"
                  />
                  <button
                    onClick={() => handleCopy(config?.token || '', 'biToken')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Copiar Token"
                  >
                    {copiedKey === 'biToken' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Ready URLs per dataset */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  URLs Prontas para Obter Dados &gt; Web:
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(config?.datasets || []).slice(0, 6).map((ds) => (
                    <div
                      key={ds.key}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="truncate">
                        <p className="font-bold text-slate-200 truncate">{ds.name}</p>
                        <p className="text-[11px] text-slate-500 truncate font-mono">{ds.url}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleCopy(ds.url, ds.key)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                        >
                          {copiedKey === ds.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === ds.key ? 'Copiado' : 'Copiar URL'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Opção B: Conexão Direta PostgreSQL */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Opção 2: Conexão Direta PostgreSQL</h3>
                    <p className="text-xs text-blue-400 font-medium">Recomendado para Power BI Desktop (Windows)</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-300 uppercase">Alta Performance</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Conexão nativa de alta velocidade com acesso direto às 13 Views Analíticas SQL (Star Schema)
                já criadas no banco Neon.
              </p>

              <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-500 font-sans">Servidor / Host:</span>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span>{config?.directConnection.host || 'ep-proud-silence-axkarls5...'}</span>
                    <button
                      onClick={() => handleCopy(config?.directConnection.host || '', 'host')}
                      className="p-1 hover:text-amber-400"
                    >
                      {copiedKey === 'host' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-500 font-sans">Banco de Dados:</span>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span>{config?.directConnection.database || 'neondb'}</span>
                    <button
                      onClick={() => handleCopy(config?.directConnection.database || 'neondb', 'database')}
                      className="p-1 hover:text-amber-400"
                    >
                      {copiedKey === 'database' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-500 font-sans">Porta:</span>
                  <span className="text-slate-200">5432</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-500 font-sans">Usuário:</span>
                  <span className="text-slate-200">{config?.directConnection.username || 'neondb_owner'}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Modo SSL / Criptografia:</span>
                  <span className="text-emerald-400 font-bold">Obrigatório (Require)</span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-200/90">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p>
                  No Power BI Desktop, selecione o schema <strong>public</strong> e marque todas as tabelas
                  iniciadas por <code className="bg-black/30 px-1 py-0.5 rounded text-amber-300 font-mono">vw_bi_*</code> para obter as dimensões e fatos já tipadas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXPLORADOR DE DADOS */}
      {activeTab === 'EXPLORER' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base">Visualizador Prévio de Dados das Views</h3>
                <p className="text-xs text-slate-400">
                  Veja em tempo real a estrutura exata de dados que o Power BI consumirá.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="bg-slate-800 text-amber-300 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="vendas">🍺 Vendas & Pedidos (Fato)</option>
                  <option value="producao">🔥 Produção & Brassagens (Fato)</option>
                  <option value="barris">🛢️ Barris Posição Atual (Fato)</option>
                  <option value="movimentacoes">🚚 Movimentações de Barris (Fato)</option>
                  <option value="financeiro">💰 Financeiro & Fluxo de Caixa (Fato)</option>
                  <option value="estoque">📦 Movimentação de Estoque (Fato)</option>
                  <option value="insumos">🌾 Insumos & Matéria-Prima (Dimensão)</option>
                  <option value="clientes">👥 Clientes & PDVs (Dimensão)</option>
                  <option value="receitas">📜 Receitas Cervejeiras (Dimensão)</option>
                  <option value="tanques">🏭 Tanques & Adega (Dimensão)</option>
                  <option value="equipamentos">🛠️ Equipamentos & Chopeiras (Dimensão)</option>
                  <option value="fornecedores">🏢 Fornecedores (Dimensão)</option>
                </select>

                <a
                  href={`/api/bi?dataset=${selectedDataset}&format=csv&token=${config?.token}`}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition"
                  title="Exportar CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar CSV</span>
                </a>
              </div>
            </div>

            {/* Data Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              {previewLoading ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="text-xs">Consultando view analítica no PostgreSQL...</span>
                </div>
              ) : previewData.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Nenhum registro encontrado para este dataset na sua cervejaria.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900/90 sticky top-0 border-b border-slate-800">
                      <tr>
                        {Object.keys(previewData[0]).map((col) => (
                          <th key={col} className="p-2.5 font-bold text-slate-300 font-mono text-[11px] whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {previewData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40 transition">
                          {Object.keys(row).map((col) => (
                            <td key={col} className="p-2.5 text-slate-300 whitespace-nowrap font-mono text-[11px]">
                              {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-600">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-500 text-right">
              Exibindo amostra de até 20 registros mais recentes desta view.
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SCRIPTS POWER QUERY (M) */}
      {activeTab === 'POWERQUERY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-400" />
                <span>Scripts Power Query (Linguagem M) Prontos</span>
              </h3>
              <p className="text-xs text-slate-400">
                Copie o código e cole diretamente no <strong>Editor Avançado</strong> do Power BI para carregar a tabela já tipada.
              </p>
            </div>

            <a
              href="/powerbi/PintTech_PowerQuery_M.txt"
              download="PintTech_PowerQuery_M.txt"
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo Completo (.txt)</span>
            </a>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-amber-300">Consulta Power Query M: Fato_Vendas_Pedidos</span>
                <button
                  onClick={() =>
                    handleCopy(
                      `let\n    Url = "${typeof window !== 'undefined' ? window.location.origin : ''}/api/bi?dataset=vendas&token=${config?.token}",\n    Source = Json.Document(Web.Contents(Url)),\n    #"Convertido para Tabela" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),\n    #"Expanded Column1" = Table.ExpandRecordColumn(#"Convertido para Tabela", "Column1", {"order_item_id", "order_id", "order_number", "order_status", "order_date", "client_name", "beer_name", "total_volume_liters", "item_total_price", "estimated_gross_profit"}),\n    #"Tipos Alterados" = Table.TransformColumnTypes(#"Expanded Column1",{{"order_date", type date}, {"total_volume_liters", type number}, {"item_total_price", Currency.Type}, {"estimated_gross_profit", Currency.Type}})\nin\n    #"Tipos Alterados"`,
                      'mCodeVendas'
                    )
                  }
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  {copiedKey === 'mCodeVendas' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'mCodeVendas' ? 'Copiado!' : 'Copiar M Code'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-3 rounded-lg overflow-x-auto">
{`let
    Url = "${typeof window !== 'undefined' ? window.location.origin : 'https://seu-sistema.com'}/api/bi?dataset=vendas&token=${config?.token || 'SEU_TOKEN'}",
    Source = Json.Document(Web.Contents(Url)),
    #"Convertido para Tabela" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Expanded Column1" = Table.ExpandRecordColumn(#"Convertido para Tabela", "Column1", 
        {"order_item_id", "order_id", "order_number", "order_status", "order_date", "client_name", "beer_name", "total_volume_liters", "item_total_price", "estimated_gross_profit"}),
    #"Tipos Alterados" = Table.TransformColumnTypes(#"Expanded Column1",{
        {"order_date", type date},
        {"total_volume_liters", type number},
        {"item_unit_price", Currency.Type},
        {"item_total_price", Currency.Type},
        {"estimated_gross_profit", Currency.Type}
    })
in
    #"Tipos Alterados"`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MEDIDAS DAX */}
      {activeTab === 'DAX' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>Biblioteca de Fórmulas DAX Prontas</span>
              </h3>
              <p className="text-xs text-slate-400">
                Copie e cole no Power BI para criar cartões de KPI, velocímetros e tabelas de métricas.
              </p>
            </div>

            {/* Filter tags */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['ALL', 'VENDAS', 'PRODUCAO', 'BARRIS', 'FINANCEIRO'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDaxCategory(cat as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    daxCategory === cat
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat === 'ALL' ? 'Todas' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDax.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-800 text-amber-400">
                      {item.category}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-1">{item.title}</h4>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(item.formula, `dax_${idx}`)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex-shrink-0"
                    title="Copiar Fórmula DAX"
                  >
                    {copiedKey === `dax_${idx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl font-mono text-[11px] text-amber-200/90 overflow-x-auto">
                  <code>{item.formula}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: GUIA PASSO A PASSO */}
      {activeTab === 'TUTORIAL' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="font-bold text-white text-base">Tutorial Rápido de Conexão no Power BI</h3>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center flex-shrink-0">
                1
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">Abra o Power BI Desktop</h4>
                <p className="text-xs text-slate-400">
                  Na tela inicial, clique em <strong>Obter Dados</strong> na barra superior.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center flex-shrink-0">
                2
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">Escolha a Opção de Conector</h4>
                <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                  <li><strong>Para Web Feed:</strong> Escolha &quot;Web&quot;, cole a URL gerada na aba &quot;Conexão & Credenciais&quot; e clique em OK.</li>
                  <li><strong>Para PostgreSQL:</strong> Escolha &quot;Banco de Dados PostgreSQL&quot;, informe o Servidor e Banco e marque o modo Importar.</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center flex-shrink-0">
                3
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">Carregue e Modele</h4>
                <p className="text-xs text-slate-400">
                  Todas as colunas já vêm limpas e desnormalizadas. Conecte as chaves <code className="text-amber-400">client_id</code>, <code className="text-amber-400">recipe_id</code> e <code className="text-amber-400">batch_id</code> para formar o Esquema Estrela.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center flex-shrink-0">
                4
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">Publicação e Atualização Automática</h4>
                <p className="text-xs text-slate-400">
                  Publique no Power BI Service (app.powerbi.com) e agende a atualização diária ou horária nas Configurações do Conjunto de Dados.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
