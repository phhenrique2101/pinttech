'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Flame,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Beaker,
  Thermometer,
  Layers,
  Droplets,
  Cylinder,
  ShieldCheck,
  PackageCheck,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BrewDayModalProps {
  recipe: any;
  tanks: any[];
  onClose: () => void;
  onBatchCreated: (batch: any) => void;
}

export default function BrewDayModal({
  recipe,
  tanks = [],
  onClose,
  onBatchCreated,
}: BrewDayModalProps) {
  const [batchNumber, setBatchNumber] = useState(`LOTE-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [tankId, setTankId] = useState(tanks[0]?.id || '');
  const [volumePlannedLiters, setVolumePlannedLiters] = useState<number>(recipe?.batchYieldLiters || 500);
  const [measuredOg, setMeasuredOg] = useState<string>(recipe?.og ? recipe.og.toFixed(3) : '');
  const [phMash, setPhMash] = useState<string>('5.3');
  const [phBoil, setPhBoil] = useState<string>('5.1');
  const [notes, setNotes] = useState<string>('');
  const [deductStock, setDeductStock] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Timer de Fervura
  const [timerSeconds, setTimerSeconds] = useState<number>((recipe?.boilTimeMinutes || 60) * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartBrew = async () => {
    if (!batchNumber.trim()) {
      setError('Informe o número ou código do lote');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const payload = {
        recipeId: recipe.id,
        batchNumber: batchNumber.trim(),
        tankId: tankId || null,
        status: 'BRASSAGEM',
        volumePlannedLiters: volumePlannedLiters,
        measuredOg: measuredOg ? parseFloat(measuredOg) : recipe.og || null,
        phMash: phMash ? parseFloat(phMash) : null,
        phBoil: phBoil ? parseFloat(phBoil) : null,
        notes: notes.trim() || `Brassagem iniciada via PintTech Brew Studio (${recipe.name})`,
        costPerLiter: recipe.costPerLiter || 0,
        totalCost: (recipe.costPerLiter || 0) * volumePlannedLiters,
        deductStock,
      };

      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao iniciar brassagem');

      onBatchCreated(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar brassagem');
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
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Dia de Brassagem (Brew Day)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                  {recipe?.name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Acompanhamento e registro do lote de produção</p>
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

          {/* CRONÔMETRO DE FERVURA LIGHT */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 block">Timer da Fervura</span>
                <span className="text-3xl font-black text-slate-900 tracking-widest">{formatTimer(timerSeconds)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimerRunning(!timerRunning)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm ${
                  timerRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{timerRunning ? 'Pausar' : 'Iniciar Fervura'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds((recipe?.boilTimeMinutes || 60) * 60);
                }}
                className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shadow-sm transition-all"
                title="Reiniciar Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DADOS DO LOTE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Identificação / Número do Lote</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-700 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanque Fermentador</label>
              <select
                value={tankId}
                onChange={(e) => setTankId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
              >
                <option value="">Nenhum tanque atribuído</option>
                {tanks.map((t) => (
                  <option key={t.id} value={t.id}>
                    🏺 {t.name} ({t.capacityLiters}L - {t.status})
                  </option>
                ))}
              </select>
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

          {/* MEDIÇÕES REAIS NA BRASSAGEM */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Beaker className="w-4 h-4 text-cyan-600" />
              <span>Controle de Qualidade & Medições de Campo</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">OG Medida (Densidade Inicial)</label>
                <input
                  type="text"
                  value={measuredOg}
                  onChange={(e) => setMeasuredOg(e.target.value)}
                  placeholder={recipe?.og ? recipe.og.toFixed(3) : '1.050'}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">pH da Mostura (Alvo: 5.2 - 5.4)</label>
                <input
                  type="text"
                  value={phMash}
                  onChange={(e) => setPhMash(e.target.value)}
                  placeholder="5.3"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">pH Pós-Fervura / Whirlpool</label>
                <input
                  type="text"
                  value={phBoil}
                  onChange={(e) => setPhBoil(e.target.value)}
                  placeholder="5.1"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Observações da Brassagem</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Eficiência de mostura, recirculação, aroma no whirlpool, clarificação..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* CHECKBOX DE DEDUÇÃO DE ESTOQUE */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PackageCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-xs font-black text-slate-900">Baixa Automática de Insumos no Estoque</p>
                <p className="text-[11px] text-slate-500">Deduzirá os maltes e lúpulos da receita do inventário da cervejaria</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={deductStock}
              onChange={(e) => setDeductStock(e.target.checked)}
              className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
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
            onClick={handleStartBrew}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Registrar Brassagem & Iniciar Lote</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
