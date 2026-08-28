'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Cylinder,
  Plus,
  Search,
  Filter,
  QrCode,
  History,
  Layers,
  Sparkles,
  Beer,
  Truck,
  MapPin,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Camera,
  X,
  Trash2,
  Check,
  Volume2,
  ArrowRight,
  Lock,
  Download,
} from 'lucide-react';
import { KEG_STATUS_MAP, formatDate } from '@/lib/utils';
import { exportJsonToExcel } from '@/lib/exportUtils';
import BarcodeModal from '@/components/kegs/BarcodeModal';
import KegTimelineModal from '@/components/kegs/KegTimelineModal';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';

export default function BarrisPage() {
  const [kegs, setKegs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [capacityFilter, setCapacityFilter] = useState('ALL');

  // Modals state
  const [selectedKegForBarcode, setSelectedKegForBarcode] = useState<any>(null);
  const [selectedKegForTimeline, setSelectedKegForTimeline] = useState<any>(null);
  const [newKegModalOpen, setNewKegModalOpen] = useState(false);
  const [batchKegModalOpen, setBatchKegModalOpen] = useState(false);
  const [fastScannerModalOpen, setFastScannerModalOpen] = useState(false);
  const [deleteConfirmKeg, setDeleteConfirmKeg] = useState<any>(null);
  const [deletingKeg, setDeletingKeg] = useState(false);
  const [deleteKegError, setDeleteKegError] = useState('');

  // New single keg form (Litragem Livre)
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [kegType, setKegType] = useState('INOX_EURO');
  const [notes, setNotes] = useState('');

  // Batch keg form (Litragem Livre)
  const [batchPrefix, setBatchPrefix] = useState('BAR-50L');
  const [batchCount, setBatchCount] = useState('10');
  const [batchCapacity, setBatchCapacity] = useState('50');

  // Fast Scanner continuous registration mode
  const [fastCode, setFastCode] = useState('');
  const [fastCapacity, setFastCapacity] = useState('50');
  const [fastKegType, setFastKegType] = useState('INOX_EURO');
  const [fastNotes, setFastNotes] = useState('');
  const [useCamera, setUseCamera] = useState(false);
  const [fastScanning, setFastScanning] = useState(false);
  const [fastFeedback, setFastFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [sessionRegisteredKegs, setSessionRegisteredKegs] = useState<{ code: string; capacity: number; time: string }[]>([]);

  const fastInputRef = useRef<HTMLInputElement>(null);

  const getKegReservation = (keg: any) => {
    if (keg.status !== 'EM_ESTOQUE' && keg.status !== 'ENVASADO') return null;

    for (const o of orders) {
      if (['ORCAMENTO', 'CONFIRMADO', 'EM_SEPARACAO'].includes(o.status)) {
        for (const it of o.items || []) {
          if (it.kegId === keg.id) {
            return {
              orderNumber: o.orderNumber,
              clientName: o.client?.tradeName || o.client?.name || 'Cliente',
              deliveryDate: o.deliveryDate,
            };
          }
          const itRecipeName = it.recipe?.name || it.description?.replace(/Barril.*?-\s*/i, '').trim();
          const matches =
            (it.recipeId && keg.currentBatch?.recipeId === it.recipeId) ||
            (itRecipeName && keg.currentBeerName && itRecipeName.toLowerCase() === keg.currentBeerName.toLowerCase());
          if (matches && (it.kegCapacity || 50) === keg.capacity) {
            return {
              orderNumber: o.orderNumber,
              clientName: o.client?.tradeName || o.client?.name || 'Cliente',
              deliveryDate: o.deliveryDate,
            };
          }
        }
      }
    }
    return null;
  };

  const fetchKegs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL' && statusFilter !== 'RESERVADO') params.append('status', statusFilter);
      if (capacityFilter !== 'ALL') params.append('capacity', capacityFilter);
      if (search) params.append('search', search);

      const [kRes, oRes] = await Promise.all([
        fetch(`/api/kegs?${params.toString()}`),
        fetch('/api/orders'),
      ]);
      const [kData, oData] = await Promise.all([kRes.json(), oRes.json()]);

      if (Array.isArray(kData)) setKegs(kData);
      if (Array.isArray(oData)) setOrders(oData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKegs();
  }, [statusFilter, capacityFilter]);

  // Focus fast scanner input when modal opens
  useEffect(() => {
    if (fastScannerModalOpen && !useCamera) {
      setTimeout(() => {
        fastInputRef.current?.focus();
      }, 200);
    }
  }, [fastScannerModalOpen, useCamera]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKegs();
  };

  const handleStatusChange = async (kegId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/kegs/${kegId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setKegs((prev) =>
          prev.map((k) => (k.id === kegId ? { ...k, status: newStatus } : k))
        );
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao alterar status do barril');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteKeg = async () => {
    if (!deleteConfirmKeg) return;
    setDeletingKeg(true);
    setDeleteKegError('');

    try {
      const res = await fetch(`/api/kegs/${deleteConfirmKeg.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setKegs((prev) => prev.filter((k) => k.id !== deleteConfirmKeg.id));
        setDeleteConfirmKeg(null);
      } else {
        setDeleteKegError(data.error || 'Erro ao excluir barril');
      }
    } catch (e) {
      setDeleteKegError('Erro de conexão ao excluir');
    } finally {
      setDeletingKeg(false);
    }
  };

  const handleCreateSingleKeg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/kegs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          capacity: parseInt(capacity, 10) || 50,
          kegType,
          notes,
        }),
      });
      if (res.ok) {
        setNewKegModalOpen(false);
        setCode('');
        setNotes('');
        fetchKegs();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao cadastrar barril');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBatchKegs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/kegs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: batchPrefix,
          count: parseInt(batchCount, 10),
          capacity: parseInt(batchCapacity, 10) || 50,
          kegType: 'INOX_EURO',
        }),
      });
      if (res.ok) {
        setBatchKegModalOpen(false);
        fetchKegs();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao cadastrar barris em lote');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio context might be restricted
    }
  };

  const handleFastScanRegister = async (scannedCode: string) => {
    const cleanCode = scannedCode.trim().toUpperCase();
    if (!cleanCode) return;

    setFastScanning(true);
    setFastFeedback(null);

    try {
      const cap = parseInt(fastCapacity, 10) || 50;
      const res = await fetch('/api/kegs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          capacity: cap,
          kegType: fastKegType,
          notes: fastNotes || 'Cadastrado via Scanner Rápido',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar barril');
      }

      playSuccessSound();
      setFastFeedback({
        text: `✓ Barril ${cleanCode} (${cap}L) cadastrado com sucesso!`,
        type: 'success',
      });

      setSessionRegisteredKegs((prev) => [
        { code: cleanCode, capacity: cap, time: new Date().toLocaleTimeString('pt-BR') },
        ...prev,
      ]);

      setFastCode('');
      fetchKegs();
    } catch (err: any) {
      setFastFeedback({
        text: err.message || 'Erro ao cadastrar código',
        type: 'error',
      });
    } finally {
      setFastScanning(false);
      if (!useCamera) {
        setTimeout(() => fastInputRef.current?.focus(), 50);
      }
    }
  };

  const openTimeline = async (keg: any) => {
    try {
      const res = await fetch(`/api/kegs/${keg.id}`);
      const data = await res.json();
      setSelectedKegForTimeline(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Extract unique registered capacities for dynamic filter
  const registeredCapacities = Array.from(new Set(kegs.map((k) => k.capacity).filter(Boolean))).sort(
    (a, b) => b - a
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Cylinder className="w-5 h-5 text-amber-600" />
            Controle & Rastreabilidade de Barris
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento de ativos, litragens de 5L a 50L+, inativação, exclusão e scanner rápido
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Fast Scanner Button */}
          <button
            onClick={() => {
              setFastFeedback(null);
              setFastCode('');
              setFastScannerModalOpen(true);
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black rounded-xl shadow-md shadow-amber-500/25 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Bipar & Cadastrar Barris (Rápido)</span>
          </button>

          <button
            onClick={() => setBatchKegModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all"
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Cadastrar em Lote</span>
          </button>

          <button
            onClick={() => setNewKegModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Barril</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, cerveja, cliente..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800"
            >
              <option value="ALL">Todos os Status</option>
              <option value="RESERVADO">🔒 Reservado em Pedido</option>
              <option value="NO_CLIENTE">No Cliente</option>
              <option value="EM_ESTOQUE">Na Câmara Fria (Cheio)</option>
              <option value="HIGIENIZADO">Higienizado (Pronto)</option>
              <option value="VAZIO_SUJO">Vazio / Sujo</option>
              <option value="EM_TRANSITO">Em Trânsito</option>
              <option value="MANUTENCAO">Em Manutenção</option>
              <option value="INATIVO">Inativo (Desativado)</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-500">Litragem:</span>
            <select
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800"
            >
              <option value="ALL">Todas ({registeredCapacities.length > 0 ? `${registeredCapacities.length} tipos` : ''})</option>
              {registeredCapacities.map((cap) => (
                <option key={cap} value={String(cap)}>
                  {cap} Litros
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchKegs}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl"
            title="Recarregar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const filtered = kegs.filter((k) => (statusFilter === 'RESERVADO' ? getKegReservation(k) !== null : true));
              const rows = filtered.map((k) => {
                const res = getKegReservation(k);
                return {
                  'Código': k.code,
                  'Capacidade': `${k.capacity}L`,
                  'Tipo': k.kegType?.replace('_', ' ') || 'INOX EURO',
                  'Status': res ? 'RESERVADO' : k.status,
                  'Chopp Envasado': k.currentBeerName || '—',
                  'Lote': k.currentBatch?.batchNumber || '—',
                  'Localização / Cliente': res
                    ? `Reservado p/ ${res.clientName} (#${res.orderNumber})`
                    : k.currentClient
                    ? k.currentClient.tradeName || k.currentClient.name
                    : k.status === 'EM_ESTOQUE'
                    ? 'Câmara Fria'
                    : 'Pátio Cervejaria',
                  'Data Entrega': res?.deliveryDate ? formatDate(res.deliveryDate) : k.lastDeliveredAt ? formatDate(k.lastDeliveredAt) : '—',
                };
              });
              exportJsonToExcel(rows, `Barris_PintTech_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Barris');
            }}
            className="px-3 py-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
            title="Exportar barris visíveis para Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Kegs Table / Cards Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-5">Código & Tipo</th>
                <th className="p-3.5">Capacidade</th>
                <th className="p-3.5">Status Atual</th>
                <th className="p-3.5">Cerveja / Lote</th>
                <th className="p-3.5">Localização / Cliente</th>
                <th className="p-3.5 text-right pr-5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Carregando barris...
                  </td>
                </tr>
              ) : kegs.filter((k) => (statusFilter === 'RESERVADO' ? getKegReservation(k) !== null : true)).length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    Nenhum barril encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                kegs
                  .filter((k) => (statusFilter === 'RESERVADO' ? getKegReservation(k) !== null : true))
                  .map((keg) => {
                  const isInactive = keg.status === 'INATIVO';
                  const inClient = keg.status === 'NO_CLIENTE' || keg.currentClientId;
                  const res = getKegReservation(keg);

                  const statusInfo = isInactive
                    ? { label: 'Inativo (Desativado)', bg: 'bg-slate-200', color: 'text-slate-700' }
                    : KEG_STATUS_MAP[keg.status] || {
                        label: keg.status,
                        bg: 'bg-slate-100',
                        color: 'text-slate-800',
                      };

                  return (
                    <tr
                      key={keg.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isInactive
                          ? 'opacity-70 bg-slate-50/40'
                          : res
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      {/* Código */}
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                            <Cylinder className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 font-mono text-sm block">
                              {keg.code}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              {keg.kegType?.replace('_', ' ') || 'INOX EURO'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Capacidade Livre */}
                      <td className="p-3.5">
                        <span className="font-black text-slate-900 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-lg text-xs">
                          {keg.capacity} L
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {res ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 inline-flex shadow-xs">
                            <Lock className="w-3 h-3 text-amber-600" />
                            Reservado
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        )}
                      </td>

                      {/* Cerveja / Lote */}
                      <td className="p-3.5">
                        {keg.currentBeerName ? (
                          <div>
                            <span className="font-bold text-purple-900 flex items-center gap-1">
                              <Beer className="w-3.5 h-3.5 text-purple-600" />
                              {keg.currentBeerName}
                            </span>
                            {keg.currentBatch && (
                              <span className="text-[10px] text-purple-600 font-mono">
                                Lote: {keg.currentBatch.batchNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">- Vazio -</span>
                        )}
                      </td>

                      {/* Localização / Cliente */}
                      <td className="p-3.5">
                        {isInactive ? (
                          <span className="text-slate-400 italic text-xs">Barril Inativado</span>
                        ) : res ? (
                          <div className="text-amber-950">
                            <span className="font-bold flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                              #{res.orderNumber} ({res.clientName})
                            </span>
                            {res.deliveryDate && (
                              <span className="text-[10px] text-amber-800/80 block font-medium">
                                Entrega: {formatDate(res.deliveryDate)}
                              </span>
                            )}
                          </div>
                        ) : keg.currentClient ? (
                          <div>
                            <span className="font-bold text-orange-900 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-orange-600" />
                              {keg.currentClient.tradeName || keg.currentClient.name}
                            </span>
                            <span className="text-[10px] text-orange-700/80">
                              {keg.currentClient.city}
                            </span>
                          </div>
                        ) : keg.status === 'EM_ESTOQUE' ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Câmara Fria
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">Pátio Cervejaria</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedKegForBarcode(keg)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors"
                            title="Gerar Etiqueta Barcode / QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openTimeline(keg)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                            title="Ver Histórico de Rastreabilidade"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Inactivate / Reactivate */}
                          {isInactive ? (
                            <button
                              onClick={() => handleStatusChange(keg.id, 'HIGIENIZADO')}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                              title="Reativar Barril"
                            >
                              Reativar
                            </button>
                          ) : (
                            !inClient && (
                              <button
                                onClick={() => handleStatusChange(keg.id, 'INATIVO')}
                                className="px-2 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
                                title="Inativar Barril"
                              >
                                Inativar
                              </button>
                            )
                          )}

                          {/* Delete */}
                          {!inClient && (
                            <button
                              onClick={() => {
                                setDeleteKegError('');
                                setDeleteConfirmKeg(keg);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir Barril"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ⚡ MODO BIPAR & CADASTRAR BARRIS (SCANNER RÁPIDO) */}
      {fastScannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-current" /> Modo Cadastro Contínuo
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Bipar & Cadastrar Barris Rapidamente
                </h3>
              </div>
              <button
                onClick={() => setFastScannerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session Parameters (Litragem livre e Tipo) */}
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
              <span className="text-[11px] font-black text-amber-950 block uppercase tracking-wider">
                1. Configure a Litragem & Tipo dos Barris da Sessão:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Litragem Livre Input + Quick Chips */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Litragem do Barril (Litros Livre)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Ex: 50, 30, 25..."
                      value={fastCapacity}
                      onChange={(e) => setFastCapacity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-black text-slate-900"
                    />
                    <span className="text-xs font-extrabold text-amber-800">Litros</span>
                  </div>

                  {/* Preset chips */}
                  <div className="flex gap-1.5 mt-2">
                    {['50', '30', '20', '15', '10', '5'].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setFastCapacity(cap)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                          fastCapacity === cap
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {cap}L
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tipo de Barril */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Barril</label>
                  <select
                    value={fastKegType}
                    onChange={(e) => setFastKegType(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="INOX_EURO">Inox Euro</option>
                    <option value="INOX_DIN">Inox DIN</option>
                    <option value="INOX_SLIM">Inox Slim</option>
                    <option value="PET_ONEWAY">Keg PET</option>
                    <option value="OUTRO">Outro Material</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Input Mode Toggle (Pistola Barcode vs Câmera) */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUseCamera(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  !useCamera
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Leitor / Pistola USB / Teclado</span>
              </button>

              <button
                type="button"
                onClick={() => setUseCamera(true)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  useCamera
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Câmera do Dispositivo</span>
              </button>
            </div>

            {/* Camera View */}
            {useCamera ? (
              <div className="p-3 bg-slate-900 rounded-2xl space-y-2">
                <BarcodeScanner onScan={handleFastScanRegister} isProcessing={fastScanning} />
              </div>
            ) : (
              /* USB / Gun Beep Input Form */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (fastCode.trim()) handleFastScanRegister(fastCode);
                }}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2"
              >
                <label className="block text-xs font-black text-slate-800">
                  2. Bipe o código do barril (ou digite e pressione Enter):
                </label>
                <div className="flex gap-2">
                  <input
                    ref={fastInputRef}
                    type="text"
                    required
                    placeholder="Bipe com a pistola ou digite ex: BAR-001..."
                    value={fastCode}
                    onChange={(e) => setFastCode(e.target.value.toUpperCase())}
                    disabled={fastScanning}
                    className="flex-1 px-4 py-3 bg-white border-2 border-amber-500 focus:border-amber-600 focus:ring-4 focus:ring-amber-500/20 rounded-2xl font-mono text-base font-black text-slate-900 uppercase"
                  />
                  <button
                    type="submit"
                    disabled={fastScanning || !fastCode.trim()}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  💡 A pistola de código de barras envia um Enter automaticamente ao bipar.
                </p>
              </form>
            )}

            {/* Instant Feedback Message */}
            {fastFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                  fastFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {fastFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{fastFeedback.text}</span>
              </div>
            )}

            {/* List of Kegs Registered In This Session */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Barris Cadastrados Nesta Sessão ({sessionRegisteredKegs.length}):
                </span>
                {sessionRegisteredKegs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSessionRegisteredKegs([])}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Limpar histórico da sessão
                  </button>
                )}
              </div>

              {sessionRegisteredKegs.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {sessionRegisteredKegs.map((k, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900">{k.code}</span>
                        <span className="text-[10px] font-bold bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                          {k.capacity} Litros
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{k.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">
                  Nenhum barril bipado nesta sessão ainda.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setFastScannerModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Concluir & Fechar Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NOVO BARRIL INDIVIDUAL (COM LITRAGEM LIVRE) */}
      {newKegModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-1">Cadastrar Novo Barril</h3>
            <p className="text-xs text-slate-500 mb-4">Insira o código e defina a litragem livre desejada</p>

            <form onSubmit={handleCreateSingleKeg} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código Único (Barcode / QR)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: BAR-50L-016 ou 3001"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl uppercase font-mono font-bold"
                />
              </div>

              {/* Litragem Livre Input + Quick Buttons */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Capacidade em Litros (Litragem Livre)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ex: 50, 30, 20, 15, 10, 5..."
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900"
                  />
                  <span className="font-black text-slate-700">Litros</span>
                </div>

                {/* Preset Chips */}
                <div className="flex gap-1.5 mt-2">
                  {['50', '30', '20', '15', '10', '5'].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setCapacity(cap)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                        capacity === cap
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cap}L
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Barril</label>
                <select
                  value={kegType}
                  onChange={(e) => setKegType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="INOX_EURO">Inox Euro</option>
                  <option value="INOX_DIN">Inox DIN</option>
                  <option value="INOX_SLIM">Inox Slim</option>
                  <option value="PET_ONEWAY">Keg PET</option>
                  <option value="OUTRO">Outro Material</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Número de série do fabricante, fornecedor, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewKegModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Salvar Barril
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CADASTRO EM LOTE (COM LITRAGEM LIVRE) */}
      {batchKegModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-1">Cadastrar Barris em Lote</h3>
            <p className="text-xs text-slate-500 mb-4">Gera sequências automáticas com a litragem que você definir</p>

            <form onSubmit={handleCreateBatchKegs} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Código Inicial ou Prefixo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 3001 ou BAR-3001 ou BAR-50L"
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl uppercase font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Digite apenas o número inicial (ex: <strong>3001</strong>) ou com prefixo (ex: <strong>BAR-3001</strong>).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantidade de Barris</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={batchCount}
                    onChange={(e) => setBatchCount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                {/* Litragem Livre Batch */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Capacidade (Litros)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={batchCapacity}
                    onChange={(e) => setBatchCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Quick Chips for batch capacity */}
              <div className="flex gap-1.5">
                {['50', '30', '20', '15', '10', '5'].map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setBatchCapacity(cap)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                      batchCapacity === cap
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cap}L
                  </button>
                ))}
              </div>

              {/* Prévia Inteligente da Sequência */}
              {(() => {
                const input = (batchPrefix || '').trim().toUpperCase();
                const count = parseInt(batchCount, 10) || 1;
                if (!input) return null;

                let basePrefix = '';
                let startNumber = 1;
                let padLength = 3;

                const match = input.match(/^(.*?)(\d+)$/);
                if (match) {
                  basePrefix = match[1];
                  startNumber = parseInt(match[2], 10);
                  padLength = match[2].length;
                } else {
                  basePrefix = input.endsWith('-') ? input : `${input}-`;
                  startNumber = 1;
                  padLength = 3;
                }

                const first = `${basePrefix}${String(startNumber).padStart(padLength, '0')}`;
                const second = count > 1 ? `${basePrefix}${String(startNumber + 1).padStart(padLength, '0')}` : null;
                const last = count > 1 ? `${basePrefix}${String(startNumber + count - 1).padStart(padLength, '0')}` : null;

                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                      ✨ Sequência que será criada ({count} barris de {batchCapacity}L):
                    </span>
                    <div className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-white rounded-lg border border-amber-200 text-amber-900">{first}</span>
                      {second && <span className="px-2 py-0.5 bg-white rounded-lg border border-amber-200 text-amber-900">{second}</span>}
                      {count > 2 && <span className="text-slate-400 font-normal">... até ...</span>}
                      {last && count > 2 && <span className="px-2 py-0.5 bg-white rounded-lg border border-amber-200 text-amber-900">{last}</span>}
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBatchKegModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Gerar Lote de Barris
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Exclusão de Barril */}
      {deleteConfirmKeg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Excluir Barril</h3>
                <p className="text-xs text-slate-500">Confirmação de exclusão definitiva</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Tem certeza que deseja excluir o barril{' '}
              <strong className="text-slate-900 font-black font-mono">{deleteConfirmKeg.code}</strong> (
              {deleteConfirmKeg.capacity} Litros)? Esta ação apagará o histórico e não poderá ser desfeita.
            </p>

            {deleteKegError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{deleteKegError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmKeg(null)}
                disabled={deletingKeg}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteKeg}
                disabled={deletingKeg}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingKeg ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode / QR Code Modal */}
      <BarcodeModal
        isOpen={!!selectedKegForBarcode}
        onClose={() => setSelectedKegForBarcode(null)}
        keg={selectedKegForBarcode}
      />

      {/* Timeline Modal */}
      {selectedKegForTimeline && (
        <KegTimelineModal
          isOpen={!!selectedKegForTimeline}
          onClose={() => setSelectedKegForTimeline(null)}
          kegCode={selectedKegForTimeline.code}
          kegCapacity={selectedKegForTimeline.capacity}
          movements={selectedKegForTimeline.movements || []}
        />
      )}
    </div>
  );
}
