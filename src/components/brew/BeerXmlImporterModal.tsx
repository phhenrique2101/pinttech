'use client';

import React, { useState } from 'react';
import {
  X,
  FileCode,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Droplets,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Building2,
  Beer,
  Tag,
  Check,
  FileText,
} from 'lucide-react';
import { parseBeerXml, ParsedBeerXmlRecipe } from '@/lib/brewing/beerXml';
import { getLocalDateString } from '@/lib/utils';

interface IngredientRow {
  id: string;
  name: string;
  category: string;
  amount: number;
  unit: string;
  stage: string;
  supplierName: string;
  supplierLot: string;
  expirationDate: string;
  harvestYear: string;
}

interface BeerXmlImporterModalProps {
  tanks: any[];
  onClose: () => void;
  onBatchCreated: (batch: any) => void;
}

export default function BeerXmlImporterModal({
  tanks = [],
  onClose,
  onBatchCreated,
}: BeerXmlImporterModalProps) {
  const [step, setStep] = useState<'UPLOAD' | 'MAPA_FORM'>('UPLOAD');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRecipe, setParsedRecipe] = useState<ParsedBeerXmlRecipe | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);

  // MAPA & Batch Form States
  const [batchNumber, setBatchNumber] = useState<string>(`LOTE-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
  const [tankId, setTankId] = useState<string>('');
  const [mapaRegistration, setMapaRegistration] = useState<string>('SP 001234-5.000001');
  const [commercialDenomination, setCommercialDenomination] = useState<string>('');
  const [technicalResponsible, setTechnicalResponsible] = useState<string>('Mestre Cervejeiro / CRQ');
  const [brewDate, setBrewDate] = useState<string>(getLocalDateString());
  const [initialStatus, setInitialStatus] = useState<'FERMENTANDO' | 'BRASSAGEM'>('FERMENTANDO');
  const [recipeNotes, setRecipeNotes] = useState<string>('');

  // Ingredients rows for MAPA traceability
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);

  const handleFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setError('Arquivo vazio ou ilegível');
        return;
      }

      setFileContent(text);
      try {
        const recipes = parseBeerXml(text);
        if (recipes.length === 0) {
          setError('Nenhuma receita cervejeira reconhecida no formato BeerXML');
        } else {
          const rec = recipes[0];
          setParsedRecipe(rec);
          setRecipeNotes(rec.notes || rec.tasteNotes || '');
          setCommercialDenomination(`Cerveja Clara Puro Malte Tipo ${rec.style}`);

          // Suggest empty tank if available
          const freeTank = tanks.find((t) => t.status === 'LIVRE');
          if (freeTank) setTankId(freeTank.id);

          // Build ingredients list for MAPA traceability
          const ingRows: IngredientRow[] = [];

          // 1. Fermentáveis / Maltes
          (rec.fermentables || []).forEach((f, idx) => {
            ingRows.push({
              id: `f-${idx}`,
              name: f.name,
              category: f.category || 'MALTE',
              amount: f.amountKg,
              unit: 'KG',
              stage: 'MOSTURA',
              supplierName: f.name.toLowerCase().includes('agr') ? 'Agrária Malte' : f.name.toLowerCase().includes('weyer') ? 'Weyermann' : 'Agrária Malte',
              supplierLot: '',
              expirationDate: '',
              harvestYear: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`,
            });
          });

          // 2. Lúpulos
          (rec.hops || []).forEach((h, idx) => {
            ingRows.push({
              id: `h-${idx}`,
              name: h.name,
              category: 'LUPULO',
              amount: h.amountGrams,
              unit: 'G',
              stage: h.use === 'FIRST_WORT' ? 'FIRST_WORT' : h.use === 'WHIRLPOOL' ? 'WHIRLPOOL' : h.use === 'DRY_HOP' ? 'DRY_HOPPING' : 'FERVURA_60MIN',
              supplierName: 'BarthHaas Brasil',
              supplierLot: '',
              expirationDate: '',
              harvestYear: `${new Date().getFullYear() - 1}`,
            });
          });

          // 3. Levedura
          if (rec.yeast) {
            ingRows.push({
              id: `y-0`,
              name: rec.yeast.name,
              category: 'LEVEDURA',
              amount: 1,
              unit: 'PACOTE',
              stage: 'FERMENTACAO',
              supplierName: rec.yeast.name.toLowerCase().includes('fermentis') ? 'Fermentis / LNF' : 'Lallemand',
              supplierLot: '',
              expirationDate: '',
              harvestYear: '',
            });
          }

          // 4. Miscs / Adjuntos
          (rec.miscs || []).forEach((m, idx) => {
            ingRows.push({
              id: `m-${idx}`,
              name: m.name,
              category: 'ADJUNTO',
              amount: m.amount,
              unit: m.unit,
              stage: m.use === 'Mash' ? 'MOSTURA' : 'FERVURA_15MIN',
              supplierName: 'Fornecedor Cadastrado',
              supplierLot: '',
              expirationDate: '',
              harvestYear: '',
            });
          });

          setIngredients(ingRows);
          setStep('MAPA_FORM');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao processar estrutura XML do arquivo');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const updateIngredientField = (id: string, field: keyof IngredientRow, value: any) => {
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  const handleSubmitTraceabilityAndBatch = async () => {
    if (!parsedRecipe) return;
    setLoading(true);
    setError('');

    try {
      // 1. Criar ou sincronizar a Receita
      const resRecipe = await fetch('/api/recipes/import-beerxml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent: fileContent }),
      });

      const recipeData = await resRecipe.json();
      if (!resRecipe.ok) throw new Error(recipeData.error || 'Erro ao salvar dados da receita');

      const createdRecipe = recipeData.recipes && recipeData.recipes[0] ? recipeData.recipes[0] : null;
      if (!createdRecipe) throw new Error('Falha ao obter ID da receita importada');

      // 2. Criar o Lote de Produção diretamente no Tanque com a Rastreabilidade de Insumos MAPA
      const payloadBatch = {
        recipeId: createdRecipe.id,
        batchNumber: batchNumber.trim().toUpperCase(),
        tankId: tankId || null,
        status: initialStatus,
        volumePlannedLiters: parsedRecipe.batchYieldLiters || 500,
        volumeProducedLiters: parsedRecipe.batchYieldLiters || 500,
        brewDate: brewDate || getLocalDateString(),
        measuredOg: parsedRecipe.og || 1.050,
        measuredFg: parsedRecipe.fg || 1.010,
        measuredAbv: parsedRecipe.abv || 5.0,
        measuredIbu: parsedRecipe.ibu || 25,
        measuredEbc: parsedRecipe.ebc || 10,
        mapaRegistration: mapaRegistration.trim(),
        commercialDenomination: commercialDenomination.trim(),
        technicalResponsible: technicalResponsible.trim(),
        notes: recipeNotes.trim() || undefined,
        yeastStrain: parsedRecipe.yeast?.name || null,
        yeastLot: ingredients.find((i) => i.category === 'LEVEDURA')?.supplierLot || 'LOTE-LEV-PADRAO',
        deductStock: false, // ZERO VÍNCULO OU BLOQUEIO DE ESTOQUE DE INSUMOS!
        ingredients: ingredients.map((ing) => ({
          name: ing.name,
          category: ing.category,
          quantityUsed: ing.amount,
          unit: ing.unit,
          stage: ing.stage,
          supplierName: ing.supplierName.trim() || 'Fornecedor Geral',
          supplierLot: ing.supplierLot.trim() || 'LOTE-NAO-INFORMADO',
          expirationDate: ing.expirationDate || null,
          harvestYear: ing.harvestYear || null,
        })),
      };

      const resBatch = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBatch),
      });

      const batchData = await resBatch.json();
      if (!resBatch.ok) throw new Error(batchData.error || 'Erro ao criar lote de produção');

      onBatchCreated(batchData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar rastreabilidade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Rastreabilidade MAPA via BeerXML</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 uppercase">
                  BeerSmith / Brewfather
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {step === 'UPLOAD'
                  ? 'Selecione o arquivo .xml da sua receita pronta para extrair insumos e parâmetros'
                  : `Receita: ${parsedRecipe?.name} (${parsedRecipe?.style}) • Registre os lotes para o MAPA`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: UPLOAD DO XML */}
          {step === 'UPLOAD' && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
                  dragActive
                    ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-950/40'
                }`}
                onClick={() => document.getElementById('beerXmlFileInput')?.click()}
              >
                <input
                  id="beerXmlFileInput"
                  type="file"
                  accept=".xml,.beerxml"
                  className="hidden"
                  onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
                />

                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <h4 className="text-lg font-bold text-white mb-1">
                  Arraste e solte o arquivo .XML da sua receita
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  Compatível com <strong>BeerSmith (Exportar BeerXML)</strong> e <strong>Brewfather</strong>.
                </p>

                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700 hover:bg-slate-700 transition">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  <span>Selecionar arquivo no computador</span>
                </span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-400">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-slate-200 block font-semibold">
                    Conformidade e Rastreabilidade do MAPA Simplificada
                  </strong>
                  <p>
                    Você não precisa cadastrar ou editar receitas manualmente. O sistema lê todos os maltes, lúpulos,
                    leveduras e observações do BeerSmith, permitindo que você apenas informe os números de lote para
                    gerar o relatório exigido pela fiscalização e já mandar para o tanque de produção.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FORMULÁRIO DE RASTREABILIDADE MAPA E ENVIO AO TANQUE */}
          {step === 'MAPA_FORM' && parsedRecipe && (
            <div className="space-y-6">
              {/* Resumo da Receita Importada */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Receita Importada do BeerSmith
                  </span>
                  <h4 className="text-xl font-black text-white">{parsedRecipe.name}</h4>
                  <p className="text-xs text-slate-400">
                    Estilo: <strong className="text-slate-200">{parsedRecipe.style}</strong> • Volume:{' '}
                    <strong className="text-slate-200">{parsedRecipe.batchYieldLiters}L</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3 text-center text-xs font-mono">
                  <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-sans block">OG Alvo</span>
                    <strong className="text-amber-300 font-bold">{parsedRecipe.og?.toFixed(3) || '1.050'}</strong>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-sans block">ABV</span>
                    <strong className="text-amber-300 font-bold">{parsedRecipe.abv?.toFixed(1) || '5.0'}%</strong>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-sans block">IBU</span>
                    <strong className="text-amber-300 font-bold">{parsedRecipe.ibu || '25'}</strong>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-sans block">Cor</span>
                    <strong className="text-amber-300 font-bold">{parsedRecipe.ebc || '10'} EBC</strong>
                  </div>
                </div>
              </div>

              {/* Observações da Receita (Importante conforme solicitado) */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Observações e Instruções da Receita (BeerXML Notes):</span>
                </div>
                <textarea
                  value={recipeNotes}
                  onChange={(e) => setRecipeNotes(e.target.value)}
                  placeholder="Nenhuma observação informada no arquivo XML. Digite aqui instruções técnicas ou notas sensoriais do mestre cervejeiro..."
                  className="w-full bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-amber-400 h-20 resize-none font-mono"
                />
              </div>

              {/* Dados do Lote e Conformidade MAPA */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Identificação Legal MAPA & Tanque de Produção</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Nº do Lote de Produção:</label>
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Tanque de Destino:</label>
                    <select
                      value={tankId}
                      onChange={(e) => setTankId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="">Sem tanque (Apenas registrar)</option>
                      {tanks.map((t) => (
                        <option key={t.id} value={t.id}>
                          🏭 {t.name} ({t.capacityLiters}L) • {t.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Registro MAPA do Rótulo:</label>
                    <input
                      type="text"
                      value={mapaRegistration}
                      onChange={(e) => setMapaRegistration(e.target.value)}
                      placeholder="Ex: SP 001234-5.000001"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Responsável Técnico / CRQ:</label>
                    <input
                      type="text"
                      value={technicalResponsible}
                      onChange={(e) => setTechnicalResponsible(e.target.value)}
                      placeholder="Nome e CRQ"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1 font-semibold">Denominação Legal MAPA:</label>
                    <input
                      type="text"
                      value={commercialDenomination}
                      onChange={(e) => setCommercialDenomination(e.target.value)}
                      placeholder="Ex: Cerveja Clara Puro Malte Tipo IPA"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Data da Brassagem:</label>
                    <input
                      type="date"
                      value={brewDate}
                      onChange={(e) => setBrewDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Status Inicial do Lote:</label>
                    <select
                      value={initialStatus}
                      onChange={(e) => setInitialStatus(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="FERMENTANDO">🟢 FERMENTANDO (No Tanque)</option>
                      <option value="BRASSAGEM">🔥 BRASSAGEM (Cozinha)</option>
                      <option value="MATURANDO">❄️ MATURANDO</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tabela de Rastreabilidade dos Insumos (Exigência MAPA) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Rastreabilidade de Matérias-Primas do Lote (Exigência MAPA)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Preencha o <strong>Fornecedor</strong> e o <strong>Nº do Lote</strong> de cada ingrediente para a emissão do dossiê fiscal.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    {ingredients.length} insumos importados
                  </span>
                </div>

                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900/90 text-slate-300 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3">Insumo</th>
                          <th className="p-3 w-24">Qtd Real</th>
                          <th className="p-3 w-48">Fornecedor / Fabricante</th>
                          <th className="p-3 w-56 text-amber-300">
                            Nº do Lote do Insumo (MAPA) *
                          </th>
                          <th className="p-3 w-36">Validade / Safra</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 font-sans">
                        {ingredients.map((ing) => (
                          <tr key={ing.id} className="hover:bg-slate-900/40 transition">
                            <td className="p-3">
                              <span className="font-bold text-slate-200 block">{ing.name}</span>
                              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                                {ing.category} • {ing.stage}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1 font-mono font-bold text-slate-200">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={ing.amount}
                                  onChange={(e) => updateIngredientField(ing.id, 'amount', parseFloat(e.target.value) || 0)}
                                  className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                                />
                                <span>{ing.unit}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={ing.supplierName}
                                onChange={(e) => updateIngredientField(ing.id, 'supplierName', e.target.value)}
                                placeholder="Nome do Fornecedor"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-400 outline-none"
                              />
                            </td>
                            <td className="p-3 bg-amber-500/5">
                              <input
                                type="text"
                                value={ing.supplierLot}
                                onChange={(e) => updateIngredientField(ing.id, 'supplierLot', e.target.value)}
                                placeholder="Digite o Lote (ex: AGR-2026-08)"
                                className="w-full bg-slate-900 border-2 border-amber-500/60 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-mono font-bold focus:ring-2 focus:ring-amber-400 outline-none"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={ing.harvestYear || ing.expirationDate}
                                onChange={(e) => updateIngredientField(ing.id, 'harvestYear', e.target.value)}
                                placeholder="Safra ou Validade"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-amber-400 outline-none"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          {step === 'MAPA_FORM' ? (
            <>
              <button
                onClick={() => setStep('UPLOAD')}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Voltar e Trocar Arquivo XML
              </button>

              <button
                onClick={handleSubmitTraceabilityAndBatch}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-2 shadow-xl shadow-amber-500/20 transition disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Gravando Rastreabilidade...' : 'Registrar Rastreabilidade & Enviar para o Tanque'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
