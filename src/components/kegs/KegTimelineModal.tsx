'use client';

import React from 'react';
import { X, History, MapPin, User, Calendar, Tag, CheckCircle2, Truck, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { formatDate, KEG_STATUS_MAP } from '@/lib/utils';

interface Movement {
  id: string;
  action: string;
  fromStatus?: string | null;
  toStatus: string;
  userName?: string | null;
  driverName?: string | null;
  toClient?: { name: string; tradeName?: string | null } | null;
  batch?: { batchNumber: string; recipe?: { name: string } } | null;
  notes?: string | null;
  createdAt: string | Date;
}

interface KegTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  kegCode: string;
  kegCapacity: number;
  movements: Movement[];
}

export default function KegTimelineModal({ isOpen, onClose, kegCode, kegCapacity, movements }: KegTimelineModalProps) {
  if (!isOpen) return null;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'HIGIENIZACAO':
        return <Sparkles className="w-4 h-4 text-blue-500" />;
      case 'ENVASE':
        return <CheckCircle2 className="w-4 h-4 text-purple-500" />;
      case 'EXPEDICAO':
      case 'ENTREGA':
        return <Truck className="w-4 h-4 text-emerald-500" />;
      case 'RECOLHA':
        return <RefreshCw className="w-4 h-4 text-orange-500" />;
      default:
        return <History className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Histórico de Rastreabilidade</h3>
              <p className="text-xs text-slate-500">{kegCode} • {kegCapacity} Litros</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {movements.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Nenhuma movimentação registrada para este barril.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
              {movements.map((m, index) => {
                const statusInfo = KEG_STATUS_MAP[m.toStatus] || { label: m.toStatus, bg: 'bg-slate-100', color: 'text-slate-800' };

                return (
                  <div key={m.id || index} className="relative group">
                    {/* Dot on line */}
                    <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-white border-2 border-amber-500 flex items-center justify-center shadow-sm">
                      {getActionIcon(m.action)}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 shadow-sm hover:border-amber-300 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          {m.action}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatDate(m.createdAt)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                          Status: {statusInfo.label}
                        </span>

                        {m.toClient && (
                          <span className="text-[11px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-orange-500" />
                            {m.toClient.tradeName || m.toClient.name}
                          </span>
                        )}

                        {m.batch && (
                          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {m.batch.batchNumber} {m.batch.recipe?.name ? `(${m.batch.recipe.name})` : ''}
                          </span>
                        )}
                      </div>

                      {m.notes && (
                        <p className="mt-2 text-xs text-slate-600 italic bg-white p-2 rounded border border-slate-100">
                          &quot;{m.notes}&quot;
                        </p>
                      )}

                      {(m.userName || m.driverName) && (
                        <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Responsável: {m.driverName || m.userName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
