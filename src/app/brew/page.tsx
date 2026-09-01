'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import RecipeDesignerModal from '@/components/brew/RecipeDesignerModal';
import BeerXmlImporterModal from '@/components/brew/BeerXmlImporterModal';
import BrewDayModal from '@/components/brew/BrewDayModal';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { srmToHex } from '@/lib/brewing/calculations';

export default function BrewStudioPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'RECIPES' | 'BATCHES' | 'STOCK'>('RECIPES');

  // Modals
  const [designerModalOpen, setDesignerModalOpen] = useState<boolean>(false);
  const [selectedRecipeForEdit, setSelectedRecipeForEdit] = useState<any | null>(null);
  const [xmlImporterOpen, setXmlImporterOpen] = useState<boolean>(false);
  const [brewDayModalOpen, setBrewDayModalOpen] = useState<boolean>(false);
  const [selectedRecipeForBrew, setSelectedRecipeForBrew] = useState<any | null>(null);

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

  // Estatísticas Rápidas
  const activeBatches = batches.filter((b) => b.status !== 'FINALIZADO' && b.status !== 'ENVASADO');
  const totalVolumeInTanks = activeBatches.reduce((acc, b) => acc + (b.volumePlannedLiters || 0), 0);
  const maltsCount = inventoryItems.filter((i) => i.category === 'MALTE').length;
  const hopsCount = inventoryItems.filter((i) => i.category === 'LUPULO').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 -m-4 md:-m-6 lg:-m-8">
      {/* TOPBAR BANNER */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PintTech Brew Studio — Designer Cervejeiro</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Calculadora & Planejador de Receitas
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
                Crie receitas cervejeiras profissionais estilo Brewfather com cálculo automático de IBU (Tinseth), OG/FG, ABV, cor EBC e integração direta com o estoque da cervejaria.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setXmlImporterOpen(true)}
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <UploadCloud className="w-4 h-4 text-amber-400" />
                <span>Importar BeerXML</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRecipeForEdit(null);
                  setDesignerModalOpen(true);
                }}
                className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Receita</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80">
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block">Receitas Elaboradas</span>
              <span className="text-xl sm:text-2xl font-black text-white mt-1 block">{recipes.length}</span>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block">Lotes Ativos em Tanque</span>
              <span className="text-xl sm:text-2xl font-black text-amber-400 mt-1 block">{activeBatches.length}</span>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block">Volume em Fermentação</span>
              <span className="text-xl sm:text-2xl font-black text-cyan-400 mt-1 block">
                {totalVolumeInTanks.toLocaleString('pt-BR')} <span className="text-xs font-bold text-slate-500">Litros</span>
              </span>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block">Catálogo de Insumos</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 block">
                {maltsCount + hopsCount} <span className="text-xs font-bold text-slate-500">Itens</span>
              </span>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('RECIPES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'RECIPES'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Beer className="w-4 h-4" />
              <span>Receitas Cervejeiras ({recipes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('BATCHES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'BATCHES'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Lotes & Fermentação ({activeBatches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('STOCK')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'STOCK'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Estoque de Insumos</span>
            </button>
          </div>

          {/* Search bar */}
          {activeTab === 'RECIPES' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou estilo..."
                className="w-full pl-10 pr-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold">Carregando dados cervejeiros...</span>
          </div>
        ) : activeTab === 'RECIPES' ? (
          <div className="space-y-4">
            {filteredRecipes.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mx-auto">
                  <Beer className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-black text-white">Nenhuma receita encontrada</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Comece desenhando sua primeira cerveja na calculadora ou importe arquivos BeerXML existentes.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedRecipeForEdit(null);
                      setDesignerModalOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md"
                  >
                    + Criar Primeira Receita
                  </button>
                  <button
                    onClick={() => setXmlImporterOpen(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700"
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
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-5 shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        {/* Header do Card */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {/* Color Swatch / Glass */}
                            <div
                              className="w-8 h-10 rounded-lg border border-slate-700 shadow-inner flex items-center justify-center relative overflow-hidden"
                              style={{ backgroundColor: hex }}
                            >
                              <div className="w-full h-1.5 bg-white/20 absolute top-0" />
                            </div>
                            <div>
                              <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                                {r.name}
                              </h3>
                              <span className="text-xs font-bold text-amber-400/90 block">
                                {r.style} {r.bjcpStyleCode ? `(${r.bjcpStyleCode})` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black text-white block">
                              {r.batchYieldLiters || 500}L
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">Volume</span>
                          </div>
                        </div>

                        {/* Badges de Parâmetros Técnicos (OG, ABV, IBU, EBC) */}
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          <div className="p-2 bg-slate-950 rounded-xl text-center border border-slate-800/80">
                            <span className="text-[10px] text-slate-500 font-bold block">OG</span>
                            <span className="text-xs font-black text-white">
                              {r.og ? r.og.toFixed(3) : '-'}
                            </span>
                          </div>

                          <div className="p-2 bg-slate-950 rounded-xl text-center border border-slate-800/80">
                            <span className="text-[10px] text-slate-500 font-bold block">ABV</span>
                            <span className="text-xs font-black text-amber-400">
                              {r.abv ? `${r.abv.toFixed(1)}%` : '-'}
                            </span>
                          </div>

                          <div className="p-2 bg-slate-950 rounded-xl text-center border border-slate-800/80">
                            <span className="text-[10px] text-slate-500 font-bold block">IBU</span>
                            <span className="text-xs font-black text-emerald-400">
                              {r.ibu ?? '-'}
                            </span>
                          </div>

                          <div className="p-2 bg-slate-950 rounded-xl text-center border border-slate-800/80">
                            <span className="text-[10px] text-slate-500 font-bold block">EBC</span>
                            <span className="text-xs font-black text-cyan-400">
                              {r.ebc ? Math.round(r.ebc) : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Custo & Insumos */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 text-slate-400">
                          <span className="flex items-center gap-1 font-bold">
                            <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                            <span>CPV: {r.costPerLiter ? `R$ ${r.costPerLiter.toFixed(2)}/L` : 'R$ 0,00'}</span>
                          </span>

                          <span className="text-[11px] font-bold text-slate-500">
                            {r._count?.batches || 0} brassagem(ns)
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <a
                            href={`/api/recipes/${r.id}/export-beerxml`}
                            download
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                            title="Exportar BeerXML"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteRecipe(r.id, r.name)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                            title="Excluir Receita"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecipeForEdit(r);
                              setDesignerModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all"
                          >
                            Calculadora
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecipeForBrew(r);
                              setBrewDayModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center gap-1 transition-all"
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
        ) : activeTab === 'BATCHES' ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl">
              <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Tanques de Fermentação & Lotes em Produção</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tanks.map((tank) => {
                  const currentBatch = batches.find((b) => b.tankId === tank.id && b.status !== 'FINALIZADO');
                  const isBusy = tank.status === 'OCUPADO' || currentBatch;

                  return (
                    <div
                      key={tank.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isBusy
                          ? 'bg-amber-950/20 border-amber-500/40 text-slate-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cylinder className={`w-5 h-5 ${isBusy ? 'text-amber-400' : 'text-slate-600'}`} />
                          <span className="text-sm font-black text-white">{tank.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">{tank.capacityLiters}L</span>
                      </div>

                      {currentBatch ? (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-white">{currentBatch.recipe?.name || 'Cerveja'}</span>
                            <span className="text-amber-400">{currentBatch.status}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Lote: <span className="font-bold text-slate-200">{currentBatch.batchNumber}</span> | {currentBatch.volumePlannedLiters}L
                          </p>
                          {currentBatch.measuredOg && (
                            <p className="text-[11px] text-slate-400">
                              OG Medida: <span className="font-bold text-cyan-400">{currentBatch.measuredOg}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 mt-3 italic">Tanque livre para brassagem</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl">
              <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Estoque Físico de Insumos da Cervejaria</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {inventoryItems.map((item) => (
                  <div key={item.id} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{item.category}</span>
                      <h4 className="text-xs font-black text-white mt-0.5">{item.name}</h4>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400">
                        {item.currentQuantity} {item.unit}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
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
