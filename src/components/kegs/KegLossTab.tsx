'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Cylinder,
  History,
  Trash2,
  Sliders,
  Sparkles,
  RefreshCw,
  Search,
  Beer,
  Wrench,
  Ban,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Keg {
  id: string;
  code: string;
  capacity: number;
  currentVolumeLiters?: number | null;
  status: string;
  currentBeerName?: string | null;
  currentBatch?: { batchNumber: string; recipe?: { name: string } } | null;
}

interface KegLossTabProps {
  kegs: Keg[];
  onSuccess: () => void;
}

const LOSS_REASONS = [
  { id: 'CONTAMINACAO', label: 'Contaminação / Azedamento', icon: '🧪' },
  { id: 'VAZAMENTO_VALVULA', label: 'Vazamento na Válvula / Sifão', icon: '🔧' },
  { id: 'ESPUMA_SANGRIA', label: 'Espuma / Sangria / Borra', icon: '🍺' },
  { id: 'OXIDACAO', label: 'Oxidação / Validade Vencida', icon: '⏱️' },
  { id: 'AVARIA_FISICA', label: 'Avaria Física / Queda / Batida', icon: '💥' },
  { id: 'AJUSTE_INVENTARIO', label: 'Furo / Ajuste de Estoque', icon: '📋' },
  { id: 'OUTRO', label: 'Outro Motivo', icon: '📝' },
];

