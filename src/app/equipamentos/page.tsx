'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  QrCode,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Flame,
  Layers,
  Power,
  Trash2,
  RefreshCw,
  X,
  ShieldAlert,
  LayoutGrid,
  List,
} from 'lucide-react';
import { EQUIPMENT_TYPE_MAP } from '@/lib/utils';
import BarcodeModal from '@/components/kegs/BarcodeModal';

export default function EquipamentosPage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'ROWS' | 'CARDS'>('ROWS');

  const changeViewMode = (mode: 'ROWS' | 'CARDS') => {
    setViewMode(mode);
    try {
      localStorage.setItem('pinttech_equipment_view_mode', mode);
    } catch {}
  };

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedForBarcode, setSelectedForBarcode] = useState<any>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Individual Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('CHOPEIRA_ELETRICA');
  const [voltage, setVoltage] = useState('220V');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Batch Form states
  const [batchPrefix, setBatchPrefix] = useState('CHOP-EL-');
  const [batchName, setBatchName] = useState('Chopeira Elétrica 2 Vias 220V Memo');
  const [batchType, setBatchType] = useState('CHOPEIRA_ELETRICA');
  const [batchVoltage, setBatchVoltage] = useState('220V');
  const [batchCount, setBatchCount] = useState('10');
  const [batchStartNumber, setBatchStartNumber] = useState('1');

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/equipment');
      const data = await res.json();
      if (Array.isArray(data)) setEquipment(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
    try {
      const savedMode = localStorage.getItem('pinttech_equipment_view_mode');
      if (savedMode === 'ROWS' || savedMode === 'CARDS') setViewMode(savedMode);
    } catch {}
  }, []);

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/equipment/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setEquipment((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, status: newStatus } : it))
        );
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao alterar status');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEquipment = async () => {
    if (!deleteConfirmItem) return;
    setDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/equipment/${deleteConfirmItem.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setEquipment((prev) => prev.filter((it) => it.id !== deleteConfirmItem.id));
        setDeleteConfirmItem(null);
      } else {
        setDeleteError(data.error || 'Erro ao excluir equipamento');
      }
    } catch (err: any) {
      setDeleteError('Erro de conexão ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, type, voltage, serialNumber, notes }),
      });
      if (res.ok) {
        setNewModalOpen(false);
        setCode('');
        setName('');
        setSerialNumber('');
        setNotes('');
        fetchEquipment();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBatchEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: batchPrefix,
          name: batchName,
          type: batchType,
          voltage: batchVoltage,
          count: parseInt(batchCount, 10),
          startNumber: parseInt(batchStartNumber, 10),
        }),
      });

      if (res.ok) {
        setBatchModalOpen(false);
        fetchEquipment();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      !search ||
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.code?.toLowerCase().includes(search.toLowerCase()) ||
      (item.currentClient?.name && item.currentClient.name.toLowerCase().includes(search.toLowerCase())) ||
      (item.currentClient?.tradeName && item.currentClient.tradeName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-600" />
            Equipamentos & Chopeiras em Comodato
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Rastreamento de chopeiras elétricas, a gelo, cilindros de CO2, inativação e controle de comodato
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBatchModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all"
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Cadastrar em Lote</span>
          </button>

          <button
            onClick={() => setNewModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Equipamento</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nome, cliente..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800"
            >
              <option value="ALL">Todos os Status</option>
              <option value="DISPONIVEL">Disponíveis</option>
              <option value="EM_USO_CLIENTE">Em Uso / Comodato</option>
              <option value="MANUTENCAO">Em Manutenção</option>
              <option value="INATIVO">Inativos (Fora de Uso)</option>
            </select>
          </div>

          {/* Alternador de Modo de Visualização: Linhas vs Cards */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => changeViewMode('ROWS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'ROWS'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visualizar em Linhas / Tabela"
            >
              <List className="w-3.5 h-3.5" />
              <span>Linhas</span>
            </button>

            <button
              type="button"
              onClick={() => changeViewMode('CARDS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'CARDS'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visualizar como Grade / Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>

          <button
            onClick={fetchEquipment}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl"
            title="Recarregar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Equipment Display: Loading, Empty, Table or Cards */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">
          Carregando equipamentos...
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 p-8">
          Nenhum equipamento encontrado com os filtros selecionados.
        </div>
      ) : viewMode === 'ROWS' ? (
        /* VISUALIZAÇÃO EM LINHAS (TABELA DE EQUIPAMENTOS) */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Código / Tag</th>
                  <th className="p-3.5">Equipamento & Tipo</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Cliente / Localização</th>
                  <th className="p-3.5 text-right w-44">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquipment.map((item) => {
                  const inUse = item.status === 'EM_USO_CLIENTE';
                  const isInactive = item.status === 'INATIVO';
                  const isMaintenance = item.status === 'MANUTENCAO';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition group">
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {item.code}
                          </span>
                          {item.voltage && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5 text-amber-600" />
                              {item.voltage}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 group-hover:text-amber-600 transition">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {EQUIPMENT_TYPE_MAP[item.type] || item.type}
                          {item.serialNumber && ` • S/N: ${item.serialNumber}`}
                        </div>
                        {item.notes && (
                          <div className="text-[10px] text-slate-400 italic truncate max-w-xs mt-0.5">
                            {item.notes}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                            isInactive
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : inUse
                              ? 'bg-orange-50 text-orange-800 border-orange-200'
                              : isMaintenance
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isInactive
                                ? 'bg-slate-400'
                                : inUse
                                ? 'bg-orange-500'
                                : isMaintenance
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          {isInactive
                            ? 'Inativo'
                            : inUse
                            ? 'Em Comodato'
                            : isMaintenance
                            ? 'Manutenção'
                            : 'Disponível'}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {isInactive ? (
                          <span className="text-slate-400 text-xs italic">Desativado</span>
                        ) : item.currentClient ? (
                          <div className="inline-flex items-center gap-1 text-xs font-bold text-orange-900 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                            <MapPin className="w-3 h-3 text-orange-600 shrink-0" />
                            <span>{item.currentClient.tradeName || item.currentClient.name}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Cervejaria (Disponível)</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              setSelectedForBarcode({
                                id: item.id,
                                code: item.code,
                                capacity: 0,
                                kegType: item.type,
                              })
                            }
                            className="p-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded-lg border border-slate-200 transition-colors"
                            title="Gerar QR Code / Etiqueta"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          {isInactive ? (
                            <button
                              onClick={() => handleStatusChange(item.id, 'DISPONIVEL')}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors"
                              title="Reativar Equipamento"
                            >
                              <Power className="w-3 h-3 text-emerald-600" />
                              <span>Reativar</span>
                            </button>
                          ) : (
                            !inUse && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'INATIVO')}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 flex items-center gap-1 transition-colors"
                                title="Desativar temporariamente"
                              >
                                <Power className="w-3 h-3 text-slate-500" />
                                <span>Inativar</span>
                              </button>
                            )
                          )}

                          {!inUse && (
                            <button
                              onClick={() => {
                                setDeleteError('');
                                setDeleteConfirmItem(item);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir Equipamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISUALIZAÇÃO EM GRADE (CARDS DE EQUIPAMENTOS) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((item) => {
            const inUse = item.status === 'EM_USO_CLIENTE';
            const isInactive = item.status === 'INATIVO';
            const isMaintenance = item.status === 'MANUTENCAO';

            return (
              <div
                key={item.id}
                className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isInactive
                    ? 'border-slate-200 bg-slate-50/50 opacity-80'
                    : 'border-slate-200 shadow-sm hover:border-amber-400'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {EQUIPMENT_TYPE_MAP[item.type] || item.type}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-base">{item.name}</h3>
                      <p className="font-mono text-xs font-bold text-amber-700 mt-0.5">{item.code}</p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isInactive
                          ? 'bg-slate-200 text-slate-700 border border-slate-300'
                          : inUse
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : isMaintenance
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isInactive
                        ? 'Inativo (Desativado)'
                        : inUse
                        ? 'Em Uso / Comodato'
                        : isMaintenance
                        ? 'Em Manutenção'
                        : 'Disponível'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    {item.voltage && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400 font-medium">Voltagem:</span>
                        <span className="font-bold">{item.voltage}</span>
                      </div>
                    )}

                    {item.serialNumber && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400 font-medium">Nº de Série:</span>
                        <span className="font-mono font-medium">{item.serialNumber}</span>
                      </div>
                    )}

                    {/* Localização / Cliente Atual */}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Status / Localização Atual:
                      </span>
                      {isInactive ? (
                        <div className="p-2 bg-slate-100 rounded-xl text-xs text-slate-600 font-medium flex items-center gap-1.5">
                          <Power className="w-3.5 h-3.5 text-slate-400" />
                          <span>Equipamento Desativado / Inativo</span>
                        </div>
                      ) : item.currentClient ? (
                        <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs font-bold text-orange-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-orange-600" />
                          <span>{item.currentClient.tradeName || item.currentClient.name}</span>
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-50 rounded-xl text-xs text-slate-500 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Estoque na Cervejaria (Pronto para comodato)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() =>
                      setSelectedForBarcode({
                        id: item.id,
                        code: item.code,
                        capacity: 0,
                        kegType: item.type,
                      })
                    }
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QR Code</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Inactivate / Reactivate */}
                    {isInactive ? (
                      <button
                        onClick={() => handleStatusChange(item.id, 'DISPONIVEL')}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors"
                        title="Reativar Equipamento"
                      >
                        <Power className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Reativar</span>
                      </button>
                    ) : (
                      !inUse && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'INATIVO')}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1 transition-colors"
                          title="Desativar temporariamente"
                        >
                          <Power className="w-3.5 h-3.5 text-slate-500" />
                          <span>Inativar</span>
                        </button>
                      )
                    )}

                    {/* Delete */}
                    {!inUse && (
                      <button
                        onClick={() => {
                          setDeleteError('');
                          setDeleteConfirmItem(item);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir Equipamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Confirmação de Exclusão */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Excluir Equipamento</h3>
                <p className="text-xs text-slate-500">Confirmação de exclusão definitiva</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Tem certeza que deseja excluir o equipamento{' '}
              <strong className="text-slate-900 font-black font-mono">{deleteConfirmItem.code}</strong> (
              {deleteConfirmItem.name})? Esta ação não poderá ser desfeita.
            </p>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-start gap-1.5">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteEquipment}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Equipamento Individual */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-1">Cadastrar Novo Equipamento</h3>
            <p className="text-xs text-slate-500 mb-4">Insira o código único e dados da chopeira ou cilindro</p>

            <form onSubmit={handleCreateEquipment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código Único (QR / Barcode)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CHOP-EL-03 ou CO2-08"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Equipamento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Chopeira Elétrica Memo 2 Vias 220V"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="CHOPEIRA_ELETRICA">Chopeira Elétrica</option>
                    <option value="CHOPEIRA_GELO">Chopeira a Gelo</option>
                    <option value="CILINDRO_CO2">Cilindro CO2</option>
                    <option value="EXTRATORA">Válvula Extratora</option>
                    <option value="MANOMETRO">Regulador / Manômetro</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Voltagem</label>
                  <select
                    value={voltage}
                    onChange={(e) => setVoltage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="220V">220V</option>
                    <option value="110V">110V</option>
                    <option value="BIVOLT">Bivolt</option>
                    <option value="N/A">Não se aplica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Série / Fabricante</label>
                <input
                  type="text"
                  placeholder="Ex: MEM-2025-9921"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Salvar Equipamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastro de Equipamentos em Lote */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-1">Cadastrar Equipamentos em Lote</h3>
            <p className="text-xs text-slate-500 mb-4">Gera sequências automáticas de chopeiras ou cilindros (ex: CHOP-EL-01 a 10)</p>

            <form onSubmit={handleCreateBatchEquipment} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prefixo do Código</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CHOP-EL- ou CO2-"
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo</label>
                  <select
                    value={batchType}
                    onChange={(e) => {
                      setBatchType(e.target.value);
                      if (e.target.value === 'CILINDRO_CO2') {
                        setBatchPrefix('CO2-');
                        setBatchName('Cilindro CO2 Alumínio 6kg');
                        setBatchVoltage('N/A');
                      } else if (e.target.value === 'CHOPEIRA_ELETRICA') {
                        setBatchPrefix('CHOP-EL-');
                        setBatchName('Chopeira Elétrica Memo 2 Vias 220V');
                        setBatchVoltage('220V');
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="CHOPEIRA_ELETRICA">Chopeira Elétrica</option>
                    <option value="CHOPEIRA_GELO">Chopeira a Gelo</option>
                    <option value="CILINDRO_CO2">Cilindro CO2</option>
                    <option value="EXTRATORA">Válvula Extratora</option>
                    <option value="MANOMETRO">Regulador / Manômetro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Base do Equipamento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Chopeira Elétrica Memo 2 Vias"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={batchCount}
                    onChange={(e) => setBatchCount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Iniciar em Nº</label>
                  <input
                    type="number"
                    min="1"
                    value={batchStartNumber}
                    onChange={(e) => setBatchStartNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Voltagem</label>
                  <select
                    value={batchVoltage}
                    onChange={(e) => setBatchVoltage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="220V">220V</option>
                    <option value="110V">110V</option>
                    <option value="BIVOLT">Bivolt</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Gerar Lote de Equipamentos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Modal */}
      <BarcodeModal
        isOpen={!!selectedForBarcode}
        onClose={() => setSelectedForBarcode(null)}
        keg={selectedForBarcode}
      />
    </div>
  );
}
