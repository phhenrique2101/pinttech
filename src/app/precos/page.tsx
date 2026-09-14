'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  DollarSign,
  TrendingUp,
  Percent,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Sparkles,
  Beer,
  Layers,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Calculator,
  Building2,
  HelpCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface MatrixItem {
  id: string;
  name: string;
  style: string;
  abv: number | null;
  ibu: number | null;
  costPerLiter: number;
  salePricePerLiter: number;
  suggestedPricePerLiter: number;
  pricingModel: 'MANUAL' | 'AT_COST' | 'MARKUP';
  profitMarginPercent: number;
  calculatedMarkupPrice: number;
  keg20L: number;
  keg30L: number;
  keg50L: number;
  grossMarginPerLiter: number;
  grossMarginPercent: number;
  batchesCount: number;
}

interface PriceTable {
  id: string;
  name: string;
  description: string | null;
  type: string;
  adjustmentPercent: number;
  isDefault: boolean;
  active: boolean;
  _count: {
    items: number;
    clients: number;
    orders: number;
  };
  items?: {
    id: string;
    recipeId: string;
    pricePerLiter: number;
    recipe: { name: string; style: string };
  }[];
}

export default function PrecosPage() {
  const [activeTab, setActiveTab] = useState<'MATRIX' | 'TABLES' | 'SIMULATOR'>('MATRIX');
  const [matrix, setMatrix] = useState<MatrixItem[]>([]);
  const [tables, setTables] = useState<PriceTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal: Nova / Editar Tabela de Preço
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<PriceTable | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableDescription, setTableDescription] = useState('');
  const [tableType, setTableType] = useState('CUSTOM');
  const [tableAdjustment, setTableAdjustment] = useState('0');
  const [tableIsDefault, setTableIsDefault] = useState(false);
  const [tableItemPrices, setTableItemPrices] = useState<Record<string, number>>({});
  const [savingTable, setSavingTable] = useState(false);

  // Modal: Confirmação de Exclusão de Tabela
  const [deleteTableConfirm, setDeleteTableConfirm] = useState<PriceTable | null>(null);
  const [deletingTable, setDeletingTable] = useState(false);

  // Simulador
  const [simRecipeId, setSimRecipeId] = useState('');
  const [simKegCapacity, setSimKegCapacity] = useState('50');
  const [simKegQuantity, setSimKegQuantity] = useState('20');
  const [simCustomPrice, setSimCustomPrice] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [matrixRes, tablesRes] = await Promise.all([
        fetch('/api/prices/matrix'),
        fetch('/api/prices/tables'),
      ]);

      if (matrixRes.ok) {
        const matrixData = await matrixRes.json();
        setMatrix(matrixData);
        if (matrixData.length > 0 && !simRecipeId) {
          setSimRecipeId(matrixData[0].id);
          setSimCustomPrice(String(matrixData[0].salePricePerLiter));
        }
      }

      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData);
      }
    } catch (err) {
      console.error('Error loading pricing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Atualizar campo na matriz localmente
  const handleMatrixChange = (id: string, field: keyof MatrixItem, value: any) => {
    setMatrix((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        const cost = parseFloat(String(updated.costPerLiter)) || 0;
        let salePrice = parseFloat(String(updated.salePricePerLiter)) || 0;
        const margin = parseFloat(String(updated.profitMarginPercent)) || 0;

        if (updated.pricingModel === 'AT_COST') {
          salePrice = cost > 0 ? cost : salePrice;
          updated.salePricePerLiter = salePrice;
        } else if (updated.pricingModel === 'MARKUP' && cost > 0) {
          salePrice = parseFloat((cost * (1 + margin / 100)).toFixed(2));
          updated.salePricePerLiter = salePrice;
        }

        updated.keg20L = parseFloat((salePrice * 20).toFixed(2));
        updated.keg30L = parseFloat((salePrice * 30).toFixed(2));
        updated.keg50L = parseFloat((salePrice * 50).toFixed(2));
        updated.grossMarginPerLiter = parseFloat((salePrice - cost).toFixed(2));
        updated.grossMarginPercent = cost > 0 ? parseFloat((((salePrice - cost) / salePrice) * 100).toFixed(1)) : 100;

        return updated;
      })
    );
  };

  // Salvar matriz de preços no backend
  const handleSaveMatrix = async () => {
    setSavingMatrix(true);
    try {
      const payload = {
        updates: matrix.map((m) => ({
          id: m.id,
          costPerLiter: m.costPerLiter,
          salePricePerLiter: m.salePricePerLiter,
          pricingModel: m.pricingModel,
          profitMarginPercent: m.profitMarginPercent,
        })),
      };

      const res = await fetch('/api/prices/matrix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showFeedback('Matriz de preços salva com sucesso!', 'success');
        loadData();
      } else {
        showFeedback(data.error || 'Erro ao salvar preços', 'error');
      }
    } catch (err: any) {
      showFeedback('Erro de conexão ao salvar', 'error');
    } finally {
      setSavingMatrix(false);
    }
  };

  // Aplicar preço de custo em todas as cervejas
  const handleApplyAtCostAll = async () => {
    if (!confirm('Deseja realmente aplicar o Preço de Custo como preço de venda para todas as cervejas que possuem custo cadastrado?')) {
      return;
    }

    setSavingMatrix(true);
    try {
      const res = await fetch('/api/prices/matrix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPLY_AT_COST_ALL' }),
      });

      const data = await res.json();
      if (res.ok) {
        showFeedback('Preço de custo aplicado a todas as receitas!', 'success');
        loadData();
      } else {
        showFeedback(data.error || 'Erro ao aplicar preço de custo', 'error');
      }
    } catch (err) {
      showFeedback('Erro de conexão', 'error');
    } finally {
      setSavingMatrix(false);
    }
  };

  // Abrir modal de criação de tabela
  const handleOpenCreateTable = () => {
    setEditingTable(null);
    setTableName('');
    setTableDescription('');
    setTableType('CUSTOM');
    setTableAdjustment('0');
    setTableIsDefault(false);

    // Preenche com os preços base atuais da matriz
    const initialPrices: Record<string, number> = {};
    matrix.forEach((m) => {
      initialPrices[m.id] = m.salePricePerLiter;
    });
    setTableItemPrices(initialPrices);
    setTableModalOpen(true);
  };

  // Abrir modal de edição de tabela
  const handleOpenEditTable = async (table: PriceTable) => {
    setEditingTable(table);
    setTableName(table.name);
    setTableDescription(table.description || '');
    setTableType(table.type || 'CUSTOM');
    setTableAdjustment(String(table.adjustmentPercent || 0));
    setTableIsDefault(table.isDefault);

    // Carregar detalhes completos com os itens da tabela
    try {
      const res = await fetch(`/api/prices/tables/${table.id}`);
      if (res.ok) {
        const fullTable = await res.json();
        const loadedPrices: Record<string, number> = {};
        // Inicializa com padrão
        matrix.forEach((m) => {
          loadedPrices[m.id] = m.salePricePerLiter;
        });
        // Sobrescreve com os preços específicos da tabela
        if (fullTable.items) {
          fullTable.items.forEach((it: any) => {
            loadedPrices[it.recipeId] = it.pricePerLiter;
          });
        }
        setTableItemPrices(loadedPrices);
      }
    } catch (e) {
      console.error(e);
    }

    setTableModalOpen(true);
  };

  // Salvar tabela (criar ou editar)
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName.trim()) {
      alert('Digite o nome da tabela de preço.');
      return;
    }

    setSavingTable(true);
    try {
      const itemsPayload = Object.entries(tableItemPrices).map(([recipeId, pricePerLiter]) => ({
        recipeId,
        pricePerLiter: parseFloat(String(pricePerLiter)) || 0,
      }));

      const payload = {
        name: tableName.trim(),
        description: tableDescription.trim() || null,
        type: tableType,
        adjustmentPercent: parseFloat(tableAdjustment) || 0,
        isDefault: tableIsDefault,
        items: itemsPayload,
      };

      const url = editingTable ? `/api/prices/tables/${editingTable.id}` : '/api/prices/tables';
      const method = editingTable ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showFeedback(`Tabela "${payload.name}" salva com sucesso!`, 'success');
        setTableModalOpen(false);
        loadData();
      } else {
        alert(data.error || 'Erro ao salvar tabela de preço');
      }
    } catch (err: any) {
      alert('Erro de conexão ao salvar tabela.');
    } finally {
      setSavingTable(false);
    }
  };

  // Excluir tabela
  const handleDeleteTable = async () => {
    if (!deleteTableConfirm) return;
    setDeletingTable(true);
    try {
      const res = await fetch(`/api/prices/tables/${deleteTableConfirm.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('Tabela de preço excluída com sucesso!', 'success');
        setDeleteTableConfirm(null);
        loadData();
      } else {
        alert(data.error || 'Erro ao excluir tabela');
      }
    } catch (e) {
      alert('Erro de conexão ao excluir tabela');
    } finally {
      setDeletingTable(false);
    }
  };

  const filteredMatrix = matrix.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.style.toLowerCase().includes(search.toLowerCase())
  );

  // Cálculos do Simulador
  const selectedSimRecipe = matrix.find((m) => m.id === simRecipeId);
  const simCapLiters = parseInt(simKegCapacity, 10) || 50;
  const simCount = parseInt(simKegQuantity, 10) || 1;
  const simPriceL = parseFloat(simCustomPrice) || (selectedSimRecipe?.salePricePerLiter || 18);
  const simCostL = selectedSimRecipe?.costPerLiter || 0;
  const simTotalLiters = simCapLiters * simCount;
  const simTotalRevenue = simTotalLiters * simPriceL;
  const simTotalCost = simTotalLiters * simCostL;
  const simGrossProfit = simTotalRevenue - simTotalCost;
  const simProfitMargin = simTotalRevenue > 0 ? (simGrossProfit / simTotalRevenue) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Gestão de Preços & Tabelas de Venda
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Matriz de custos e margens, tabelas para atacado/distribuidor e simulador de rentabilidade
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'MATRIX' && (
            <>
              <button
                type="button"
                onClick={handleApplyAtCostAll}
                disabled={savingMatrix}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all"
                title="Ajusta o preço de venda de todas as receitas para ser igual ao custo de produção"
              >
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Aplicar Preço de Custo em Todas</span>
              </button>

              <button
                type="button"
                onClick={handleSaveMatrix}
                disabled={savingMatrix}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-amber-500/25 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{savingMatrix ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </>
          )}

          {activeTab === 'TABLES' && (
            <button
              type="button"
              onClick={handleOpenCreateTable}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-amber-500/25 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tabela de Preço</span>
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* TABS NAVEGAÇÃO */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('MATRIX')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'MATRIX'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Beer className="w-4 h-4" />
          <span>Matriz de Preços das Cervejas</span>
          <span className="text-[10px] py-0.5 px-1.5 rounded-full bg-slate-950/15 font-black">
            {matrix.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TABLES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'TABLES'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tabelas de Preço (Listas)</span>
          <span className="text-[10px] py-0.5 px-1.5 rounded-full bg-slate-950/15 font-black">
            {tables.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SIMULATOR')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'SIMULATOR'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Simulador de Rentabilidade</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: MATRIZ DE PREÇOS DAS CERVEJAS */}
      {/* ========================================================================= */}
      {activeTab === 'MATRIX' && (
        <div className="space-y-4">
          {/* Barra de Busca e Dica */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cerveja ou estilo..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>
                Edite os preços e custos diretamente nas colunas. Clique em <strong>Salvar Alterações</strong> ao terminar.
              </span>
            </div>
          </div>

          {/* Tabela de Preços */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="p-3.5 pl-5">Cerveja / Estilo</th>
                    <th className="p-3.5 text-right">Custo / Litro</th>
                    <th className="p-3.5 text-center">Modelo de Preço</th>
                    <th className="p-3.5 text-right">Margem Desejada</th>
                    <th className="p-3.5 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300">
                      Preço Venda / L
                    </th>
                    <th className="p-3.5 text-right">Barril 20L</th>
                    <th className="p-3.5 text-right">Barril 30L</th>
                    <th className="p-3.5 text-right">Barril 50L</th>
                    <th className="p-3.5 text-right pr-5">Lucro Bruto / L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Nenhuma cerveja encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrix.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Nome & Estilo */}
                        <td className="p-3.5 pl-5">
                          <div className="font-black text-slate-900 dark:text-white text-sm">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{item.style}</span>
                            {item.abv && <span>• {item.abv}% ABV</span>}
                            {item.ibu && <span>• {item.ibu} IBU</span>}
                          </div>
                        </td>

                        {/* Custo / Litro */}
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-slate-400 font-bold">R$</span>
                            <input
                              type="number"
                              step="0.10"
                              min="0"
                              value={item.costPerLiter}
                              onChange={(e) =>
                                handleMatrixChange(item.id, 'costPerLiter', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 text-right font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </td>

                        {/* Modelo de Preço */}
                        <td className="p-3.5 text-center">
                          <div className="inline-flex flex-col gap-1 items-center">
                            <select
                              value={item.pricingModel}
                              onChange={(e) => handleMatrixChange(item.id, 'pricingModel', e.target.value)}
                              className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                              <option value="MANUAL">Manual</option>
                              <option value="AT_COST">Preço de Custo</option>
                              <option value="MARKUP">Markup (%)</option>
                            </select>

                            {/* Botão de Atalho Rápido */}
                            <button
                              type="button"
                              onClick={() => handleMatrixChange(item.id, 'pricingModel', 'AT_COST')}
                              className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                            >
                              Aplicar Custo
                            </button>
                          </div>
                        </td>

                        {/* Margem Desejada (%) */}
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="5"
                              min="0"
                              value={item.profitMarginPercent}
                              onChange={(e) =>
                                handleMatrixChange(item.id, 'profitMarginPercent', parseFloat(e.target.value) || 0)
                              }
                              disabled={item.pricingModel !== 'MARKUP'}
                              className={`w-16 px-2 py-1 text-right font-bold rounded-lg border text-slate-900 dark:text-white ${
                                item.pricingModel === 'MARKUP'
                                  ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-amber-500'
                                  : 'bg-slate-100 dark:bg-slate-900/60 border-transparent text-slate-400 cursor-not-allowed'
                              }`}
                            />
                            <span className="text-slate-400 font-bold">%</span>
                          </div>
                        </td>

                        {/* Preço de Venda / Litro (Destaque) */}
                        <td className="p-3.5 text-right bg-amber-50/30 dark:bg-amber-950/10">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-amber-700 dark:text-amber-400 font-bold">R$</span>
                            <input
                              type="number"
                              step="0.50"
                              min="0"
                              value={item.salePricePerLiter}
                              onChange={(e) =>
                                handleMatrixChange(item.id, 'salePricePerLiter', parseFloat(e.target.value) || 0)
                              }
                              disabled={item.pricingModel === 'AT_COST'}
                              className={`w-24 px-2.5 py-1 text-right font-black text-sm rounded-lg border ${
                                item.pricingModel === 'AT_COST'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-600 text-slate-900 dark:text-amber-300 focus:ring-2 focus:ring-amber-500'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Barril 20L */}
                        <td className="p-3.5 text-right font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(item.keg20L)}
                        </td>

                        {/* Barril 30L */}
                        <td className="p-3.5 text-right font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(item.keg30L)}
                        </td>

                        {/* Barril 50L */}
                        <td className="p-3.5 text-right font-black text-slate-900 dark:text-white">
                          {formatCurrency(item.keg50L)}
                        </td>

                        {/* Lucro Bruto / L */}
                        <td className="p-3.5 text-right pr-5">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(item.grossMarginPerLiter)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {item.grossMarginPercent}% margem
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: TABELAS DE PREÇO (LISTAS PERSONALIZADAS) */}
      {/* ========================================================================= */}
      {activeTab === 'TABLES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((tbl) => (
              <div
                key={tbl.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-sm flex flex-col justify-between transition-all ${
                  tbl.isDefault
                    ? 'border-amber-400 dark:border-amber-500/50 ring-2 ring-amber-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 dark:text-white text-base">
                          {tbl.name}
                        </h3>
                        {tbl.isDefault && (
                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] uppercase rounded-md tracking-wider">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {tbl.description || 'Tabela de preços configurada para clientes específicos.'}
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Layers className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Informações da Tabela */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Clientes</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {tbl._count.clients}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Tipo</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {tbl.type === 'STANDARD' && 'Padrão Base'}
                        {tbl.type === 'AT_COST' && 'Preço Custo'}
                        {tbl.type === 'DISCOUNT_PERCENT' && `${tbl.adjustmentPercent}% Desc.`}
                        {tbl.type === 'MARKUP_PERCENT' && `+${tbl.adjustmentPercent}% Markup`}
                        {tbl.type === 'CUSTOM' && 'Customizada'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações da Tabela */}
                <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenEditTable(tbl)}
                    className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Preços</span>
                  </button>

                  {!tbl.isDefault && (
                    <button
                      type="button"
                      onClick={() => setDeleteTableConfirm(tbl)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                      title="Excluir tabela"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: SIMULADOR DE RENTABILIDADE */}
      {/* ========================================================================= */}
      {activeTab === 'SIMULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Parâmetros da Simulação */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-base border-b border-slate-100 dark:border-slate-800 pb-3">
              <Calculator className="w-5 h-5 text-amber-500" />
              <span>Parâmetros de Venda</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Selecione a Cerveja
              </label>
              <select
                value={simRecipeId}
                onChange={(e) => {
                  setSimRecipeId(e.target.value);
                  const found = matrix.find((m) => m.id === e.target.value);
                  if (found) setSimCustomPrice(String(found.salePricePerLiter));
                }}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              >
                {matrix.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.style})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Capacidade do Barril
                </label>
                <select
                  value={simKegCapacity}
                  onChange={(e) => setSimKegCapacity(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="20">20 Litros</option>
                  <option value="30">30 Litros</option>
                  <option value="50">50 Litros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Qtd de Barris
                </label>
                <input
                  type="number"
                  min="1"
                  value={simKegQuantity}
                  onChange={(e) => setSimKegQuantity(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Preço Simulado por Litro (R$)
              </label>
              <input
                type="number"
                step="0.50"
                value={simCustomPrice}
                onChange={(e) => setSimCustomPrice(e.target.value)}
                className="w-full text-sm font-black p-2.5 bg-white dark:bg-slate-800 border-2 border-amber-500 rounded-xl text-slate-900 dark:text-amber-300"
              />
            </div>
          </div>

          {/* Resultados Financeiros */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-3xl text-slate-950 flex flex-col justify-between shadow-lg shadow-amber-500/20">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-950/70">
                  Faturamento Bruto Projetado
                </span>
                <div className="text-3xl font-black mt-2">
                  {formatCurrency(simTotalRevenue)}
                </div>
                <p className="text-xs text-slate-950/80 mt-1 font-semibold">
                  {simTotalLiters.toLocaleString('pt-BR')} Litros ({simCount} barris de {simCapLiters}L)
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-950/15 text-xs font-bold">
                Valor por barril: {formatCurrency(simCapLiters * simPriceL)}
              </div>
            </div>

            <div className="bg-emerald-600 p-6 rounded-3xl text-white flex flex-col justify-between shadow-lg shadow-emerald-600/20">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-white/70">
                  Lucro Bruto Estimado
                </span>
                <div className="text-3xl font-black mt-2">
                  {formatCurrency(simGrossProfit)}
                </div>
                <p className="text-xs text-white/80 mt-1 font-semibold">
                  Margem de contribuição: <strong>{simProfitMargin.toFixed(1)}%</strong>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/20 text-xs font-bold">
                Custo de Fabricação: {formatCurrency(simTotalCost)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR / EDITAR TABELA DE PREÇO */}
      {/* ========================================================================= */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    {editingTable ? 'Editar Tabela de Preço' : 'Nova Tabela de Preço'}
                  </h3>
                  <p className="text-xs text-slate-500">Defina os valores por cerveja para esta tabela comercial</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTableModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Tabela *
                  </label>
                  <input
                    type="text"
                    required
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="Ex: Atacado & Distribuidores"
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Precificação
                  </label>
                  <select
                    value={tableType}
                    onChange={(e) => setTableType(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="CUSTOM">Preços Específicos por Cerveja</option>
                    <option value="DISCOUNT_PERCENT">Desconto Geral (%) sobre o Preço Base</option>
                    <option value="MARKUP_PERCENT">Acréscimo Geral (%) sobre o Preço Base</option>
                    <option value="AT_COST">Preço de Custo de Fábrica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição Comercial (Opcional)
                </label>
                <input
                  type="text"
                  value={tableDescription}
                  onChange={(e) => setTableDescription(e.target.value)}
                  placeholder="Ex: Praticado para compras acima de 10 barris/mês"
                  className="w-full px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Ajuste em Massa (Desconto ou Acréscimo) */}
              {(tableType === 'DISCOUNT_PERCENT' || tableType === 'MARKUP_PERCENT') && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/40 flex items-center gap-3">
                  <Percent className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                      Percentual de Ajuste (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={tableAdjustment}
                      onChange={(e) => {
                        const adj = parseFloat(e.target.value) || 0;
                        setTableAdjustment(e.target.value);
                        // Recalcular itens
                        const updated: Record<string, number> = {};
                        matrix.forEach((m) => {
                          if (tableType === 'DISCOUNT_PERCENT') {
                            updated[m.id] = parseFloat((m.salePricePerLiter * (1 - adj / 100)).toFixed(2));
                          } else {
                            updated[m.id] = parseFloat((m.salePricePerLiter * (1 + adj / 100)).toFixed(2));
                          }
                        });
                        setTableItemPrices(updated);
                      }}
                      className="w-24 px-2 py-1 text-xs font-black bg-white dark:bg-slate-800 border border-amber-300 rounded-lg text-slate-900 dark:text-white mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Botão de Preço de Custo no Modal */}
              {tableType === 'AT_COST' && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                  Esta tabela utilizará automaticamente o custo de produção de cada cerveja como preço de venda.
                </div>
              )}

              {/* Lista de Preços por Cerveja */}
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                  Preços por Litro para cada Cerveja:
                </label>
                <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
                  {matrix.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{m.name}</span>
                        <span className="text-[10px] text-slate-400 block">{m.style}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">Preço Base: {formatCurrency(m.salePricePerLiter)}/L ➔</span>
                        <div className="inline-flex items-center gap-1">
                          <span className="font-bold text-amber-600">R$</span>
                          <input
                            type="number"
                            step="0.50"
                            min="0"
                            value={tableItemPrices[m.id] ?? m.salePricePerLiter}
                            onChange={(e) =>
                              setTableItemPrices((prev) => ({
                                ...prev,
                                [m.id]: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-20 px-2 py-1 text-right font-black bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opção Tabela Padrão */}
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={tableIsDefault}
                  onChange={(e) => setTableIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Definir como Tabela Padrão da cervejaria (para novos clientes sem tabela definida)
                </span>
              </label>

              {/* Botões do Modal */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTableModalOpen(false)}
                  disabled={savingTable}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTable}
                  className="px-4 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingTable ? 'Salvando...' : 'Salvar Tabela'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE TABELA */}
      {deleteTableConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Excluir Tabela de Preço
                </h3>
                <p className="text-xs text-slate-500">Confirmação de exclusão</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir a tabela{' '}
              <strong className="text-slate-900 dark:text-white font-black">
                "{deleteTableConfirm.name}"
              </strong>
              ? Os clientes que utilizavam esta tabela voltarão a utilizar a tabela padrão da cervejaria.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTableConfirm(null)}
                disabled={deletingTable}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteTable}
                disabled={deletingTable}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingTable ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
