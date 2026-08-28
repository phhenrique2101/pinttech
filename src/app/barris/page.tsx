'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { KEG_STATUS_MAP, formatDate } from '@/lib/utils';
import BarcodeModal from '@/components/kegs/BarcodeModal';
import KegTimelineModal from '@/components/kegs/KegTimelineModal';

export default function BarrisPage() {
  const [kegs, setKegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [capacityFilter, setCapacityFilter] = useState('ALL');

  // Modals state
  const [selectedKegForBarcode, setSelectedKegForBarcode] = useState<any>(null);
  const [selectedKegForTimeline, setSelectedKegForTimeline] = useState<any>(null);
  const [newKegModalOpen, setNewKegModalOpen] = useState(false);
  const [batchKegModalOpen, setBatchKegModalOpen] = useState(false);

  // New keg form
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [kegType, setKegType] = useState('INOX_EURO');
  const [notes, setNotes] = useState('');

  // Batch keg form
  const [batchPrefix, setBatchPrefix] = useState('BAR-50L');
  const [batchCount, setBatchCount] = useState('10');
  const [batchCapacity, setBatchCapacity] = useState('50');

  const fetchKegs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (capacityFilter !== 'ALL') params.append('capacity', capacityFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/kegs?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setKegs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKegs();
  }, [statusFilter, capacityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKegs();
  };

  const handleCreateSingleKeg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/kegs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, capacity, kegType, notes }),
      });
      if (res.ok) {
        setNewKegModalOpen(false);
        setCode('');
        setNotes('');
        fetchKegs();
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
          capacity: batchCapacity,
          kegType: 'INOX_EURO',
        }),
      });
      if (res.ok) {
        setBatchKegModalOpen(false);
        fetchKegs();
      }
    } catch (err) {
      console.error(err);
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
            Gerenciamento de ativos, etiquetas de código de barras / QR e histórico de clientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBatchKegModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all"
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Cadastrar em Lote</span>
          </button>

          <button
            onClick={() => setNewKegModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95"
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
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              <option value="NO_CLIENTE">No Cliente</option>
              <option value="EM_ESTOQUE">Na Câmara Fria (Cheio)</option>
              <option value="HIGIENIZADO">Higienizado (Pronto)</option>
              <option value="VAZIO_SUJO">Vazio / Sujo</option>
              <option value="EM_TRANSITO">Em Trânsito</option>
              <option value="MANUTENCAO">Em Manutenção</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-500">Capacidade:</span>
            <select
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800"
            >
              <option value="ALL">Todas</option>
              <option value="50">50 Litros</option>
              <option value="30">30 Litros</option>
              <option value="20">20 Litros</option>
              <option value="10">10 Litros</option>
            </select>
          </div>

          <button
            onClick={fetchKegs}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl"
            title="Recarregar"
          >
            <RefreshCw className="w-4 h-4" />
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
              ) : kegs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    Nenhum barril encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                kegs.map((keg) => {
                  const statusInfo = KEG_STATUS_MAP[keg.status] || {
                    label: keg.status,
                    bg: 'bg-slate-100',
                    color: 'text-slate-800',
                  };

                  return (
                    <tr key={keg.id} className="hover:bg-slate-50/80 transition-colors">
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
                              {keg.kegType.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Capacidade */}
                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {keg.capacity} L
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${statusInfo.bg} ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
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
                        {keg.currentClient ? (
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

      {/* Modal: Novo Barril */}
      {newKegModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-4">Cadastrar Novo Barril</h3>
            <form onSubmit={handleCreateSingleKeg} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Código Único (Barcode / QR)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: BAR-50L-016"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Capacidade</label>
                  <select
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="50">50 Litros</option>
                    <option value="30">30 Litros</option>
                    <option value="20">20 Litros</option>
                    <option value="10">10 Litros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Barril</label>
                  <select
                    value={kegType}
                    onChange={(e) => setKegType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="INOX_EURO">Inox Euro</option>
                    <option value="INOX_DIN">Inox DIN</option>
                    <option value="INOX_SLIM">Inox Slim</option>
                    <option value="PET_ONEWAY">Keg PET</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Número de série do fabricante, fornecedor, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewKegModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Salvar Barril
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastro em Lote */}
      {batchKegModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-1">Cadastrar Barris em Lote</h3>
            <p className="text-xs text-slate-500 mb-4">Gera sequências automáticas (ex: BAR-50L-001 até 020)</p>

            <form onSubmit={handleCreateBatchKegs} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prefixo do Código</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: BAR-50L"
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantidade de Barris</label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={batchCount}
                    onChange={(e) => setBatchCount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Capacidade (Litros)</label>
                  <select
                    value={batchCapacity}
                    onChange={(e) => setBatchCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="50">50 Litros</option>
                    <option value="30">30 Litros</option>
                    <option value="20">20 Litros</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBatchKegModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Gerar Lote de Barris
                </button>
              </div>
            </form>
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
