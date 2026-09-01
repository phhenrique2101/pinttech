'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Beer,
  Plus,
  Search,
  Upload,
  Download,
  Calendar,
  Flame,
  Layers,
  Cylinder,
  Sparkles,
  DollarSign,
  Package,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Clock,
  ShoppingCart,
  Copy,
  Check,
  CalendarDays,
  Edit3,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
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

  // Layout e Ordenação
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [sortField, setSortField] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  // Resetar campo padrão de ordenação ao mudar de aba
  useEffect(() => {
    if (activeTab === 'RECIPES') setSortField('name');
    else if (activeTab === 'CELLAR_CALENDAR') setSortField('dueDate');
    else if (activeTab === 'PLANNING') setSortField('brewDate');
    else if (activeTab === 'BATCHES') setSortField('brewDate');
    else if (activeTab === 'STOCK') setSortField('name');
  }, [activeTab]);

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

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // 1. Filtragem e Ordenação de Receitas
  const filteredAndSortedRecipes = useMemo(() => {
    let list = recipes.filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.name?.toLowerCase().includes(q) ||
        r.style?.toLowerCase().includes(q) ||
        r.bjcpStyleCode?.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      let valA: any = a[sortField] ?? '';
      let valB: any = b[sortField] ?? '';

      if (sortField === 'costPerLiter' || sortField === 'abv' || sortField === 'ibu' || sortField === 'ebc' || sortField === 'og') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [recipes, search, sortField, sortOrder]);

  // Lotes Planejados e Ativos
  const plannedBatches = batches.filter((b) => b.status === 'PLANEJADO');
  const activeBatches = batches.filter((b) => b.status !== 'FINALIZADO' && b.status !== 'ENVASADO' && b.status !== 'PLANEJADO');
  const totalVolumeInTanks = activeBatches.reduce((acc, b) => acc + (b.volumePlannedLiters || 0), 0);

  // 2. Tarefas de Tanque Consolidadas
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

    let filtered = taskList;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.beerName.toLowerCase().includes(q) ||
          t.batchNumber.toLowerCase().includes(q) ||
          t.tankName.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      let valA: any = (a as any)[sortField] ?? '';
      let valB: any = (b as any)[sortField] ?? '';

      if (sortField === 'dueDate') {
        valA = a.dueDate;
        valB = b.dueDate;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [batches, search, sortField, sortOrder]);

  const todayStr = getLocalDateString();
  const pendingTasks = allTankTasks.filter((t) => !t.completed);
  const todayTasks = pendingTasks.filter((t) => t.dueDate === todayStr);

  // Alternar conclusão de tarefa diretamente no calendário
  const handleToggleGlobalTask = async (batchId: string, taskId: string) => {
    const targetBatch = batches.find((b) => b.id === batchId);
    if (!targetBatch) return;

    let currentTasks: TankTaskItem[] = [];
    if (targetBatch.tankTasksJson) {
      try {
        currentTasks = JSON.parse(targetBatch.tankTasksJson);
      } catch (e) {}
    } else {
      const brewDateRef = targetBatch.brewDate ? targetBatch.brewDate : new Date();
      currentTasks = [
        { id: `${targetBatch.id}-1`, title: 'Medição de Densidade & Subida Diacetil', type: 'MEASUREMENT', dueDate: addDaysToDateString(brewDateRef, 4), completed: false },
        { id: `${targetBatch.id}-2`, title: 'Adição de Dry Hopping', type: 'DRY_HOPPING', dueDate: addDaysToDateString(brewDateRef, 6), completed: false, amount: 2.0, unit: 'KG' },
        { id: `${targetBatch.id}-3`, title: 'Dosagem de Antioxidante & Início Cold Crash', type: 'ANTIOXIDANT', dueDate: addDaysToDateString(brewDateRef, 10), completed: false },
      ];
    }

    const updatedTasks = currentTasks.map((t) =>
      t.id === taskId
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
        : t
    );

    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankTasksJson: JSON.stringify(updatedTasks) }),
      });
      if (res.ok) {
        setBatches(
          batches.map((b) => (b.id === batchId ? { ...b, tankTasksJson: JSON.stringify(updatedTasks) } : b))
        );
      }
    } catch (e) {}
  };

  // 3. Filtragem e Ordenação de Lotes Planejados
  const filteredAndSortedPlannedBatches = useMemo(() => {
    let list = plannedBatches.filter((b) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const rName = b.recipe?.name || '';
      return b.batchNumber?.toLowerCase().includes(q) || rName.toLowerCase().includes(q);
    });

    list.sort((a, b) => {
      let valA: any = a[sortField] ?? '';
      let valB: any = b[sortField] ?? '';

      if (sortField === 'name' || sortField === 'recipe') {
        valA = (a.recipe?.name || '').toLowerCase();
        valB = (b.recipe?.name || '').toLowerCase();
      } else if (sortField === 'volumePlannedLiters') {
        valA = a.volumePlannedLiters || 0;
        valB = b.volumePlannedLiters || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [plannedBatches, search, sortField, sortOrder]);

  // 4. Filtragem e Ordenação de Tanques e Fermentação
  const filteredAndSortedTanks = useMemo(() => {
    let list = tanks.filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const currentBatch = batches.find((b) => b.tankId === t.id && b.status !== 'FINALIZADO' && b.status !== 'PLANEJADO');
      return t.name.toLowerCase().includes(q) || (currentBatch?.recipe?.name || '').toLowerCase().includes(q);
    });

    list.sort((a, b) => {
      let valA: any = a[sortField] ?? '';
      let valB: any = b[sortField] ?? '';

      if (sortField === 'capacityLiters') {
        valA = a.capacityLiters || 0;
        valB = b.capacityLiters || 0;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [tanks, batches, search, sortField, sortOrder]);

  // 5. Filtragem e Ordenação do Estoque Físico
  const filteredAndSortedStock = useMemo(() => {
    let list = inventoryItems.filter((item) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });

    list.sort((a, b) => {
      let valA: any = a[sortField] ?? '';
      let valB: any = b[sortField] ?? '';

      if (sortField === 'currentQuantity' || sortField === 'costPerUnit') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [inventoryItems, search, sortField, sortOrder]);

  // CÁLCULO CONSOLIDADO DE DEMANDA DE INSUMOS FUTUROS VS ESTOQUE FÍSICO
  const consolidatedDeficitPlan = useMemo(() => {
    const demandMap: Record<string, { name: string; category: string; totalRequired: number; unit: string }> = {};

    for (const batch of plannedBatches) {
      const rec = recipes.find((r) => r.id === batch.recipeId) || batch.recipe;
      if (!rec) continue;

      const scale = (rec.batchYieldLiters && rec.batchYieldLiters > 0)
        ? (batch.volumePlannedLiters || 500) / rec.batchYieldLiters
        : 1;

      let recipeData: any = null;
      if (rec.recipeDataJson) {
        try {
          recipeData = JSON.parse(rec.recipeDataJson);
        } catch (e) {}
      }

      if (recipeData) {
        for (const f of recipeData.fermentables || []) {
          const key = `malte_${f.name.toLowerCase().trim()}`;
          const amount = (f.amountKg || 0) * scale;
          if (!demandMap[key]) {
            demandMap[key] = { name: f.name, category: 'MALTE', totalRequired: 0, unit: 'KG' };
          }
          demandMap[key].totalRequired += amount;
        }

        for (const h of recipeData.hops || []) {
          const key = `hop_${h.name.toLowerCase().trim()}`;
          const amountKg = ((h.amountGrams || 0) * scale) / 1000;
          if (!demandMap[key]) {
            demandMap[key] = { name: h.name, category: 'LUPULO', totalRequired: 0, unit: 'KG' };
          }
          demandMap[key].totalRequired += amountKg;
        }

        if (recipeData.yeast) {
          const key = `yeast_${recipeData.yeast.name.toLowerCase().trim()}`;
          if (!demandMap[key]) {
            demandMap[key] = { name: recipeData.yeast.name, category: 'LEVEDURA', totalRequired: 0, unit: 'UN' };
          }
          demandMap[key].totalRequired += 1;
        }
      }
    }

    const allRequirements: Array<{
      name: string;
      category: string;
      totalRequired: number;
      available: number;
      deficit: number;
      unit: string;
      isMissing: boolean;
    }> = [];

    for (const key of Object.keys(demandMap)) {
      const item = demandMap[key];
      const stockMatch = inventoryItems.find((inv) =>
        inv.name.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(inv.name.toLowerCase())
      );

      let availableQty = 0;
      if (stockMatch) {
        availableQty = stockMatch.unit === 'G' ? stockMatch.currentQuantity / 1000 : stockMatch.currentQuantity;
      }

      const diff = Math.round((item.totalRequired - availableQty) * 100) / 100;
      allRequirements.push({
        name: item.name,
        category: item.category,
        totalRequired: Math.round(item.totalRequired * 100) / 100,
        available: Math.round(availableQty * 100) / 100,
        deficit: diff > 0 ? diff : 0,
        unit: item.unit,
        isMissing: diff > 0,
      });
    }

    const missingList = allRequirements.filter((i) => i.isMissing);
    return {
      allRequirements,
      missingList,
      hasDeficit: missingList.length > 0,
    };
  }, [plannedBatches, recipes, inventoryItems]);

  const copyShoppingListText = () => {
    if (consolidatedDeficitPlan.missingList.length === 0) return;
    let txt = `🛒 LISTA DE COMPRAS DE INSUMOS - PINTTECH BREW\n`;
    txt += `Demanda consolidada para os próximos ${plannedBatches.length} lotes de produção:\n\n`;
    for (const item of consolidatedDeficitPlan.missingList) {
      txt += `• [${item.category}] ${item.name}: ${item.deficit} ${item.unit} (Estoque atual: ${item.available} ${item.unit} | Demanda: ${item.totalRequired} ${item.unit})\n`;
    }
    txt += `\nGerado automaticamente via PintTech Brew Studio (${new Date().toLocaleDateString('pt-BR')})`;

    navigator.clipboard.writeText(txt);
    setCopiedShoppingList(true);
    setTimeout(() => setCopiedShoppingList(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* TOP HEADER LIGHT */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 font-black text-xl">
              🍺
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 tracking-tight">PintTech</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Brew Studio
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none">
                Engenharia Cervejeira, Planejamento & Controle de Estoque
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setXmlImporterOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span>Importar BeerXML</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRecipeForEdit(null);
                setDesignerModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Receita</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* BANNER / STATUS DA CERVEJARIA */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <span>Cockpit de Produção & Adega</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Sincronizado
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Ambiente de elaboração de receitas, cálculo BJCP 2021, curvas de maturação e baixa bidirecional de estoque.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setXmlImporterOpen(true)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4 text-amber-600" />
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

          {/* Quick Metrics Bar */}
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

        {/* NAVEGAÇÃO ENTRE ABAS */}
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
              <span>Tarefas da Adega ({pendingTasks.length})</span>
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

          {/* Search bar & Global Controls */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar em tempo real..."
              className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 shadow-sm"
            />
          </div>
        </div>

        {/* BARRA DE CONTROLE UNIVERSAL: MODO DE EXIBIÇÃO (GRADE / LINHAS) & ORDENAÇÃO (CRESCENTE / DECRESCENTE) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Seletor de Ordenação Dinâmico por Aba */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>Ordenar por:</span>
            </span>

            {activeTab === 'RECIPES' && (
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="name">Nome da Receita</option>
                <option value="style">Estilo Cervejeiro</option>
                <option value="abv">Teor Alcoólico (ABV)</option>
                <option value="ibu">Amargor (IBU)</option>
                <option value="ebc">Cor (EBC/SRM)</option>
                <option value="costPerLiter">Custo por Litro (R$/L)</option>
                <option value="createdAt">Data de Criação</option>
              </select>
            )}

            {activeTab === 'CELLAR_CALENDAR' && (
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="dueDate">Data Programada</option>
                <option value="title">Título da Tarefa</option>
                <option value="batchNumber">Número do Lote</option>
                <option value="tankName">Tanque</option>
              </select>
            )}

            {activeTab === 'PLANNING' && (
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="brewDate">Data Prevista</option>
                <option value="batchNumber">Número do Lote</option>
                <option value="name">Nome da Cerveja</option>
                <option value="volumePlannedLiters">Volume Planejado</option>
              </select>
            )}

            {activeTab === 'BATCHES' && (
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="name">Nome do Tanque</option>
                <option value="capacityLiters">Capacidade (L)</option>
                <option value="status">Status</option>
              </select>
            )}

            {activeTab === 'STOCK' && (
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="name">Nome do Insumo</option>
                <option value="currentQuantity">Saldo em Estoque</option>
                <option value="category">Categoria</option>
                <option value="costPerUnit">Custo Unitário</option>
              </select>
            )}

            {/* Botão de Toggle Crescente / Decrescente */}
            <button
              type="button"
              onClick={toggleSortOrder}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title={sortOrder === 'asc' ? 'Ordem Crescente (A-Z, Menor-Maior)' : 'Ordem Decrescente (Z-A, Maior-Menor)'}
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Crescente (A-Z)</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Decrescente (Z-A)</span>
                </>
              )}
            </button>
          </div>

          {/* Seletor de Modo de Exibição: GRADE (CARDS) vs LINHAS (TABELA) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'GRID'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Exibir em Grade (Cards)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grade</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'LIST'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Exibir em Linhas (Tabela)"
            >
              <List className="w-3.5 h-3.5" />
              <span>Linhas</span>
            </button>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold">Carregando dados cervejeiros...</span>
          </div>
        ) : activeTab === 'RECIPES' ? (
          /* ========================================================================= */
          /* ABA 1: MINHAS RECEITAS (GRADE OU LINHAS)                                  */
          /* ========================================================================= */
          <div className="space-y-4">
            {filteredAndSortedRecipes.length === 0 ? (
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
            ) : viewMode === 'GRID' ? (
              /* MODO GRADE: RECEITAS */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedRecipes.map((r) => {
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
            ) : (
              /* MODO LINHAS (TABELA): RECEITAS */
              <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Receita / Cor</th>
                      <th className="p-4">Estilo BJCP</th>
                      <th className="p-4 text-center">OG</th>
                      <th className="p-4 text-center">ABV</th>
                      <th className="p-4 text-center">IBU</th>
                      <th className="p-4 text-center">EBC</th>
                      <th className="p-4 text-right">Rendimento</th>
                      <th className="p-4 text-right">Custo / Litro</th>
                      <th className="p-4 text-center">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedRecipes.map((r) => {
                      const srm = r.ebc ? Math.round(r.ebc / 1.97) : 4;
                      const hex = srmToHex(srm);

                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-6 rounded border border-slate-300 shadow-inner flex-shrink-0"
                                style={{ backgroundColor: hex }}
                              />
                              <div>
                                <span className="font-black text-slate-900 block text-sm">{r.name}</span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {r._count?.batches || 0} lote(s) produzidos
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 font-bold text-slate-700">
                            {r.style} {r.bjcpStyleCode ? `(${r.bjcpStyleCode})` : ''}
                          </td>

                          <td className="p-4 text-center font-bold text-slate-900">{r.og ? r.og.toFixed(3) : '-'}</td>
                          <td className="p-4 text-center font-black text-amber-700">{r.abv ? `${r.abv.toFixed(1)}%` : '-'}</td>
                          <td className="p-4 text-center font-black text-emerald-700">{r.ibu ?? '-'}</td>
                          <td className="p-4 text-center font-black text-cyan-700">{r.ebc ? Math.round(r.ebc) : '-'}</td>
                          <td className="p-4 text-right font-black text-slate-900">{r.batchYieldLiters || 500} L</td>
                          <td className="p-4 text-right font-black text-purple-700">
                            {r.costPerLiter ? `R$ ${r.costPerLiter.toFixed(2)}` : 'R$ 0,00'}
                          </td>

                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecipeForSchedule(r);
                                  setScheduleModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-200"
                                title="Planejar Brassagem Futura"
                              >
                                Planejar
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecipeForEdit(r);
                                  setDesignerModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg border border-slate-300"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecipeForBrew(r);
                                  setBrewDayModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-lg shadow-xs"
                              >
                                Brassar
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteRecipe(r.id, r.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'CELLAR_CALENDAR' ? (
          /* ========================================================================= */
          /* ABA 2: TAREFAS DA ADEGA & LEMBRETES (GRADE OU LINHAS)                     */
          /* ========================================================================= */
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
              ) : viewMode === 'LIST' ? (
                /* MODO LINHAS: TAREFAS */
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
              ) : (
                /* MODO GRADE: TAREFAS */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allTankTasks.map((task) => {
                    const isLate = !task.completed && task.dueDate < todayStr;
                    const isToday = !task.completed && task.dueDate === todayStr;

                    return (
                      <div
                        key={task.id}
                        className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-3 ${
                          task.completed
                            ? 'bg-slate-50/70 border-slate-200 opacity-60'
                            : isLate
                            ? 'bg-rose-50 border-rose-200 shadow-sm'
                            : isToday
                            ? 'bg-amber-50 border-amber-300 shadow-md'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              🏺 {task.tankName}
                            </span>
                            <span className="text-xs font-bold text-slate-600">
                              {formatDate(task.dueDate)}
                            </span>
                          </div>

                          <h4 className={`text-sm font-black ${task.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                            {task.title}
                          </h4>

                          <p className="text-xs font-bold text-amber-800">
                            Lote: {task.batchNumber} ({task.beerName})
                          </p>

                          {task.amount && (
                            <p className="text-xs text-slate-600 font-medium">
                              Dosagem: <strong>{task.amount} {task.unit}</strong>
                            </p>
                          )}

                          {task.notes && (
                            <p className="text-xs text-slate-500 bg-slate-100 p-2 rounded-xl">{task.notes}</p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleGlobalTask(task.batchId, task.id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                              task.completed
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{task.completed ? 'Concluída' : 'Marcar Feito'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const b = batches.find((item) => item.id === task.batchId);
                              if (b) {
                                setSelectedBatchForLive(b);
                                setLiveBatchModalOpen(true);
                              }
                            }}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
                            title="Gerenciar Tanque"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'PLANNING' ? (
          /* ========================================================================= */
          /* ABA 3: PLANEJAMENTO & ESTOQUE FUTURO (GRADE OU LINHAS)                    */
          /* ========================================================================= */
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
                    <span>Cronograma de Brassagens Futuras ({filteredAndSortedPlannedBatches.length} Lotes)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhe as datas programadas e inicie a brassagem no dia previsto com 1 clique.
                  </p>
                </div>
              </div>

              {filteredAndSortedPlannedBatches.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500">Nenhum lote agendado.</p>
                </div>
              ) : viewMode === 'GRID' ? (
                /* MODO GRADE: PLANEJAMENTO */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAndSortedPlannedBatches.map((batch) => {
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
              ) : (
                /* MODO LINHAS: PLANEJAMENTO */
                <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Data Prevista</th>
                        <th className="p-3">Lote</th>
                        <th className="p-3">Cerveja / Receita</th>
                        <th className="p-3 text-right">Volume</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAndSortedPlannedBatches.map((batch) => {
                        const rec = recipes.find((r) => r.id === batch.recipeId) || batch.recipe;
                        const dateFormatted = batch.brewDate ? formatDate(batch.brewDate) : 'Data a definir';

                        return (
                          <tr key={batch.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{dateFormatted}</td>
                            <td className="p-3 font-black text-amber-800">{batch.batchNumber}</td>
                            <td className="p-3 font-bold text-slate-800">{rec?.name || 'Cerveja'}</td>
                            <td className="p-3 text-right font-black text-slate-900">{batch.volumePlannedLiters} L</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                PLANEJADO
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecipeForBrew(rec || { name: batch.batchNumber, batchYieldLiters: batch.volumePlannedLiters, id: batch.recipeId });
                                    setBrewDayModalOpen(true);
                                  }}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-lg"
                                >
                                  Brassar Hoje
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBatch(batch.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'BATCHES' ? (
          /* ========================================================================= */
          /* ABA 4: TANQUES E FERMENTAÇÃO (GRADE OU LINHAS)                            */
          /* ========================================================================= */
          <div className="space-y-4">
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                <span>Tanques de Fermentação & Lotes em Andamento (Clique para Gerenciar Tarefas)</span>
              </h3>

              {viewMode === 'GRID' ? (
                /* MODO GRADE: TANQUES */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAndSortedTanks.map((tank) => {
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
              ) : (
                /* MODO LINHAS: TANQUES */
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Tanque</th>
                        <th className="p-3 text-right">Capacidade</th>
                        <th className="p-3">Cerveja Atual</th>
                        <th className="p-3">Lote</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredAndSortedTanks.map((tank) => {
                        const currentBatch = batches.find((b) => b.tankId === tank.id && b.status !== 'FINALIZADO' && b.status !== 'PLANEJADO');

                        return (
                          <tr key={tank.id} className="hover:bg-white">
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                              <Cylinder className="w-4 h-4 text-amber-600" />
                              <span>{tank.name}</span>
                            </td>
                            <td className="p-3 text-right font-black text-slate-800">{tank.capacityLiters} L</td>
                            <td className="p-3 font-bold text-slate-900">{currentBatch?.recipe?.name || '-'}</td>
                            <td className="p-3 font-bold text-amber-800">{currentBatch?.batchNumber || '-'}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                currentBatch ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {currentBatch ? currentBatch.status : 'LIVRE'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {currentBatch && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedBatchForLive(currentBatch);
                                    setLiveBatchModalOpen(true);
                                  }}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg"
                                >
                                  Gerenciar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* ABA 5: ESTOQUE FÍSICO (GRADE OU LINHAS)                                   */
          /* ========================================================================= */
          <div className="space-y-4">
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Estoque Físico de Insumos da Cervejaria ({filteredAndSortedStock.length} Itens)</span>
              </h3>

              {viewMode === 'GRID' ? (
                /* MODO GRADE: ESTOQUE */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {filteredAndSortedStock.map((item) => (
                    <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.category}</span>
                        <h4 className="text-xs font-black text-slate-900 mt-0.5">{item.name}</h4>
                        {item.supplierLot && (
                          <span className="text-[10px] text-slate-400 font-bold block mt-1">Lote: {item.supplierLot}</span>
                        )}
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
              ) : (
                /* MODO LINHAS: ESTOQUE */
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Insumo</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Lote do Fornecedor</th>
                        <th className="p-3 text-right">Saldo Atual</th>
                        <th className="p-3 text-right">Custo Unitário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredAndSortedStock.map((item) => (
                        <tr key={item.id} className="hover:bg-white">
                          <td className="p-3 font-bold text-slate-900">{item.name}</td>
                          <td className="p-3 text-slate-500 font-medium">{item.category}</td>
                          <td className="p-3 text-slate-600 font-bold">{item.supplierLot || '-'}</td>
                          <td className="p-3 text-right font-black text-emerald-700">
                            {item.currentQuantity} {item.unit}
                          </td>
                          <td className="p-3 text-right font-black text-slate-700">
                            {formatCurrency(item.costPerUnit || 0)} / {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

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
