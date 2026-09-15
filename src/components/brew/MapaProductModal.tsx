'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Tag,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

export interface MapaProduct {
  id: string;
  breweryId: string;
  name: string;
  mapaRegistration: string;
  commercialDenomination?: string | null;
  style?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    recipes: number;
  };
}

interface MapaProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: MapaProduct | null;
  initialMapa?: string;
  initialName?: string;
  onSuccess: (savedProduct: MapaProduct) => void;
}

export default function MapaProductModal({
  isOpen,
  onClose,
  product,
  initialMapa = '',
  initialName = '',
  onSuccess,
}: MapaProductModalProps) {
  const isEditing = !!product;

  const [name, setName] = useState('');
  const [mapaRegistration, setMapaRegistration] = useState('');
  const [commercialDenomination, setCommercialDenomination] = useState('');
  const [style, setStyle] = useState('');
  const [status, setStatus] = useState('ATIVO');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setName(product.name || '');
        setMapaRegistration(product.mapaRegistration || '');
        setCommercialDenomination(product.commercialDenomination || '');
        setStyle(product.style || '');
        setStatus(product.status || 'ATIVO');
        setNotes(product.notes || '');
      } else {
        setName(initialName || '');
        setMapaRegistration(initialMapa || '');
        setCommercialDenomination('');
        setStyle('');
        setStatus('ATIVO');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, product, initialMapa, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome do produto / rótulo é obrigatório.');
      return;
    }
    if (!mapaRegistration.trim()) {
      setError('O número de registro MAPA é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/mapa-products/${product.id}` : '/api/mapa-products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          mapaRegistration: mapaRegistration.trim(),
          commercialDenomination: commercialDenomination.trim() || null,
          style: style.trim() || null,
          status,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar registro MAPA');
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar requisição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isEditing ? 'Editar Registro MAPA' : 'Novo Registro MAPA de Produto'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastro oficial de rótulo para conformidade e rastreabilidade
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY / FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-red-600 dark:text-red-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NOME DO PRODUTO */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>Nome Comercial do Rótulo / Produto *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: PintTech American IPA, Pilsen Cristal..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* NUMERO MAPA */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Nº Registro MAPA *</span>
              </label>
              <input
                type="text"
                required
                value={mapaRegistration}
                onChange={(e) => setMapaRegistration(e.target.value)}
                placeholder="Ex: SP 001234-5.000001"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                Padrão MAPA: UF [Estabelecimento].[Sequencial]
              </span>
            </div>

            {/* STATUS */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Status do Registro
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="ATIVO">✅ Ativo / Deferido</option>
                <option value="EM_ANALISE">⏳ Em Análise no MAPA</option>
                <option value="ARQUIVADO">📁 Arquivado / Inativo</option>
              </select>
            </div>

            {/* DENOMINACAO LEGAL */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Denominação Comercial / Legal Oficial</span>
              </label>
              <input
                type="text"
                value={commercialDenomination}
                onChange={(e) => setCommercialDenomination(e.target.value)}
                placeholder="Ex: Cerveja Puro Malte Extra Clara do Tipo India Pale Ale"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                Nome regulatório que sai na rotulagem oficial e ficha de rastreabilidade
              </span>
            </div>

            {/* ESTILO */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Estilo Base da Cerveja (Opcional)
              </label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Ex: American IPA, German Pilsner, Witbier..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* NOTAS */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Observações Regulatórias / Histórico
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Data de concessão, número do processo no MAPA ou notas de ingredientes..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-700 dark:text-amber-300">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <span>
              Ao cadastrar aqui, este produto fica disponível para seleção instantânea nas receitas do Brew Studio e nos lotes de brassagem, preenchendo automaticamente o número e a denominação legal.
            </span>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Atualizar Registro' : 'Salvar Registro MAPA'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
