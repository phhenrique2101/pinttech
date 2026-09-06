'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Upload,
  Search,
  Beer,
  Printer,
  Calendar,
  Layers,
  Flame,
  CheckCircle2,
  RefreshCw,
  Plus,
  FileText,
  Building2,
  Sliders,
  Sparkles,
  ArrowRight,
  Cylinder,
  Check,
  AlertTriangle,
  Clock,
  Eye,
  Trash2,
  X,
  Activity,
  Pencil,
  Edit3,
  Thermometer,
  Droplet,
  Boxes,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import BeerXmlImporterModal from '@/components/brew/BeerXmlImporterModal';
import MapaTraceabilitySheetModal from '@/components/brew/MapaTraceabilitySheetModal';
import LiveBatchManagerModal from '@/components/brew/LiveBatchManagerModal';
import EditRecipeModal from '@/components/brew/EditRecipeModal';
import { formatDate, formatDateShort, formatCurrency } from '@/lib/utils';

export default function ProducaoPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [brewery, setBrewery] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'PRODUCTION_TANKS' | 'HISTORY_MAPA' | 'RECIPES'>('PRODUCTION_TANKS');

  // View mode and sorting state for Unified Production & Tanks
  const [tankViewMode, setTankViewMode] = useState<'CARDS' | 'ROWS'>('CARDS');
  const [tankSortBy, setTankSortBy] = useState<'name' | 'status' | 'batch' | 'capacity' | 'occupation' | 'type'>('name');
  const [tankSortOrder, setTankSortOrder] = useState<'asc' | 'desc'>('asc');

  // Tank filter state
  const [tankStatusFilter, setTankStatusFilter] = useState<string>('ALL');

  // Modals
  const [importerModalOpen, setImporterModalOpen] = useState<boolean>(false);
  const [selectedBatchForSheet, setSelectedBatchForSheet] = useState<any | null>(null);
  const [selectedBatchForManager, setSelectedBatchForManager] = useState<any | null>(null);
  const [selectedRecipeForEdit, setSelectedRecipeForEdit] = useState<any | null>(null);

  // Modal de Tanque (Criar / Editar)
  const [tankModalOpen, setTankModalOpen] = useState<boolean>(false);
  const [editingTank, setEditingTank] = useState<any | null>(null);
  const [tankName, setTankName] = useState<string>('');
  const [tankCapacity, setTankCapacity] = useState<string>('1000');
  const [tankType, setTankType] = useState<string>('Fermentador Cônico');
  const [tankStatus, setTankStatus] = useState<string>('LIVRE');
  const [tankNotes, setTankNotes] = useState<string>('');
  const [savingTank, setSavingTank] = useState<boolean>(false);

  // Modal de Exclusão Unificado
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'BATCH' | 'RECIPE' | 'TANK';
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Status update modal / quick edit
  const [editingBatchStatus, setEditingBatchStatus] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [newMeasuredFg, setNewMeasuredFg] = useState<string>('');
  const [newMeasuredAbv, setNewMeasuredAbv] = useState<string>('');
  const [savingStatus, setSavingStatus] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchesRes, tanksRes, recipesRes, authRes, breweryRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/tanks'),
        fetch('/api/recipes'),
        fetch('/api/auth/me'),
        fetch('/api/brewery'),
      ]);

      const [batchesData, tanksData, recipesData, authData, breweryData] = await Promise.all([
        batchesRes.json(),
        tanksRes.json(),
        recipesRes.json(),
        authRes.json(),
        breweryRes.ok ? breweryRes.json() : null,
      ]);

      if (authRes.status === 401 || !authRes.ok) {
        window.location.href = '/login?redirect=/producao';
        return;
      }

      if (Array.isArray(batchesData)) setBatches(batchesData);
      if (Array.isArray(tanksData)) setTanks(tanksData);
      if (Array.isArray(recipesData)) setRecipes(recipesData);

      if (breweryData && !breweryData.error) {
        setBrewery(breweryData);
      } else if (authData?.user?.brewery) {
        setBrewery(authData.user.brewery);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de produção:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      let url = '';
      if (itemToDelete.type === 'BATCH') url = `/api/batches/${itemToDelete.id}`;
      else if (itemToDelete.type === 'RECIPE') url = `/api/recipes/${itemToDelete.id}`;
      else if (itemToDelete.type === 'TANK') url = `/api/tanks/${itemToDelete.id}`;

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir registro');
      setItemToDelete(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchData();
    try {
      const savedMode = localStorage.getItem('pinttech_tank_view_mode') || localStorage.getItem('pinttech_batch_view_mode');
      if (savedMode === 'CARDS' || savedMode === 'ROWS') setTankViewMode(savedMode);

      const savedSort = localStorage.getItem('pinttech_tank_sort_by');
      if (savedSort && ['name', 'status', 'capacity', 'type', 'occupation', 'batch'].includes(savedSort)) {
        setTankSortBy(savedSort as any);
      }

      const savedOrder = localStorage.getItem('pinttech_tank_sort_order');
      if (savedOrder === 'asc' || savedOrder === 'desc') setTankSortOrder(savedOrder);
    } catch {
      // ignore
    }
  }, []);

  // Lotes Ativos nos Tanques
  const activeBatches = useMemo(() => {
    return batches.filter(
      (b) => b.status !== 'FINALIZADO' && b.status !== 'ENVASADO' && b.status !== 'CANCELADO'
    );
  }, [batches]);

  // Lotes sem tanque atribuído
  const unassignedBatches = useMemo(() => {
    return activeBatches.filter((b) => !b.tankId && !b.tank);
  }, [activeBatches]);

  // Busca do Lote Ativo correspondente a um Tanque
  const getTankActiveBatch = (t: any) => {
    return (
      activeBatches.find((b) => b.tankId === t.id || b.tank?.id === t.id) ||
      (t.batches || []).find((b: any) => b.status !== 'FINALIZADO' && b.status !== 'ENVASADO' && b.status !== 'CANCELADO') ||
      t.batches?.[0] ||
      null
    );
  };

  // Lotes Históricos / Arquivados
  const historicalBatches = useMemo(() => {
    return batches.filter(
      (b) => b.status === 'FINALIZADO' || b.status === 'ENVASADO'
    );
  }, [batches]);

  // Filtragem de busca
  const filterList = (list: any[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (item) =>
        item.batchNumber?.toLowerCase().includes(q) ||
        item.recipe?.name?.toLowerCase().includes(q) ||
        item.recipe?.style?.toLowerCase().includes(q) ||
        item.mapaRegistration?.toLowerCase().includes(q) ||
        item.tank?.name?.toLowerCase().includes(q)
    );
  };

  const getElapsedDays = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const diffTime = Date.now() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const filteredHistory = filterList(historicalBatches);
  const filteredRecipes = recipes.filter(
    (r) =>
      !search.trim() ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.style?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTanks = useMemo(() => {
    return tanks.filter((t) => {
      const activeBatch = getTankActiveBatch(t);
      const isOccupied = t.status === 'OCUPADO' || !!activeBatch;

      let matchesStatus = true;
      if (tankStatusFilter === 'OCUPADO') {
        matchesStatus = isOccupied;
      } else if (tankStatusFilter !== 'ALL') {
        matchesStatus = t.status === tankStatusFilter;
      }

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.type?.toLowerCase().includes(q) ||
        (activeBatch && (
          activeBatch.batchNumber?.toLowerCase().includes(q) ||
          activeBatch.recipe?.name?.toLowerCase().includes(q) ||
          activeBatch.recipe?.style?.toLowerCase().includes(q) ||
          activeBatch.mapaRegistration?.toLowerCase().includes(q) ||
          activeBatch.commercialDenomination?.toLowerCase().includes(q)
        ));

      return matchesStatus && matchesSearch;
    });
  }, [tanks, tankStatusFilter, search, activeBatches]);

  // Ordenação Unificada de Tanques & Lotes
  const sortedTanks = useMemo(() => {
    return [...filteredTanks].sort((a, b) => {
      let comp = 0;
      switch (tankSortBy) {
        case 'name':
          comp = (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'status':
          comp = (a.status || '').localeCompare(b.status || '');
          break;
        case 'capacity':
          comp = Number(a.capacityLiters || 0) - Number(b.capacityLiters || 0);
          break;
        case 'type':
          comp = (a.type || '').localeCompare(b.type || '');
          break;
        case 'occupation': {
          const batchA = getTankActiveBatch(a);
          const isOccA = a.status === 'OCUPADO' || !!batchA;
          const volA = isOccA && batchA ? (batchA.volumeProducedLiters || batchA.volumePlannedLiters || a.capacityLiters) : 0;
          const fillA = a.capacityLiters > 0 ? (volA / a.capacityLiters) : 0;

          const batchB = getTankActiveBatch(b);
          const isOccB = b.status === 'OCUPADO' || !!batchB;
          const volB = isOccB && batchB ? (batchB.volumeProducedLiters || batchB.volumePlannedLiters || b.capacityLiters) : 0;
          const fillB = b.capacityLiters > 0 ? (volB / b.capacityLiters) : 0;

          comp = fillA - fillB;
          break;
        }
        case 'batch': {
          const batchA = getTankActiveBatch(a);
          const batchB = getTankActiveBatch(b);
          const textA = batchA ? `${batchA.batchNumber || ''} ${batchA.recipe?.name || ''}` : '';
          const textB = batchB ? `${batchB.batchNumber || ''} ${batchB.recipe?.name || ''}` : '';
          if (!textA && textB) comp = 1;
          else if (textA && !textB) comp = -1;
          else comp = textA.localeCompare(textB, undefined, { sensitivity: 'base' });
          break;
        }
      }
      return tankSortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredTanks, tankSortBy, tankSortOrder, activeBatches]);

  const changeTankViewMode = (mode: 'CARDS' | 'ROWS') => {
    setTankViewMode(mode);
    try {
      localStorage.setItem('pinttech_tank_view_mode', mode);
    } catch {}
  };

  const handleTankSortChange = (field: 'name' | 'status' | 'capacity' | 'type' | 'occupation' | 'batch') => {
    let newOrder: 'asc' | 'desc' = 'asc';
    if (tankSortBy === field) {
      newOrder = tankSortOrder === 'asc' ? 'desc' : 'asc';
    }
    setTankSortBy(field);
    setTankSortOrder(newOrder);
    try {
      localStorage.setItem('pinttech_tank_sort_by', field);
      localStorage.setItem('pinttech_tank_sort_order', newOrder);
    } catch {}
  };

  const toggleTankSortOrder = () => {
    const newOrder = tankSortOrder === 'asc' ? 'desc' : 'asc';
    setTankSortOrder(newOrder);
    try {
      localStorage.setItem('pinttech_tank_sort_order', newOrder);
    } catch {}
  };

  const handleUpdateBatchStatus = async () => {
    if (!editingBatchStatus) return;
    setSavingStatus(true);
    try {
      const payload: any = { status: newStatus };
      if (newMeasuredFg) payload.measuredFg = parseFloat(newMeasuredFg);
      if (newMeasuredAbv) payload.measuredAbv = parseFloat(newMeasuredAbv);

      const res = await fetch(`/api/batches/${editingBatchStatus.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
        setEditingBatchStatus(null);
      } else {
        alert('Erro ao atualizar lote.');
      }
    } catch {
      alert('Erro ao atualizar lote.');
    } finally {
      setSavingStatus(false);
    }
  };

  const openBatchStatusModal = (batch: any) => {
    setEditingBatchStatus(batch);
    setNewStatus(batch.status || 'FERMENTANDO');
    setNewMeasuredFg(batch.measuredFg ? String(batch.measuredFg) : '');
    setNewMeasuredAbv(batch.measuredAbv ? String(batch.measuredAbv) : '');
  };

  // Funções de Gestão de Tanques
  const openNewTankModal = () => {
    setEditingTank(null);
    setTankName('');
    setTankCapacity('1000');
    setTankType('Fermentador Cônico');
    setTankStatus('LIVRE');
    setTankNotes('');
    setTankModalOpen(true);
  };

  const openEditTankModal = (t: any) => {
    setEditingTank(t);
    setTankName(t.name || '');
    setTankCapacity(String(t.capacityLiters || 1000));
    setTankType(t.type || 'Fermentador Cônico');
    setTankStatus(t.status || 'LIVRE');
    setTankNotes(t.notes || '');
    setTankModalOpen(true);
  };

  const handleSaveTank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTank(true);
    try {
      const payload = {
        name: tankName.trim(),
        capacityLiters: parseFloat(tankCapacity) || 1000,
        type: tankType,
        status: tankStatus,
        notes: tankNotes,
      };

      const url = editingTank ? `/api/tanks/${editingTank.id}` : '/api/tanks';
      const method = editingTank ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar tanque');

      setTankModalOpen(false);
      setEditingTank(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar tanque');
    } finally {
      setSavingTank(false);
    }
  };

  const handleLiberateTank = async (tank: any) => {
    if (!confirm(`Deseja desocupar e liberar o tanque ${tank.name}? O lote atual será desvinculado e o status passará para LIVRE.`)) return;
    try {
      const res = await fetch(`/api/tanks/${tank.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIVRE', batchId: '' }),
      });
      if (res.ok) fetchData();
      else alert('Erro ao desocupar tanque');
    } catch {
      alert('Erro ao desocupar tanque');
    }
  };

  const handleQuickTankStatus = async (tankId: string, status: string) => {
    try {
      const res = await fetch(`/api/tanks/${tankId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const totalTankCapacity = useMemo(() => {
    return tanks.reduce((acc, t) => acc + (t.capacityLiters || 0), 0);
  }, [tanks]);

  const occupiedTanksCount = useMemo(() => {
    return tanks.filter((t) => t.status === 'OCUPADO').length;
  }, [tanks]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header Principal */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-amber-700 to-slate-950 p-8 text-white shadow-2xl border border-amber-500/30 keep-dark">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>Conformidade & Exigências MAPA • Brassagem & Adega</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Flame className="w-9 h-9 text-amber-300" />
              <span>Produção & Tanques</span>
            </h1>
            <p className="text-slate-200 max-w-2xl text-xs md:text-sm leading-relaxed">
              Importe receitas completas do <strong>BeerSmith (.xml)</strong>, vincule os lotes de matérias-primas com rastreabilidade,
              gerencie fermentadores da adega e gere a ficha oficial de controle do MAPA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setImporterModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Importar BeerXML & Novo Lote</span>
            </button>
            <button
              onClick={openNewTankModal}
              className="px-4 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-900 text-amber-300 border border-amber-400/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Tanque</span>
            </button>
          </div>
        </div>

        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Lotes em Produção</span>
            <strong className="text-xl font-black text-slate-900 dark:text-white">{activeBatches.length}</strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Cylinder className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Tanques Ocupados</span>
            <strong className="text-xl font-black text-slate-900 dark:text-white">
              {occupiedTanksCount} / {tanks.length}
            </strong>
            <span className="text-[9px] text-slate-500 font-mono block">{totalTankCapacity}L instalados</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Dossiês MAPA Emitidos</span>
            <strong className="text-xl font-black text-slate-900 dark:text-white">{batches.length}</strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Beer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Receitas no Catálogo</span>
            <strong className="text-xl font-black text-slate-900 dark:text-white">{recipes.length}</strong>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Navegação por Abas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex space-x-2 overflow-x-auto">
          {[
            { id: 'PRODUCTION_TANKS', label: 'Produção & Tanques', count: tanks.length, icon: Flame },
            { id: 'HISTORY_MAPA', label: 'Lotes Finalizados', count: historicalBatches.length, icon: ShieldCheck },
            { id: 'RECIPES', label: 'Catálogo de Receitas', count: recipes.length, icon: Beer },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${isActive ? 'bg-slate-950 text-amber-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por lote, tanque, cerveja ou MAPA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>
      </div>


      {/* ABA UNIFICADA: PRODUÇÃO & TANQUES */}
      {activeTab === 'PRODUCTION_TANKS' && (
        <div className="space-y-5">
          {/* Alerta de Lotes Ativos sem Tanque Atribuído (se houver) */}
          {unassignedBatches.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-200">
                      Atenção: {unassignedBatches.length} {unassignedBatches.length === 1 ? 'lote ativo cadastrado sem tanque atribuído' : 'lotes ativos cadastrados sem tanque atribuído'}
                    </h4>
                    <p className="text-xs text-amber-300/80">
                      Estes lotes foram lançados sem vínculo a um fermentador físico. Você pode gerenciar suas medições ou atribuir a um tanque:
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold shrink-0">
                  Sem Tanque
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-amber-500/20">
                {unassignedBatches.map((b) => (
                  <div
                    key={b.id}
                    className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          #{b.batchNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {b.status}
                        </span>
                      </div>
                      <strong className="text-white block text-sm mt-1 truncate">
                        {b.recipe?.name || 'Cerveja'}
                      </strong>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {b.recipe?.style || 'Standard'} • {b.volumeProducedLiters || b.volumePlannedLiters || 0}L
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => setSelectedBatchForManager(b)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1"
                        title="Abrir Adega & Medições"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Adega</span>
                      </button>
                      <button
                        onClick={() => setSelectedBatchForSheet(b)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1"
                        title="Ficha Oficial MAPA"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">MAPA</span>
                      </button>
                      <button
                        onClick={() => openBatchStatusModal(b)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                        title="Atualizar Status"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barra de Filtros Rápidos de Status e Ações */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: `Todos (${tanks.length})` },
                {
                  id: 'OCUPADO',
                  label: `Em Produção (${tanks.filter((t) => t.status === 'OCUPADO' || !!getTankActiveBatch(t)).length})`,
                },
                {
                  id: 'LIVRE',
                  label: `Livres (${tanks.filter((t) => t.status === 'LIVRE' && !getTankActiveBatch(t)).length})`,
                },
                {
                  id: 'HIGIENIZANDO',
                  label: `CIP / Limpeza (${tanks.filter((t) => t.status === 'HIGIENIZANDO').length})`,
                },
                {
                  id: 'MANUTENCAO',
                  label: `Manutenção (${tanks.filter((t) => t.status === 'MANUTENCAO').length})`,
                },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setTankStatusFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    tankStatusFilter === btn.id
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setImporterModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Importar BeerXML</span>
              </button>
              <button
                onClick={openNewTankModal}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>+ Adicionar Tanque</span>
              </button>
            </div>
          </div>

          {/* Barra de Ferramentas: Contagem, Ordenação e Alternador de Visualização (Grade / Linhas) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                Tanques & Lotes:
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                {sortedTanks.length} {sortedTanks.length === 1 ? 'tanque' : 'tanques'}
              </span>
              {(tankStatusFilter !== 'ALL' || search.trim()) && (
                <span className="text-[11px] text-slate-400">
                  (filtrado de {tanks.length})
                </span>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              {/* Classificação / Ordenação */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Ordenar:</span>
                </span>
                <select
                  value={tankSortBy}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setTankSortBy(val);
                    try { localStorage.setItem('pinttech_tank_sort_by', val); } catch {}
                  }}
                  className="bg-transparent text-xs text-amber-300 font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value="name" className="bg-slate-900 text-slate-200">Nome do Tanque</option>
                  <option value="status" className="bg-slate-900 text-slate-200">Status Operacional</option>
                  <option value="capacity" className="bg-slate-900 text-slate-200">Capacidade (Litros)</option>
                  <option value="type" className="bg-slate-900 text-slate-200">Tipo de Tanque</option>
                  <option value="occupation" className="bg-slate-900 text-slate-200">Ocupação (%)</option>
                  <option value="batch" className="bg-slate-900 text-slate-200">Lote / Cerveja</option>
                </select>

                <button
                  type="button"
                  onClick={toggleTankSortOrder}
                  className="p-1 rounded-md hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition"
                  title={tankSortOrder === 'asc' ? 'Ordem Crescente (clique para Decrescente)' : 'Ordem Decrescente (clique para Crescente)'}
                >
                  {tankSortOrder === 'asc' ? (
                    <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </button>
              </div>

              {/* Alternador Grade / Linhas */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => changeTankViewMode('CARDS')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                    tankViewMode === 'CARDS'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Visualizar como Grade / Cards"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => changeTankViewMode('ROWS')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                    tankViewMode === 'ROWS'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Visualizar como Linhas / Tabela"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Linhas</span>
                </button>
              </div>
            </div>
          </div>

          {sortedTanks.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl space-y-3 text-slate-400">
              <Cylinder className="w-12 h-12 mx-auto text-slate-500" />
              <h4 className="text-sm font-bold text-white">Nenhum tanque encontrado</h4>
              <p className="text-xs text-slate-500">Cadastre seus fermentadores e maturadores para gerenciar seus lotes de produção.</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={openNewTankModal}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Tanque</span>
                </button>
                <button
                  onClick={() => setImporterModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importar BeerXML</span>
                </button>
              </div>
            </div>
          ) : tankViewMode === 'ROWS' ? (
            /* VISUALIZAÇÃO EM LINHAS (TABELA UNIFICADA) */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
                    <tr>
                      <th
                        onClick={() => handleTankSortChange('name')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-400 transition"
                        title="Clique para ordenar por Nome do Tanque"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Tanque & Tipo</span>
                          {tankSortBy === 'name' ? (
                            tankSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTankSortChange('status')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-400 transition"
                        title="Clique para ordenar por Status"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Status</span>
                          {tankSortBy === 'status' ? (
                            tankSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTankSortChange('capacity')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-400 transition"
                        title="Clique para ordenar por Capacidade"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Capacidade</span>
                          {tankSortBy === 'capacity' ? (
                            tankSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTankSortChange('occupation')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-400 transition"
                        title="Clique para ordenar por Ocupação"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Ocupação</span>
                          {tankSortBy === 'occupation' ? (
                            tankSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTankSortChange('batch')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-400 transition"
                        title="Clique para ordenar por Lote / Cerveja"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Lote Contido / Cerveja</span>
                          {tankSortBy === 'batch' ? (
                            tankSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th className="p-3.5">OG / FG / ABV</th>
                      <th className="p-3.5">MAPA</th>
                      <th className="p-3.5 text-right">Ações Operacionais</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sortedTanks.map((tank) => {
                      const activeBatch = getTankActiveBatch(tank);
                      const isOccupied = tank.status === 'OCUPADO' || !!activeBatch;
                      const volumeInTank = activeBatch ? (activeBatch.volumeProducedLiters || activeBatch.volumePlannedLiters || tank.capacityLiters) : 0;
                      const fillPercent = tank.capacityLiters > 0 ? Math.min(100, Math.round((volumeInTank / tank.capacityLiters) * 100)) : 0;
                      const elapsedDays = activeBatch ? getElapsedDays(activeBatch.brewDate || activeBatch.createdAt) : null;

                      return (
                        <tr key={tank.id} className="hover:bg-slate-800/40 transition group">
                          {/* Tanque & Tipo */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  isOccupied
                                    ? 'bg-purple-400 animate-pulse'
                                    : tank.status === 'LIVRE'
                                    ? 'bg-emerald-400'
                                    : tank.status === 'HIGIENIZANDO'
                                    ? 'bg-blue-400'
                                    : 'bg-amber-400'
                                }`}
                              />
                              <div>
                                <strong className="text-white block text-xs group-hover:text-amber-300 transition">
                                  {tank.name}
                                </strong>
                                <span className="text-[11px] text-slate-400">
                                  {tank.type || 'Fermentador Cônico'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-3.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-block ${
                                isOccupied
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : tank.status === 'LIVRE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : tank.status === 'HIGIENIZANDO'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isOccupied ? (activeBatch?.status || 'OCUPADO') : tank.status}
                            </span>
                          </td>

                          {/* Capacidade */}
                          <td className="p-3.5 whitespace-nowrap font-mono font-bold text-xs text-slate-200">
                            {tank.capacityLiters}L
                          </td>

                          {/* Ocupação */}
                          <td className="p-3.5 whitespace-nowrap min-w-[130px]">
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 mb-1">
                              <span>{isOccupied ? `${fillPercent}%` : '0%'}</span>
                              <span className="text-slate-400">{isOccupied ? `${volumeInTank}L` : 'Vazio'}</span>
                            </div>
                            <div className="w-28 h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isOccupied ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-slate-700'
                                }`}
                                style={{ width: `${isOccupied ? fillPercent : 0}%` }}
                              />
                            </div>
                          </td>

                          {/* Lote Contido / Cerveja */}
                          <td className="p-3.5 min-w-[190px]">
                            {isOccupied && activeBatch ? (
                              <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    #{activeBatch.batchNumber}
                                  </span>
                                  {elapsedDays !== null && (
                                    <span className="text-[10px] text-amber-400 font-mono">
                                      ⏱️ Dia {elapsedDays}
                                    </span>
                                  )}
                                </div>
                                <strong className="text-white block text-xs truncate max-w-[200px]">
                                  {activeBatch.recipe?.name || activeBatch.commercialDenomination || 'Cerveja'}
                                </strong>
                                <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                                  {activeBatch.recipe?.style || 'Standard'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">
                                {tank.status === 'LIVRE' ? 'Tanque livre' : tank.status === 'HIGIENIZANDO' ? 'Em sanitização (CIP)' : 'Em manutenção'}
                              </span>
                            )}
                          </td>

                          {/* Parâmetros Vitais (OG / FG / ABV) */}
                          <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-slate-300">
                            {isOccupied && activeBatch ? (
                              <div>
                                <div>OG: {activeBatch.measuredOg || activeBatch.recipe?.og || '—'} / FG: {activeBatch.measuredFg || activeBatch.recipe?.fg || '—'}</div>
                                <div className="text-[10px] text-emerald-400 font-semibold">
                                  {activeBatch.measuredAbv || activeBatch.recipe?.abv || '—'}% ABV
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* MAPA */}
                          <td className="p-3.5 whitespace-nowrap text-xs">
                            {isOccupied && activeBatch ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold block truncate max-w-[140px] ${
                                  activeBatch.mapaRegistration
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                                title={activeBatch.mapaRegistration || 'Registro MAPA não informado'}
                              >
                                {activeBatch.mapaRegistration || 'Sem MAPA'}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="p-3.5 whitespace-nowrap text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {isOccupied && activeBatch ? (
                                <>
                                  <button
                                    onClick={() => setSelectedBatchForManager(activeBatch)}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1 transition shadow-xs"
                                    title="Adega & Medições"
                                  >
                                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="hidden lg:inline">Adega</span>
                                  </button>

                                  <button
                                    onClick={() => setSelectedBatchForSheet(activeBatch)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                    title="Ficha Oficial MAPA"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => openBatchStatusModal(activeBatch)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                    title="Alterar Fase / Status do Lote"
                                  >
                                    <Sliders className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleLiberateTank(tank)}
                                    className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1 transition border border-slate-700"
                                    title="Desocupar e Liberar Tanque"
                                  >
                                    <span className="hidden lg:inline">Liberar</span>
                                  </button>
                                </>
                              ) : (
                                <div className="inline-flex items-center gap-1 mr-1">
                                  <button
                                    onClick={() => handleQuickTankStatus(tank.id, 'LIVRE')}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'LIVRE' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    title="Marcar como Livre"
                                  >
                                    Livre
                                  </button>
                                  <button
                                    onClick={() => handleQuickTankStatus(tank.id, 'HIGIENIZANDO')}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'HIGIENIZANDO' ? 'bg-blue-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    title="Marcar como CIP / Higienizando"
                                  >
                                    CIP
                                  </button>
                                  <button
                                    onClick={() => handleQuickTankStatus(tank.id, 'MANUTENCAO')}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'MANUTENCAO' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    title="Marcar como Manutenção"
                                  >
                                    Manut.
                                  </button>
                                </div>
                              )}

                              <button
                                onClick={() => openEditTankModal(tank)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                title="Editar Tanque"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() =>
                                  setItemToDelete({
                                    type: 'TANK',
                                    id: tank.id,
                                    title: tank.name,
                                    subtitle: `${tank.capacityLiters}L • ${tank.type}`,
                                  })
                                }
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                                title="Excluir Tanque"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VISUALIZAÇÃO EM GRADE (CARDS UNIFICADOS DE PRODUÇÃO & TANQUES) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedTanks.map((tank) => {
                const activeBatch = getTankActiveBatch(tank);
                const isOccupied = tank.status === 'OCUPADO' || !!activeBatch;
                const volumeInTank = activeBatch ? (activeBatch.volumeProducedLiters || activeBatch.volumePlannedLiters || tank.capacityLiters) : 0;
                const fillPercent = tank.capacityLiters > 0 ? Math.min(100, Math.round((volumeInTank / tank.capacityLiters) * 100)) : 0;
                const elapsedDays = activeBatch ? getElapsedDays(activeBatch.brewDate || activeBatch.createdAt) : null;
                const ingredientsCount = activeBatch ? (activeBatch._count?.ingredients || activeBatch.ingredients?.length || 0) : 0;

                return (
                  <div
                    key={tank.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between hover:border-slate-700 transition relative overflow-hidden group"
                  >
                    <div className="space-y-3.5">
                      {/* Top Header do Tanque */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-white group-hover:text-amber-400 transition flex items-center gap-1.5">
                              <Cylinder className="w-4 h-4 text-amber-400" />
                              <span>{tank.name}</span>
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                isOccupied
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : tank.status === 'LIVRE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : tank.status === 'HIGIENIZANDO'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isOccupied ? (activeBatch?.status || 'OCUPADO') : tank.status}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            {tank.type || 'Fermentador Cônico'} • <strong>{tank.capacityLiters} Litros</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditTankModal(tank)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Editar Tanque"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setItemToDelete({
                                type: 'TANK',
                                id: tank.id,
                                title: tank.name,
                                subtitle: `${tank.capacityLiters}L • ${tank.type}`,
                              })
                            }
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                            title="Excluir Tanque"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Barra de Ocupação */}
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Ocupação do Tanque:</span>
                          <span className="font-mono text-white font-bold">{isOccupied ? `${fillPercent}% (${volumeInTank}L)` : '0% (Vazio)'}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isOccupied ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-slate-700'
                            }`}
                            style={{ width: `${isOccupied ? fillPercent : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Lote Contido no Tanque */}
                      {isOccupied && activeBatch ? (
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-amber-400 text-xs">
                                Lote #{activeBatch.batchNumber}
                              </span>
                              {elapsedDays !== null && (
                                <span className="text-[10px] text-amber-400 font-mono">
                                  ⏱️ Dia {elapsedDays}
                                </span>
                              )}
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {activeBatch.status}
                            </span>
                          </div>

                          <div>
                            <strong className="text-white block text-sm font-bold">
                              {activeBatch.recipe?.name || activeBatch.commercialDenomination || 'Cerveja'}
                            </strong>
                            <span className="text-slate-400 text-[11px] block mt-0.5">
                              {activeBatch.recipe?.style || 'Estilo não especificado'}
                            </span>
                          </div>

                          {/* MAPA & Rastreabilidade */}
                          <div className="flex items-center justify-between gap-2 text-[10px] pt-1">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold truncate max-w-[170px] ${
                                activeBatch.mapaRegistration
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                              title={activeBatch.mapaRegistration || 'Registro MAPA pendente'}
                            >
                              MAPA: {activeBatch.mapaRegistration || 'Pendente'}
                            </span>

                            {ingredientsCount > 0 && (
                              <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                {ingredientsCount} insumos
                              </span>
                            )}
                          </div>

                          {/* Parâmetros Vitais */}
                          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80 text-[10px] text-center font-mono">
                            <div className="bg-slate-900/80 p-1 rounded">
                              <span className="text-[9px] text-slate-500 block font-sans">OG</span>
                              <strong className="text-slate-200">{activeBatch.measuredOg || activeBatch.recipe?.og || '—'}</strong>
                            </div>
                            <div className="bg-slate-900/80 p-1 rounded">
                              <span className="text-[9px] text-slate-500 block font-sans">FG</span>
                              <strong className="text-slate-200">{activeBatch.measuredFg || activeBatch.recipe?.fg || '—'}</strong>
                            </div>
                            <div className="bg-slate-900/80 p-1 rounded">
                              <span className="text-[9px] text-slate-500 block font-sans">ABV</span>
                              <strong className="text-emerald-400">{activeBatch.measuredAbv || activeBatch.recipe?.abv || '—'}%</strong>
                            </div>
                            <div className="bg-slate-900/80 p-1 rounded">
                              <span className="text-[9px] text-slate-500 block font-sans">Volume</span>
                              <strong className="text-slate-200">{volumeInTank}L</strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 space-y-2">
                          <p>Tanque pronto para nova brassagem ou processo de CIP/sanitização.</p>
                          <button
                            onClick={() => setImporterModalOpen(true)}
                            className="text-amber-400 hover:text-amber-300 font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Lançar lote via BeerXML</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Rodapé e Ações Rápidas */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                      {isOccupied && activeBatch ? (
                        <>
                          <button
                            onClick={() => setSelectedBatchForManager(activeBatch)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5 transition text-xs shadow-xs"
                            title="Abrir Medições da Adega"
                          >
                            <Activity className="w-3.5 h-3.5 text-amber-400" />
                            <span>Medições & Adega</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedBatchForSheet(activeBatch)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                              title="Ficha Oficial MAPA"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openBatchStatusModal(activeBatch)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                              title="Alterar Status / Fase do Lote"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleLiberateTank(tank)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
                              title="Desocupar e Liberar Tanque"
                            >
                              Liberar
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">Alterar Status:</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleQuickTankStatus(tank.id, 'LIVRE')}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'LIVRE' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              Livre
                            </button>
                            <button
                              onClick={() => handleQuickTankStatus(tank.id, 'HIGIENIZANDO')}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'HIGIENIZANDO' ? 'bg-blue-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              CIP
                            </button>
                            <button
                              onClick={() => handleQuickTankStatus(tank.id, 'MANUTENCAO')}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'MANUTENCAO' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              Manutenção
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: LOTES FINALIZADOS */}
      {activeTab === 'HISTORY_MAPA' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Lotes Finalizados</h3>
              <p className="text-xs text-slate-400">
                Lotes finalizados ou envasados com rastreabilidade arquivada para consulta fiscal e dossiês MAPA.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{filteredHistory.length} lotes</span>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Nenhum lote finalizado encontrado no histórico.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Nº Lote</th>
                    <th className="p-3">Cerveja & Estilo</th>
                    <th className="p-3">Data Brassagem</th>
                    <th className="p-3">Volume</th>
                    <th className="p-3">Registro MAPA</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Dossiê Oficial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredHistory.map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-amber-400">{batch.batchNumber}</td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{batch.recipe?.name}</span>
                        <span className="text-slate-400 text-[11px]">{batch.recipe?.style}</span>
                      </td>
                      <td className="p-3 text-slate-300">{formatDate(batch.brewDate)}</td>
                      <td className="p-3 font-mono">{batch.volumeProducedLiters || batch.volumePlannedLiters}L</td>
                      <td className="p-3 font-mono text-slate-400">{batch.mapaRegistration || '—'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {batch.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBatchForSheet(batch)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition"
                            title="Reimprimir Dossiê MAPA"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ficha MAPA</span>
                          </button>

                          <button
                            onClick={() => setSelectedBatchForManager(batch)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Editar Dados do Lote"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() =>
                              setItemToDelete({
                                type: 'BATCH',
                                id: batch.id,
                                title: `Lote ${batch.batchNumber}`,
                                subtitle: `${batch.recipe?.name || 'Cerveja'} • Data: ${formatDate(batch.brewDate)}`,
                              })
                            }
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                            title="Excluir Lote do Histórico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 4: CATÁLOGO DE RECEITAS (BEERXML) */}
      {activeTab === 'RECIPES' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Receitas BeerSmith Importadas</h3>
              <p className="text-xs text-slate-400">
                Fichas técnicas prontas. Você pode despachar novos lotes diretamente a partir destas receitas.
              </p>
            </div>
            <button
              onClick={() => setImporterModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Novo BeerXML</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        {recipe.style}
                      </span>
                      <h4 className="text-base font-black text-white">{recipe.name}</h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedRecipeForEdit(recipe)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                        title="Editar Receita"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          setItemToDelete({
                            type: 'RECIPE',
                            id: recipe.id,
                            title: recipe.name,
                            subtitle: `Estilo: ${recipe.style}`,
                          })
                        }
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                        title="Excluir Receita"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {recipe.description || 'Sem observações informadas.'}
                  </p>

                  <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-2 rounded-xl text-center text-xs font-mono mt-3">
                    <div>
                      <span className="text-[9px] text-slate-500 font-sans block">OG</span>
                      <span className="text-slate-200">{recipe.og?.toFixed(3) || '1.050'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-sans block">ABV</span>
                      <span className="text-slate-200">{recipe.abv?.toFixed(1) || '5.0'}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-sans block">IBU</span>
                      <span className="text-slate-200">{recipe.ibu || '25'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-sans block">EBC</span>
                      <span className="text-slate-200">{recipe.ebc || '10'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                    {recipe.mapaRegistration || 'Sem MAPA'}
                  </span>
                  <button
                    onClick={() => setImporterModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lançar Lote via XML</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO BEERXML & RASTREABILIDADE MAPA */}
      {importerModalOpen && (
        <BeerXmlImporterModal
          tanks={tanks}
          onClose={() => setImporterModalOpen(false)}
          onBatchCreated={(created) => {
            fetchData();
            setSelectedBatchForSheet(created);
          }}
        />
      )}

      {/* MODAL DE IMPRESSÃO DA FICHA OFICIAL MAPA */}
      {selectedBatchForSheet && (
        <MapaTraceabilitySheetModal
          batch={selectedBatchForSheet}
          brewery={brewery}
          onBreweryUpdated={(updated) => setBrewery(updated)}
          onClose={() => setSelectedBatchForSheet(null)}
        />
      )}

      {/* MODAL DE CONTROLE DE ADEGA, MEDIÇÕES & MULTI-MASH PH */}
      {selectedBatchForManager && (
        <LiveBatchManagerModal
          batch={selectedBatchForManager}
          tanks={tanks}
          onClose={() => setSelectedBatchForManager(null)}
          onSaved={() => {
            fetchData();
            setSelectedBatchForManager(null);
          }}
        />
      )}

      {/* MODAL DE EDIÇÃO DE RECEITA */}
      {selectedRecipeForEdit && (
        <EditRecipeModal
          recipe={selectedRecipeForEdit}
          onClose={() => setSelectedRecipeForEdit(null)}
          onSaved={() => {
            fetchData();
            setSelectedRecipeForEdit(null);
          }}
        />
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE TANQUE */}
      {tankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 space-y-5 text-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Cylinder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">{editingTank ? 'Editar Tanque' : 'Novo Tanque da Adega'}</h3>
                  <p className="text-[11px] text-slate-400">Fermentadores, maturadores e tanques de serviço</p>
                </div>
              </div>
              <button onClick={() => setTankModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTank} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nome / Identificação do Tanque *</label>
                <input
                  type="text"
                  required
                  value={tankName}
                  onChange={(e) => setTankName(e.target.value)}
                  placeholder="Ex: Fermentador 01, Maturador 02, BBT 01"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Capacidade (Litros) *</label>
                  <input
                    type="number"
                    required
                    min="50"
                    step="10"
                    value={tankCapacity}
                    onChange={(e) => setTankCapacity(e.target.value)}
                    placeholder="1000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold font-mono focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tipo de Tanque</label>
                  <select
                    value={tankType}
                    onChange={(e) => setTankType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                  >
                    <option value="Fermentador Cônico">Fermentador Cônico</option>
                    <option value="Maturador Horizontal">Maturador Horizontal</option>
                    <option value="BBT (Bright Beer Tank)">BBT (Bright Beer Tank)</option>
                    <option value="Isotérmico">Isotérmico</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Status Operacional</label>
                <select
                  value={tankStatus}
                  onChange={(e) => setTankStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  <option value="LIVRE">🟢 LIVRE (Pronto para brassagem)</option>
                  <option value="OCUPADO">🟣 OCUPADO (Com cerveja)</option>
                  <option value="HIGIENIZANDO">🔵 HIGIENIZANDO / CIP</option>
                  <option value="MANUTENCAO">🟡 EM MANUTENÇÃO</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Observações do Tanque</label>
                <textarea
                  rows={2}
                  value={tankNotes}
                  onChange={(e) => setTankNotes(e.target.value)}
                  placeholder="Ex: Válvula de amostragem trocada recentemente..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-medium focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTankModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTank}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition disabled:opacity-50 flex items-center gap-1.5 shadow"
                >
                  {savingTank ? 'Salvando...' : editingTank ? 'Salvar Alterações' : 'Cadastrar Tanque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO PARA ATUALIZAR STATUS DO LOTE */}
      {editingBatchStatus && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm">Atualizar Status do Lote {editingBatchStatus.batchNumber}</h4>
              <button onClick={() => setEditingBatchStatus(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Status de Produção:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  <option value="BRASSAGEM">🔥 BRASSAGEM</option>
                  <option value="FERMENTANDO">🟢 FERMENTANDO</option>
                  <option value="MATURANDO">❄️ MATURANDO</option>
                  <option value="PRONTO_ENVASE">✨ PRONTO PARA ENVASE</option>
                  <option value="ENVASADO">🛢️ ENVASADO (Liberar Tanque)</option>
                  <option value="FINALIZADO">✅ FINALIZADO</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">FG Medida (Densidade Final):</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="1.010"
                    value={newMeasuredFg}
                    onChange={(e) => setNewMeasuredFg(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">ABV Real (% Álcool):</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="5.2"
                    value={newMeasuredAbv}
                    onChange={(e) => setNewMeasuredAbv(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingBatchStatus(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateBatchStatus}
                disabled={savingStatus}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
              >
                {savingStatus ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO UNIFICADO */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 text-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Confirmar Exclusão</h3>
                <p className="text-xs text-rose-300">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">
                Você está prestes a excluir o seguinte{' '}
                <strong className="text-white font-bold">
                  {itemToDelete.type === 'BATCH' ? 'Lote de Produção' : itemToDelete.type === 'RECIPE' ? 'Receita' : 'Tanque'}
                </strong>:
              </div>
              <div className="text-sm font-bold text-amber-300 font-mono">{itemToDelete.title}</div>
              {itemToDelete.subtitle && (
                <div className="text-[11px] text-slate-400">{itemToDelete.subtitle}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
