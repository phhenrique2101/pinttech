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
} from 'lucide-react';
import BeerXmlImporterModal from '@/components/brew/BeerXmlImporterModal';
import MapaTraceabilitySheetModal from '@/components/brew/MapaTraceabilitySheetModal';
import LiveBatchManagerModal from '@/components/brew/LiveBatchManagerModal';
import { formatDate, formatDateShort } from '@/lib/utils';

export default function BrewStudioPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [brewery, setBrewery] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ACTIVE_BATCHES' | 'HISTORY_MAPA' | 'RECIPES'>('ACTIVE_BATCHES');

  // Modals
  const [importerModalOpen, setImporterModalOpen] = useState<boolean>(false);
  const [selectedBatchForSheet, setSelectedBatchForSheet] = useState<any | null>(null);
  const [selectedBatchForManager, setSelectedBatchForManager] = useState<any | null>(null);

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
      console.error('Erro ao carregar dados do Brew Studio:', err);
    } finally {
      setLoading(false);
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header Principal */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-amber-700 to-slate-950 p-8 text-white shadow-2xl border border-amber-500/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>Conformidade & Exigências MAPA</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Beer className="w-9 h-9 text-amber-300" />
              <span>Brew Studio • Rastreabilidade MAPA</span>
            </h1>
            <p className="text-slate-200 max-w-2xl text-xs md:text-sm leading-relaxed">
              Importe sua receita pronta do <strong>BeerSmith (.xml)</strong>, vincule os lotes das matérias-primas
              para atender à fiscalização do Ministério da Agricultura e despache direto para os tanques da adega.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setImporterModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition"
            >
              <Upload className="w-5 h-5" />
              <span>Importar BeerXML & Rastrear Lote MAPA</span>
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lotes Ativos nos Tanques</span>
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
              {tanks.filter((t) => t.status === 'OCUPADO').length} / {tanks.length}
            </strong>
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
            { id: 'ACTIVE_BATCHES', label: 'Lotes em Produção & Tanques', count: activeBatches.length, icon: Flame },
            { id: 'HISTORY_MAPA', label: 'Histórico de Dossiês MAPA', count: historicalBatches.length, icon: ShieldCheck },
            { id: 'RECIPES', label: 'Receitas BeerSmith Importadas', count: recipes.length, icon: Beer },
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
            placeholder="Buscar por lote, cerveja ou MAPA..."
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

                      {/* Observações da Receita (Exigência do usuário) */}
                      {(batch.notes || batch.recipe?.description) && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 text-xs text-amber-200/90">
                          <span className="text-[10px] font-bold text-amber-400 block uppercase mb-0.5 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>Observações da Receita (BeerSmith):</span>
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

                      <div className="flex items-center gap-2">
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
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Ficha MAPA</span>
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

      {/* ABA 2: HISTÓRICO DE DOSSIÊS MAPA */}
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
                        <button
                          onClick={() => setSelectedBatchForSheet(batch)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reimprimir Ficha MAPA</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: RECEITAS IMPORTADAS */}
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
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    {recipe.style}
                  </span>
                  <h4 className="text-base font-black text-white">{recipe.name}</h4>
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

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => setImporterModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5"
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
                  <label className="block text-slate-400 mb-1">FG Medida Real:</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Ex: 1.012"
                    value={newMeasuredFg}
                    onChange={(e) => setNewMeasuredFg(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">ABV Medido (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 6.5"
                    value={newMeasuredAbv}
                    onChange={(e) => setNewMeasuredAbv(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingBatchStatus(null)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateBatchStatus}
                disabled={savingStatus}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-black text-slate-950"
              >
                {savingStatus ? 'Salvando...' : 'Salvar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
