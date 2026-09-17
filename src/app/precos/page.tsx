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
  Save,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { formatCurrency, parseCurrencyInput } from '@/lib/utils';
import {
  applyRounding,
  computeCalculatedPrice,
  RoundingRule,
  PricingModel,
} from '@/lib/pricingUtils';
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
  pricingModel: 'MANUAL' | 'AT_COST' | 'MARKUP' | 'PERCENT' | 'COST_PLUS_FIXED';
  profitMarginPercent: number;
  costPlusFixedValue?: number;
  roundingRule?: RoundingRule;
  calculatedMarkupPrice: number;
  keg20L: number;
  keg30L: number;
  keg50L: number;
  grossMarginPerLiter: number;
  grossMarginPercent: number;
  batchesCount: number;
  isModified?: boolean;
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
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Ferramenta de Cálculo em Massa na Matriz
  const [bulkModel, setBulkModel] = useState<'PERCENT' | 'AT_COST' | 'COST_PLUS_FIXED'>('PERCENT');
  const [bulkValue, setBulkValue] = useState('60');
  const [bulkRounding, setBulkRounding] = useState<RoundingRule>('NONE');

  // Modal: Nova / Editar Tabela de Preço
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<PriceTable | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableDescription, setTableDescription] = useState('');
  const [tableType, setTableType] = useState('CUSTOM');
  const [tableAdjustment, setTableAdjustment] = useState('0');
  const [tableFixedAddition, setTableFixedAddition] = useState('5');
  const [tableRounding, setTableRounding] = useState<RoundingRule>('NONE');
  const [tableIsDefault, setTableIsDefault] = useState(false);
  const [tableItemPrices, setTableItemPrices] = useState<Record<string, number>>({});
  const [savingTable, setSavingTable] = useState(false);
  const [loadingTableItems, setLoadingTableItems] = useState(false);

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

        const updated = { ...item, [field]: value, isModified: true };

        const cost = parseCurrencyInput(updated.costPerLiter);
        let salePrice = parseCurrencyInput(updated.salePricePerLiter);
        const margin = parseCurrencyInput(updated.profitMarginPercent);
        const fixedVal = parseCurrencyInput(updated.costPlusFixedValue ?? 5);
        const rounding = (updated.roundingRule as RoundingRule) || 'NONE';

        if (field === 'salePricePerLiter') {
          // Quando o usuário digita o preço de venda manualmente, muda o modelo para MANUAL
          // sem sobrescrever o que o usuário acabou de digitar!
          updated.pricingModel = 'MANUAL';
        } else if (
          field === 'pricingModel' ||
          field === 'profitMarginPercent' ||
          field === 'costPlusFixedValue' ||
          field === 'roundingRule' ||
          (field === 'costPerLiter' && updated.pricingModel !== 'MANUAL')
        ) {
          // Recalcula o preço de venda de acordo com o modelo selecionado
          salePrice = computeCalculatedPrice({
            cost,
            basePrice: salePrice,
            model: updated.pricingModel,
            adjustmentValue: updated.pricingModel === 'COST_PLUS_FIXED' ? fixedVal : margin,
            roundingRule: rounding,
          });
          updated.salePricePerLiter = salePrice;
        }

        updated.keg20L = parseFloat((salePrice * 20).toFixed(2));
        updated.keg30L = parseFloat((salePrice * 30).toFixed(2));
        updated.keg50L = parseFloat((salePrice * 50).toFixed(2));
        updated.grossMarginPerLiter = parseFloat((salePrice - cost).toFixed(2));
        updated.grossMarginPercent = salePrice > 0 ? parseFloat((((salePrice - cost) / salePrice) * 100).toFixed(1)) : 0;

        return updated;
      })
    );
  };

  // Salvar uma única receita da matriz com 1 clique
  const handleSaveSingleRecipe = async (id: string) => {
    const item = matrix.find((m) => m.id === id);
    if (!item) return;

    setSavingRowId(id);
    try {
      const res = await fetch('/api/prices/matrix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            {
              id: item.id,
              costPerLiter: parseCurrencyInput(item.costPerLiter),
              salePricePerLiter: parseCurrencyInput(item.salePricePerLiter),
              pricingModel: item.pricingModel,
              profitMarginPercent: parseCurrencyInput(item.profitMarginPercent),
              costPlusFixedValue: parseCurrencyInput(item.costPlusFixedValue),
              roundingRule: item.roundingRule,
            },
          ],
        }),
      });

      if (res.ok) {
        setMatrix((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isModified: false } : m))
        );
        setSavedRowId(id);
        setTimeout(() => setSavedRowId(null), 3000);
        showFeedback(`Preço de "${item.name}" salvo com sucesso!`, 'success');
      } else {
        const data = await res.json();
        showFeedback(data.error || 'Erro ao salvar cerveja', 'error');
      }
    } catch (err) {
      showFeedback('Erro de conexão ao salvar cerveja', 'error');
    } finally {
      setSavingRowId(null);
    }
  };

  // Aplica regra em massa para todas as receitas na matriz
  const handleApplyBulkRule = () => {
    const val = parseCurrencyInput(bulkValue);
    let count = 0;

    setMatrix((prev) =>
      prev.map((item) => {
        const cost = parseCurrencyInput(item.costPerLiter);
        const newPrice = computeCalculatedPrice({
          cost,
          basePrice: item.salePricePerLiter,
          model: bulkModel,
          adjustmentValue: val,
          roundingRule: bulkRounding,
        });

        count++;
        return {
          ...item,
          pricingModel: bulkModel,
          profitMarginPercent: bulkModel === 'PERCENT' ? val : item.profitMarginPercent,
          costPlusFixedValue: bulkModel === 'COST_PLUS_FIXED' ? val : (item.costPlusFixedValue ?? 5),
          roundingRule: bulkRounding,
          salePricePerLiter: newPrice,
          keg20L: parseFloat((newPrice * 20).toFixed(2)),
          keg30L: parseFloat((newPrice * 30).toFixed(2)),
          keg50L: parseFloat((newPrice * 50).toFixed(2)),
          grossMarginPerLiter: parseFloat((newPrice - cost).toFixed(2)),
          grossMarginPercent: newPrice > 0 ? parseFloat((((newPrice - cost) / newPrice) * 100).toFixed(1)) : 0,
          isModified: true,
        };
      })
    );

    showFeedback(
      `Regra aplicada a ${count} cerveja(s)! Clique em "Salvar Alterações" para gravar no banco.`,
      'success'
    );
  };

  // Salvar matriz de preços no backend
  const handleSaveMatrix = async () => {
    setSavingMatrix(true);
    try {
      const payload = {
        updates: matrix.map((m) => ({
          id: m.id,
          costPerLiter: parseCurrencyInput(m.costPerLiter),
          salePricePerLiter: parseCurrencyInput(m.salePricePerLiter),
          pricingModel: m.pricingModel,
          profitMarginPercent: parseCurrencyInput(m.profitMarginPercent),
          costPlusFixedValue: parseCurrencyInput(m.costPlusFixedValue),
          roundingRule: m.roundingRule,
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
        setMatrix((prev) => prev.map((m) => ({ ...m, isModified: false })));
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

  // Descartar alterações não salvas
  const handleDiscardChanges = () => {
    if (confirm('Deseja descartar as alterações não salvas na matriz de preços?')) {
      loadData();
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

  // Recalcular todos os preços no modal da tabela com base na regra e no arredondamento selecionado
  const handleRecalculateTablePrices = () => {
    const adj = parseCurrencyInput(tableAdjustment);
    const fixed = parseCurrencyInput(tableFixedAddition);
    const updated: Record<string, number> = {};

    matrix.forEach((m) => {
      let model = tableType;
      let val = adj;
      if (tableType === 'COST_PLUS_FIXED') {
        val = fixed;
      }
      updated[m.id] = computeCalculatedPrice({
        cost: m.costPerLiter,
        basePrice: m.salePricePerLiter,
        model,
        adjustmentValue: val,
        roundingRule: tableRounding,
      });
    });

    setTableItemPrices(updated);
    showFeedback('Preços da tabela recalculados conforme a regra!', 'success');
  };

  // Abrir modal de criação de tabela
  const handleOpenCreateTable = () => {
    setEditingTable(null);
    setTableName('');
    setTableDescription('');
    setTableType('CUSTOM');
    setTableAdjustment('0');
    setTableFixedAddition('5');
    setTableRounding('NONE');
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
    setTableFixedAddition('5');
    setTableRounding('NONE');
    setTableIsDefault(table.isDefault);
    setTableModalOpen(true);
    setLoadingTableItems(true);

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
    } finally {
      setLoadingTableItems(false);
    }
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

  const hasUnsavedChanges = matrix.some((m) => m.isModified);
  const modifiedCount = matrix.filter((m) => m.isModified).length;

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
              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  disabled={savingMatrix}
                  className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition-all"
                  title="Descartar alterações não salvas"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Descartar ({modifiedCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleApplyAtCostAll}
                disabled={savingMatrix}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all"
                title="Ajusta o preço de venda de todas as receitas para ser igual ao custo de produção"
              >
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Aplicar Custo em Todas</span>
              </button>

              <button
                type="button"
                onClick={handleSaveMatrix}
                disabled={savingMatrix}
                className={`px-4 py-2 text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 ${
                  hasUnsavedChanges
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-400 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>
                  {savingMatrix
                    ? 'Salvando...'
                    : hasUnsavedChanges
                    ? `Salvar Alterações (${modifiedCount})`
                    : 'Salvar Alterações'}
                </span>
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
          {/* CALCULADORA & AJUSTE EM MASSA DE PREÇOS */}
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-50 to-slate-50 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 p-4 sm:p-5 rounded-3xl border border-amber-200/60 dark:border-amber-900/40 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/40 dark:border-amber-900/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    Calculadora & Ajuste em Massa de Preços
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Defina uma regra (por Custo, Margem % ou Custo + R$) e arredondamento para aplicar em lote ou individualmente
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg">
                Fórmula Automática & Arredondamento
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  1. Regra de Cálculo
                </label>
                <select
                  value={bulkModel}
                  onChange={(e) => setBulkModel(e.target.value as 'PERCENT' | 'AT_COST' | 'COST_PLUS_FIXED')}
                  className="w-full text-xs font-bold p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="AT_COST">Preço de Custo (Preço = Custo)</option>
                  <option value="PERCENT">Margem / Markup (% sobre Custo)</option>
                  <option value="COST_PLUS_FIXED">Custo + R$ Fixo por Litro</option>
                </select>
              </div>

              {bulkModel !== 'AT_COST' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {bulkModel === 'PERCENT' ? '2. Margem / Acréscimo (%)' : '2. Valor Fixo por Litro (R$)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      className="w-full text-xs font-black p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {bulkModel === 'PERCENT' ? '%' : 'R$/L'}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    2. Parâmetro
                  </label>
                  <div className="text-xs font-bold p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl">
                    100% Custo de Fabricação
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  3. Arredondamento
                </label>
                <select
                  value={bulkRounding}
                  onChange={(e) => setBulkRounding(e.target.value as RoundingRule)}
                  className="w-full text-xs font-bold p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="NONE">Sem arredondar (Exato)</option>
                  <option value="ROUND_INT">Inteiro mais próximo (.00)</option>
                  <option value="ROUND_HALF">Meio Real (.50)</option>
                  <option value="ROUND_NINE">Comercial .90 (ex: R$ 14,90)</option>
                  <option value="ROUND_CEIL">Sempre p/ Cima (.00)</option>
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleApplyBulkRule}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Aplicar em Todas</span>
                </button>
              </div>
            </div>
          </div>

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
                Edite os valores nas colunas ou digite o preço direto. Salve por linha ou em <strong>Salvar Alterações</strong>.
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
                    <th className="p-3.5 text-center">Modelo de Cálculo</th>
                    <th className="p-3.5 text-right">Ajuste (% / R$)</th>
                    <th className="p-3.5 text-center">Arredondar</th>
                    <th className="p-3.5 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300">
                      Preço Venda / L
                    </th>
                    <th className="p-3.5 text-right">Barril 20L</th>
                    <th className="p-3.5 text-right">Barril 30L</th>
                    <th className="p-3.5 text-right">Barril 50L</th>
                    <th className="p-3.5 text-right">Lucro Bruto / L</th>
                    <th className="p-3.5 text-center pr-5">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        Nenhuma cerveja encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrix.map((item) => (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          item.isModified
                            ? 'bg-amber-50/40 dark:bg-amber-950/15 hover:bg-amber-50/60 dark:hover:bg-amber-950/30'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Nome & Estilo */}
                        <td className="p-3.5 pl-5">
                          <div className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.isModified && (
                              <span
                                className="inline-block w-2 h-2 rounded-full bg-amber-500"
                                title="Alteração não salva"
                              />
                            )}
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
                              step="any"
                              min="0"
                              value={item.costPerLiter}
                              onChange={(e) =>
                                handleMatrixChange(item.id, 'costPerLiter', e.target.value)
                              }
                              className="w-20 px-2 py-1 text-right font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </td>

                        {/* Modelo de Preço */}
                        <td className="p-3.5 text-center">
                          <select
                            value={item.pricingModel}
                            onChange={(e) => handleMatrixChange(item.id, 'pricingModel', e.target.value)}
                            className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <option value="MANUAL">Manual</option>
                            <option value="AT_COST">Preço de Custo</option>
                            <option value="PERCENT">Margem % (Markup)</option>
                            <option value="COST_PLUS_FIXED">Custo + Valor Fixo R$</option>
                          </select>
                        </td>

                        {/* Ajuste (Margem % ou Fixo R$) */}
                        <td className="p-3.5 text-right">
                          {item.pricingModel === 'PERCENT' || item.pricingModel === 'MARKUP' ? (
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.profitMarginPercent}
                                onChange={(e) =>
                                  handleMatrixChange(item.id, 'profitMarginPercent', e.target.value)
                                }
                                className="w-16 px-2 py-1 text-right font-bold rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                              />
                              <span className="text-slate-400 font-bold">%</span>
                            </div>
                          ) : item.pricingModel === 'COST_PLUS_FIXED' ? (
                            <div className="inline-flex items-center gap-1">
                              <span className="text-slate-400 font-bold">R$</span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.costPlusFixedValue ?? 5}
                                onChange={(e) =>
                                  handleMatrixChange(item.id, 'costPlusFixedValue', e.target.value)
                                }
                                className="w-16 px-2 py-1 text-right font-bold rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                          ) : item.pricingModel === 'AT_COST' ? (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                              = Custo
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">
                              Manual
                            </span>
                          )}
                        </td>

                        {/* Arredondamento */}
                        <td className="p-3.5 text-center">
                          <select
                            value={item.roundingRule || 'NONE'}
                            onChange={(e) => handleMatrixChange(item.id, 'roundingRule', e.target.value)}
                            disabled={item.pricingModel === 'MANUAL'}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                              item.pricingModel === 'MANUAL'
                                ? 'bg-slate-100 dark:bg-slate-900/60 border-transparent text-slate-400 cursor-not-allowed'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer'
                            }`}
                          >
                            <option value="NONE">Exato</option>
                            <option value="ROUND_INT">Inteiro (.00)</option>
                            <option value="ROUND_HALF">Meio (.50)</option>
                            <option value="ROUND_NINE">.90 Comercial</option>
                            <option value="ROUND_CEIL">P/ Cima (.00)</option>
                          </select>
                        </td>

                        {/* Preço de Venda / Litro (Destaque) */}
                        <td className="p-3.5 text-right bg-amber-50/30 dark:bg-amber-950/10">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-amber-700 dark:text-amber-400 font-bold">R$</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.salePricePerLiter}
                              onChange={(e) =>
                                handleMatrixChange(item.id, 'salePricePerLiter', e.target.value)
                              }
                              className={`w-24 px-2.5 py-1 text-right font-black text-sm rounded-lg border ${
                                item.isModified
                                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/30'
                                  : 'bg-white dark:bg-slate-800 border-amber-300/80 dark:border-amber-600/80 text-slate-900 dark:text-amber-300 focus:ring-2 focus:ring-amber-500'
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
                        <td className="p-3.5 text-right">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(item.grossMarginPerLiter)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {item.grossMarginPercent}% margem
                          </div>
                        </td>

                        {/* Ação: Salvar Linha Individual */}
                        <td className="p-3.5 text-center pr-5">
                          <button
                            type="button"
                            onClick={() => handleSaveSingleRecipe(item.id)}
                            disabled={savingRowId === item.id}
                            className={`p-2 rounded-xl transition-all inline-flex items-center justify-center ${
                              savedRowId === item.id
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : item.isModified
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm animate-pulse'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title={
                              savedRowId === item.id
                                ? 'Salvo com sucesso!'
                                : item.isModified
                                ? 'Salvar esta cerveja agora'
                                : 'Salvar esta linha'
                            }
                          >
                            {savingRowId === item.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : savedRowId === item.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BARRA FLUTUANTE DE SALVAMENTO */}
          {hasUnsavedChanges && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/50 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-200">
                  <strong className="text-amber-400">{modifiedCount}</strong>{' '}
                  {modifiedCount === 1 ? 'cerveja modificada' : 'cervejas modificadas'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  disabled={savingMatrix}
                  className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={handleSaveMatrix}
                  disabled={savingMatrix}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingMatrix ? 'Salvando...' : 'Salvar Todas'}</span>
                </button>
              </div>
            </div>
          )}
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
                step="any"
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
                    Tipo de Precificação da Tabela
                  </label>
                  <select
                    value={tableType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setTableType(newType);
                      if (newType === 'AT_COST') {
                        const updated: Record<string, number> = {};
                        matrix.forEach((m) => {
                          updated[m.id] = applyRounding(m.costPerLiter, tableRounding);
                        });
                        setTableItemPrices(updated);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="CUSTOM">Preços Personalizados por Cerveja</option>
                    <option value="AT_COST">Preço de Custo de Produção (Preço = Custo)</option>
                    <option value="COST_PLUS_PERCENT">Custo de Produção + Margem (%)</option>
                    <option value="COST_PLUS_FIXED">Custo de Produção + Valor Fixo (R$ por Litro)</option>
                    <option value="DISCOUNT_PERCENT">Desconto Geral (%) sobre o Preço Base</option>
                    <option value="MARKUP_PERCENT">Acréscimo Geral (%) sobre o Preço Base</option>
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

              {/* Painel de Cálculo e Arredondamento da Tabela */}
              {tableType !== 'CUSTOM' && (
                <div className="p-3.5 bg-gradient-to-r from-amber-50 to-slate-50 dark:from-amber-950/20 dark:to-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    {tableType === 'COST_PLUS_FIXED' ? (
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                          Adicional Fixo por Litro (R$)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={tableFixedAddition}
                            onChange={(e) => setTableFixedAddition(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-black bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-slate-900 dark:text-white pr-9"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            R$/L
                          </span>
                        </div>
                      </div>
                    ) : tableType === 'AT_COST' ? (
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                          Regra de Custo
                        </label>
                        <div className="text-xs font-bold p-2 bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-300/60 dark:border-emerald-800">
                          Preço = 100% Custo
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                          Percentual de Ajuste (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max="200"
                            value={tableAdjustment}
                            onChange={(e) => setTableAdjustment(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-black bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-slate-900 dark:text-white pr-7"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            %
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                        Regra de Arredondamento
                      </label>
                      <select
                        value={tableRounding}
                        onChange={(e) => setTableRounding(e.target.value as RoundingRule)}
                        className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-slate-900 dark:text-white"
                      >
                        <option value="NONE">Sem arredondar (Exato)</option>
                        <option value="ROUND_INT">Inteiro mais próximo (.00)</option>
                        <option value="ROUND_HALF">Meio Real (.50)</option>
                        <option value="ROUND_NINE">Comercial .90 (ex: R$ 14,90)</option>
                        <option value="ROUND_CEIL">Sempre p/ Cima (.00)</option>
                      </select>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={handleRecalculateTablePrices}
                        className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Recalcular Preços</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Preços por Cerveja */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Preços Praticados nesta Tabela:
                  </label>
                  {loadingTableItems && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                      Carregando preços...
                    </span>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
                  {matrix.map((m) => {
                    const currentPrice = tableItemPrices[m.id] ?? m.salePricePerLiter;
                    const profitPerLiter = currentPrice - m.costPerLiter;
                    const profitMargin = currentPrice > 0 ? (profitPerLiter / currentPrice) * 100 : 0;
                    return (
                      <div
                        key={m.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{m.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{m.style}</span>
                            <span>•</span>
                            <span className="text-slate-500 dark:text-slate-400 font-semibold">
                              Custo: {formatCurrency(m.costPerLiter)}/L
                            </span>
                            <span>•</span>
                            <span className="text-slate-500 dark:text-slate-400 font-semibold">
                              Base: {formatCurrency(m.salePricePerLiter)}/L
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(profitPerLiter)}/L
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {profitMargin.toFixed(0)}% margem
                            </div>
                          </div>

                          <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-amber-300 dark:border-amber-600/60 shadow-xs">
                            <span className="font-black text-amber-600 dark:text-amber-400 text-xs">R$</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={tableItemPrices[m.id] ?? m.salePricePerLiter}
                              onChange={(e) =>
                                setTableItemPrices((prev) => ({
                                  ...prev,
                                  [m.id]: parseCurrencyInput(e.target.value),
                                }))
                              }
                              className="w-20 px-1 py-0.5 text-right font-black text-xs bg-transparent border-0 text-slate-900 dark:text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
