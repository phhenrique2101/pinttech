'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Search,
  Check,
  Plus,
  X,
  ExternalLink,
  ChevronDown,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { MapaProduct } from './MapaProductModal';

interface MapaSelectorInputProps {
  mapaRegistration: string;
  onChangeMapa: (val: string) => void;
  commercialDenomination: string;
  onChangeDenomination: (val: string) => void;
  mapaProductId?: string | null;
  onChangeProductId?: (id: string | null) => void;
  suggestedProductName?: string;
  suggestedStyle?: string;
}

export default function MapaSelectorInput({
  mapaRegistration,
  onChangeMapa,
  commercialDenomination,
  onChangeDenomination,
  mapaProductId,
  onChangeProductId,
  suggestedProductName = '',
  suggestedStyle = '',
}: MapaSelectorInputProps) {
  const [products, setProducts] = useState<MapaProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingQuick, setSavingQuick] = useState(false);
  const [quickSaveMsg, setQuickSaveMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mapa-products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setProducts(data);
      }
    } catch (e) {
      console.error('Failed to load mapa products', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find currently matched product
  const matchedProduct = products.find(
    (p) =>
      p.id === mapaProductId ||
      (mapaRegistration && p.mapaRegistration.toLowerCase() === mapaRegistration.trim().toLowerCase())
  );

  // Filter products for dropdown
  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.mapaRegistration.toLowerCase().includes(q) ||
      (p.commercialDenomination && p.commercialDenomination.toLowerCase().includes(q)) ||
      (p.style && p.style.toLowerCase().includes(q))
    );
  });

  const handleSelect = (p: MapaProduct) => {
    onChangeMapa(p.mapaRegistration);
    if (p.commercialDenomination) {
      onChangeDenomination(p.commercialDenomination);
    }
    if (onChangeProductId) {
      onChangeProductId(p.id);
    }
    setDropdownOpen(false);
    setSearchQuery('');
  };

  const handleClearLink = () => {
    if (onChangeProductId) onChangeProductId(null);
  };

  const handleQuickSaveToCatalog = async () => {
    if (!mapaRegistration.trim()) return;
    setSavingQuick(true);
    setQuickSaveMsg(null);
    try {
      const prodName = suggestedProductName.trim() || 'Novo Produto MAPA';
      const res = await fetch('/api/mapa-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prodName,
          mapaRegistration: mapaRegistration.trim(),
          commercialDenomination: commercialDenomination.trim() || null,
          style: suggestedStyle.trim() || null,
          status: 'ATIVO',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar no catálogo');
      }

      await fetchCatalog();
      if (onChangeProductId) onChangeProductId(data.id);
      setQuickSaveMsg('Salvo no catálogo com sucesso!');
      setTimeout(() => setQuickSaveMsg(null), 3000);
    } catch (err: any) {
      setQuickSaveMsg(`Erro: ${err.message}`);
      setTimeout(() => setQuickSaveMsg(null), 4000);
    } finally {
      setSavingQuick(false);
    }
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* HEADER / STATUS DA VINCULAÇÃO */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-black text-amber-500 dark:text-amber-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Registro & Denominação Oficial MAPA</span>
        </div>

        {matchedProduct ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            <Check className="w-3 h-3" />
            <span className="truncate max-w-[180px]">Catálogo: {matchedProduct.name}</span>
            <button
              type="button"
              onClick={handleClearLink}
              title="Desvincular do catálogo (manter texto)"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400">
            {mapaRegistration ? 'Entrada manual' : 'Selecione do catálogo ou digite'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* CAMPO: NÚMERO MAPA COM DROPDOWN INTELIGENTE */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Nº Registro MAPA do Rótulo
            </label>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                if (!dropdownOpen) setSearchQuery('');
              }}
              className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <Search className="w-2.5 h-2.5" />
              <span>{dropdownOpen ? 'Fechar busca' : 'Buscar no Catálogo'}</span>
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={mapaRegistration}
              onChange={(e) => {
                onChangeMapa(e.target.value);
                if (onChangeProductId) onChangeProductId(null);
              }}
              onFocus={() => {
                if (products.length > 0 && !mapaRegistration) setDropdownOpen(true);
              }}
              placeholder="Ex: SP 001234-5.000001"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-amber-300 focus:outline-none focus:border-amber-500"
            />
            {loading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 absolute right-3 top-2.5" />
            )}
          </div>

          {/* DROPDOWN FLUTUANTE DE SELEÇÃO */}
          {dropdownOpen && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Filtrar por nome, número MAPA ou estilo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    {products.length === 0 ? (
                      <div>
                        <p className="font-semibold">Nenhum rótulo cadastrado no catálogo.</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Você pode digitar o número manualmente ou cadastrar novos rótulos na aba Registros MAPA.
                        </p>
                      </div>
                    ) : (
                      <p>Nenhum produto corresponde a &quot;{searchQuery}&quot;.</p>
                    )}
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelect(p)}
                      className="w-full text-left p-2.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition flex items-center justify-between gap-2 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-300">
                            {p.name}
                          </span>
                          {p.style && (
                            <span className="text-[10px] text-slate-400">({p.style})</span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                          {p.mapaRegistration}
                        </div>
                        {p.commercialDenomination && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {p.commercialDenomination}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {p.status === 'ATIVO' ? 'Ativo' : p.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* CAMPO: DENOMINAÇÃO LEGAL COMERCIAL */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Denominação Legal / Comercial
          </label>
          <input
            type="text"
            value={commercialDenomination}
            onChange={(e) => onChangeDenomination(e.target.value)}
            placeholder="Ex: Cerveja Clara Puro Malte"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* QUICK SAVE TO CATALOG ACTION */}
      {mapaRegistration.trim().length > 3 && !matchedProduct && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">
            Este número MAPA ainda não está no catálogo da cervejaria.
          </span>
          <button
            type="button"
            onClick={handleQuickSaveToCatalog}
            disabled={savingQuick}
            className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {savingQuick ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>Salvar no Catálogo MAPA</span>
              </>
            )}
          </button>
        </div>
      )}

      {quickSaveMsg && (
        <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2">
          {quickSaveMsg}
        </div>
      )}
    </div>
  );
}
