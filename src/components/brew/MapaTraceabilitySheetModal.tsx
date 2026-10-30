'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Printer,
  ShieldCheck,
  Building2,
  Beer,
  Calendar,
  Layers,
  FileCheck,
  CheckCircle2,
  Edit3,
  Cylinder,
  Plus,
  Search,
  Check,
  AlertCircle,
  Tag,
  RefreshCw,
  ExternalLink,
  Download,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import BreweryEditModal from './BreweryEditModal';

interface BatchIngredient {
  id?: string;
  name: string;
  category: string;
  quantityUsed: number;
  unit: string;
  supplierName?: string | null;
  supplierLot?: string | null;
  expirationDate?: string | Date | null;
  harvestYear?: string | null;
  stage?: string | null;
  notes?: string | null;
}

interface MapaTraceabilitySheetModalProps {
  batch: any;
  brewery: any;
  onBreweryUpdated?: (updatedBrewery: any) => void;
  onClose?: () => void;
  isStandalone?: boolean;
  autoPrint?: boolean;
}

export default function MapaTraceabilitySheetModal({
  batch,
  brewery: initialBrewery,
  onBreweryUpdated,
  onClose,
  isStandalone = false,
  autoPrint = false,
}: MapaTraceabilitySheetModalProps) {
  const [brewery, setBrewery] = useState(initialBrewery);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullBatch, setFullBatch] = useState<any>(batch);
  const [loadingBatchDetails, setLoadingBatchDetails] = useState<boolean>(false);

  // Manual link keg state (interactive on screen, hidden on print)
  const [showLinkKegForm, setShowLinkKegForm] = useState(false);
  const [kegCodeInput, setKegCodeInput] = useState('');
  const [linkingKeg, setLinkingKeg] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBatchDetails = () => {
    if (!batch?.id) return;
    setLoadingBatchDetails(true);
    fetch(`/api/batches/${batch.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) {
          setFullBatch(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBatchDetails(false));
  };

  useEffect(() => {
    setBrewery(initialBrewery);
  }, [initialBrewery]);

  useEffect(() => {
    setFullBatch(batch);
    fetchBatchDetails();
  }, [batch?.id]);

  useEffect(() => {
    if (!initialBrewery) {
      fetch('/api/brewery')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && !data.error) {
            setBrewery(data);
            onBreweryUpdated?.(data);
          }
        })
        .catch(() => {});
    }
  }, [initialBrewery, onBreweryUpdated]);

  const currentBatch = fullBatch || batch;
  const ingredients: BatchIngredient[] = currentBatch.ingredients || [];
  const recipe = currentBatch.recipe || {};

  const handlePrint = () => {
    if (isStandalone) {
      const originalTitle = document.title;
      const batchNum = currentBatch.batchNumber || 'LOTE';
      const beerName = (recipe.name || currentBatch.recipeName || 'Cerveja').replace(/[^a-zA-Z0-9_-]/g, '_');
      document.title = `Ficha_Rastreabilidade_MAPA_Lote_${batchNum}_${beerName}`;

      window.print();

      setTimeout(() => {
        document.title = originalTitle;
      }, 1500);
    } else {
      // Abre a página dedicada e limpa de impressão em nova aba acionando o print
      window.open(`/producao/mapa/${currentBatch.id}?print=true`, '_blank');
    }
  };

  const handleOpenInNewTab = () => {
    window.open(`/producao/mapa/${currentBatch.id}`, '_blank');
  };

  // Disparo automático na página standalone se solicitado na URL (?print=true)
  useEffect(() => {
    if (isStandalone && autoPrint && currentBatch?.id) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isStandalone, autoPrint, currentBatch?.id]);

  // Deduplicate and aggregate all kegs that were envasados from this batch
  const envasadosKegs = useMemo(() => {
    const map = new Map<
      string,
      {
        id?: string;
        code: string;
        capacity: number;
        volumeLiters: number;
        kegType?: string;
        packagedAt?: string | Date | null;
        status?: string;
        clientName?: string | null;
        notes?: string | null;
      }
    >();

    // 1. Direct kegs linked to batch
    if (Array.isArray(currentBatch.kegs)) {
      currentBatch.kegs.forEach((k: any) => {
        if (!k || !k.code) return;
        const vol = k.currentVolumeLiters !== null && k.currentVolumeLiters !== undefined
          ? Number(k.currentVolumeLiters)
          : Number(k.capacity);
        const cleanCode = k.code.trim().toUpperCase();
        map.set(cleanCode, {
          id: k.id,
          code: cleanCode,
          capacity: Number(k.capacity) || 50,
          volumeLiters: vol,
          kegType: k.kegType || 'INOX_EURO',
          packagedAt: k.lastFilledAt || currentBatch.packagingDate || currentBatch.updatedAt,
          status: k.status,
          clientName: k.currentClient?.name || null,
          notes: k.notes,
        });
      });
    }

    // 2. Movements recorded for this batch
    if (Array.isArray(currentBatch.movements)) {
      currentBatch.movements.forEach((m: any) => {
        const kegObj = m.keg;
        let code = kegObj?.code;
        if (!code && m.notes) {
          const match = m.notes.match(/barril\s+([A-Z0-9_-]+)/i);
          if (match) code = match[1];
        }
        if (code) {
          const cleanCode = code.trim().toUpperCase();
          const cap = Number(kegObj?.capacity) || 50;
          const vol = Number(m.volumeLiters) ||
            (kegObj?.currentVolumeLiters !== null && kegObj?.currentVolumeLiters !== undefined
              ? Number(kegObj.currentVolumeLiters)
              : cap);

          if (!map.has(cleanCode)) {
            map.set(cleanCode, {
              id: kegObj?.id,
              code: cleanCode,
              capacity: cap,
              volumeLiters: vol,
              kegType: kegObj?.kegType || 'INOX_EURO',
              packagedAt: m.createdAt || currentBatch.packagingDate,
              status: kegObj?.status || 'EM_ESTOQUE',
              clientName: kegObj?.currentClient?.name || m.toClient?.name || null,
              notes: m.notes,
            });
          } else {
            const existing = map.get(cleanCode)!;
            if (m.createdAt && !existing.packagedAt) {
              existing.packagedAt = m.createdAt;
            }
            if (kegObj?.currentClient?.name && !existing.clientName) {
              existing.clientName = kegObj.currentClient.name;
            }
          }
        }
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [currentBatch]);

  const totalEnvasadoLiters = useMemo(() => {
    return envasadosKegs.reduce((acc, k) => acc + (k.volumeLiters || 0), 0);
  }, [envasadosKegs]);

  const capacitiesSummary = useMemo(() => {
    const counts: Record<number, number> = {};
    envasadosKegs.forEach((k) => {
      counts[k.capacity] = (counts[k.capacity] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([cap, count]) => `${count}x ${cap}L`)
      .join(' • ');
  }, [envasadosKegs]);

  const handleLinkKeg = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = kegCodeInput.trim().toUpperCase();
    if (!code) return;
    setLinkingKeg(true);
    setLinkFeedback(null);
    try {
      const res = await fetch('/api/kegs/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          action: 'FILL',
          batchId: currentBatch.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao vincular barril');
      setLinkFeedback({ type: 'success', text: `Barril ${code} vinculado com sucesso!` });
      setKegCodeInput('');
      fetchBatchDetails();
    } catch (err: any) {
      setLinkFeedback({ type: 'error', text: err.message });
    } finally {
      setLinkingKeg(false);
    }
  };

  const renderDocumentContent = () => (
    <div id="mapa-traceability-document" className="p-6 md:p-8 overflow-y-auto bg-white text-slate-900 font-sans print:p-0 print:m-0 print:overflow-visible text-xs leading-relaxed keep-white">
      {/* 1. CABEÇALHO OFICIAL MAPA */}
      <div className="border-b-2 border-slate-950 pb-4 mb-4 page-break-avoid print-avoid-break">
        {/* Faixa Institucional Oficial */}
            <div className="bg-slate-950 text-white px-3.5 py-2 rounded-md flex items-center justify-between mb-3 shadow-xs print:bg-slate-900 print:text-white print:rounded-none">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 print:text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Ministério da Agricultura e Pecuária • MAPA / DIPOV
                </span>
              </div>
              <span className="text-[9px] font-mono tracking-wider text-slate-300 print:text-slate-200">
                Decreto Federal nº 6.871/2009 • IN MAPA nº 65/2019
              </span>
            </div>

            <div className="flex justify-between items-start gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-[280px]">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase leading-none">
                    {brewery?.name || 'Cervejaria PintTech'}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="print:hidden text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded transition cursor-pointer"
                    title="Clique para editar CNPJ, Registro MAPA, Telefone e Endereço"
                  >
                    <Edit3 className="w-3 h-3 text-amber-600" />
                    <span>Editar dados cadastrais</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-700 space-y-0.5">
                  <p>
                    <strong>CNPJ:</strong>{' '}
                    {brewery?.document ? (
                      <span className="font-mono font-bold text-slate-950">{brewery.document}</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditModalOpen(true)}
                          className="text-amber-700 underline print:hidden font-medium cursor-pointer"
                        >
                          (Não cadastrado - clique aqui para editar)
                        </button>
                        <span className="hidden print:inline text-slate-500 italic font-mono">Não informado</span>
                      </>
                    )}{' '}
                    • <strong>Registro Estabelecimento MAPA:</strong>{' '}
                    {brewery?.mapaEstablishment ? (
                      <span className="font-mono font-bold text-slate-950">{brewery.mapaEstablishment}</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditModalOpen(true)}
                          className="text-amber-700 underline print:hidden font-medium cursor-pointer"
                        >
                          (Não cadastrado - clique aqui para editar)
                        </button>
                        <span className="hidden print:inline text-slate-500 italic font-mono">Não informado</span>
                      </>
                    )}
                  </p>

                  <p>
                    <strong>Endereço:</strong>{' '}
                    {brewery?.address || brewery?.city ? (
                      <>
                        {brewery?.address ? `${brewery.address} • ` : ''}
                        {brewery?.city ? `${brewery.city}` : ''}
                        {brewery?.city && brewery?.state ? `/${brewery.state}` : (brewery?.state || '')}
                      </>
                    ) : (
                      <span className="text-slate-500 italic">Endereço da fábrica</span>
                    )}
                    {brewery?.phone && ` • Tel: ${brewery.phone}`}
                  </p>
                </div>
              </div>

              <div className="text-right border-2 border-slate-950 rounded-lg p-2.5 bg-slate-50 min-w-[190px] shrink-0 print:bg-white print:border-slate-800">
                <span className="text-[9px] uppercase font-black tracking-wider text-slate-600 block">
                  Ficha de Rastreabilidade
                </span>
                <span className="text-2xl font-black font-mono text-slate-950 block my-0.5 tracking-tight">
                  LOTE {currentBatch.batchNumber}
                </span>
                <span className="text-[9px] text-slate-600 font-mono block">
                  Emissão: {new Date().toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Dados do Produto & Identificação do Lote */}
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-4 space-y-2 page-break-avoid print-avoid-break print:bg-slate-50 print:border-slate-400">
            <h4 className="text-[11px] font-black uppercase text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5">
              <Beer className="w-3.5 h-3.5 text-slate-700" />
              <span>1. Identificação do Produto e Registro MAPA</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Nome Comercial:</span>
                <strong className="text-slate-950 font-bold">{recipe.name || 'Cerveja Artesanal'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Estilo Cervejeiro:</span>
                <span className="text-slate-800">{recipe.style || 'Standard'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Registro MAPA do Rótulo:</span>
                <strong className="text-slate-900 font-mono">
                  {currentBatch.mapaRegistration || recipe.mapaRegistration || 'SP 001234-5.000001'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Denominação Legal MAPA:</span>
                <span className="text-slate-800">
                  {currentBatch.commercialDenomination || recipe.commercialDenomination || 'Cerveja Clara Puro Malte'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
              <div>
                <span className="text-slate-500 block text-[10px]">Data da Brassagem:</span>
                <span className="text-slate-900 font-bold">{formatDate(currentBatch.brewDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Tanque de Fermentação:</span>
                <span className="text-slate-900 font-bold">{currentBatch.tank?.name || 'Tanque da Adega'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Volume Planejado / Real:</span>
                <span className="text-slate-900 font-bold">
                  {currentBatch.volumeProducedLiters || currentBatch.volumePlannedLiters} Litros
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Responsável Técnico (CRQ):</span>
                <span className="text-slate-900 font-bold">
                  {currentBatch.technicalResponsible || 'Eng. Químico / Cervejeiro Responsável'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Tabela de Rastreabilidade de Insumos (Coração da Exigência MAPA) */}
          <div className="mb-4">
            <h4 className="text-[11px] font-black uppercase text-slate-800 border-b-2 border-slate-900 pb-1 mb-2 flex items-center justify-between">
              <span>2. Rastreabilidade de Matérias-Primas e Insumos Utilizados</span>
              <span className="text-[10px] font-normal text-slate-500 lowercase">
                ({ingredients.length} itens registrados)
              </span>
            </h4>

            {ingredients.length === 0 ? (
              <p className="text-slate-500 italic p-3 bg-slate-50 border border-dashed rounded text-center">
                Nenhum insumo associado a este lote.
              </p>
            ) : (
              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="border border-slate-300 p-1.5 text-left">Matéria-Prima / Insumo</th>
                    <th className="border border-slate-300 p-1.5 text-center w-20">Categoria</th>
                    <th className="border border-slate-300 p-1.5 text-right w-20">Quantidade</th>
                    <th className="border border-slate-300 p-1.5 text-left w-36">Fornecedor / Fabricante</th>
                    <th className="border border-slate-300 p-1.5 text-left w-32 bg-amber-50 text-slate-950 font-black">
                      Nº do Lote
                    </th>
                    <th className="border border-slate-300 p-1.5 text-center w-20">Validade / Safra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ingredients.map((ing, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="border border-slate-300 p-1.5 font-bold text-slate-900">
                        {ing.name}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center text-slate-600 uppercase font-semibold">
                        {ing.category}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-slate-900">
                        {ing.quantityUsed} {ing.unit}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-slate-800 font-medium">
                        {ing.supplierName || 'Fornecedor Cadastrado'}
                      </td>
                      <td className="border border-slate-300 p-1.5 font-mono font-bold text-slate-950 bg-amber-50/60">
                        {ing.supplierLot || <span className="text-red-500 font-normal">Não informado</span>}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center text-slate-600 font-mono">
                        {ing.expirationDate ? formatDate(ing.expirationDate) : ing.harvestYear || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 4. Controle Físico-Químico e Parâmetros de Processo */}
          <div className="border border-slate-300 rounded-lg p-3 mb-4 bg-slate-50 space-y-2 page-break-avoid print-avoid-break print:bg-slate-50 print:border-slate-400">
            <h4 className="text-[11px] font-black uppercase text-slate-800 border-b border-slate-200 pb-1">
              3. Parâmetros Físico-Químicos e Controle de Qualidade
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px]">
              <div>
                <span className="text-slate-500 block">OG (Inicial):</span>
                <strong className="font-mono text-slate-900">{currentBatch.measuredOg || recipe.og || '1.050'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">FG (Final):</span>
                <strong className="font-mono text-slate-900">{currentBatch.measuredFg || recipe.fg || '1.010'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Teor Alcoólico:</span>
                <strong className="font-mono text-slate-900">{currentBatch.measuredAbv || recipe.abv || '5.0'}% v/v</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Amargor Real:</span>
                <strong className="font-mono text-slate-900">{currentBatch.measuredIbu || recipe.ibu || '25'} IBU</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Cor da Cerveja:</span>
                <strong className="font-mono text-slate-900">{currentBatch.measuredEbc || recipe.ebc || '10'} EBC</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Atenuação Real:</span>
                <strong className="font-mono text-slate-900">{currentBatch.attenuationPercent || '80'}%</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-slate-200">
              <div>
                <span className="text-slate-500 block">Mostura (pH & Temperatura):</span>
                <span className="font-mono font-bold text-slate-900">
                  {(() => {
                    if (currentBatch.customRecipeDataJson) {
                      try {
                        const parsed = JSON.parse(currentBatch.customRecipeDataJson);
                        const list = parsed.mashList || parsed.mashPhList;
                        if (Array.isArray(list) && list.length > 0) {
                          const valid = list.filter((m: any) => m.ph || m.tempCelsius);
                          if (valid.length > 1) {
                            return valid.map((m: any) => `${m.name}: pH ${m.ph || '—'}${m.tempCelsius ? ` (${m.tempCelsius}°C)` : ''}`).join(' • ');
                          } else if (valid.length === 1) {
                            const single = valid[0];
                            return `pH ${single.ph || currentBatch.phMash || '5.30'}${single.tempCelsius ? ` (${single.tempCelsius}°C)` : ''}`;
                          }
                        }
                      } catch (e) {}
                    }
                    return `pH ${currentBatch.phMash || '5.30'}${currentBatch.tempMash ? ` (${currentBatch.tempMash}°C)` : ''}`;
                  })()}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Fervura (pH):</span>
                <span className="font-mono font-bold text-slate-900">
                  {(() => {
                    if (currentBatch.customRecipeDataJson) {
                      try {
                        const parsed = JSON.parse(currentBatch.customRecipeDataJson);
                        if (Array.isArray(parsed.boilPhList) && parsed.boilPhList.length > 1) {
                          const valid = parsed.boilPhList.filter((b: any) => b.ph);
                          if (valid.length > 0) {
                            return valid.map((b: any) => `${b.name}: pH ${b.ph}`).join(' • ');
                          }
                        }
                      } catch (e) {}
                    }
                    return currentBatch.phBoil ? `pH ${currentBatch.phBoil}` : 'pH 5.10';
                  })()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-1.5 border-t border-slate-200">
              <div>
                <span className="text-slate-500 block">pH Início Fermentação:</span>
                <span className="font-mono text-slate-900">{currentBatch.phFermentationStart || '5.05'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">pH Final / Envase:</span>
                <span className="font-mono text-slate-900 font-bold">{currentBatch.phFinal || '4.30'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Temp. Fermentação:</span>
                <span className="font-mono text-slate-900">{currentBatch.tempFermentation ? `${currentBatch.tempFermentation}°C` : '19.0°C'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Levedura (Cepa & Lote):</span>
                <span className="font-bold text-slate-900 truncate block">
                  {currentBatch.yeastStrain || 'Fermentis US-05'} {currentBatch.yeastLot ? `(Lt: ${currentBatch.yeastLot})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Rastreabilidade de Envase & Numeração dos Barris Envasados (Exigência MAPA) */}
          <div className="mb-4">
            <div className="border-b-2 border-slate-900 pb-1 mb-2 flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-[11px] font-black uppercase text-slate-800 flex items-center gap-1.5">
                <Cylinder className="w-3.5 h-3.5 text-slate-700" />
                <span>4. Rastreabilidade de Envase & Numeração dos Barris Envasados</span>
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-700">
                  {envasadosKegs.length > 0 ? (
                    <>
                      <span className="font-black text-slate-950">{envasadosKegs.length} barril(is)</span>
                      <span className="mx-1 text-slate-400">•</span>
                      <span className="font-mono font-bold text-slate-950">{totalEnvasadoLiters.toFixed(1)} Litros envasados</span>
                      {capacitiesSummary && (
                        <>
                          <span className="mx-1 text-slate-400">•</span>
                          <span className="text-slate-600 font-medium">({capacitiesSummary})</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 font-normal lowercase">(nenhum barril registrado)</span>
                  )}
                </span>

                {/* Botão de Vincular Barril Manualmente (Apenas em tela, oculto em impressão) */}
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkKegForm(!showLinkKegForm);
                    setLinkFeedback(null);
                  }}
                  className="print:hidden text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-300 transition flex items-center gap-1 cursor-pointer"
                  title="Vincular código de barril manualmente a este lote"
                >
                  <Plus className="w-3 h-3 text-amber-600" />
                  <span>{showLinkKegForm ? 'Fechar' : 'Vincular Barril'}</span>
                </button>
              </div>
            </div>

            {/* Painel Interativo de Vínculo Manual (Oculto na Impressão) */}
            {showLinkKegForm && (
              <div className="print:hidden p-3 bg-amber-50/70 border border-amber-300 rounded-xl mb-3 space-y-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Cylinder className="w-3.5 h-3.5 text-amber-700" />
                    Vincular Barril ao Lote {currentBatch.batchNumber}
                  </span>
                  <span className="text-[10px] text-amber-800">
                    Bipe com leitor ou digite o código do vasilhame
                  </span>
                </div>

                <form onSubmit={handleLinkKeg} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={kegCodeInput}
                    onChange={(e) => setKegCodeInput(e.target.value)}
                    placeholder="Ex: B-01, B-042, BAR-10..."
                    className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={linkingKeg || !kegCodeInput.trim()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    {linkingKeg ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>{linkingKeg ? 'Vinculando...' : 'Vincular ao Lote'}</span>
                  </button>
                </form>

                {linkFeedback && (
                  <p
                    className={`text-xs font-bold flex items-center gap-1 ${
                      linkFeedback.type === 'success' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {linkFeedback.type === 'success' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{linkFeedback.text}</span>
                  </p>
                )}
              </div>
            )}

            {envasadosKegs.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-600 text-[10px] flex items-center justify-between">
                <span>
                  Nenhum barril individual associado a este lote até o momento. (Os barris bipados via scanner ou vinculados manualmente aparecerão discriminados aqui).
                </span>
                {currentBatch.volumeProducedLiters && (
                  <span className="font-bold text-slate-900 ml-2 shrink-0">
                    Volume envasado registrado no lote: {currentBatch.volumeProducedLiters}L
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Relação Rápida de Códigos dos Barris (Tags de Inspeção Rápida MAPA) */}
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg print:border-slate-300">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase font-black tracking-wider text-slate-700">
                      Relação dos Números dos Barris ({envasadosKegs.length}):
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      Total: {totalEnvasadoLiters.toFixed(1)}L
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {envasadosKegs.map((k) => (
                      <span
                        key={k.code}
                        className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-950 shadow-2xs print:border-slate-400"
                      >
                        {k.code}
                        <span className="text-[8px] text-slate-500 font-sans ml-1">
                          ({k.volumeLiters}L)
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tabela Formal dos Barris para Auditoria e Fiscalização */}
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="border border-slate-300 p-1.5 text-left w-24">Nº do Barril</th>
                      <th className="border border-slate-300 p-1.5 text-center w-20">Capacidade</th>
                      <th className="border border-slate-300 p-1.5 text-center w-24 bg-amber-50/70 text-slate-950 font-black">
                        Volume Envasado
                      </th>
                      <th className="border border-slate-300 p-1.5 text-left w-28">Tipo de Vasilhame</th>
                      <th className="border border-slate-300 p-1.5 text-center w-24">Data do Envase</th>
                      <th className="border border-slate-300 p-1.5 text-left">Status Atual / Destino</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {envasadosKegs.map((k, idx) => (
                      <tr key={k.code} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-300 p-1.5 font-mono font-bold text-slate-950 text-xs">
                          {k.code}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono text-slate-700">
                          {k.capacity} L
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-slate-950 bg-amber-50/40">
                          {k.volumeLiters.toFixed(1)} L
                          {k.volumeLiters < k.capacity && (
                            <span className="block text-[8px] text-purple-700 font-sans font-normal">
                              (Envase Parcial)
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-slate-700 uppercase text-[9px]">
                          {k.kegType ? k.kegType.replace('_', ' ') : 'INOX EURO'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center text-slate-700 font-mono">
                          {k.packagedAt ? formatDate(k.packagedAt) : '—'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-slate-800">
                          {(() => {
                            if (k.clientName) {
                              return (
                                <span className="font-semibold text-slate-900">
                                  Em Cliente: <span className="font-bold">{k.clientName}</span>
                                </span>
                              );
                            }
                            switch (k.status) {
                              case 'EM_ESTOQUE':
                              case 'ENVASADO':
                                return <span className="text-emerald-700 font-bold">Em Estoque (Câmara Fria)</span>;
                              case 'NO_CLIENTE':
                                return <span className="text-blue-700 font-bold">Em Ponto de Venda / Cliente</span>;
                              case 'EM_TRANSITO':
                                return <span className="text-amber-700 font-bold">Em Transporte / Entrega</span>;
                              case 'VAZIO_SUJO':
                                return <span className="text-slate-600">Recolhido / Fila de Limpeza CIP</span>;
                              case 'HIGIENIZADO':
                                return <span className="text-slate-500">Higienizado (Próximo Ciclo)</span>;
                              default:
                                return <span className="text-slate-700">{k.status || 'Envasado'}</span>;
                            }
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-950 border-t border-slate-300 text-[10px]">
                      <td className="border border-slate-300 p-1.5">
                        Total: {envasadosKegs.length} barril(is)
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center">
                        —
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono bg-amber-100 text-slate-950">
                        {totalEnvasadoLiters.toFixed(1)} L
                      </td>
                      <td colSpan={3} className="border border-slate-300 p-1.5 text-slate-600 font-normal">
                        Numeração dos vasilhames conferida e registrada para conformidade regulatória.
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>


          {/* 6. Declaração Legal e Assinatura */}
          <div className="border-t-2 border-slate-900 pt-4 mt-6 page-break-avoid print-avoid-break">
            <p className="text-[9px] text-slate-600 text-justify mb-8 leading-relaxed">
              Declaro sob as penas da lei que o produto especificado neste dossiê foi elaborado em estrita conformidade com os
              padrões de identidade e qualidade estabelecidos pelo Ministério da Agricultura e Pecuária (MAPA), respeitando as
              boas práticas de fabricação e com matérias-primas devidamente inspecionadas e rastreadas por lote de fabricação.
            </p>

            <div className="grid grid-cols-2 gap-8 text-center pt-2">
              <div>
                <div className="border-b border-slate-900 w-64 mx-auto mb-1.5" />
                <span className="text-[10px] font-bold text-slate-950 block">
                  {currentBatch.technicalResponsible || 'Responsável Técnico / Cervejeiro'}
                </span>
                <span className="text-[9px] text-slate-600">Mestre Cervejeiro / CRQ</span>
              </div>

              <div>
                <div className="border-b border-slate-900 w-64 mx-auto mb-1.5" />
                <span className="text-[10px] font-bold text-slate-950 block">
                  Controle de Qualidade & Liberação Sensorial
                </span>
                <span className="text-[9px] text-slate-600">Data de Liberação: ____/____/________</span>
              </div>
            </div>

            {/* Rodapé Oficial da Ficha (Exibido na impressão e exportação) */}
            <div className="hidden print:flex items-center justify-between text-[8px] text-slate-500 pt-6 mt-6 border-t border-slate-300 font-mono">
              <span>PintTech • Ficha Oficial de Rastreabilidade MAPA — Lote #{currentBatch.batchNumber}</span>
              <span>Em conformidade com o Decreto Federal nº 6.871/2009 e IN MAPA nº 65/2019</span>
              <span>Emitido em: {new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
  );

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-6 px-4 sm:px-6 print:p-0 print:bg-white">
        {/* Floating Action Bar */}
        <div className="max-w-4xl mx-auto mb-6 print:hidden">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/producao"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Produção</span>
              </Link>
              <div className="hidden sm:block">
                <h3 className="text-sm font-bold text-white">Dossiê Oficial de Rastreabilidade MAPA</h3>
                <p className="text-xs text-slate-400">Lote {currentBatch.batchNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Editar Cadastro</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Salvar como PDF / Imprimir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Document container */}
        <div className="max-w-4xl mx-auto bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none print:max-w-none">
          {renderDocumentContent()}
        </div>

        {/* Modal de Edição de Dados Cadastrais da Cervejaria */}
        <BreweryEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          brewery={brewery}
          onSuccess={(updated) => {
            setBrewery(updated);
            onBreweryUpdated?.(updated);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mapa-print-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto print:static print:p-0 print:bg-white print:overflow-visible">
      {/* Container Principal */}
      <div className="mapa-print-card relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] print:max-w-none print:w-full print:m-0 print:p-0 print:border-none print:shadow-none print:bg-white print:max-h-none print:overflow-visible">
        {/* Top Action Bar (Ocultada na Impressão) */}
        <div className="print:hidden p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Dossiê Oficial de Rastreabilidade MAPA</h3>
              <p className="text-xs text-slate-400">
                Lote {currentBatch.batchNumber} • Pronto para apresentação a fiscais, auditoria e exportação em PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition shadow-sm cursor-pointer"
              title="Atualizar dados cadastrais da cervejaria (CNPJ, Registro MAPA, Telefone, etc.)"
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Editar Cadastro</span>
            </button>

            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition shadow-sm cursor-pointer"
              title="Abrir este relatório em uma nova aba limpa para visualização e impressão"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Abrir em Nova Aba</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg transition active:scale-95 cursor-pointer"
              title="Gera o arquivo PDF oficial sem elementos da tela"
            >
              <Printer className="w-4 h-4" />
              <span>Salvar como PDF / Imprimir</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ÁREA IMPRIMÍVEL (A4 FORMAL) */}
        {renderDocumentContent()}
      </div>

      {/* Modal de Edição de Dados Cadastrais da Cervejaria */}
      <BreweryEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        brewery={brewery}
        onSuccess={(updated) => {
          setBrewery(updated);
          onBreweryUpdated?.(updated);
        }}
      />
    </div>
  );
}

