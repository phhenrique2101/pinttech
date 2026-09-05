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
  const [activeTab, setActiveTab] = useState<'ACTIVE_BATCHES' | 'TANKS' | 'HISTORY_MAPA' | 'RECIPES'>('ACTIVE_BATCHES');

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
      const [batchesRes, tanksRes, recipesRes, authRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/tanks'),
        fetch('/api/recipes'),
        fetch('/api/auth/me'),
      ]);

      const [batchesData, tanksData, recipesData, authData] = await Promise.all([
        batchesRes.json(),
        tanksRes.json(),
        recipesRes.json(),
        authRes.json(),
      ]);

      if (Array.isArray(batchesData)) setBatches(batchesData);
      if (Array.isArray(tanksData)) setTanks(tanksData);
      if (Array.isArray(recipesData)) setRecipes(recipesData);

      if (authData?.user?.brewery) {
        setBrewery(authData.user.brewery);
      } else if (authData?.user?.breweryId) {
        const brewRes = await fetch(`/api/breweries`);
        if (brewRes.ok) {
          const breweries = await brewRes.json();
          if (Array.isArray(breweries)) {
            const found = breweries.find((b: any) => b.id === authData.user.breweryId);
            if (found) setBrewery(found);
          }
        }
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
  }, []);

  // Lotes Ativos nos Tanques
  const activeBatches = useMemo(() => {
    return batches.filter(
      (b) => b.status !== 'FINALIZADO' && b.status !== 'ENVASADO' && b.status !== 'CANCELADO'
    );
  }, [batches]);

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

  const filteredActive = filterList(activeBatches);
  const filteredHistory = filterList(historicalBatches);
  const filteredRecipes = recipes.filter(
    (r) =>
      !search.trim() ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.style?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTanks = useMemo(() => {
    return tanks.filter((t) => {
      const matchesStatus = tankStatusFilter === 'ALL' || t.status === tankStatusFilter;
      const q = search.trim().toLowerCase();
      const activeBatch = (t.batches || []).find((b: any) => b.status !== 'FINALIZADO' && b.status !== 'ENVASADO') || t.batches?.[0];
      const matchesSearch =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.type?.toLowerCase().includes(q) ||
        (activeBatch && (
          activeBatch.batchNumber?.toLowerCase().includes(q) ||
          activeBatch.recipe?.name?.toLowerCase().includes(q) ||
          activeBatch.recipe?.style?.toLowerCase().includes(q)
        ));
      return matchesStatus && matchesSearch;
    });
  }, [tanks, tankStatusFilter, search]);

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-amber-700 to-slate-950 p-8 text-white shadow-2xl border border-amber-500/30">
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
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lotes em Produção</span>
            <strong className="text-xl font-black text-white">{activeBatches.length}</strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Cylinder className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanques Ocupados</span>
            <strong className="text-xl font-black text-white">
              {occupiedTanksCount} / {tanks.length}
            </strong>
            <span className="text-[9px] text-slate-500 font-mono block">{totalTankCapacity}L instalados</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dossiês MAPA Emitidos</span>
            <strong className="text-xl font-black text-white">{batches.length}</strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Beer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Receitas no Catálogo</span>
            <strong className="text-xl font-black text-white">{recipes.length}</strong>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Navegação por Abas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-2">
        <div className="flex space-x-2 overflow-x-auto">
          {[
            { id: 'ACTIVE_BATCHES', label: 'Lotes em Produção', count: activeBatches.length, icon: Flame },
            { id: 'TANKS', label: 'Tanques da Adega', count: tanks.length, icon: Cylinder },
            { id: 'HISTORY_MAPA', label: 'Histórico & Dossiês MAPA', count: historicalBatches.length, icon: ShieldCheck },
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
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-slate-900 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>
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
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>
      </div>

      {/* ABA 1: LOTES ATIVOS EM PRODUÇÃO COM RASTREABILIDADE */}
      {activeTab === 'ACTIVE_BATCHES' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs">Carregando lotes em produção...</span>
            </div>
          ) : filteredActive.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <Beer className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Nenhum lote em produção no momento</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Importe o arquivo BeerXML do seu BeerSmith para cadastrar os lotes de matérias-primas e enviar para o tanque.
                </p>
              </div>
              <button
                onClick={() => setImporterModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Importar BeerXML Agora</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActive.map((batch) => {
                const ingCount = batch.ingredients?.length || batch._count?.ingredients || 0;
                return (
                  <div
                    key={batch.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition shadow-lg flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Bar do Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {batch.batchNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                batch.status === 'FERMENTANDO'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : batch.status === 'MATURANDO'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-orange-500/20 text-orange-400'
                              }`}
                            >
                              {batch.status}
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-white mt-1">{batch.recipe?.name || 'Cerveja'}</h3>
                          <p className="text-xs text-slate-400">
                            Estilo: <strong className="text-slate-300">{batch.recipe?.style || 'Standard'}</strong> • Volume:{' '}
                            <strong className="text-slate-300">{batch.volumePlannedLiters}L</strong>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Tanque</span>
                          <strong className="text-xs font-bold text-amber-400 block font-mono">
                            {batch.tank?.name || 'Sem Tanque'}
                          </strong>
                        </div>
                      </div>

                      {/* Parâmetros Vitais e Registro MAPA */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl text-center text-xs font-mono border border-slate-800/80">
                        <div>
                          <span className="text-[10px] text-slate-500 font-sans block">OG / FG</span>
                          <strong className="text-slate-200">
                            {batch.measuredOg || batch.recipe?.og || '1.050'} / {batch.measuredFg || batch.recipe?.fg || '1.010'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-sans block">ABV / IBU</span>
                          <strong className="text-slate-200">
                            {batch.measuredAbv || batch.recipe?.abv || '5.0'}% / {batch.measuredIbu || batch.recipe?.ibu || '25'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-sans block">Insumos Rastreáveis</span>
                          <strong className="text-emerald-400 font-bold">{ingCount} itens</strong>
                        </div>
                      </div>

                      {/* Dados MAPA */}
                      <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Registro MAPA:</span>
                          <span className="font-mono text-slate-300">
                            {batch.mapaRegistration || batch.recipe?.mapaRegistration || 'SP 001234-5.000001'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Denominação:</span>
                          <span className="text-slate-300 truncate max-w-[220px]">
                            {batch.commercialDenomination || batch.recipe?.commercialDenomination || 'Cerveja Puro Malte'}
                          </span>
                        </div>
                      </div>

                      {/* Observações da Receita */}
                      {(batch.notes || batch.recipe?.description) && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 text-xs text-amber-200/90">
                          <span className="text-[10px] font-bold text-amber-400 block uppercase mb-0.5 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>Observações da Receita:</span>
                          </span>
                          <p className="line-clamp-2 italic text-[11px] text-slate-300">
                            {batch.notes || batch.recipe?.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedBatchForManager(batch)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                      >
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                        <span>Medições, pH & Adega</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingBatchStatus(batch);
                            setNewStatus(batch.status);
                            setNewMeasuredFg(batch.measuredFg ? String(batch.measuredFg) : '');
                            setNewMeasuredAbv(batch.measuredAbv ? String(batch.measuredAbv) : '');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Status</span>
                        </button>

                        <button
                          onClick={() => setSelectedBatchForSheet(batch)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Ficha MAPA</span>
                        </button>

                        <button
                          onClick={() =>
                            setItemToDelete({
                              type: 'BATCH',
                              id: batch.id,
                              title: `Lote ${batch.batchNumber}`,
                              subtitle: `${batch.recipe?.name || 'Cerveja'} • Tanque: ${batch.tank?.name || 'Sem tanque'}`,
                            })
                          }
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                          title="Excluir Lote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: TANQUES DA ADEGA */}
      {activeTab === 'TANKS' && (
        <div className="space-y-4">
          {/* Barra de Filtros de Tanques */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: `Todos (${tanks.length})` },
                { id: 'OCUPADO', label: `Ocupados (${tanks.filter((t) => t.status === 'OCUPADO').length})` },
                { id: 'LIVRE', label: `Livres (${tanks.filter((t) => t.status === 'LIVRE').length})` },
                { id: 'HIGIENIZANDO', label: `CIP / Limpeza (${tanks.filter((t) => t.status === 'HIGIENIZANDO').length})` },
                { id: 'MANUTENCAO', label: `Manutenção (${tanks.filter((t) => t.status === 'MANUTENCAO').length})` },
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

            <button
              onClick={openNewTankModal}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Tanque</span>
            </button>
          </div>

          {filteredTanks.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl space-y-3 text-slate-400">
              <Cylinder className="w-12 h-12 mx-auto text-slate-500" />
              <h4 className="text-sm font-bold text-white">Nenhum tanque encontrado</h4>
              <p className="text-xs text-slate-500">Cadastre seus fermentadores e maturadores para controlar a capacidade da adega.</p>
              <button
                onClick={openNewTankModal}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Tanque</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTanks.map((tank) => {
                const isOccupied = tank.status === 'OCUPADO';
                const activeBatch = (tank.batches || []).find((b: any) => b.status !== 'FINALIZADO' && b.status !== 'ENVASADO') || tank.batches?.[0];
                const volumeInTank = activeBatch ? (activeBatch.volumeProducedLiters || activeBatch.volumePlannedLiters || tank.capacityLiters) : 0;
                const fillPercent = tank.capacityLiters > 0 ? Math.min(100, Math.round((volumeInTank / tank.capacityLiters) * 100)) : 0;

                return (
                  <div
                    key={tank.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between hover:border-slate-700 transition"
                  >
                    <div className="space-y-3">
                      {/* Top Header do Tanque */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-white">{tank.name}</h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                tank.status === 'OCUPADO'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : tank.status === 'LIVRE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : tank.status === 'HIGIENIZANDO'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {tank.status}
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
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-amber-400">
                              Lote #{activeBatch.batchNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300">
                              {activeBatch.status}
                            </span>
                          </div>
                          <div>
                            <strong className="text-white block text-sm">{activeBatch.recipe?.name || 'Cerveja'}</strong>
                            <span className="text-slate-400 text-[11px]">{activeBatch.recipe?.style || 'Estilo não especificado'}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-800 text-[10px] text-slate-300 font-mono">
                            <div>OG: {activeBatch.measuredOg || activeBatch.recipe?.og || '—'}</div>
                            <div>FG: {activeBatch.measuredFg || activeBatch.recipe?.fg || '—'}</div>
                            <div>ABV: {activeBatch.measuredAbv || activeBatch.recipe?.abv || '—'}%</div>
                            <div>Data: {formatDateShort(activeBatch.brewDate || activeBatch.createdAt)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                          Tanque livre para nova brassagem ou processo de CIP/sanitização.
                        </div>
                      )}
                    </div>

                    {/* Ações Rápidas do Tanque */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                      {isOccupied && activeBatch ? (
                        <>
                          <button
                            onClick={() => setSelectedBatchForManager(activeBatch)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5 transition text-[11px]"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Adega & Medições</span>
                          </button>
                          <button
                            onClick={() => handleLiberateTank(tank)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] transition"
                          >
                            Liberar Tanque
                          </button>
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

      {/* ABA 3: HISTÓRICO DE DOSSIÊS MAPA */}
      {activeTab === 'HISTORY_MAPA' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Arquivo Histórico de Lotes & Dossiês MAPA</h3>
              <p className="text-xs text-slate-400">
                Lotes finalizados ou envasados com rastreabilidade arquivada para consulta fiscal.
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
