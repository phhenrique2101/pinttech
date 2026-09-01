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
} from 'lucide-react';
import { parseBeerXml, ParsedBeerXmlRecipe } from '@/lib/brewing/beerXml';

interface BeerXmlImporterModalProps {
  onClose: () => void;
  onImportSuccess: (recipes: any[]) => void;
}

export default function BeerXmlImporterModal({
  onClose,
  onImportSuccess,
}: BeerXmlImporterModalProps) {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRecipes, setParsedRecipes] = useState<ParsedBeerXmlRecipe[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);

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
          setParsedRecipes(recipes);
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

  const handleConfirmImport = async () => {
    if (!fileContent) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/recipes/import-beerxml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent: fileContent }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao importar receitas');

      onImportSuccess(data.recipes || []);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl text-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER LIGHT */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Importar BeerXML</h2>
              <p className="text-xs text-slate-500 font-medium">Compatível com Brewfather, BeerSmith e Brewers Friend (.xml)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {parsedRecipes.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`p-8 border-2 border-dashed rounded-3xl text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                dragActive
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-300 bg-slate-50/70 hover:border-amber-400'
              }`}
            >
              <input
                type="file"
                accept=".xml"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
                id="beerxml-file-input"
              />
              <label htmlFor="beerxml-file-input" className="cursor-pointer flex flex-col items-center">
                <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-amber-600 mb-2 shadow-sm">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Arraste seu arquivo .xml aqui</h3>
                <p className="text-xs text-slate-500 mt-1">ou clique para selecionar do seu computador</p>
                <span className="mt-3 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                  Selecionar Arquivo .XML
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-black text-slate-900">{fileName}</p>
                    <p className="text-[11px] text-emerald-700 font-bold">{parsedRecipes.length} receita(s) pronta(s) para importação</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsedRecipes([]);
                    setFileContent('');
                    setFileName('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 underline"
                >
                  Trocar arquivo
                </button>
              </div>

              {/* Lista de Pré-visualização */}
              <div className="space-y-3">
                {parsedRecipes.map((r, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>{r.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-300">
                          {r.style}
                        </span>
                      </h4>
                      <span className="text-xs font-black text-slate-700">{r.batchYieldLiters} Litros</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold block">OG</span>
                        <span className="text-xs font-black text-slate-900">{r.og?.toFixed(3) || 'Auto'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold block">ABV</span>
                        <span className="text-xs font-black text-amber-700">{r.abv ? `${r.abv}%` : 'Auto'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold block">IBU</span>
                        <span className="text-xs font-black text-emerald-700">{r.ibu || 'Auto'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold block">EBC</span>
                        <span className="text-xs font-black text-cyan-700">{r.ebc || 'Auto'}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 font-medium flex items-center gap-3 pt-1">
                      <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-amber-600" /> {r.fermentables.length} maltes</span>
                      <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-emerald-600" /> {r.hops.length} lúpulos</span>
                      {r.yeast && <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-cyan-600" /> {r.yeast.name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER LIGHT */}
        <div className="p-5 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            Cancelar
          </button>

          {parsedRecipes.length > 0 && (
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmImport}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Importar {parsedRecipes.length} Receita(s)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
