'use client';

import React, { useState, useEffect } from 'react';
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
  onClose: () => void;
}

export default function MapaTraceabilitySheetModal({
  batch,
  brewery: initialBrewery,
  onBreweryUpdated,
  onClose,
}: MapaTraceabilitySheetModalProps) {
  const [brewery, setBrewery] = useState(initialBrewery);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    setBrewery(initialBrewery);
  }, [initialBrewery]);

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

  const handlePrint = () => {
    window.print();
  };

  const ingredients: BatchIngredient[] = batch.ingredients || [];
  const recipe = batch.recipe || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Container Principal */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Top Action Bar (Ocultada na Impressão) */}
        <div className="print:hidden p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Dossiê Oficial de Rastreabilidade MAPA</h3>
              <p className="text-xs text-slate-400">
                Lote {batch.batchNumber} • Pronto para apresentação a fiscais e auditoria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-2 border border-slate-700 transition shadow-sm"
              title="Atualizar dados cadastrais da cervejaria (CNPJ, Registro MAPA, Telefone, etc.)"
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Editar Cadastro</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ficha Oficial (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ÁREA IMPRIMÍVEL (A4 FORMAL) */}
        <div className="p-6 md:p-8 overflow-y-auto bg-white text-slate-900 font-sans print:p-0 print:m-0 print:overflow-visible text-xs leading-relaxed">
          {/* 1. Cabeçalho Oficial */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-start">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-black tracking-tight text-slate-950 uppercase">
                  {brewery?.name || 'Cervejaria PintTech'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700">
                  MAPA / DECRETO 6.871/2009
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="print:hidden text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 ml-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded transition cursor-pointer"
                  title="Clique para editar CNPJ, Registro MAPA, Telefone e Endereço"
                >
                  <Edit3 className="w-3 h-3 text-amber-600" />
                  <span>Editar dados cadastrais</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                <strong>CNPJ:</strong>{' '}
                {brewery?.document || (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-amber-700 underline print:no-underline print:text-slate-400 font-medium cursor-pointer"
                  >
                    (Não cadastrado - clique aqui para editar)
                  </button>
                )}{' '}
                • <strong>Registro Estabelecimento MAPA:</strong>{' '}
                {brewery?.mapaEstablishment || (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-amber-700 underline print:no-underline print:text-slate-400 font-medium cursor-pointer"
                  >
                    (Não cadastrado - clique aqui para editar)
                  </button>
                )}
              </p>
              <p className="text-[11px] text-slate-600">
                {brewery?.address ? `${brewery.address} • ` : ''}
                {brewery?.city ? `${brewery.city}` : ''}
                {brewery?.city && brewery?.state ? `/${brewery.state}` : (brewery?.state || '')}
                {brewery?.phone ? (
                  ` • Telefone: ${brewery.phone}`
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-amber-700 underline print:hidden ml-1 cursor-pointer"
                  >
                    • Telefone: não cadastrado
                  </button>
                )}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">
                Ficha de Rastreabilidade
              </span>
              <span className="text-xl font-black font-mono text-slate-950 block">
                {batch.batchNumber}
              </span>
              <span className="text-[10px] text-slate-500">
                Emitido em: {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* 2. Dados do Produto & Identificação do Lote */}
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-4 space-y-2">
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
                  {batch.mapaRegistration || recipe.mapaRegistration || 'SP 001234-5.000001'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Denominação Legal MAPA:</span>
                <span className="text-slate-800">
                  {batch.commercialDenomination || recipe.commercialDenomination || 'Cerveja Clara Puro Malte'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
              <div>
                <span className="text-slate-500 block text-[10px]">Data da Brassagem:</span>
                <span className="text-slate-900 font-bold">{formatDate(batch.brewDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Tanque de Fermentação:</span>
                <span className="text-slate-900 font-bold">{batch.tank?.name || 'Tanque da Adega'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Volume Planejado / Real:</span>
                <span className="text-slate-900 font-bold">
                  {batch.volumeProducedLiters || batch.volumePlannedLiters} Litros
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Responsável Técnico (CRQ):</span>
                <span className="text-slate-900 font-bold">
                  {batch.technicalResponsible || 'Eng. Químico / Cervejeiro Responsável'}
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
          <div className="border border-slate-300 rounded-lg p-3 mb-4 bg-slate-50 space-y-2">
            <h4 className="text-[11px] font-black uppercase text-slate-800 border-b border-slate-200 pb-1">
              3. Parâmetros Físico-Químicos e Controle de Qualidade
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px]">
              <div>
                <span className="text-slate-500 block">OG (Inicial):</span>
                <strong className="font-mono text-slate-900">{batch.measuredOg || recipe.og || '1.050'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">FG (Final):</span>
                <strong className="font-mono text-slate-900">{batch.measuredFg || recipe.fg || '1.010'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Teor Alcoólico:</span>
                <strong className="font-mono text-slate-900">{batch.measuredAbv || recipe.abv || '5.0'}% v/v</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Amargor Real:</span>
                <strong className="font-mono text-slate-900">{batch.measuredIbu || recipe.ibu || '25'} IBU</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Cor da Cerveja:</span>
                <strong className="font-mono text-slate-900">{batch.measuredEbc || recipe.ebc || '10'} EBC</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Atenuação Real:</span>
                <strong className="font-mono text-slate-900">{batch.attenuationPercent || '80'}%</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-slate-200">
              <div>
                <span className="text-slate-500 block">Mostura (pH & Temperatura):</span>
                <span className="font-mono font-bold text-slate-900">
                  {(() => {
                    if (batch.customRecipeDataJson) {
                      try {
                        const parsed = JSON.parse(batch.customRecipeDataJson);
                        const list = parsed.mashList || parsed.mashPhList;
                        if (Array.isArray(list) && list.length > 0) {
                          const valid = list.filter((m: any) => m.ph || m.tempCelsius);
                          if (valid.length > 1) {
                            return valid.map((m: any) => `${m.name}: pH ${m.ph || '—'}${m.tempCelsius ? ` (${m.tempCelsius}°C)` : ''}`).join(' • ');
                          } else if (valid.length === 1) {
                            const single = valid[0];
                            return `pH ${single.ph || batch.phMash || '5.30'}${single.tempCelsius ? ` (${single.tempCelsius}°C)` : ''}`;
                          }
                        }
                      } catch (e) {}
                    }
                    return `pH ${batch.phMash || '5.30'}${batch.tempMash ? ` (${batch.tempMash}°C)` : ''}`;
                  })()}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Fervura (pH):</span>
                <span className="font-mono font-bold text-slate-900">
                  {(() => {
                    if (batch.customRecipeDataJson) {
                      try {
                        const parsed = JSON.parse(batch.customRecipeDataJson);
                        if (Array.isArray(parsed.boilPhList) && parsed.boilPhList.length > 1) {
                          const valid = parsed.boilPhList.filter((b: any) => b.ph);
                          if (valid.length > 0) {
                            return valid.map((b: any) => `${b.name}: pH ${b.ph}`).join(' • ');
                          }
                        }
                      } catch (e) {}
                    }
                    return batch.phBoil ? `pH ${batch.phBoil}` : 'pH 5.10';
                  })()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-1.5 border-t border-slate-200">
              <div>
                <span className="text-slate-500 block">pH Início Fermentação:</span>
                <span className="font-mono text-slate-900">{batch.phFermentationStart || '5.05'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">pH Final / Envase:</span>
                <span className="font-mono text-slate-900 font-bold">{batch.phFinal || '4.30'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Temp. Fermentação:</span>
                <span className="font-mono text-slate-900">{batch.tempFermentation ? `${batch.tempFermentation}°C` : '19.0°C'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Levedura (Cepa & Lote):</span>
                <span className="font-bold text-slate-900 truncate block">
                  {batch.yeastStrain || 'Fermentis US-05'} {batch.yeastLot ? `(Lt: ${batch.yeastLot})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Observações da Receita e Processo */}
          {(batch.notes || recipe.description) && (
            <div className="border border-slate-300 rounded-lg p-3 mb-4 bg-white text-[11px]">
              <h4 className="text-[10px] font-black uppercase text-slate-700 mb-1">
                4. Observações Técnicas da Receita & Lote
              </h4>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                {batch.notes || recipe.description}
              </p>
            </div>
          )}

          {/* 6. Declaração Legal e Assinatura */}
          <div className="border-t-2 border-slate-900 pt-4 mt-6">
            <p className="text-[9px] text-slate-500 text-justify mb-8">
              Declaro sob as penas da lei que o produto especificado neste dossiê foi elaborado em estrita conformidade com os
              padrões de identidade e qualidade estabelecidos pelo Ministério da Agricultura e Pecuária (MAPA), respeitando as
              boas práticas de fabricação e com matérias-primas devidamente inspecionadas e rastreadas por lote de fabricação.
            </p>

            <div className="grid grid-cols-2 gap-8 text-center pt-2">
              <div>
                <div className="border-b border-slate-800 w-64 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-950 block">
                  {batch.technicalResponsible || 'Responsável Técnico / Cervejeiro'}
                </span>
                <span className="text-[9px] text-slate-500">Mestre Cervejeiro / CRQ</span>
              </div>

              <div>
                <div className="border-b border-slate-800 w-64 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-950 block">
                  Controle de Qualidade & Liberação Sensorial
                </span>
                <span className="text-[9px] text-slate-500">Data: ____/____/________</span>
              </div>
            </div>
          </div>
        </div>
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