export default function KegLossTab({ kegs, onSuccess }: KegLossTabProps) {
  // Selected Keg
  const [selectedKegId, setSelectedKegId] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [laserCodeInput, setLaserCodeInput] = useState<string>('');

  // Loss Configuration
  const [lossType, setLossType] = useState<'TOTAL' | 'PARTIAL'>('TOTAL');
  const [partialVolume, setPartialVolume] = useState<string>('5');
  const [selectedReason, setSelectedReason] = useState<string>('CONTAMINACAO');
  const [reasonDetails, setReasonDetails] = useState<string>('');
  const [targetKegStatus, setTargetKegStatus] = useState<'VAZIO_SUJO' | 'MANUTENCAO' | 'INATIVO'>('VAZIO_SUJO');
  const [notes, setNotes] = useState<string>('');

  // Execution & Feedback
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Recent Loss History
  const [recentLosses, setRecentLosses] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const fetchLossHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/kegs/loss');
      if (res.ok) {
        const data = await res.json();
        setRecentLosses(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchLossHistory();
  }, []);

  // Filter kegs that currently have beer or are in stock
  const kegsWithBeer = useMemo(() => {
    return kegs.filter((k) => {
      const vol = k.currentVolumeLiters !== null && k.currentVolumeLiters !== undefined
        ? k.currentVolumeLiters
        : (['EM_ESTOQUE', 'ENVASADO', 'NO_CLIENTE'].includes(k.status) ? k.capacity : 0);
      return vol > 0;
    });
  }, [kegs]);

  // Filtered list for selector
  const filteredKegs = useMemo(() => {
    if (!searchFilter.trim()) return kegsWithBeer;
    const q = searchFilter.toLowerCase();
    return kegsWithBeer.filter(
      (k) => k.code.toLowerCase().includes(q) || (k.currentBeerName || '').toLowerCase().includes(q)
    );
  }, [kegsWithBeer, searchFilter]);

  // Selected Keg object
  const selectedKeg = useMemo(() => {
    return kegs.find((k) => k.id === selectedKegId) || null;
  }, [kegs, selectedKegId]);

  // Current volume of selected keg
  const currentAvailableVol = useMemo(() => {
    if (!selectedKeg) return 0;
    return selectedKeg.currentVolumeLiters !== null && selectedKeg.currentVolumeLiters !== undefined
      ? selectedKeg.currentVolumeLiters
      : (['EM_ESTOQUE', 'ENVASADO', 'NO_CLIENTE'].includes(selectedKeg.status) ? selectedKeg.capacity : 0);
  }, [selectedKeg]);

  // Calculated lost volume and remaining volume
  const lostLiters = useMemo(() => {
    if (!selectedKeg) return 0;
    if (lossType === 'TOTAL') return currentAvailableVol;
    const p = parseFloat(partialVolume) || 0;
    return Math.min(currentAvailableVol, Math.max(0, p));
  }, [selectedKeg, lossType, currentAvailableVol, partialVolume]);

  const remainingLiters = useMemo(() => {
    return Math.max(0, currentAvailableVol - lostLiters);
  }, [currentAvailableVol, lostLiters]);

  // Handle laser code direct scan or input
  const handleLaserCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = laserCodeInput.trim().toUpperCase();
    if (!clean) return;
    const found = kegs.find((k) => k.code.toUpperCase() === clean);
    if (found) {
      setSelectedKegId(found.id);
      setLaserCodeInput('');
      setFeedback(null);
    } else {
      setFeedback({ type: 'error', text: `Barril com código "${clean}" não encontrado.` });
    }
  };

  // Submit loss
  const handleSubmitLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKeg) {
      setFeedback({ type: 'error', text: 'Selecione o barril que sofreu a perda.' });
      return;
    }
    if (lostLiters <= 0) {
      setFeedback({ type: 'error', text: 'O volume de perda deve ser maior que zero.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/kegs/loss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kegId: selectedKeg.id,
          lossType,
          volumeLiters: lostLiters,
          reason: selectedReason,
          reasonDetails,
          targetKegStatus,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar perda');

      setFeedback({
        type: 'success',
        text: data.message || 'Perda registrada com sucesso!',
      });

      // Reset form
      setSelectedKegId('');
      setPartialVolume('5');
      setReasonDetails('');
      setNotes('');
      onSuccess();
      fetchLossHistory();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao registrar perda' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            Registro de Perda & Descarte de Chopp
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Registre perdas parciais (sangria, espuma, vazamentos) ou perdas totais (azedamento, contaminação, avarias) com rastreabilidade completa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form onSubmit={handleLaserCodeSubmit} className="relative flex items-center">
            <input
              type="text"
              value={laserCodeInput}
              onChange={(e) => setLaserCodeInput(e.target.value)}
              placeholder="Bipar barril (laser)..."
              className="px-3 py-1.5 pl-8 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-rose-500 w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          </form>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-300 text-rose-950 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form de Registro de Perda */}
        <form onSubmit={handleSubmitLoss} className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          {/* Step 1: Selecionar Barril */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
              1. Selecione o Barril que sofreu a perda:
            </label>
            <select
              value={selectedKegId}
              onChange={(e) => setSelectedKegId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            >
              <option value="">Selecione o barril com chopp...</option>
              {filteredKegs.map((k) => {
                const vol = k.currentVolumeLiters !== null && k.currentVolumeLiters !== undefined
                  ? k.currentVolumeLiters
                  : k.capacity;
                return (
                  <option key={k.id} value={k.id}>
                    {k.code} ({k.capacity}L) — {k.currentBeerName || 'Chopp'} ({vol}L disponíveis)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected Keg Preview Card */}
          {selectedKeg && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 animate-in fade-in text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                    {selectedKeg.code}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold">
                    {selectedKeg.currentBeerName || 'Chopp'}
                  </span>
                </div>
                <span className="font-black text-slate-700 dark:text-slate-300">
                  Capacidade: {selectedKeg.capacity}L
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Saldo Atual no Barril:</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {currentAvailableVol} Litros
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Lote Atual:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {selectedKeg.currentBatch?.batchNumber || 'Sem lote'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Tipo de Perda (Total vs Parcial) */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              2. Formato da Perda:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLossType('TOTAL')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  lossType === 'TOTAL'
                    ? 'bg-rose-500 text-slate-950 border-rose-600 shadow-sm font-black ring-2 ring-rose-300'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="font-black text-xs block">💥 Perda Total (Esvaziar Barril)</span>
                <span className={`text-[10px] block mt-0.5 ${lossType === 'TOTAL' ? 'text-slate-950/80 font-bold' : 'text-slate-500'}`}>
                  Descarte completo de todo o chopp ({currentAvailableVol}L). O barril fica vazio.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLossType('PARTIAL')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  lossType === 'PARTIAL'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-black ring-2 ring-amber-300'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="font-black text-xs block">📉 Perda Parcial (Apenas Litros)</span>
                <span className={`text-[10px] block mt-0.5 ${lossType === 'PARTIAL' ? 'text-slate-950/80 font-bold' : 'text-slate-500'}`}>
                  Desconta apenas os litros perdidos. O barril permanece em estoque com a sobra.
                </span>
              </button>
            </div>
          </div>

          {/* Seletor de Litros se for Perda Parcial */}
          {lossType === 'PARTIAL' && (
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-3 animate-in fade-in text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 dark:text-amber-200">
                  Informe a quantidade de litros perdidos:
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={currentAvailableVol}
                    value={partialVolume}
                    onChange={(e) => setPartialVolume(e.target.value)}
                    className="w-24 px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-center font-black text-amber-950 dark:text-amber-200 text-sm"
                  />
                  <span className="font-black text-slate-600 dark:text-slate-400">Litros</span>
                </div>
              </div>

              {/* Quick Click Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 5, 10, 15, 20].map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={v > currentAvailableVol}
                    onClick={() => setPartialVolume(v.toString())}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] font-bold text-amber-900 dark:text-amber-300 disabled:opacity-40"
                  >
                    -{v}L
                  </button>
                ))}
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/40 rounded-lg flex items-center justify-between font-bold text-[11px]">
                <span className="text-slate-600 dark:text-slate-400">Cálculo de Saldo:</span>
                <span className="text-slate-900 dark:text-white">
                  {currentAvailableVol}L - {lostLiters}L = <strong className="text-emerald-600 dark:text-emerald-400 font-black">{remainingLiters.toFixed(1)}L restantes</strong>
                </span>
              </div>
            </div>
          )}

          {/* Destino do Barril se for Perda Total */}
          {lossType === 'TOTAL' && (
            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-2 animate-in fade-in text-xs">
              <label className="font-bold text-rose-950 dark:text-rose-200 block">
                Destino do vasilhame de inox após o esvaziamento:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetKegStatus('VAZIO_SUJO')}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    targetKegStatus === 'VAZIO_SUJO'
                      ? 'bg-rose-500 text-slate-950 border-rose-600 font-black shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="block font-bold">🧼 Vazio / Sujo</span>
                  <span className={`text-[10px] block ${targetKegStatus === 'VAZIO_SUJO' ? 'text-slate-950/80 font-semibold' : 'text-slate-500'}`}>
                    Para lavar na CIP
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetKegStatus('MANUTENCAO')}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    targetKegStatus === 'MANUTENCAO'
                      ? 'bg-rose-500 text-slate-950 border-rose-600 font-black shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="block font-bold">🛠️ Manutenção</span>
                  <span className={`text-[10px] block ${targetKegStatus === 'MANUTENCAO' ? 'text-slate-950/80 font-semibold' : 'text-slate-500'}`}>
                    Válvula/sifão avariado
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetKegStatus('INATIVO')}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    targetKegStatus === 'INATIVO'
                      ? 'bg-rose-500 text-slate-950 border-rose-600 font-black shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="block font-bold">🚫 Inativo / Baixa</span>
                  <span className={`text-[10px] block ${targetKegStatus === 'INATIVO' ? 'text-slate-950/80 font-semibold' : 'text-slate-500'}`}>
                    Vasilhame inutilizado
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Motivo da Perda */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              3. Motivo da Perda / Descarte:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LOSS_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReason(r.id)}
                  className={`p-2 rounded-xl text-left border text-xs font-bold transition-all flex items-center gap-2 ${
                    selectedReason === r.id
                      ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">{r.icon}</span>
                  <span className="truncate">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Observações / Detalhes */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Observações / Justificativa detalhada (opcional):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Identificado off-flavor ácido no lote; Válvula sifão amassada durante transporte..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Botão de Confirmação */}
          <button
            type="submit"
            disabled={submitting || !selectedKeg || lostLiters <= 0}
            className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <TrendingDown className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
            <span>Confirmar Registro de Perda ({lostLiters} Litros)</span>
          </button>
        </form>

        {/* Right Column: Histórico Recente de Perdas na Cervejaria */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-rose-600" />
                Auditoria de Perdas Recentes
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Últimos registros de descarte e perda na cervejaria
              </p>
            </div>
            <button
              onClick={fetchLossHistory}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
              title="Atualizar histórico"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {recentLosses.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
              <TrendingDown className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Nenhum registro de perda recente
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Todas as perdas parciais ou totais registradas aparecerão listadas aqui para controle e auditoria.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {recentLosses.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-slate-900 dark:text-white">
                        {item.keg?.code || 'Barril'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-black text-[10px]">
                        -{item.volumeLiters}L
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {item.notes || 'Perda registrada no barril'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Usuário: {item.userName || 'Sistema'}</span>
                    <span>Novo status: <strong>{item.toStatus}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
