'use client';

import React, { useState, useMemo } from 'react';
import {
  Zap,
  Beer,
  Cylinder,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  Plus,
  Trash2,
  Sliders,
  Check,
  Package,
  Search,
  Sparkles,
} from 'lucide-react';

interface Keg {
  id: string;
  code: string;
  capacity: number;
  currentVolumeLiters?: number | null;
  status: string;
  currentBeerName?: string | null;
  currentBatch?: {
    batchNumber?: string;
  } | null;
}

interface KegQuickFillTabProps {
  kegs: Keg[];
  onSuccess: () => void;
}

export default function KegQuickFillTab({ kegs, onSuccess }: KegQuickFillTabProps) {
  // Source Selection Mode: 'STOCK' (from current inventory) vs 'CUSTOM' (new or manual)
  const [sourceMode, setSourceMode] = useState<'STOCK' | 'CUSTOM'>('STOCK');
  const [selectedStockKey, setSelectedStockKey] = useState<string>('');
  const [stockSearchTerm, setStockSearchTerm] = useState<string>('');

  // Product & Batch definition
  const [beerName, setBeerName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [isPartial, setIsPartial] = useState(false);
  const [customVolume, setCustomVolume] = useState('35');
  const [notes, setNotes] = useState('');

  // Selected or scanned codes
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [inputCode, setInputCode] = useState('');

  // Execution state
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group beers currently in stock by name + batch
  const stockBeers = useMemo(() => {
    const map = new Map<
      string,
      {
        beerName: string;
        batchNumber: string;
        kegCount: number;
        totalVolume: number;
        capacities: number[];
      }
    >();

    kegs.forEach((k) => {
      if (['EM_ESTOQUE', 'ENVASADO'].includes(k.status) && k.currentBeerName) {
        const bName = k.currentBeerName.trim();
        const bNum = k.currentBatch?.batchNumber || '';
        const key = `${bName}:::${bNum}`;
        const vol = k.currentVolumeLiters !== null && k.currentVolumeLiters !== undefined
          ? k.currentVolumeLiters
          : k.capacity;

        if (!map.has(key)) {
          map.set(key, {
            beerName: bName,
            batchNumber: bNum,
            kegCount: 1,
            totalVolume: vol,
            capacities: [k.capacity],
          });
        } else {
          const item = map.get(key)!;
          item.kegCount += 1;
          item.totalVolume += vol;
          if (!item.capacities.includes(k.capacity)) {
            item.capacities.push(k.capacity);
          }
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalVolume - a.totalVolume);
  }, [kegs]);

  // Filter stock beers by search term
  const filteredStockBeers = useMemo(() => {
    if (!stockSearchTerm.trim()) return stockBeers;
    const term = stockSearchTerm.toLowerCase();
    return stockBeers.filter(
      (b) =>
        b.beerName.toLowerCase().includes(term) ||
        b.batchNumber.toLowerCase().includes(term)
    );
  }, [stockBeers, stockSearchTerm]);

  // Distinct beer names already in system for quick suggestions
  const suggestedBeerNames = useMemo(() => {
    const set = new Set<string>();
    kegs.forEach((k) => {
      if (k.currentBeerName) set.add(k.currentBeerName);
    });
    return Array.from(set).slice(0, 8);
  }, [kegs]);

  // Empty or sanitized kegs available for quick fill
  const availableKegs = useMemo(() => {
    return kegs.filter((k) => ['HIGIENIZADO', 'VAZIO_SUJO'].includes(k.status));
  }, [kegs]);

  const handleAddCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;

    if (scannedCodes.includes(clean)) {
      setFeedback({ type: 'error', text: `Barril ${clean} já está na lista de envase!` });
      setInputCode('');
      return;
    }

    setScannedCodes((prev) => [...prev, clean]);
    setInputCode('');
    setFeedback(null);
  };

  const handleToggleKegSelect = (code: string) => {
    if (scannedCodes.includes(code)) {
      setScannedCodes((prev) => prev.filter((c) => c !== code));
    } else {
      setScannedCodes((prev) => [...prev, code]);
    }
  };

  const handleRemoveCode = (code: string) => {
    setScannedCodes((prev) => prev.filter((c) => c !== code));
  };

  const handleExecuteQuickFill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beerName.trim()) {
      setFeedback({ type: 'error', text: 'Informe o nome da cerveja / chopp para o envase' });
      return;
    }
    if (scannedCodes.length === 0) {
      setFeedback({ type: 'error', text: 'Adicione ou selecione ao menos um barril para envasar' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        kegCodes: scannedCodes,
        beerName: beerName.trim(),
        batchNumber: batchNumber.trim() || undefined,
        volumeLiters: isPartial ? parseFloat(customVolume) : undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/kegs/quick-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar envase rápido');

      setFeedback({
        type: 'success',
        text: data.message || `${scannedCodes.length} barril(is) envasado(s) com sucesso!`,
      });

      // Clear scanned list
      setScannedCodes([]);
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
            <Zap className="w-5 h-5 text-amber-600 fill-current" />
            Envase Rápido & Ajuste de Chopp (Sem Brassagem)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Ideal para envasar chopp de cervejarias terceiras, parcerias ciganas, ajuste de furo de inventário ou lotes legados.
          </p>
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

      <form onSubmit={handleExecuteQuickFill} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Info & Configuration */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Beer className="w-4 h-4 text-purple-600" />
                1. Dados do Chopp / Cerveja
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecione uma cerveja já disponível no estoque ou cadastre um novo chopp avulso
              </p>
            </div>

            {/* Mode Switcher: Stock vs Custom */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSourceMode('STOCK')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-black transition-all ${
                  sourceMode === 'STOCK'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Cervejas em Estoque ({stockBeers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceMode('CUSTOM');
                  setSelectedStockKey('');
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-black transition-all ${
                  sourceMode === 'CUSTOM'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nova / Digitação Livre</span>
              </button>
            </div>
          </div>

          {/* STOCK MODE: Beer Picker */}
          {sourceMode === 'STOCK' && (
            <div className="space-y-2.5">
              {stockBeers.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-center space-y-2">
                  <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                    Nenhuma cerveja com barris atualmente em estoque encontrada (status Envasado ou Em Estoque).
                  </p>
                  <button
                    type="button"
                    onClick={() => setSourceMode('CUSTOM')}
                    className="text-xs font-black text-amber-700 dark:text-amber-300 underline hover:text-amber-900"
                  >
                    Alternar para digitação livre →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Escolha a cerveja para envasar mais barris:
                    </span>
                    {stockBeers.length > 3 && (
                      <div className="relative w-44">
                        <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={stockSearchTerm}
                          onChange={(e) => setStockSearchTerm(e.target.value)}
                          placeholder="Filtrar cerveja..."
                          className="w-full pl-6 pr-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Stock Beers List */}
                  <div className="max-h-52 overflow-y-auto pr-1 space-y-1.5">
                    {filteredStockBeers.length === 0 ? (
                      <p className="text-center py-4 text-xs text-slate-400">
                        Nenhuma cerveja corresponde à pesquisa.
                      </p>
                    ) : (
                      filteredStockBeers.map((b) => {
                        const key = `${b.beerName}:::${b.batchNumber}`;
                        const isSelected = selectedStockKey === key;
                        return (
                          <div
                            key={key}
                            onClick={() => {
                              setSelectedStockKey(key);
                              setBeerName(b.beerName);
                              setBatchNumber(b.batchNumber);
                            }}
                            className={`p-2.5 rounded-xl cursor-pointer transition-all border text-left ${
                              isSelected
                                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 dark:border-purple-600 ring-1 ring-purple-400/50 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/80 hover:border-purple-300 dark:hover:border-purple-800 hover:bg-purple-50/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                  }`}
                                >
                                  {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Beer className="w-3.5 h-3.5" />}
                                </div>
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                                      {b.beerName}
                                    </p>
                                    {b.batchNumber ? (
                                      <span className="font-mono font-bold text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 shrink-0">
                                        Lote: {b.batchNumber}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-slate-400 shrink-0">(Sem lote)</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                                    <span className="font-bold text-purple-700 dark:text-purple-300">
                                      {b.kegCount} barril{b.kegCount > 1 ? 'is' : ''}
                                    </span>
                                    <span>•</span>
                                    <span>{b.totalVolume}L totais</span>
                                    <span>•</span>
                                    <span>[{b.capacities.map((c) => `${c}L`).join(', ')}]</span>
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 transition-all ${
                                  isSelected
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {isSelected ? '✓ Selecionada' : 'Adicionar Desta'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {selectedStockKey && (
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/80 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
                      <span className="font-bold flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        Cerveja do estoque vinculada! Você pode ajustar os campos abaixo se desejar.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStockKey('');
                          setBeerName('');
                          setBatchNumber('');
                        }}
                        className="text-[10px] text-emerald-700 dark:text-emerald-300 hover:underline font-bold shrink-0 ml-2"
                      >
                        Limpar seleção
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form Inputs (Used by both modes, pre-filled when in Stock Mode) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {/* Beer Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Nome da Cerveja / Chopp: *
                </label>
                {sourceMode === 'STOCK' && selectedStockKey && (
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                    Preenchido a partir do estoque
                  </span>
                )}
              </div>
              <input
                type="text"
                value={beerName}
                onChange={(e) => {
                  setBeerName(e.target.value);
                  if (selectedStockKey) setSelectedStockKey('');
                }}
                placeholder="Ex: Pilsen Especial, IPA Terceirizada, etc."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />

              {/* Quick Suggestions in CUSTOM mode */}
              {sourceMode === 'CUSTOM' && suggestedBeerNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 self-center">Sugestões recentes:</span>
                  {suggestedBeerNames.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setBeerName(s)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:text-amber-900 dark:hover:text-amber-300 transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Batch Identifier */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Identificador de Lote (Opcional):
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="Ex: AJUSTE-01, LOT-EXT-2026, etc."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Volume Option */}
          <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-2 text-xs">
            <label className="flex items-center gap-2 font-black text-purple-950 dark:text-purple-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isPartial}
                onChange={(e) => setIsPartial(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <span>Envase com Litragem Parcial (Não preencher 100% da capacidade)</span>
            </label>

            {isPartial && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Volume real a envasar:</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={customVolume}
                  onChange={(e) => setCustomVolume(e.target.value)}
                  className="w-20 px-2.5 py-1 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg text-center font-black text-purple-950 dark:text-purple-200"
                />
                <span className="font-bold text-slate-600 dark:text-slate-400">Litros</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Observações / Motivo do Envase:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Chopp terceirizado da cervejaria X para evento de fim de semana..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Right Column: Barris Selecionados / Bipagem */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Cylinder className="w-4 h-4 text-amber-600" />
                2. Barris a Envasar ({scannedCodes.length})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Bipe com leitor USB/Bluetooth ou selecione os barris da lista
              </p>
            </div>
            {scannedCodes.length > 0 && (
              <button
                type="button"
                onClick={() => setScannedCodes([])}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </button>
            )}
          </div>

          {/* Manual / Laser Fast Input Form */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCode();
                  }
                }}
                placeholder="Bipe ou digite o código do barril..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCode}
              disabled={!inputCode.trim()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>

          {/* List of Scanned/Selected Codes */}
          <div className="min-h-[140px] max-h-[220px] overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            {scannedCodes.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Nenhum barril adicionado ainda. Bipe os códigos acima ou clique nos barris vazios abaixo.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {scannedCodes.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-black text-slate-900 dark:text-white shadow-2xs"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCode(c)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Selection Pills from Available Kegs */}
          {availableKegs.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Barris Vazios / Higienizados Disponíveis ({availableKegs.length}):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {availableKegs.slice(0, 20).map((k) => {
                  const selected = scannedCodes.includes(k.code);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => handleToggleKegSelect(k.code)}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                        selected
                          ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400 font-bold'
                      }`}
                    >
                      {k.code} ({k.capacity}L)
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting || !beerName.trim() || scannedCodes.length === 0}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-98 cursor-pointer mt-4"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>
              {submitting
                ? 'Gravando Envase...'
                : `Envasar ${scannedCodes.length} Barril(is) com "${beerName || '...'}"`}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
