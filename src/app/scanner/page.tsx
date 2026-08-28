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
    const info = KEG_STATUS_MAP[status] || { label: status, bg: 'bg-slate-100', color: 'text-slate-800' };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${info.bg} ${info.color}`}>
        {info.label}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-600 animate-pulse" />
            Scanner Móvel de Campo
          </h1>
          <p className="text-xs text-slate-500">
            Leitura contínua na câmera para envase parcial, carga, entrega e recolha de chopeiras e barris
          </p>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl">
        <button
          onClick={() => { setMode('LOOKUP'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'LOOKUP' ? 'bg-white text-slate-900 shadow-md font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4 text-amber-600" />
          <span>Consultar</span>
        </button>

        <button
          onClick={() => { setMode('FILL'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'FILL' ? 'bg-white text-slate-900 shadow-md font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Beer className="w-4 h-4 text-purple-600" />
          <span>Envase</span>
        </button>

        <button
          onClick={() => { setMode('EXPEDITION'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'EXPEDITION' ? 'bg-white text-slate-900 shadow-md font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 text-cyan-600" />
          <span>Carga</span>
        </button>

        <button
          onClick={() => { setMode('DELIVER'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'DELIVER' ? 'bg-white text-slate-900 shadow-md font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>Entrega</span>
        </button>

        <button
          onClick={() => { setMode('RETURN'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'RETURN' ? 'bg-white text-slate-900 shadow-md font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <RefreshCw className="w-4 h-4 text-orange-600" />
          <span>Recolha</span>
        </button>

        <button
          onClick={() => { setMode('SANITIZE'); setFeedbackMessage(null); }}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
            mode === 'SANITIZE' ? 'bg-white text-slate-900 shadow-md font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Lavar/CIP</span>
        </button>
      </div>

      {/* Context Options per Mode */}
      {mode === 'FILL' && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-3 animate-in fade-in text-xs">
          <div>
            <label className="font-bold text-purple-900 block mb-1">
              🍺 Selecione o Lote de Cerveja a Envasar:
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full p-2.5 bg-white border border-purple-300 rounded-xl font-bold text-slate-800"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.recipe?.name} ({b.batchNumber}) - {b.tank?.name || 'Tanque'} ({b.volumePlannedLiters}L)
                </option>
              ))}
            </select>
          </div>

          {/* Opção de Litragem Parcial */}
          <div className="p-3 bg-white border border-purple-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2 font-bold text-purple-950 cursor-pointer">
              <input
                type="checkbox"
                checked={isPartialFill}
                onChange={(e) => setIsPartialFill(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <span>Envase Parcial (Barril não ficou totalmente cheio / Sobra de tanque)</span>
            </label>

            {isPartialFill && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                <span className="text-slate-600 font-semibold">Litros reais envasados:</span>
                <input
                  type="number"
                  step="0.5"
                  value={fillVolumeLiters}
                  onChange={(e) => setFillVolumeLiters(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-slate-50 border border-purple-300 rounded-lg font-black text-center text-purple-900"
                />
                <span className="font-bold text-slate-500">Litros</span>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'RETURN' && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-3 animate-in fade-in text-xs">
          <label className="font-bold text-orange-950 block">
            🔄 Tipo de Recolha & Condição dos Vasilhames:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setReturnCondition('VAZIO_SUJO')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                returnCondition === 'VAZIO_SUJO'
                  ? 'bg-white border-orange-400 shadow-sm font-bold text-orange-950 ring-2 ring-orange-300'
                  : 'bg-orange-100/50 border-orange-200 text-orange-800'
              }`}
            >
              <span className="font-black block">1. Vazio / Sujo</span>
              <span className="text-[10px] text-orange-700">Retorna para lavagem CIP</span>
            </button>

            <button
              type="button"
              onClick={() => setReturnCondition('PARCIALMENTE_CHEIO')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                returnCondition === 'PARCIALMENTE_CHEIO'
                  ? 'bg-white border-orange-400 shadow-sm font-bold text-orange-950 ring-2 ring-orange-300'
                  : 'bg-orange-100/50 border-orange-200 text-orange-800'
              }`}
            >
              <span className="font-black block">2. Parcial / Sobra</span>
              <span className="text-[10px] text-orange-700">Retorna cheio ao estoque</span>
            </button>

            <button
              type="button"
              onClick={() => setReturnCondition('CHEIO_RETORNADO')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                returnCondition === 'CHEIO_RETORNADO'
                  ? 'bg-white border-orange-400 shadow-sm font-bold text-orange-950 ring-2 ring-orange-300'
                  : 'bg-orange-100/50 border-orange-200 text-orange-800'
              }`}
            >
              <span className="font-black block">3. Cheio (Intacto)</span>
              <span className="text-[10px] text-orange-700">Não utilizado pelo cliente</span>
            </button>
          </div>

          {returnCondition === 'PARCIALMENTE_CHEIO' && (
            <div className="p-3.5 bg-white border border-orange-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-black text-xs">Litros restantes no barril:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={returnVolumeLiters}
                  onChange={(e) => setReturnVolumeLiters(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-slate-50 border border-orange-300 rounded-xl font-black text-center text-orange-950 text-xs"
                />
                <span className="font-bold text-slate-500 text-xs">Litros</span>
              </div>

              {/* Pergunta de Cobrança do Cliente no Pedido */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                  💳 Cobrança do Cliente no Pedido:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingMode('FULL')}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      billingMode === 'FULL'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-300 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-black text-xs">🧾 Cobrar Barril Inteiro (100%)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      O cliente paga o valor integral do barril (padrão em eventos onde o barril foi aberto).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingMode('PARTIAL')}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      billingMode === 'PARTIAL'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-black text-xs text-emerald-800">💰 Cobrar Apenas Consumo Parcial</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Calcula os litros consumidos e desconta os litros que voltaram no pedido.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-orange-800 font-medium">
            💡 Dica: Você também pode bipar <strong>Chopeiras e Cilindros de CO2</strong> continuamente aqui para dar baixa e retornar ao pátio!
          </p>
        </div>
      )}

      {mode === 'DELIVER' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 animate-in fade-in">
          <label className="text-xs font-bold text-emerald-900 block">
            📍 Selecione o Cliente de Destino da Entrega:
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName || c.name} - {c.city || 'Sem cidade'} ({c.retainedKegsCount} barris em posse)
              </option>
            ))}
          </select>
          <p className="text-[11px] text-emerald-700">
            Ao bipar, o barril ou chopeira é transferido para a custódia do cliente.
          </p>
        </div>
      )}

      {/* Camera Barcode Scanner Viewport */}
      <BarcodeScanner onScan={handleScan} isProcessing={loading} />

      {/* Live Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-sm animate-in slide-in-from-top-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Scanned Item Detailed Card */}
      {scannedItem && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {itemType === 'KEG' ? `BARRIL ${scannedItem.capacity}L` : 'EQUIPAMENTO'}
              </span>
              <h3 className="text-xl font-black text-slate-900">{scannedItem.code}</h3>
            </div>
            {getStatusBadge(scannedItem.status)}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {scannedItem.currentBeerName && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <span className="text-[10px] font-bold text-purple-700 block">Cerveja no Barril</span>
                <span className="text-sm font-extrabold text-purple-900">{scannedItem.currentBeerName}</span>
                <span className="text-[11px] font-black text-purple-800 block mt-0.5">
                  Volume: {scannedItem.currentVolumeLiters || scannedItem.capacity} Litros
                </span>
                {scannedItem.currentBatch && (
                  <span className="text-[10px] text-purple-600 block mt-0.5 font-mono">
                    Lote: {scannedItem.currentBatch.batchNumber}
                  </span>
                )}
              </div>
            )}

            {scannedItem.currentClient && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <span className="text-[10px] font-bold text-orange-700 block">Cliente Atual</span>
                <span className="text-sm font-extrabold text-orange-900">
                  {scannedItem.currentClient.tradeName || scannedItem.currentClient.name}
                </span>
                <span className="text-[10px] text-orange-700/80 block mt-0.5">
                  {scannedItem.currentClient.city || ''}
                </span>
              </div>
            )}
          </div>

          {scannedItem.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <span className="font-bold text-slate-800 block mb-0.5">Observações:</span>
              {scannedItem.notes}
            </div>
          )}

          {/* Action buttons inside lookup */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setTimelineOpen(true)}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Clock className="w-4 h-4 text-slate-600" />
              Ver Linha do Tempo
            </button>
          </div>
        </div>
      )}

      {/* Batch Scanned History List */}
      {batchScannedCodes.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <ListPlus className="w-4 h-4 text-amber-600" />
              Bipes Recentes nesta Sessão ({batchScannedCodes.length})
            </h4>
            <button
              onClick={() => setBatchScannedCodes([])}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {batchScannedCodes.map((c) => (
              <span
                key={c}
                className="px-2.5 py-1 bg-slate-100 text-slate-800 font-mono text-xs font-bold rounded-lg border border-slate-200"
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
