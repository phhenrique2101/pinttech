'use client';

import React, { useState, useEffect } from 'react';
import { Undo2, AlertTriangle, CheckCircle2, RotateCcw, X } from 'lucide-react';

export default function UndoActionWidget() {
  const [lastAction, setLastAction] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchLastAction = async () => {
    try {
      const res = await fetch('/api/actions/recent');
      if (res.ok) {
        const data = await res.json();
        setLastAction(data);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchLastAction();
    const interval = setInterval(fetchLastAction, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirmUndo = async () => {
    if (!lastAction) return;
    setLoading(true);
    try {
      const res = await fetch('/api/actions/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: lastAction.id }),
      });

      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        setToastMessage(data.message || 'Ação desfeita com sucesso!');
        setLastAction(null);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        alert(data.error || 'Não foi possível desfazer a ação.');
      }
    } catch {
      alert('Erro de conexão ao desfazer ação.');
    } finally {
      setLoading(false);
    }
  };

  if (!lastAction && !toastMessage) return null;

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Undo Button in Navbar / Floating */}
      {lastAction && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition-all shadow-sm group"
            title={`Desfazer: ${lastAction.description}`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-700 group-hover:-rotate-45 transition-transform" />
            <span className="hidden sm:inline">Desfazer Ação</span>
            <span className="sm:hidden">Desfazer</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {modalOpen && lastAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900">Confirmar Desfazer Ação?</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Você está prestes a reverter a última ação registrada no sistema. Tem certeza que deseja desfazer?
            </p>

            {/* Action Details Card */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1.5 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                Detalhes da Ação a Desfazer:
              </span>
              <p className="font-bold text-slate-900 text-sm">{lastAction.description}</p>
              {lastAction.userName && (
                <p className="text-[11px] text-slate-500 font-medium">
                  Realizada por: <strong className="text-slate-700">{lastAction.userName}</strong>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmUndo}
                disabled={loading}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Undo2 className="w-4 h-4" />
                <span>{loading ? 'Revertendo...' : 'Sim, Desfazer Ação'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
