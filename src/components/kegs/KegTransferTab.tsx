'use client';

import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Cylinder,
  Layers,
  Search,
} from 'lucide-react';

interface Keg {
  id: string;
  code: string;
  capacity: number;
  currentVolumeLiters?: number | null;
  status: string;
  currentBeerName?: string | null;
  currentBatch?: { batchNumber: string; recipe?: { name: string } } | null;
}

interface KegTransferTabProps {
  kegs: Keg[];
  onSuccess: () => void;
}

export default function KegTransferTab({ kegs, onSuccess }: KegTransferTabProps) {
  // Target Keg (Receptor)
  const [targetKegId, setTargetKegId] = useState<string>('');
  const [targetSearch, setTargetSearch] = useState<string>('');

  // Source Kegs (Doadores): list of { kegId, volumeLiters }
  const [sourceItems, setSourceItems] = useState<Array<{ kegId: string; volumeLiters: number }>>([]);
  const [selectedSourceToAdd, setSelectedSourceToAdd] = useState<string>('');

  // Blend Settings
  const [isBlend, setIsBlend] = useState<boolean>(false);
  const [customBeerName, setCustomBeerName] = useState<string>('');
  const [customBatchNumber, setCustomBatchNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Execution State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Available Target Kegs: preferably empty, sanitized, or partially full
  const availableTargetKegs = useMemo(() => {
    return kegs.filter((k) => {
      // Exclude kegs already in sources
      if (sourceItems.some((s) => s.kegId === k.id)) return false;
      if (targetSearch.trim()) {
        const q = targetSearch.toLowerCase();
        return k.code.toLowerCase().includes(q) || (k.currentBeerName || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [kegs, sourceItems, targetSearch]);

  // Selected Target Keg Object
  const targetKeg = useMemo(() => {
    return kegs.find((k) => k.id === targetKegId) || null;
  }, [kegs, targetKegId]);

  // Available Source Kegs (must have beer/volume)
  const availableSourceKegs = useMemo(() => {
    return kegs.filter((k) => {
      if (k.id === targetKegId) return false;
      if (sourceItems.some((s) => s.kegId === k.id)) return false;
      const vol = k.currentVolumeLiters !== null && k.currentVolumeLiters !== undefined
        ? k.currentVolumeLiters
        : (['EM_ESTOQUE', 'ENVASADO', 'NO_CLIENTE'].includes(k.status) ? k.capacity : 0);
      return vol > 0;
    });
  }, [kegs, targetKegId, sourceItems]);

  // Total volume being transferred
  const totalTransferVolume = useMemo(() => {
    return sourceItems.reduce((acc, item) => acc + (item.volumeLiters || 0), 0);
  }, [sourceItems]);

  const targetCapacity = targetKeg ? targetKeg.capacity : 50;
  const isOverCapacity = totalTransferVolume > targetCapacity;
  const fillPercentage = Math.min(100, Math.round((totalTransferVolume / targetCapacity) * 100));

  // Add a source keg to the transfer list
  const handleAddSource = (kegId: string) => {
    if (!kegId) return;
    const keg = kegs.find((k) => k.id === kegId);
    if (!keg) return;

    const availableVol = keg.currentVolumeLiters !== null && keg.currentVolumeLiters !== undefined
      ? keg.currentVolumeLiters
      : (['EM_ESTOQUE', 'ENVASADO', 'NO_CLIENTE'].includes(keg.status) ? keg.capacity : 0);

    setSourceItems((prev) => [...prev, { kegId, volumeLiters: availableVol }]);
    setSelectedSourceToAdd('');

    // If more than 1 beer style, suggest blend
    if (sourceItems.length >= 1 && !isBlend) {
      const firstKeg = kegs.find((k) => k.id === sourceItems[0].kegId);
      if (firstKeg && firstKeg.currentBeerName !== keg.currentBeerName) {
        setIsBlend(true);
        if (!customBeerName) {
          setCustomBeerName(`Blend ${firstKeg.currentBeerName || 'Chopp'} + ${keg.currentBeerName || 'Chopp'}`);
        }
      }
    }
  };

  const handleRemoveSource = (index: number) => {
    setSourceItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSourceVolume = (index: number, newVol: number) => {
    setSourceItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], volumeLiters: Math.max(0.1, newVol) };
      return copy;
    });
  };

  // Submit transfer
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetKegId) {
      setFeedback({ type: 'error', text: 'Selecione o barril de destino da trasfega' });
      return;
    }
    if (sourceItems.length === 0) {
      setFeedback({ type: 'error', text: 'Adicione ao menos um barril de origem' });
      return;
    }
    if (isOverCapacity) {
      setFeedback({
        type: 'error',
        text: `O volume total (${totalTransferVolume}L) excede a capacidade do barril destino (${targetCapacity}L)! Ajuste as litragens.`,
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        targetKegId,
        sourceKegs: sourceItems.map((s) => ({
          kegId: s.kegId,
          volumeLiters: s.volumeLiters,
        })),
        isBlend,
        beerName: isBlend ? customBeerName : undefined,
        batchNumber: isBlend ? customBatchNumber : undefined,
        notes,
      };

      const res = await fetch('/api/kegs/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar trasfega');

      setFeedback({
        type: 'success',
        text: data.message || 'Transferência realizada com sucesso!',
      });

      // Reset form
      setTargetKegId('');
      setSourceItems([]);
      setIsBlend(false);
      setCustomBeerName('');
      setCustomBatchNumber('');
      setNotes('');

      onSuccess();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Intro Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-600" />
            Trasfega & Blends entre Barris
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Junte sobras de barris para fazer um cheio, consolide volumes ou crie blends exclusivos com nome e lote personalizados.
          </p>
        </div>

        {/* Quick Toggle Blend */}
        <label className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-xl cursor-pointer text-xs font-black text-amber-950 dark:text-amber-200">
          <input
            type="checkbox"
            checked={isBlend}
            onChange={(e) => setIsBlend(e.target.checked)}
            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
          />
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Ativar Modo Criação de Blend</span>
        </label>
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

      <form onSubmit={handleExecuteTransfer} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Barris de Origem (Doadores) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Cylinder className="w-4 h-4 text-amber-600" />
                1. Barris de Origem (De onde sai o chopp)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecione os barris com sobras ou lotes que serão transferidos
              </p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {sourceItems.length} selecionado(s)
            </span>
          </div>

          {/* Add Source Input / Dropdown */}
          <div className="flex gap-2">
            <select
              value={selectedSourceToAdd}
              onChange={(e) => {
                setSelectedSourceToAdd(e.target.value);
                if (e.target.value) handleAddSource(e.target.value);
              }}
              className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">+ Selecionar barril com chopp para transferir...</option>
              {availableSourceKegs.map((k) => {
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

          {/* Source List */}
          {sourceItems.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
              <Cylinder className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Nenhum barril de origem adicionado
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Escolha um ou mais barris no seletor acima para compor a trasfega ou blend.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sourceItems.map((item, idx) => {
                const keg = kegs.find((k) => k.id === item.kegId);
                if (!keg) return null;
                const maxVol = keg.currentVolumeLiters !== null && keg.currentVolumeLiters !== undefined
                  ? keg.currentVolumeLiters
                  : keg.capacity;

                return (
                  <div
                    key={item.kegId}
                    className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          {keg.code}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold truncate max-w-[150px]">
                          {keg.currentBeerName || 'Chopp'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                        Disponível: {maxVol}L • Lote: {keg.currentBatch?.batchNumber || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Usar:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max={maxVol}
                          value={item.volumeLiters}
                          onChange={(e) => handleUpdateSourceVolume(idx, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-black text-slate-900 dark:text-white text-xs"
                        />
                        <span className="font-bold text-slate-500">L</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSource(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        title="Remover da lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sum Banner */}
          {sourceItems.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-amber-900 dark:text-amber-300">
                Volume Total Extraído:
              </span>
              <span className="font-black text-sm text-amber-950 dark:text-amber-100">
                {totalTransferVolume.toFixed(1)} Litros
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Barril de Destino (Receptor) & Blend Info */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4 text-emerald-600" />
              2. Barril de Destino (Para onde vai o chopp)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Escolha o barril receptor que receberá o chope consolidado ou o blend
            </p>
          </div>

          {/* Target Keg Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Selecione o Barril Receptor:
            </label>
            <select
              value={targetKegId}
              onChange={(e) => setTargetKegId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="">Selecione o barril de destino...</option>
              {availableTargetKegs.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.code} ({k.capacity}L) — {k.status === 'HIGIENIZADO' ? 'Higienizado (Pronto)' : k.status === 'VAZIO_SUJO' ? 'Vazio' : k.status} {k.currentBeerName ? `[${k.currentBeerName}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Target Visual Fill Progress */}
          {targetKeg && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-700 dark:text-slate-300">
                  Capacidade: {targetCapacity}L (Barril {targetKeg.code})
                </span>
                <span
                  className={`font-black ${
                    isOverCapacity ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {totalTransferVolume}L / {targetCapacity}L ({fillPercentage}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isOverCapacity ? 'bg-rose-500' : fillPercentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, fillPercentage)}%` }}
                />
              </div>

              {isOverCapacity && (
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-[11px] pt-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Atenção: O volume ultrapassa a litragem do barril receptor!</span>
                </div>
              )}
            </div>
          )}

          {/* Blend Configuration Form (Conditional) */}
          {isBlend && (
            <div className="p-4 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-3 animate-in fade-in text-xs">
              <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-300 font-black">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Configurações do Novo Blend</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-purple-950 dark:text-purple-200 block mb-1">
                  Nome do Blend / Nova Cerveja: *
                </label>
                <input
                  type="text"
                  value={customBeerName}
                  onChange={(e) => setCustomBeerName(e.target.value)}
                  placeholder="Ex: Blend Imperial Oak 2026"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  required={isBlend}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-purple-950 dark:text-purple-200 block mb-1">
                  Identificador de Lote do Blend:
                </label>
                <input
                  type="text"
                  value={customBatchNumber}
                  onChange={(e) => setCustomBatchNumber(e.target.value)}
                  placeholder="Ex: BLEND-01 ou BL-2026"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white uppercase"
                />
              </div>
            </div>
          )}

          {/* Optional Brewer's Notes */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
              Observações da Trasfega / Blend:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Trasfega de sobras de evento ou lote especial para maturação em madeira..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !targetKegId || sourceItems.length === 0 || isOverCapacity}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-98 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
            <span>
              {submitting
                ? 'Executando Trasfega...'
                : isBlend
                ? '✨ Concluir Criação do Blend'
                : 'Concluir Transferência de Chopp'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
