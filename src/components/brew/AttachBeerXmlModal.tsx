'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  Thermometer,
  ShieldCheck,
  Check,
  FileText,
} from 'lucide-react';
import { parseBeerXml, ParsedBeerXmlRecipe } from '@/lib/brewing/beerXml';

interface AttachBeerXmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: any;
  tankName?: string;
  onSuccess: (updatedBatch: any) => void;
}

export default function AttachBeerXmlModal({
  isOpen,
  onClose,
  batch,
  tankName,
  onSuccess,
}: AttachBeerXmlModalProps) {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRecipe, setParsedRecipe] = useState<ParsedBeerXmlRecipe | null>(null);
  const [syncRecipe, setSyncRecipe] = useState<boolean>(true);
  const [syncIngredients, setSyncIngredients] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !batch) return null;

  const handleProcessFile = (file: File) => {
    if (!file) return;
    setError('');
    setFileName(file.name);

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
        if (!recipes || recipes.length === 0) {
          setError('Nenhuma receita cervejeira reconhecida no formato BeerXML.');
          setParsedRecipe(null);
        } else {
          setParsedRecipe(recipes[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao processar estrutura XML do arquivo');
        setParsedRecipe(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!fileContent || !parsedRecipe) {
      setError('Por favor, selecione um arquivo BeerXML válido primeiro.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/batches/${batch.id}/attach-beerxml`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xmlContent: fileContent,
          fileName,
          syncRecipe,
          syncIngredients,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao anexar BeerXML ao lote');
      }

      onSuccess(data.batch);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha de comunicação com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* CABEÇALHO */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Anexar BeerXML ao Lote #{batch.batchNumber}
                </h3>
                {tankName && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-sm">
                    {tankName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Carregue o arquivo do BeerSmith ou Brewfather para preencher metas e insumos deste lote
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO SCROLLÁVEL */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ÁREA DE DRAG & DROP / UPLOAD */}
          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                : fileContent
                ? 'border-emerald-500/60 bg-emerald-950/20 hover:border-emerald-400'
                : 'border-slate-700 bg-slate-800/40 hover:border-amber-400/60 hover:bg-slate-800/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,text/xml"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-2.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform ${
                  fileContent
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-amber-400 border border-slate-700'
                }`}
              >
                {fileContent ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>

              {fileName ? (
                <div>
                  <span className="text-sm font-black text-white block">{fileName}</span>
                  <span className="text-[11px] font-bold text-emerald-400 mt-0.5 block">
                    ✓ Arquivo BeerXML carregado. Clique para trocar.
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-sm font-black text-slate-200 block">
                    Arraste o arquivo .xml aqui ou clique para selecionar
                  </span>
                  <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                    Compatível com BeerSmith 2/3 e Brewfather
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* PRÉVIA DOS DADOS EXTRAÍDOS DO BEERXML */}
          {parsedRecipe && (
            <div className="bg-slate-800/80 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-lg animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <div>
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider block">
                    Receita Identificada no XML:
                  </span>
                  <span className="text-base font-black text-white">{parsedRecipe.name}</span>
                  <span className="text-xs text-slate-400 font-bold ml-2">({parsedRecipe.style})</span>
                </div>
                <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {parsedRecipe.batchYieldLiters || 500}L
                </span>
              </div>

              {/* GRID DE MÉTRICAS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">OG Alvo</span>
                  <span className="text-base font-black font-mono text-emerald-400 block">
                    {parsedRecipe.og ? parsedRecipe.og.toFixed(3) : '—'}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">FG Alvo</span>
                  <span className="text-base font-black font-mono text-sky-400 block">
                    {parsedRecipe.fg ? parsedRecipe.fg.toFixed(3) : '—'}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Teor ABV</span>
                  <span className="text-base font-black font-mono text-amber-400 block">
                    {parsedRecipe.abv ? `${parsedRecipe.abv.toFixed(1)}%` : '—'}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Amargor IBU</span>
                  <span className="text-base font-black font-mono text-emerald-400 block">
                    {parsedRecipe.ibu !== undefined ? parsedRecipe.ibu : '—'}
                  </span>
                </div>
              </div>

              {/* RESUMO DOS INSUMOS */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs font-bold text-slate-300">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">
                  🌾 {parsedRecipe.fermentables?.length || 0} maltes/grãos
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">
                  🌿 {parsedRecipe.hops?.length || 0} lúpulos
                </span>
                {parsedRecipe.yeast && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300">
                    🧫 Levedura: {parsedRecipe.yeast.name}
                  </span>
                )}
                {parsedRecipe.mashSteps && parsedRecipe.mashSteps.length > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-sky-300">
                    ⏱️ {parsedRecipe.mashSteps.length} rampas mostura
                  </span>
                )}
              </div>

              {/* ANOTAÇÕES DO CERVEJEIRO */}
              {(parsedRecipe.tasteNotes || parsedRecipe.notes) && (
                <div className="pt-2 border-t border-slate-700/60">
                  <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1 mb-1">
                    <FileText className="w-3.5 h-3.5" /> Anotações do BeerXML:
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/90 p-2.5 rounded-xl border border-slate-700 max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {parsedRecipe.tasteNotes || parsedRecipe.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* OPÇÕES DE VÍNCULO */}
          <div className="space-y-2.5 bg-slate-800/40 border border-slate-700 p-3.5 rounded-2xl">
            <span className="text-[11px] font-black uppercase text-slate-400 block mb-1">
              Opções de Sincronização:
            </span>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-200 hover:text-white select-none">
              <input
                type="checkbox"
                checked={syncRecipe}
                onChange={(e) => setSyncRecipe(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-600"
              />
              <span>Atualizar dados técnicos da receita no catálogo permanente</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-200 hover:text-white select-none">
              <input
                type="checkbox"
                checked={syncIngredients}
                onChange={(e) => setSyncIngredients(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-600"
              />
              <span>Preencher lista de insumos na Ficha de Rastreabilidade MAPA deste lote</span>
            </label>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !fileContent || !parsedRecipe}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg border border-amber-300 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Vinculando BeerXML...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Vincular BeerXML ao Lote</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
