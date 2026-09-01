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
      // 1. Cria o Lote de Produção
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Dia de Brassagem (Brew Day)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  {recipe?.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Acompanhamento e registro do lote de produção</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* CRONÔMETRO DE FERVURA */}
          <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block">Timer da Fervura</span>
                <span className="text-3xl font-black text-white tracking-widest">{formatTimer(timerSeconds)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimerRunning(!timerRunning)}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  timerRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
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
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
                title="Reiniciar Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DADOS DO LOTE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Identificação / Número do Lote</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tanque Fermentador</label>
              <select
                value={tankId}
                onChange={(e) => setTankId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 focus:outline-none focus:border-amber-500"
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
              <label className="block text-xs font-bold text-slate-300 mb-1">Volume Planejado (Litros)</label>
              <input
                type="number"
                value={volumePlannedLiters}
                onChange={(e) => setVolumePlannedLiters(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none text-right"
              />
            </div>
          </div>

          {/* MEDIÇÕES REAIS NA BRASSAGEM */}
          <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Beaker className="w-4 h-4 text-cyan-400" />
              <span>Controle de Qualidade & Medições de Campo</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">OG Medida (Densidade Inicial)</label>
                <input
                  type="text"
                  value={measuredOg}
                  onChange={(e) => setMeasuredOg(e.target.value)}
                  placeholder={recipe?.og ? recipe.og.toFixed(3) : '1.050'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">pH da Mostura (Alvo: 5.2 - 5.4)</label>
                <input
                  type="text"
                  value={phMash}
                  onChange={(e) => setPhMash(e.target.value)}
                  placeholder="5.3"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">pH Pós-Fervura / Whirlpool</label>
                <input
                  type="text"
                  value={phBoil}
                  onChange={(e) => setPhBoil(e.target.value)}
                  placeholder="5.1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Observações da Brassagem</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Eficiência de mostura, recirculação, aroma no whirlpool, clarificação..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* CHECKBOX DE DEDUÇÃO DE ESTOQUE */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PackageCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-black text-white">Baixa Automática de Insumos no Estoque</p>
                <p className="text-[11px] text-slate-400">Deduzirá os maltes e lúpulos da receita do inventário da cervejaria</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={deductStock}
              onChange={(e) => setDeductStock(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleStartBrew}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
