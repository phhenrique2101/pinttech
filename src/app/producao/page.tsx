'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  Beer,
  Layers,
  Thermometer,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Droplet,
  Trash2,
  Cylinder,
} from 'lucide-react';
import { formatDateShort } from '@/lib/utils';

export default function ProducaoPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'BATCHES' | 'TANKS' | 'RECIPES'>('BATCHES');

  // Modals
  const [newBatchModal, setNewBatchModal] = useState(false);
  const [newRecipeModal, setNewRecipeModal] = useState(false);
  const [newTankModal, setNewTankModal] = useState(false);

  // New batch form
  const [recipeId, setRecipeId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [volumePlanned, setVolumePlanned] = useState('500');
  const [tankId, setTankId] = useState('');
  const [notes, setNotes] = useState('');

  // New recipe form
  const [recipeName, setRecipeName] = useState('');
  const [recipeStyle, setRecipeStyle] = useState('American IPA');
  const [abv, setAbv] = useState('6.5');
  const [ibu, setIbu] = useState('55');
  const [pricePerLiter, setPricePerLiter] = useState('22.0');
  const [description, setDescription] = useState('');

  // New tank form
  const [tankName, setTankName] = useState('');
  const [tankCapacity, setTankCapacity] = useState('500');
  const [tankType, setTankType] = useState('FERMENTADOR_ISOTERMICO');
  const [tankNotes, setTankNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, rRes, tRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/recipes'),
        fetch('/api/tanks'),
      ]);
      const [bData, rData, tData] = await Promise.all([bRes.json(), rRes.json(), tRes.json()]);

      if (Array.isArray(bData)) setBatches(bData);
      if (Array.isArray(rData)) {
        setRecipes(rData);
        if (rData.length > 0 && !recipeId) setRecipeId(rData[0].id);
      }
      if (Array.isArray(tData)) {
        setTanks(tData);
        if (tData.length > 0 && !tankId) setTankId(tData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId,
          batchNumber,
          tankId: tankId || null,
          volumePlannedLiters: volumePlanned,
          status: 'BRASSAGEM',
          notes,
        }),
      });
      if (res.ok) {
        setNewBatchModal(false);
        setBatchNumber('');
        setNotes('');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipeName,
          style: recipeStyle,
          abv,
          ibu,
          suggestedPricePerLiter: pricePerLiter,
          description,
        }),
      });
      if (res.ok) {
        setNewRecipeModal(false);
        setRecipeName('');
        setDescription('');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tanks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tankName,
          capacityLiters: tankCapacity,
          type: tankType,
          notes: tankNotes,
        }),
      });
      if (res.ok) {
        setNewTankModal(false);
        setTankName('');
        setTankNotes('');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTank = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o tanque ${name}?`)) return;
    try {
      const res = await fetch(`/api/tanks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-600" />
            Produção, Tanques & Lotes de Cerveja
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Brassagens, controle de tanques, receitas cervejeiras e envase parcial ou total de barris
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setNewTankModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all"
          >
            <Cylinder className="w-4 h-4 text-blue-600" />
            <span>Novo Tanque</span>
          </button>

          <button
            onClick={() => setNewRecipeModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all"
          >
            <Beer className="w-4 h-4 text-purple-600" />
            <span>Nova Receita</span>
          </button>

          <button
            onClick={() => {
              setBatchNumber(`LOTE-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, '0')}`);
              setNewBatchModal(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Brassagem</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-200/80 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('BATCHES')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'BATCHES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Lotes de Produção ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('TANKS')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'TANKS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tanques & Fermentadores ({tanks.length})
        </button>
        <button
          onClick={() => setActiveTab('RECIPES')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'RECIPES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Catálogo de Receitas ({recipes.length})
        </button>
      </div>

      {/* Tab: Batches */}
      {activeTab === 'BATCHES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-400">Carregando lotes...</div>
          ) : batches.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">Nenhum lote registrado.</div>
          ) : (
            batches.map((batch) => {
              const isReady = batch.status === 'PRONTO_ENVASE' || batch.status === 'ENVASADO';

              return (
                <div
                  key={batch.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-700 block">
                          {batch.batchNumber}
                        </span>
                        <h3 className="font-black text-slate-900 text-base mt-0.5">
                          {batch.recipe?.name || 'Cerveja'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {batch.recipe?.style || 'Estilo'}
                        </p>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          isReady
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Volume Planejado:</span>
                        <span className="font-bold text-slate-800">{batch.volumePlannedLiters} Litros</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Tanque:</span>
                        <span className="font-semibold text-blue-700">{batch.tank?.name || 'Tanque não atribuído'}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Data Brassagem:</span>
                        <span className="font-semibold">{formatDateShort(batch.brewDate)}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Barris Vinculados:</span>
                        <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          {batch._count?.kegs || 0} barris envasados
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {batch.measuredOg ? `OG: ${batch.measuredOg}` : ''}
                    </span>
                    <a
                      href="/scanner"
                      className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-lg border border-purple-200 flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Envasar Barris
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Tanques & Fermentadores */}
      {activeTab === 'TANKS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tanks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">Nenhum tanque cadastrado.</div>
          ) : (
            tanks.map((tank) => {
              const isOccupied = tank.status === 'OCUPADO';

              return (
                <div
                  key={tank.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {tank.type.replace('_', ' ')}
                        </span>
                        <h3 className="font-black text-slate-900 text-lg mt-0.5">{tank.name}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isOccupied
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {tank.status}
                        </span>

                        <button
                          onClick={() => handleDeleteTank(tank.id, tank.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Tanque"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Capacidade Total:</span>
                        <span className="font-black text-slate-900 text-sm">{tank.capacityLiters} Litros</span>
                      </div>

                      {tank.batches && tank.batches.length > 0 && (
                        <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-0.5">
                          <span className="text-[10px] font-bold text-purple-700 block uppercase tracking-wider">
                            Lote em Maturação/Fermentação:
                          </span>
                          <p className="font-black text-purple-900">
                            {tank.batches[0].recipe?.name || 'Cerveja'} ({tank.batches[0].batchNumber})
                          </p>
                          <span className="text-[10px] text-purple-600">
                            Volume: {tank.batches[0].volumePlannedLiters}L • Status: {tank.batches[0].status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Recipes */}
      {activeTab === 'RECIPES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-slate-900 text-base">{recipe.name}</h3>
                    <p className="text-xs font-bold text-purple-700">{recipe.style}</p>
                  </div>
                  <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    R$ {recipe.suggestedPricePerLiter?.toFixed(2)}/L
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-2 line-clamp-2">{recipe.description || 'Sem descrição.'}</p>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center text-xs">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">ABV</span>
                    <span className="font-black text-slate-800">{recipe.abv || '-'}%</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">IBU</span>
                    <span className="font-black text-slate-800">{recipe.ibu || '-'}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Lotes</span>
                    <span className="font-black text-purple-700">{recipe._count?.batches || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Novo Tanque */}
      {newTankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-4">Cadastrar Novo Tanque</h3>
            <form onSubmit={handleCreateTank} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome / Identificação do Tanque</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: F-03 (1000L) ou BBT-02"
                  value={tankName}
                  onChange={(e) => setTankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Capacidade (Litros)</label>
                  <input
                    type="number"
                    required
                    placeholder="1000"
                    value={tankCapacity}
                    onChange={(e) => setTankCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Tanque</label>
                  <select
                    value={tankType}
                    onChange={(e) => setTankType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="FERMENTADOR_ISOTERMICO">Fermentador Isotérmico</option>
                    <option value="MATURADOR">Maturador</option>
                    <option value="BBT_BRITE_TANK">Brite Tank (BBT)</option>
                    <option value="PANELA_BRASSAGEM">Panela de Brassagem</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Fabricante, pressão máxima, etc."
                  value={tankNotes}
                  onChange={(e) => setTankNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewTankModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Salvar Tanque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Brassagem */}
      {newBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-4">Iniciar Nova Brassagem (Lote)</h3>
            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Receita da Cerveja</label>
                <select
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.style})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Número / Código do Lote</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: LOTE-2026-003"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Volume Previsto (Litros)</label>
                  <input
                    type="number"
                    required
                    value={volumePlanned}
                    onChange={(e) => setVolumePlanned(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanque / Fermentador</label>
                  <select
                    value={tankId}
                    onChange={(e) => setTankId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="">-- Sem Tanque --</option>
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.capacityLiters}L) - {t.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas da Brassagem</label>
                <textarea
                  rows={2}
                  placeholder="OG medida, temperatura de mostura, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewBatchModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Iniciar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Receita */}
      {newRecipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-4">Cadastrar Nova Receita</h3>
            <form onSubmit={handleCreateRecipe} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome da Cerveja</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Red Velvet Amber Ale"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estilo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Irish Red Ale"
                    value={recipeStyle}
                    onChange={(e) => setRecipeStyle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preço Sugerido (R$/Litro)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricePerLiter}
                    onChange={(e) => setPricePerLiter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ABV (% Álcool)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={abv}
                    onChange={(e) => setAbv(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">IBU (Amargor)</label>
                  <input
                    type="number"
                    value={ibu}
                    onChange={(e) => setIbu(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewRecipeModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Salvar Receita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
