'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Layers,
  Droplets,
  Sparkles,
  Cylinder,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Package,
  ArrowRight,
  Clock,
  DollarSign,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ScheduleBatchModalProps {
  recipe: any;
  tanks: any[];
  inventoryItems: any[];
  onClose: () => void;
  onScheduled: (batch: any) => void;
}

export default function ScheduleBatchModal({
  recipe,
  tanks = [],
  inventoryItems = [],
  onClose,
  onScheduled,
}: ScheduleBatchModalProps) {
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [scheduledDate, setScheduledDate] = useState<string>(tomorrowStr);
  const [batchNumber, setBatchNumber] = useState<string>(`PLAN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [volumePlannedLiters, setVolumePlannedLiters] = useState<number>(recipe?.batchYieldLiters || 500);
  const [tankId, setTankId] = useState<string>(tanks[0]?.id || '');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Ingredientes da receita
  const recipeData = useMemo(() => {
    if (recipe?.recipeDataJson) {
      try {
        return JSON.parse(recipe.recipeDataJson);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [recipe]);

  const fermentables = recipeData?.fermentables || [];
  const hops = recipeData?.hops || [];
  const yeast = recipeData?.yeast;

  // Multiplicador de escala se o volume planejado for diferente da receita base
  const scaleMultiplier = (recipe?.batchYieldLiters && recipe.batchYieldLiters > 0)
    ? volumePlannedLiters / recipe.batchYieldLiters
    : 1;

  // Diagnóstico de Estoque para este Planejamento
  const stockDiagnosis = useMemo(() => {
    const list: Array<{
      name: string;
      category: string;
      required: number;
      available: number;
      deficit: number;
      unit: string;
      isMissing: boolean;
    }> = [];

    // Checagem de Maltes
    for (const f of fermentables) {
      const req = (f.amountKg || 0) * scaleMultiplier;
      const lower = f.name.toLowerCase();
      const match = inventoryItems.find((i) => i.name.toLowerCase().includes(lower) || lower.includes(i.name.toLowerCase()));
      const avail = match?.currentQuantity || 0;
      const diff = req - avail;
      list.push({
        name: f.name,
        category: 'MALTE',
        required: Math.round(req * 10) / 10,
        available: avail,
        deficit: diff > 0 ? Math.round(diff * 10) / 10 : 0,
        unit: 'KG',
        isMissing: diff > 0,
      });
    }

    // Checagem de Lúpulos
    for (const h of hops) {
      const reqG = (h.amountGrams || 0) * scaleMultiplier;
      const lower = h.name.toLowerCase();
      const match = inventoryItems.find((i) => i.name.toLowerCase().includes(lower) || lower.includes(i.name.toLowerCase()));
      const availG = match ? (match.unit === 'KG' ? match.currentQuantity * 1000 : match.currentQuantity) : 0;
      const diffG = reqG - availG;
      list.push({
        name: h.name,
        category: 'LUPULO',
        required: Math.round(reqG),
        available: availG,
        deficit: diffG > 0 ? Math.round(diffG) : 0,
        unit: 'G',
        isMissing: diffG > 0,
      });
    }

    const missingItems = list.filter((i) => i.isMissing);
    return {
      all: list,
      missingItems,
      hasDeficit: missingItems.length > 0,
    };
  }, [fermentables, hops, inventoryItems, scaleMultiplier]);

  const handleSaveSchedule = async () => {
    if (!batchNumber.trim()) {
      setError('Informe o número ou código de identificação do lote');
      return;
    }
    if (!scheduledDate) {
      setError('Selecione a data prevista de produção');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        recipeId: recipe.id,
        batchNumber: batchNumber.trim(),
        tankId: tankId || null,
        status: 'PLANEJADO',
        volumePlannedLiters: volumePlannedLiters,
        brewDate: new Date(scheduledDate).toISOString(),
        notes: notes.trim() || `Brassagem planejada para ${new Date(scheduledDate).toLocaleDateString('pt-BR')} (${recipe.name})`,
        costPerLiter: recipe.costPerLiter || 0,
        totalCost: (recipe.costPerLiter || 0) * volumePlannedLiters,
        deductStock: false, // não deduz estoque imediatamente pois é agendamento futuro
      };

      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao agendar lote de produção');

      onScheduled(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao agendar produção');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl text-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER LIGHT */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Planejar Produção Futura</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                  {recipe?.name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Agende datas de brassagem e confira o que falta comprar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PARÂMETROS DO AGENDAMENTO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Data Prevista de Brassagem</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Identificação / Nº do Lote</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-700 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Volume Planejado (Litros)</label>
              <input
                type="number"
                value={volumePlannedLiters}
                onChange={(e) => setVolumePlannedLiters(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none text-right focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tanque Fermentador Previsto (Opcional)</label>
            <select
              value={tankId}
              onChange={(e) => setTankId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="">Definir tanque mais tarde</option>
              {tanks.map((t) => (
                <option key={t.id} value={t.id}>
                  🏺 {t.name} ({t.capacityLiters}L - Status: {t.status})
                </option>
              ))}
            </select>
          </div>

          {/* DIAGNÓSTICO DE INSUMOS DO PLANEJAMENTO */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" />
                <span>Previsão de Estoque para este Lote ({volumePlannedLiters}L)</span>
              </h3>

              {stockDiagnosis.hasDeficit ? (
                <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {stockDiagnosis.missingItems.length} insumo(s) faltando
                </span>
              ) : (
                <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Estoque 100% suficiente
                </span>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Insumo</th>
                    <th className="p-2.5 text-right">Qtd. Necessária</th>
                    <th className="p-2.5 text-right">Saldo Atual</th>
                    <th className="p-2.5 text-right">Falta / Déficit</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockDiagnosis.all.map((item, idx) => (
                    <tr key={idx} className={item.isMissing ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                      <td className="p-2.5 font-bold text-slate-900">{item.name}</td>
                      <td className="p-2.5 text-right font-black text-slate-800">{item.required} {item.unit}</td>
                      <td className="p-2.5 text-right font-bold text-slate-600">{item.available} {item.unit}</td>
                      <td className="p-2.5 text-right font-black">
                        {item.deficit > 0 ? (
                          <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md font-black">
                            Faltam {item.deficit} {item.unit}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold">OK</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {item.isMissing ? (
                          <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                            Comprar
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Disponível
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notas do Planejamento</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Brassagem agendada após entrega dos maltes pelo fornecedor..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>
        </div>

        {/* FOOTER LIGHT */}
        <div className="p-5 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSaveSchedule}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Agendamento de Produção</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
