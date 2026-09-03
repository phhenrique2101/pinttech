'use client';

import React, { useState } from 'react';
import { X, Save, Beer, ShieldCheck, FileText, Activity } from 'lucide-react';

interface EditRecipeModalProps {
  recipe: any;
  onClose: () => void;
  onSaved: (updatedRecipe: any) => void;
}

export default function EditRecipeModal({ recipe, onClose, onSaved }: EditRecipeModalProps) {
  const [name, setName] = useState(recipe.name || '');
  const [style, setStyle] = useState(recipe.style || '');
  const [mapaRegistration, setMapaRegistration] = useState(recipe.mapaRegistration || '');
  const [commercialDenomination, setCommercialDenomination] = useState(recipe.commercialDenomination || '');
  const [og, setOg] = useState(recipe.og ? String(recipe.og) : '');
  const [fg, setFg] = useState(recipe.fg ? String(recipe.fg) : '');
  const [abv, setAbv] = useState(recipe.abv ? String(recipe.abv) : '');
  const [ibu, setIbu] = useState(recipe.ibu ? String(recipe.ibu) : '');
  const [ebc, setEbc] = useState(recipe.ebc ? String(recipe.ebc) : '');
  const [batchYieldLiters, setBatchYieldLiters] = useState(recipe.batchYieldLiters ? String(recipe.batchYieldLiters) : '500');
  const [description, setDescription] = useState(recipe.description || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da receita é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        style: style.trim() || 'Standard',
        mapaRegistration: mapaRegistration.trim() || null,
        commercialDenomination: commercialDenomination.trim() || null,
        og: og ? parseFloat(og) : null,
        fg: fg ? parseFloat(fg) : null,
        abv: abv ? parseFloat(abv) : null,
        ibu: ibu ? parseInt(ibu, 10) : null,
        ebc: ebc ? parseFloat(ebc) : null,
        batchYieldLiters: batchYieldLiters ? parseFloat(batchYieldLiters) : 500,
        description: description.trim() || null,
      };

      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar receita');

      onSaved(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações da receita.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Beer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Editar Receita Técnica</h2>
              <p className="text-xs text-slate-400">
                Ajuste os parâmetros físicos, registro MAPA e observações da receita
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nome da Receita *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: German Pilsen"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Estilo de Cerveja</label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Ex: German Pils"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* DADOS MAPA DA RECEITA */}
          <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Identificação & Denominação Oficial MAPA</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Registro MAPA do Rótulo</label>
                <input
                  type="text"
                  value={mapaRegistration}
                  onChange={(e) => setMapaRegistration(e.target.value)}
                  placeholder="Ex: SP 001234-5.000001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Denominação Legal / Comercial</label>
                <input
                  type="text"
                  value={commercialDenomination}
                  onChange={(e) => setCommercialDenomination(e.target.value)}
                  placeholder="Ex: Cerveja Clara Puro Malte"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* PARÂMETROS TÉCNICOS */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-300 mb-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Parâmetros Técnicos da Receita</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">OG Alvo</label>
                <input
                  type="text"
                  value={og}
                  onChange={(e) => setOg(e.target.value)}
                  placeholder="1.048"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500 text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">FG Alvo</label>
                <input
                  type="text"
                  value={fg}
                  onChange={(e) => setFg(e.target.value)}
                  placeholder="1.010"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-cyan-400 focus:outline-none focus:border-amber-500 text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">ABV (%)</label>
                <input
                  type="text"
                  value={abv}
                  onChange={(e) => setAbv(e.target.value)}
                  placeholder="5.0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">IBU</label>
                <input
                  type="number"
                  value={ibu}
                  onChange={(e) => setIbu(e.target.value)}
                  placeholder="25"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Cor EBC</label>
                <input
                  type="text"
                  value={ebc}
                  onChange={(e) => setEbc(e.target.value)}
                  placeholder="8.5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Volume (L)</label>
                <input
                  type="number"
                  value={batchYieldLiters}
                  onChange={(e) => setBatchYieldLiters(e.target.value)}
                  placeholder="500"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 text-center"
                />
              </div>
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Observações da Receita & Notas do Cervejeiro</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instruções de brassagem, perfis aromáticos, rampas de mostura..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          {/* FOOTER */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
