'use client';

import React, { useState, useEffect } from 'react';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import {
  QrCode,
  Search,
  CheckCircle2,
  Truck,
  MapPin,
  RefreshCw,
  Sparkles,
  Beer,
  AlertCircle,
  Clock,
  User,
  ArrowRight,
  ListPlus,
  Trash2,
  Sliders,
  Wrench,
} from 'lucide-react';
import { KEG_STATUS_MAP, formatDate } from '@/lib/utils';
import KegTimelineModal from '@/components/kegs/KegTimelineModal';

type ScannerMode = 'LOOKUP' | 'FILL' | 'EXPEDITION' | 'DELIVER' | 'RETURN' | 'SANITIZE';

export default function ScannerPage() {
  const [mode, setMode] = useState<ScannerMode>('LOOKUP');
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [itemType, setItemType] = useState<'KEG' | 'EQUIPMENT' | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Dynamic context data
  const [batches, setBatches] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Envase Parcial Option
  const [isPartialFill, setIsPartialFill] = useState(false);
  const [fillVolumeLiters, setFillVolumeLiters] = useState('35');

  // Recolha Options (Vazio, Parcialmente Cheio ou Cheio Retornado ao Estoque)
  const [returnCondition, setReturnCondition] = useState<'VAZIO_SUJO' | 'PARCIALMENTE_CHEIO' | 'CHEIO_RETORNADO'>('VAZIO_SUJO');
  const [returnVolumeLiters, setReturnVolumeLiters] = useState('20');
  const [billingMode, setBillingMode] = useState<'FULL' | 'PARTIAL'>('FULL');

  // Scanned history list in batch mode
  const [batchScannedCodes, setBatchScannedCodes] = useState<string[]>([]);
  const [timelineOpen, setTimelineOpen] = useState(false);

  useEffect(() => {
    // Load active batches and clients
    fetch('/api/batches')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBatches(data);
          if (data.length > 0) setSelectedBatchId(data[0].id);
        }
      })
      .catch(() => {});

    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClients(data);
          if (data.length > 0) setSelectedClientId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleScan = async (code: string) => {
    if (!code) return;
    setLoading(true);
    setFeedbackMessage(null);

    try {
      if (mode === 'LOOKUP') {
        const res = await fetch('/api/kegs/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, action: 'LOOKUP' }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Código não encontrado');

        setScannedItem(data.item);
        setItemType(data.type);
      } else {
        // Direct Action Mode (FILL, SANITIZE, EXPEDITION, DELIVER, RETURN)
        const payload: any = {
          code,
          action: mode,
        };

        if (mode === 'FILL') {
          payload.batchId = selectedBatchId;
          if (isPartialFill && fillVolumeLiters) {
            payload.volumeLiters = parseFloat(fillVolumeLiters);
          }
        }

        if (mode === 'DELIVER') {
          payload.clientId = selectedClientId;
        }

        if (mode === 'RETURN') {
          payload.returnCondition = returnCondition;
          payload.billingMode = billingMode;
          if (returnCondition === 'PARCIALMENTE_CHEIO') {
            payload.returnVolumeLiters = parseFloat(returnVolumeLiters);
          }
        }

        const res = await fetch('/api/kegs/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao processar ação');

        setFeedbackMessage({ text: data.message, type: 'success' });
        setBatchScannedCodes((prev) => [code, ...prev.filter((c) => c !== code)]);
        setScannedItem(data.item);
        setItemType('KEG');
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err.message, type: 'error' });
      setScannedItem(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const info = KEG_STATUS_MAP[status] || { label: status, bg: 'bg-slate-100', color: 'text-slate-800', border: 'border-slate-200' };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${info.bg} ${info.color} ${info.border || 'border-transparent'}`}>
        {info.label}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-600 animate-pulse" />
            Scanner Móvel de Campo
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Leitura contínua na câmera para envase parcial, carga, entrega e recolha de chopeiras e barris
          </p>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <button
          onClick={() => { setMode('LOOKUP'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'LOOKUP'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800'
          }`}
        >
          <Search className={`w-4 h-4 ${mode === 'LOOKUP' ? 'text-slate-950 stroke-[2.5]' : 'text-amber-600'}`} />
          <span>Consultar</span>
        </button>

        <button
          onClick={() => { setMode('FILL'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'FILL'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800'
          }`}
        >
          <Beer className={`w-4 h-4 ${mode === 'FILL' ? 'text-slate-950 stroke-[2.5]' : 'text-purple-600'}`} />
          <span>Envase</span>
        </button>

        <button
          onClick={() => { setMode('EXPEDITION'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'EXPEDITION'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className={`w-4 h-4 ${mode === 'EXPEDITION' ? 'text-slate-950 stroke-[2.5]' : 'text-cyan-600'}`} />
          <span>Carga</span>
        </button>

        <button
          onClick={() => { setMode('DELIVER'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'DELIVER'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800'
          }`}
        >
          <MapPin className={`w-4 h-4 ${mode === 'DELIVER' ? 'text-slate-950 stroke-[2.5]' : 'text-emerald-600'}`} />
          <span>Entrega</span>
        </button>

        <button
          onClick={() => { setMode('RETURN'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'RETURN'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${mode === 'RETURN' ? 'text-slate-950 stroke-[2.5]' : 'text-orange-600'}`} />
          <span>Recolha</span>
        </button>

        <button
          onClick={() => { setMode('SANITIZE'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'SANITIZE'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${mode === 'SANITIZE' ? 'text-slate-950 stroke-[2.5]' : 'text-blue-600'}`} />
          <span>Lavar/CIP</span>
        </button>
      </div>

      {/* Context Options per Mode */}
      {mode === 'FILL' && (
        <div className="p-4 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-3 animate-in fade-in text-xs shadow-xs">
          <div>
            <label className="font-black text-purple-950 dark:text-purple-200 block mb-1">
              🍺 Selecione o Lote de Cerveja a Envasar:
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl font-bold text-slate-900 dark:text-white shadow-2xs"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.recipe?.name} ({b.batchNumber}) - {b.tank?.name || 'Tanque'} ({b.volumePlannedLiters}L)
                </option>
              ))}
            </select>
          </div>

          {/* Opção de Litragem Parcial */}
          <div className="p-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-2 shadow-2xs">
            <label className="flex items-center gap-2 font-black text-purple-950 dark:text-purple-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isPartialFill}
                onChange={(e) => setIsPartialFill(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <span>Envase Parcial (Barril não ficou totalmente cheio / Sobra de tanque)</span>
            </label>

            {isPartialFill && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Litros reais envasados:</span>
                <input
                  type="number"
                  step="0.5"
                  value={fillVolumeLiters}
                  onChange={(e) => setFillVolumeLiters(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-purple-50/50 dark:bg-slate-950 border border-purple-300 dark:border-purple-700 rounded-lg font-black text-center text-purple-950 dark:text-purple-200"
                />
                <span className="font-bold text-slate-600 dark:text-slate-400">Litros</span>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'RETURN' && (
        <div className="p-4 bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/60 rounded-2xl space-y-3 animate-in fade-in text-xs shadow-xs">
          <label className="font-black text-orange-950 dark:text-orange-200 block">
            🔄 Tipo de Recolha & Condição dos Vasilhames:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setReturnCondition('VAZIO_SUJO')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                returnCondition === 'VAZIO_SUJO'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-black ring-2 ring-amber-300'
                  : 'bg-white hover:bg-orange-50/50 border-orange-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
              }`}
            >
              <span className="font-black block">1. Vazio / Sujo</span>
              <span className={`text-[10px] block ${returnCondition === 'VAZIO_SUJO' ? 'text-slate-950/80 font-bold' : 'text-slate-500'}`}>
                Retorna para lavagem CIP
              </span>
            </button>

            <button
              type="button"
              onClick={() => setReturnCondition('PARCIALMENTE_CHEIO')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                returnCondition === 'PARCIALMENTE_CHEIO'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-black ring-2 ring-amber-300'
                  : 'bg-white hover:bg-orange-50/50 border-orange-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
              }`}
            >
              <span className="font-black block">2. Parcial / Sobra</span>
              <span className={`text-[10px] block ${returnCondition === 'PARCIALMENTE_CHEIO' ? 'text-slate-950/80 font-bold' : 'text-slate-500'}`}>
                Retorna cheio ao estoque
              </span>
            </button>

            <button
              type="button"
              onClick={() => setReturnCondition('CHEIO_RETORNADO')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                returnCondition === 'CHEIO_RETORNADO'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-black ring-2 ring-amber-300'
                  : 'bg-white hover:bg-orange-50/50 border-orange-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
              }`}
            >
              <span className="font-black block">3. Cheio (Intacto)</span>
              <span className={`text-[10px] block ${returnCondition === 'CHEIO_RETORNADO' ? 'text-slate-950/80 font-bold' : 'text-slate-500'}`}>
                Não utilizado pelo cliente
              </span>
            </button>
          </div>

          {returnCondition === 'PARCIALMENTE_CHEIO' && (
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800/60 rounded-2xl space-y-3 animate-in fade-in shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-900 dark:text-white font-black text-xs">Litros restantes no barril:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={returnVolumeLiters}
                  onChange={(e) => setReturnVolumeLiters(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-orange-50/50 dark:bg-slate-950 border border-orange-300 dark:border-orange-700 rounded-xl font-black text-center text-orange-950 dark:text-orange-200 text-xs"
                />
                <span className="font-bold text-slate-600 dark:text-slate-400 text-xs">Litros</span>
              </div>

              {/* Pergunta de Cobrança do Cliente no Pedido */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  💳 Cobrança do Cliente no Pedido:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingMode('FULL')}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      billingMode === 'FULL'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-300 font-black shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-black text-xs">🧾 Cobrar Barril Inteiro (100%)</span>
                    </div>
                    <span className={`text-[10px] block leading-tight ${billingMode === 'FULL' ? 'text-slate-950/80 font-semibold' : 'text-slate-500'}`}>
                      O cliente paga o valor integral do barril (padrão em eventos onde o barril foi aberto).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingMode('PARTIAL')}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      billingMode === 'PARTIAL'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-600 ring-2 ring-emerald-300 font-black shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-black text-xs">💰 Cobrar Apenas Consumo Parcial</span>
                    </div>
                    <span className={`text-[10px] block leading-tight ${billingMode === 'PARTIAL' ? 'text-slate-950/80 font-semibold' : 'text-slate-500'}`}>
                      Calcula os litros consumidos e desconta os litros que voltaram no pedido.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-orange-900 dark:text-orange-300 font-bold">
            💡 Dica: Você também pode bipar <strong>Chopeiras e Cilindros de CO2</strong> continuamente aqui para dar baixa e retornar ao pátio!
          </p>
        </div>
      )}

      {mode === 'DELIVER' && (
        <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-2 animate-in fade-in shadow-xs">
          <label className="text-xs font-black text-emerald-950 dark:text-emerald-200 block">
            📍 Selecione o Cliente de Destino da Entrega:
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white shadow-2xs"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName || c.name} - {c.city || 'Sem cidade'} ({c.retainedKegsCount} barris em posse)
              </option>
            ))}
          </select>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">
            Ao bipar, o barril ou chopeira é transferido para a custódia do cliente.
          </p>
        </div>
      )}

      {/* Camera Barcode Scanner Viewport */}
      <BarcodeScanner onScan={handleScan} isProcessing={loading} storageKey="pinttech_scanner_pwa_collapsed" />

      {/* Live Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-sm animate-in slide-in-from-top-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-300 text-rose-950 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Scanned Item Detailed Card */}
      {scannedItem && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {itemType === 'KEG' ? `BARRIL ${scannedItem.capacity}L` : 'EQUIPAMENTO'}
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{scannedItem.code}</h3>
            </div>
            {getStatusBadge(scannedItem.status)}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {scannedItem.currentBeerName && (
              <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 block">Cerveja no Barril</span>
                <span className="text-sm font-black text-purple-950 dark:text-purple-100">{scannedItem.currentBeerName}</span>
                <span className="text-[11px] font-black text-purple-900 dark:text-purple-300 block mt-0.5">
                  Volume: {scannedItem.currentVolumeLiters || scannedItem.capacity} Litros
                </span>
                {scannedItem.currentBatch && (
                  <span className="text-[10px] text-purple-700 dark:text-purple-400 block mt-0.5 font-mono font-semibold">
                    Lote: {scannedItem.currentBatch.batchNumber}
                  </span>
                )}
              </div>
            )}

            {scannedItem.currentClient && (
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 block">Cliente Atual</span>
                <span className="text-sm font-black text-amber-950 dark:text-amber-100">
                  {scannedItem.currentClient.tradeName || scannedItem.currentClient.name}
                </span>
                <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80 block mt-0.5 font-medium">
                  {scannedItem.currentClient.city || ''}
                </span>
              </div>
            )}
          </div>

          {scannedItem.notes && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Observações:</span>
              {scannedItem.notes}
            </div>
          )}

          {/* Action buttons inside lookup */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setTimelineOpen(true)}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs"
            >
              <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Ver Linha do Tempo
            </button>
          </div>
        </div>
      )}

      {/* Batch Scanned History List */}
      {batchScannedCodes.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <ListPlus className="w-4 h-4 text-amber-600" />
              Bipes Recentes nesta Sessão ({batchScannedCodes.length})
            </h4>
            <button
              onClick={() => setBatchScannedCodes([])}
              className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {batchScannedCodes.map((c) => (
              <span
                key={c}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {scannedItem && (
        <KegTimelineModal
          isOpen={timelineOpen}
          onClose={() => setTimelineOpen(false)}
          kegCode={scannedItem.code}
          kegCapacity={scannedItem.capacity || 50}
          movements={scannedItem.movements || []}
        />
      )}
    </div>
  );
}
