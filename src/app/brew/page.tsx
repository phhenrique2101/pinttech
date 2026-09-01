'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Flame,
  Plus,
  Beer,
  Layers,
  Thermometer,
  Sparkles,
  Droplets,
  Trash2,
  Cylinder,
  DollarSign,
  Search,
  ArrowRight,
  UploadCloud,
  Download,
  CheckCircle2,
  RefreshCw,
  Activity,
  Package,
  Calendar,
  Zap,
  Sliders,
  Filter,
  AlertTriangle,
  AlertCircle,
  Clock,
  ShoppingCart,
  Copy,
  Check,
  CalendarDays,
  Edit3,
} from 'lucide-react';
import RecipeDesignerModal from '@/components/brew/RecipeDesignerModal';
import BeerXmlImporterModal from '@/components/brew/BeerXmlImporterModal';
import BrewDayModal from '@/components/brew/BrewDayModal';
import ScheduleBatchModal from '@/components/brew/ScheduleBatchModal';
import LiveBatchManagerModal, { TankTaskItem } from '@/components/brew/LiveBatchManagerModal';
import { formatCurrency, formatDateShort, formatDate, getLocalDateString, addDaysToDateString } from '@/lib/utils';
import { srmToHex } from '@/lib/brewing/calculations';

export default function BrewStudioPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'RECIPES' | 'PLANNING' | 'CELLAR_CALENDAR' | 'BATCHES' | 'STOCK'>('RECIPES');
  const [copiedShoppingList, setCopiedShoppingList] = useState<boolean>(false);

  // Modals
  const [designerModalOpen, setDesignerModalOpen] = useState<boolean>(false);
  const [selectedRecipeForEdit, setSelectedRecipeForEdit] = useState<any | null>(null);
  const [xmlImporterOpen, setXmlImporterOpen] = useState<boolean>(false);
  const [brewDayModalOpen, setBrewDayModalOpen] = useState<boolean>(false);
  const [selectedRecipeForBrew, setSelectedRecipeForBrew] = useState<any | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [selectedRecipeForSchedule, setSelectedRecipeForSchedule] = useState<any | null>(null);
  const [liveBatchModalOpen, setLiveBatchModalOpen] = useState<boolean>(false);
  const [selectedBatchForLive, setSelectedBatchForLive] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recipesRes, batchesRes, tanksRes, inventoryRes] = await Promise.all([
        fetch('/api/recipes'),
        fetch('/api/batches'),
        fetch('/api/tanks'),
        fetch('/api/inventory'),
      ]);

      const [recipesData, batchesData, tanksData, inventoryData] = await Promise.all([
        recipesRes.json(),
        batchesRes.json(),
        tanksRes.json(),
        inventoryRes.json(),
      ]);

      if (Array.isArray(recipesData)) setRecipes(recipesData);
      if (Array.isArray(batchesData)) setBatches(batchesData);
      if (Array.isArray(tanksData)) setTanks(tanksData);
      if (Array.isArray(inventoryData)) setInventoryItems(inventoryData);
    } catch (err) {
      console.error('Error loading brew studio data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteRecipe = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a receita "${name}"?`)) return;
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRecipes(recipes.filter((r) => r.id !== id));
      } else {
        alert('Erro ao excluir receita');
      }
    } catch (err) {
      alert('Erro ao excluir receita');
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (!confirm('Deseja excluir este planejamento/lote?')) return;
    try {
      const res = await fetch(`/api/batches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBatches(batches.filter((b) => b.id !== id));
      }
    } catch (e) {}
  };

  // Filtragem de receitas
  const filteredRecipes = recipes.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.style?.toLowerCase().includes(q) ||
      r.bjcpStyleCode?.toLowerCase().includes(q)
    );
  });

  // Lotes Planejados / Futuros e Ativos
  const plannedBatches = batches.filter((b) => b.status === 'PLANEJADO');
  const activeBatches = batches.filter((b) => b.status !== 'FINALIZADO' && b.status !== 'ENVASADO' && b.status !== 'PLANEJADO');
  const totalVolumeInTanks = activeBatches.reduce((acc, b) => acc + (b.volumePlannedLiters || 0), 0);

  // TODAS AS TAREFAS DE TANQUE CONSOLIDADAS DE TODOS OS LOTES ATIVOS
  const allTankTasks = useMemo(() => {
    const taskList: Array<TankTaskItem & { batchId: string; batchNumber: string; beerName: string; tankName: string }> = [];

    for (const batch of batches) {
      if (batch.status === 'FINALIZADO' || batch.status === 'ENVASADO') continue;
      const tName = batch.tank?.name || 'Tanque não atribuído';
      const bName = batch.recipe?.name || 'Cerveja';

      let parsedTasks: TankTaskItem[] = [];
      if (batch.tankTasksJson) {
        try {
          parsedTasks = JSON.parse(batch.tankTasksJson);
        } catch (e) {}
      } else if (batch.status === 'FERMENTANDO' || batch.status === 'MATURANDO') {
        const brewDateRef = batch.brewDate ? batch.brewDate : new Date();
        parsedTasks = [
          { id: `${batch.id}-1`, title: 'Medição de Densidade & Subida Diacetil', type: 'MEASUREMENT', dueDate: addDaysToDateString(brewDateRef, 4), completed: false },
          { id: `${batch.id}-2`, title: 'Adição de Dry Hopping', type: 'DRY_HOPPING', dueDate: addDaysToDateString(brewDateRef, 6), completed: false, amount: 2.0, unit: 'KG' },
          { id: `${batch.id}-3`, title: 'Dosagem de Antioxidante & Início Cold Crash', type: 'ANTIOXIDANT', dueDate: addDaysToDateString(brewDateRef, 10), completed: false },
        ];
      }

      for (const t of parsedTasks) {
        taskList.push({
          ...t,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          beerName: bName,
          tankName: tName,
        });
      }
    }

    taskList.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return taskList;
  }, [batches]);

  const todayStr = getLocalDateString();
  const pendingTasks = allTankTasks.filter((t) => !t.completed);
  const todayTasks = pendingTasks.filter((t) => t.dueDate === todayStr);

  // Alternar conclusão de tarefa diretamente no calendário
  const handleToggleGlobalTask = async (batchId: string, taskId: string) => {
    const targetBatch = batches.find((b) => b.id === batchId);
    if (!targetBatch) return;

    let tasksArr: TankTaskItem[] = [];
    if (targetBatch.tankTasksJson) {
      try {
        tasksArr = JSON.parse(targetBatch.tankTasksJson);
      } catch (e) {}
    } else {
      tasksArr = allTankTasks.filter((t) => t.batchId === batchId);
    }

    const updatedTasks = tasksArr.map((t) =>
      t.id === taskId
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
        : t
    );

    try {
      await fetch(`/api/batches/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankTasksJson: JSON.stringify(updatedTasks) }),
      });
      fetchData();
    } catch (e) {}
  };

  // MOTOR DE CÁLCULO DE DÉFICIT CONSOLIDADO DE ESTOQUE
  const consolidatedDeficitPlan = useMemo(() => {
    const ingredientDemandMap: Record<string, { name: string; category: string; totalRequired: number; unit: string }> = {};

    for (const batch of plannedBatches) {
      const rec = recipes.find((r) => r.id === batch.recipeId) || batch.recipe;
      if (!rec) continue;

      const scale = (rec.batchYieldLiters && rec.batchYieldLiters > 0)
        ? (batch.volumePlannedLiters || 500) / rec.batchYieldLiters
        : 1;

      if (rec.recipeDataJson) {
        try {
          const parsed = JSON.parse(rec.recipeDataJson);
          for (const f of parsed.fermentables || []) {
            const key = `MALTE_${f.name.toLowerCase().trim()}`;
            if (!ingredientDemandMap[key]) {
              ingredientDemandMap[key] = { name: f.name, category: 'MALTE', totalRequired: 0, unit: 'KG' };
            }
            ingredientDemandMap[key].totalRequired += (f.amountKg || 0) * scale;
          }
          for (const h of parsed.hops || []) {
            const key = `LUPULO_${h.name.toLowerCase().trim()}`;
            if (!ingredientDemandMap[key]) {
              ingredientDemandMap[key] = { name: h.name, category: 'LUPULO', totalRequired: 0, unit: 'G' };
            }
            ingredientDemandMap[key].totalRequired += (h.amountGrams || 0) * scale;
          }
        } catch (e) {}
      } else if (Array.isArray(rec.ingredients)) {
        for (const ing of rec.ingredients) {
          const cat = ing.category === 'LUPULO' ? 'LUPULO' : 'MALTE';
          const key = `${cat}_${ing.name.toLowerCase().trim()}`;
          const amount = ing.amount || 0;
          if (!ingredientDemandMap[key]) {
            ingredientDemandMap[key] = { name: ing.name, category: cat, totalRequired: 0, unit: ing.unit || 'KG' };
          }
          ingredientDemandMap[key].totalRequired += amount * scale;
        }
      }
    }

    const items = Object.values(ingredientDemandMap).map((d) => {
      const lower = d.name.toLowerCase();
      const match = inventoryItems.find((i) => i.name.toLowerCase().includes(lower) || lower.includes(i.name.toLowerCase()));
      let avail = match ? match.currentQuantity : 0;
      if (d.unit === 'G' && match?.unit === 'KG') {
        avail = avail * 1000;
      }

      const deficit = d.totalRequired - avail;
      return {
        name: d.name,
        category: d.category,
        totalRequired: Math.round(d.totalRequired * 10) / 10,
        available: Math.round(avail * 10) / 10,
        deficit: deficit > 0 ? Math.round(deficit * 10) / 10 : 0,
        unit: d.unit,
        isMissing: deficit > 0,
      };
    });

    const missingList = items.filter((i) => i.isMissing);
    return {
      allRequirements: items,
      missingList,
      hasDeficit: missingList.length > 0,
    };
  }, [plannedBatches, recipes, inventoryItems]);

  const copyShoppingListText = () => {
    if (consolidatedDeficitPlan.missingList.length === 0) return;
    let text = `📋 *LISTA DE COMPRAS DE INSUMOS - PINTTECH*\n`;
    text += `Para atender o planejamento de produção (${plannedBatches.length} lotes futuros):\n\n`;
    for (const item of consolidatedDeficitPlan.missingList) {
      text += `• ${item.name} (${item.category}): Falta comprar *${item.deficit} ${item.unit}* (Necessário: ${item.totalRequired} ${item.unit} | Saldo: ${item.available} ${item.unit})\n`;
    }
    navigator.clipboard.writeText(text);
    setCopiedShoppingList(true);
    setTimeout(() => setCopiedShoppingList(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 -m-4 md:-m-6 lg:-m-8">
      {/* TOPBAR BANNER LIGHT */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>PintTech Brew Studio — Designer & Planejador Cervejeiro</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Elaboração de Receitas & Gestão da Adega
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm max-w-2xl font-medium">
                Crie receitas, edite parâmetros ao vivo durante a fermentação, agende lembretes de Dry Hopping/Antioxidante e acompanhe o que falta comprar no estoque.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setXmlImporterOpen(true)}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <UploadCloud className="w-4 h-4 text-amber-600" />
                <span>Importar BeerXML</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRecipeForEdit(null);
                  setDesignerModalOpen(true);
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-2xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Receita</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar Light */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-100">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block">Receitas Elaboradas</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">{recipes.length}</span>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80">
              <span className="text-[11px] font-bold text-amber-800 block">Tarefas de Tanque Pendentes</span>
              <span className="text-xl sm:text-2xl font-black text-amber-700 mt-1 block">{pendingTasks.length} tarefas</span>
            </div>

            <div className="p-3.5 bg-cyan-50/60 rounded-2xl border border-cyan-200/80">
              <span className="text-[11px] font-bold text-cyan-800 block">Volume em Fermentação</span>
              <span className="text-xl sm:text-2xl font-black text-cyan-800 mt-1 block">
                {totalVolumeInTanks.toLocaleString('pt-BR')} <span className="text-xs font-bold text-slate-500">Litros</span>
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
              <span className="text-[11px] font-bold text-emerald-800 block">Diagnóstico de Compras</span>
              <span className={`text-xl sm:text-2xl font-black mt-1 block ${consolidatedDeficitPlan.hasDeficit ? 'text-rose-600' : 'text-emerald-700'}`}>
                {consolidatedDeficitPlan.hasDeficit ? `${consolidatedDeficitPlan.missingList.length} itens a comprar` : 'Estoque 100% OK'}
              </span>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS LIGHT */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('RECIPES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'RECIPES'
                  ? 'bg-amber-500 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Beer className="w-4 h-4" />
              <span>Minhas Receitas ({recipes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('CELLAR_CALENDAR')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'CELLAR_CALENDAR'
                  ? 'bg-amber-500 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Tarefas da Adega & Lembretes ({pendingTasks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('PLANNING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'PLANNING'
                  ? 'bg-amber-500 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Planejamento & Estoque Futuro ({plannedBatches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('BATCHES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'BATCHES'
                  ? 'bg-amber-500 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Tanques & Fermentação ({activeBatches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('STOCK')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'STOCK'
                  ? 'bg-amber-500 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Estoque Físico</span>
            </button>
          </div>

          {/* Search bar */}
          {activeTab === 'RECIPES' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar receita ou estilo..."
                className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 shadow-sm"
              />
            </div>
          )}
        </div>

        {/* CONTEÚDO PRINCIPAL (LIGHT THEME) */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold">Carregando dados cervejeiros...</span>
          </div>
        ) : activeTab === 'RECIPES' ? (
          <div className="space-y-4">
            {filteredRecipes.length === 0 ? (
              <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-3xl space-y-3 shadow-sm">
                <div className="w-14 h-14 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                  <Beer className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Nenhuma receita encontrada</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Comece desenhando sua primeira cerveja na calculadora ou importe arquivos BeerXML existentes.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedRecipeForEdit(null);
                      setDesignerModalOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-md"
                  >
                    + Criar Primeira Receita
                  </button>
                  <button
                    onClick={() => setXmlImporterOpen(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300"
                  >
                    Importar BeerXML
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecipes.map((r) => {
                  const srm = r.ebc ? Math.round(r.ebc / 1.97) : 4;
                  const hex = srmToHex(srm);

                  return (
                    <div
                      key={r.id}
                      className="bg-white border border-slate-200 hover:border-amber-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        {/* Header do Card */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-10 rounded-lg border border-slate-300 shadow-inner flex items-center justify-center relative overflow-hidden"
                              style={{ backgroundColor: hex }}
                            >
                              <div className="w-full h-1.5 bg-white/40 absolute top-0" />
                            </div>
                            <div>
                              <h3 className="text-base font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                                {r.name}
                              </h3>
                              <span className="text-xs font-bold text-amber-700 block">
                                {r.style} {r.bjcpStyleCode ? `(${r.bjcpStyleCode})` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900 block">
                              {r.batchYieldLiters || 500}L
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">Rendimento</span>
                          </div>
                        </div>

                        {/* Badges de Parâmetros Técnicos (OG, ABV, IBU, EBC) */}
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          <div className="p-2 bg-slate-50 rounded-xl text-center border border-slate-200">
                            <span className="text-[10px] text-slate-500 font-bold block">OG</span>
                            <span className="text-xs font-black text-slate-900">
                              {r.og ? r.og.toFixed(3) : '-'}
                            </span>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-xl text-center border border-slate-200">
                            <span className="text-[10px] text-slate-500 font-bold block">ABV</span>
                            <span className="text-xs font-black text-amber-700">
                              {r.abv ? `${r.abv.toFixed(1)}%` : '-'}
                            </span>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-xl text-center border border-slate-200">
                            <span className="text-[10px] text-slate-500 font-bold block">IBU</span>
                            <span className="text-xs font-black text-emerald-700">
                              {r.ibu ?? '-'}
                            </span>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-xl text-center border border-slate-200">
                            <span className="text-[10px] text-slate-500 font-bold block">EBC</span>
                            <span className="text-xs font-black text-cyan-700">
                              {r.ebc ? Math.round(r.ebc) : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Custo & Insumos */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-600 font-medium">
                          <span className="flex items-center gap-1 font-bold">
                            <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                            <span>CPV: {r.costPerLiter ? `R$ ${r.costPerLiter.toFixed(2)}/L` : 'R$ 0,00'}</span>
                          </span>

                          <span className="text-[11px] font-bold text-slate-500">
                            {r._count?.batches || 0} brassagem(ns)
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <a
                            href={`/api/recipes/${r.id}/export-beerxml`}
                            download
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                            title="Exportar BeerXML"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteRecipe(r.id, r.name)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Excluir Receita"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecipeForSchedule(r);
                              setScheduleModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-200 transition-all flex items-center gap-1"
                            title="Agendar data futura de brassagem"
                          >
                            <Calendar className="w-3.5 h-3.5 text-amber-600" />
                            <span>Planejar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecipeForEdit(r);
                              setDesignerModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all"
                          >
                            Calculadora
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecipeForBrew(r);
                              setBrewDayModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1 transition-all"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>Brassagem</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'CELLAR_CALENDAR' ? (
          /* ABA: CALENDÁRIO DE TAREFAS DA ADEGA & LEMBRETES DE TANQUE */
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-black text-slate-900">
                      Quadro de Tarefas da Adega & Lembretes de Tanque
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Acompanhe as tarefas diárias programadas para cada fermentador (Dry Hopping, Antioxidante, Cold Crash, Purgas).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-xl border border-amber-300">
                    {todayTasks.length} tarefa(s) para hoje
                  </span>
                </div>
              </div>

              {allTankTasks.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <Clock className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Nenhuma tarefa programada nos tanques no momento.</p>
                  <p className="text-[11px] text-slate-400">Ao iniciar ou acompanhar qualquer lote, você pode programar tarefas de adega personalizadas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allTankTasks.map((task) => {
                    const isLate = !task.completed && task.dueDate < todayStr;
                    const isToday = !task.completed && task.dueDate === todayStr;

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          task.completed
                            ? 'bg-slate-50/70 border-slate-200 opacity-60'
                            : isLate
                            ? 'bg-rose-50 border-rose-200'
                            : isToday
                            ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleGlobalTask(task.batchId, task.id)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors mt-0.5 ${
                              task.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white border-slate-300 hover:border-amber-500'
                            }`}
                            title="Marcar como concluída"
                          >
                            {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                          </button>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-sm font-black ${task.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {task.title}
                              </span>

                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                🏺 {task.tankName}
                              </span>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                Lote: {task.batchNumber} ({task.beerName})
                              </span>

                              {task.type === 'DRY_HOPPING' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                  🌿 Dry Hopping
                                </span>
                              )}
                              {task.type === 'ANTIOXIDANT' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800">
                                  🧪 Antioxidante
                                </span>
                              )}
                              {task.type === 'COLD_CRASH' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                  ❄️ Cold Crash
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1 font-bold">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                Data Programada: {formatDate(task.dueDate)}
                              </span>
                              {task.amount && (
                                <span>Dosagem: <strong>{task.amount} {task.unit}</strong></span>
                              )}
                              {task.completedAt && (
                                <span className="text-emerald-700 font-bold">✓ Concluída em {formatDateShort(task.completedAt)}</span>
                              )}
                            </div>

                            {task.notes && (
                              <p className="text-xs text-slate-600 bg-slate-100/60 p-2 rounded-lg mt-1">{task.notes}</p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const b = batches.find((item) => item.id === task.batchId);
                            if (b) {
                              setSelectedBatchForLive(b);
                              setLiveBatchModalOpen(true);
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all self-end sm:self-center flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Abrir Tanque</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'PLANNING' ? (
          /* ABA: PLANEJAMENTO & CRONOGRAMA DE PRODUÇÃO */
          <div className="space-y-6">
            {/* CARD 1: DIAGNÓSTICO DE INSUMOS E LISTA DE COMPRAS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-black text-slate-900">
                      Balanço de Insumos & O que Falta Comprar
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Cálculo cumulativo de demanda para todos os {plannedBatches.length} lotes com data futura agendada.
                  </p>
                </div>

                {consolidatedDeficitPlan.hasDeficit ? (
                  <button
                    type="button"
                    onClick={copyShoppingListText}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-2 transition-all"
                  >
                    {copiedShoppingList ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedShoppingList ? 'Lista Copiada!' : 'Copiar Lista p/ Fornecedor'}</span>
                  </button>
                ) : (
                  <div className="px-3.5 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Estoque suficiente para todas as datas planejadas!</span>
                  </div>
                )}
              </div>

              {consolidatedDeficitPlan.allRequirements.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500">Nenhum lote futuro agendado no momento.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Clique em &quot;Planejar&quot; em qualquer receita para agendar datas futuras.</p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Insumo</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3 text-right">Demanda Planejada</th>
                        <th className="p-3 text-right">Estoque Físico Atual</th>
                        <th className="p-3 text-right">Falta Comprar (Déficit)</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {consolidatedDeficitPlan.allRequirements.map((item, idx) => (
                        <tr key={idx} className={item.isMissing ? 'bg-rose-50/70 hover:bg-rose-50' : 'hover:bg-white'}>
                          <td className="p-3 font-bold text-slate-900">{item.name}</td>
                          <td className="p-3 text-slate-500 font-medium">{item.category}</td>
                          <td className="p-3 text-right font-black text-slate-800">{item.totalRequired} {item.unit}</td>
                          <td className="p-3 text-right font-bold text-slate-600">{item.available} {item.unit}</td>
                          <td className="p-3 text-right font-black">
                            {item.deficit > 0 ? (
                              <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md font-black">
                                Comprar {item.deficit} {item.unit}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold">100% Coberto</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {item.isMissing ? (
                              <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                Déficit
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                Pronto
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* CARD 2: CRONOGRAMA DE LOTES FUTUROS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span>Cronograma de Brassagens Futuras ({plannedBatches.length} Lotes)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhe as datas programadas e inicie a brassagem no dia previsto com 1 clique.
                  </p>
                </div>
              </div>

              {plannedBatches.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500">Nenhum lote agendado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plannedBatches.map((batch) => {
                    const rec = recipes.find((r) => r.id === batch.recipeId) || batch.recipe;
                    const dateFormatted = batch.brewDate ? formatDate(batch.brewDate) : 'Data a definir';

                    return (
                      <div key={batch.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              PLANEJADO
                            </span>
                            <span className="text-xs font-black text-slate-700">{batch.volumePlannedLiters} Litros</span>
                          </div>

                          <h4 className="text-sm font-black text-slate-900">{rec?.name || 'Cerveja'}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Brassagem: {dateFormatted}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">Lote: <span className="font-bold text-slate-700">{batch.batchNumber}</span></p>
                        </div>

                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteBatch(batch.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remover Agendamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecipeForBrew(rec || { name: batch.batchNumber, batchYieldLiters: batch.volumePlannedLiters, id: batch.recipeId });
                              setBrewDayModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>Iniciar Brassagem Hoje</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'BATCHES' ? (
          /* ABA: TANQUES E FERMENTAÇÃO */
          <div className="space-y-4">
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                <span>Tanques de Fermentação & Lotes em Andamento (Clique para Gerenciar Tarefas)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tanks.map((tank) => {
                  const currentBatch = batches.find((b) => b.tankId === tank.id && b.status !== 'FINALIZADO' && b.status !== 'PLANEJADO');
                  const isBusy = tank.status === 'OCUPADO' || currentBatch;

                  return (
                    <div
                      key={tank.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isBusy
                          ? 'bg-amber-50/70 border-amber-300 text-slate-800 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Cylinder className={`w-5 h-5 ${isBusy ? 'text-amber-600' : 'text-slate-400'}`} />
                            <span className="text-sm font-black text-slate-900">{tank.name}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-500">{tank.capacityLiters}L</span>
                        </div>

                        {currentBatch ? (
                          <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-900">{currentBatch.recipe?.name || 'Cerveja'}</span>
                              <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[10px] font-black">{currentBatch.status}</span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              Lote: <span className="font-bold text-slate-800">{currentBatch.batchNumber}</span> | {currentBatch.volumePlannedLiters}L
                            </p>
                            {currentBatch.measuredOg && (
                              <p className="text-[11px] text-slate-600">
                                OG: <span className="font-bold text-amber-700">{currentBatch.measuredOg}</span> {currentBatch.measuredFg ? `→ FG: ${currentBatch.measuredFg}` : ''}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-3 italic">Tanque livre para brassagem</p>
                        )}
                      </div>

                      {currentBatch && (
                        <div className="mt-4 pt-3 border-t border-amber-200/80 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-bold">Tarefas & Medições</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBatchForLive(currentBatch);
                              setLiveBatchModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Gerenciar Tanque</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ABA: ESTOQUE FÍSICO */
          <div className="space-y-4">
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Estoque Físico de Insumos da Cervejaria</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {inventoryItems.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{item.category}</span>
                      <h4 className="text-xs font-black text-slate-900 mt-0.5">{item.name}</h4>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-700">
                        {item.currentQuantity} {item.unit}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {formatCurrency(item.costPerUnit || 0)}/{item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: DESIGNER / CALCULADORA DE RECEITA */}
      {designerModalOpen && (
        <RecipeDesignerModal
          recipe={selectedRecipeForEdit}
          inventoryItems={inventoryItems}
          onClose={() => {
            setDesignerModalOpen(false);
            setSelectedRecipeForEdit(null);
          }}
          onSaved={(saved) => {
            fetchData();
          }}
        />
      )}

      {/* MODAL: AGENDAR PRODUÇÃO FUTURA */}
      {scheduleModalOpen && selectedRecipeForSchedule && (
        <ScheduleBatchModal
          recipe={selectedRecipeForSchedule}
          tanks={tanks}
          inventoryItems={inventoryItems}
          onClose={() => {
            setScheduleModalOpen(false);
            setSelectedRecipeForSchedule(null);
          }}
          onScheduled={() => {
            fetchData();
            setActiveTab('PLANNING');
          }}
        />
      )}

      {/* MODAL: GERENCIAMENTO DE TANQUE / LOTE AO VIVO & TAREFAS */}
      {liveBatchModalOpen && selectedBatchForLive && (
        <LiveBatchManagerModal
          batch={selectedBatchForLive}
          tanks={tanks}
          inventoryItems={inventoryItems}
          onClose={() => {
            setLiveBatchModalOpen(false);
            setSelectedBatchForLive(null);
          }}
          onSaved={() => {
            fetchData();
          }}
        />
      )}

      {/* MODAL: IMPORTADOR BEERXML */}
      {xmlImporterOpen && (
        <BeerXmlImporterModal
          onClose={() => setXmlImporterOpen(false)}
          onImportSuccess={(newRecipes) => {
            fetchData();
          }}
        />
      )}

      {/* MODAL: DIA DE BRASSAGEM (BREW DAY) */}
      {brewDayModalOpen && selectedRecipeForBrew && (
        <BrewDayModal
          recipe={selectedRecipeForBrew}
          tanks={tanks}
          onClose={() => {
            setBrewDayModalOpen(false);
            setSelectedRecipeForBrew(null);
          }}
          onBatchCreated={() => {
            fetchData();
            setActiveTab('BATCHES');
          }}
        />
      )}
    </div>
  );
}
