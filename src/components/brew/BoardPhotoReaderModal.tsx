'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  PlusCircle,
  X,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Layers,
  Check,
  Eye,
  Key,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { getLocalDateString } from '@/lib/utils';

interface BoardPhotoReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batches: any[];
  tanks: any[];
}

export default function BoardPhotoReaderModal({
  isOpen,
  onClose,
  onSuccess,
  batches,
  tanks,
}: BoardPhotoReaderModalProps) {
  const [step, setStep] = useState<'CAPTURE' | 'ANALYZING' | 'REVIEW' | 'SAVING'>('CAPTURE');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyConfig, setShowApiKeyConfig] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resultados da IA
  const [tasksToComplete, setTasksToComplete] = useState<any[]>([]);
  const [tasksToCreate, setTasksToCreate] = useState<any[]>([]);
  const [rawObservations, setRawObservations] = useState<string>('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega chave de API salva no navegador
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('pinttech_gemini_api_key');
      if (savedKey) setApiKey(savedKey);
    } catch {}
  }, []);

  const handleSaveApiKey = (key: string) => {
    const cleaned = key.trim().replace(/^["']|["']$/g, '');
    setApiKey(cleaned);
    try {
      localStorage.setItem('pinttech_gemini_api_key', cleaned);
    } catch {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawResult = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setImagePreview(compressed);
            setImageBase64(compressed);
            return;
          }
        } catch (err) {
          console.warn('Falha no canvas, usando imagem original:', err);
        }
        setImagePreview(rawResult);
        setImageBase64(rawResult);
      };
      img.onerror = () => {
        setImagePreview(rawResult);
        setImageBase64(rawResult);
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzePhoto = async () => {
    if (!imageBase64) {
      setErrorMessage('Nenhuma foto selecionada. Tire uma foto ou carregue uma imagem.');
      return;
    }

    setStep('ANALYZING');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/vision/tasks-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          apiKey: apiKey.trim().replace(/^["']|["']$/g, '') || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'MISSING_API_KEY') {
          setShowApiKeyConfig(true);
        }
        throw new Error(data.message || data.error || 'Falha ao processar foto com a IA.');
      }

      // Adiciona flag 'selected' em cada item retornado
      const completeList = (data.tasksToComplete || []).map((t: any, idx: number) => ({
        ...t,
        _uid: `comp_${idx}_${Date.now()}`,
        selected: true,
      }));

      const createList = (data.tasksToCreate || []).map((t: any, idx: number) => ({
        ...t,
        _uid: `create_${idx}_${Date.now()}`,
        dueDate: t.dueDate || getLocalDateString(),
        type: t.type || 'OTHER',
        selected: true,
      }));

      setTasksToComplete(completeList);
      setTasksToCreate(createList);
      setRawObservations(data.rawObservations || '');

      if (completeList.length === 0 && createList.length === 0) {
        setErrorMessage(
          'A IA não conseguiu identificar tarefas claras no quadro. Verifique se o quadro está nítido e bem iluminado.'
        );
        setStep('CAPTURE');
      } else {
        setStep('REVIEW');
      }
    } catch (err: any) {
      console.error('Erro na análise da foto:', err);
      setErrorMessage(err.message || 'Erro inesperado ao conectar com o serviço de visão.');
      setStep('CAPTURE');
    }
  };

  const handleToggleCompleteItem = (uid: string) => {
    setTasksToComplete((prev) =>
      prev.map((item) => (item._uid === uid ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleCreateItem = (uid: string) => {
    setTasksToCreate((prev) =>
      prev.map((item) => (item._uid === uid ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleUpdateCreateItem = (uid: string, field: string, value: any) => {
    setTasksToCreate((prev) =>
      prev.map((item) => (item._uid === uid ? { ...item, [field]: value } : item))
    );
  };

  // Aplica as alterações na adega com segurança
  const handleApplyChanges = async () => {
    const selectedToComplete = tasksToComplete.filter((t) => t.selected);
    const selectedToCreate = tasksToCreate.filter((t) => t.selected);

    if (selectedToComplete.length === 0 && selectedToCreate.length === 0) {
      setErrorMessage('Nenhuma alteração foi selecionada para aplicar.');
      return;
    }

    setStep('SAVING');
    setErrorMessage(null);

    try {
      // Agrupa operações por batchId
      const batchUpdatesMap = new Map<string, { toComplete: any[]; toCreate: any[] }>();

      selectedToComplete.forEach((t) => {
        let bId = t.batchId;
        // Se a IA não pegou o batchId, tenta deduzir pelo tankName
        if (!bId && t.tankName) {
          const matchedTank = tanks.find(
            (tk) => tk.name.toLowerCase().trim() === t.tankName.toLowerCase().trim()
          );
          if (matchedTank) {
            const activeB = batches.find(
              (b) => b.tankId === matchedTank.id && !['FINALIZADO', 'CANCELADO'].includes(b.status)
            );
            if (activeB) bId = activeB.id;
          }
        }

        if (bId) {
          if (!batchUpdatesMap.has(bId)) batchUpdatesMap.set(bId, { toComplete: [], toCreate: [] });
          batchUpdatesMap.get(bId)!.toComplete.push(t);
        }
      });

      selectedToCreate.forEach((t) => {
        let bId = t.batchId;
        if (!bId && t.tankName) {
          const matchedTank = tanks.find(
            (tk) => tk.name.toLowerCase().trim() === t.tankName.toLowerCase().trim()
          );
          if (matchedTank) {
            const activeB = batches.find(
              (b) => b.tankId === matchedTank.id && !['FINALIZADO', 'CANCELADO'].includes(b.status)
            );
            if (activeB) bId = activeB.id;
          }
        }

        if (bId) {
          if (!batchUpdatesMap.has(bId)) batchUpdatesMap.set(bId, { toComplete: [], toCreate: [] });
          batchUpdatesMap.get(bId)!.toCreate.push(t);
        }
      });

      // Executa o update para cada lote afetado
      for (const [batchId, updates] of Array.from(batchUpdatesMap.entries())) {
        const targetBatch = batches.find((b) => b.id === batchId);
        if (!targetBatch) continue;

        let currentTasks: any[] = [];
        try {
          if (targetBatch.tankTasksJson) {
            const p = JSON.parse(targetBatch.tankTasksJson);
            if (Array.isArray(p)) currentTasks = p;
          }
        } catch {}

        // 1. Marca como concluído
        updates.toComplete.forEach((compItem) => {
          let found = false;
          currentTasks = currentTasks.map((existingTask: any) => {
            const matchesId = compItem.taskId && existingTask.id === compItem.taskId;
            const matchesTitle =
              !compItem.taskId &&
              existingTask.title.toLowerCase().trim() === compItem.title.toLowerCase().trim();

            if (matchesId || matchesTitle) {
              found = true;
              return {
                ...existingTask,
                completed: true,
                completedAt: new Date().toISOString(),
              };
            }
            return existingTask;
          });

          // Se não existia tarefa prévia, adiciona como concluída diretamente
          if (!found) {
            currentTasks.push({
              id: 'task_' + Math.random().toString(36).substring(2, 9),
              title: compItem.title,
              type: 'OTHER',
              dueDate: getLocalDateString(),
              completed: true,
              completedAt: new Date().toISOString(),
              notes: 'Identificado como feito via foto do quadro.',
            });
          }
        });

        // 2. Adiciona novas tarefas
        updates.toCreate.forEach((newItem) => {
          currentTasks.push({
            id: 'task_' + Math.random().toString(36).substring(2, 9),
            title: newItem.title,
            type: newItem.type || 'OTHER',
            dueDate: newItem.dueDate || getLocalDateString(),
            completed: false,
            amount: newItem.amount || undefined,
            unit: newItem.unit || undefined,
            notes: newItem.notes || 'Criado via foto do quadro físico.',
          });
        });

        const updatedJson = JSON.stringify(currentTasks);

        const patchRes = await fetch(`/api/batches/${batchId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tankTasksJson: updatedJson }),
        });

        if (!patchRes.ok) {
          throw new Error(`Falha ao salvar lote #${targetBatch.batchNumber}`);
        }
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Erro ao aplicar alterações do quadro:', err);
      setErrorMessage(err.message || 'Erro ao sincronizar com a adega.');
      setStep('REVIEW');
    }
  };

  const handleClose = () => {
    setStep('CAPTURE');
    setImagePreview(null);
    setImageBase64(null);
    setTasksToComplete([]);
    setTasksToCreate([]);
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 text-white my-auto max-h-[92vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Leitor de Quadro de Tarefas
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  IA de Visão
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tire uma foto do quadro da fábrica para sincronizar a adega automaticamente.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Configuração da Chave da IA (Acordeão / Banner) */}
        {(showApiKeyConfig || !apiKey) && (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Chave da IA (Google Gemini API)
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Obter chave gratuita</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Cole sua API Key do Google Gemini (AIzaSy...)"
                value={apiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
              {apiKey && (
                <button
                  type="button"
                  onClick={() => setShowApiKeyConfig(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
                >
                  Salvar
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              A chave fica gravada com segurança no seu navegador e não é compartilhada com terceiros.
            </p>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL (COM SCROLL INTERNO) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* PASSO 1: CAPTURA DE FOTO */}
          {step === 'CAPTURE' && (
            <div className="space-y-4">
              {/* Inputs Ocultos de Câmera e Arquivo */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {!imagePreview ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {/* Botão Câmera */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-6 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border-2 border-dashed border-amber-500/40 hover:border-amber-400 text-center flex flex-col items-center justify-center gap-3 transition group cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <strong className="text-white block text-sm font-bold">
                        Tirar Foto com a Câmera
                      </strong>
                      <span className="text-[11px] text-slate-400">
                        Use a câmera do smartphone apontada pro quadro
                      </span>
                    </div>
                  </button>

                  {/* Botão Galeria / Arquivo */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border-2 border-dashed border-slate-700 hover:border-slate-600 text-center flex flex-col items-center justify-center gap-3 transition group cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <strong className="text-white block text-sm font-bold">
                        Carregar da Galeria / Arquivo
                      </strong>
                      <span className="text-[11px] text-slate-400">
                        Envie uma foto já tirada do seu dispositivo
                      </span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Preview da Imagem Selecionada */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 max-h-72 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Foto do quadro de tarefas"
                      className="max-h-72 w-auto object-contain"
                    />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setImageBase64(null);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-slate-300 text-xs font-bold backdrop-blur-xs border border-slate-700 transition"
                      >
                        Trocar Foto
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 text-xs">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Foto pronta para análise. A IA lerá o texto manuscrito e comparará com seus{' '}
                      <strong>{tanks.length} tanques</strong> e lotes ativos.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 2: ANALISANDO (LOADING) */}
          {step === 'ANALYZING' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30 animate-pulse">
                <Sparkles className="w-7 h-7 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Analisando Quadro com IA...</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Decodificando anotações manuscritas, verificando marcações de tarefas concluídas e
                  correlacionando com os tanques da adega.
                </p>
              </div>
            </div>
          )}

          {/* PASSO 3: REVISÃO DOS DADOS IDENTIFICADOS */}
          {step === 'REVIEW' && (
            <div className="space-y-4">
              {/* Observações da IA */}
              {rawObservations && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px]">
                    <Eye className="w-3.5 h-3.5" />
                    Leitura Visual do Quadro:
                  </span>
                  <p className="text-slate-400 leading-relaxed text-[11px]">{rawObservations}</p>
                </div>
              )}

              {/* Seção 1: Tarefas a Concluir (Riscadas / OK) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Tarefas Identificadas como Concluídas ({tasksToComplete.length})
                  </span>
                  <span className="text-[10px] text-slate-500">Desmarque para ignorar</span>
                </div>

                {tasksToComplete.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800">
                    Nenhuma tarefa riscada ou marcada como concluída encontrada.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {tasksToComplete.map((item) => (
                      <label
                        key={item._uid}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                          item.selected
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                            : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleCompleteItem(item._uid)}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {item.tankName || 'Tanque'}
                            </span>
                            {item.batchNumber && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-400 bg-slate-800">
                                #{item.batchNumber}
                              </span>
                            )}
                            {item.recipeName && (
                              <span className="text-[11px] text-slate-300 font-semibold truncate max-w-[150px]">
                                {item.recipeName}
                              </span>
                            )}
                          </div>
                          <strong className="block text-xs text-white">{item.title}</strong>
                          <span className="text-[10px] text-emerald-400/80 block mt-0.5">
                            ✓ {item.reason || 'Riscado no quadro'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Seção 2: Novas Tarefas Identificadas */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <PlusCircle className="w-3.5 h-3.5" />
                    Novas Tarefas para Agendar ({tasksToCreate.length})
                  </span>
                  <span className="text-[10px] text-slate-500">Editáveis antes de salvar</span>
                </div>

                {tasksToCreate.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800">
                    Nenhuma nova tarefa pendente identificada no quadro.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tasksToCreate.map((item) => (
                      <div
                        key={item._uid}
                        className={`p-3 rounded-xl border transition space-y-2 ${
                          item.selected
                            ? 'bg-amber-950/15 border-amber-500/30'
                            : 'bg-slate-950/40 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleCreateItem(item._uid)}
                            className="mt-1 w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {item.tankName || 'Tanque'}
                              </span>
                              {item.batchNumber && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-400 bg-slate-800">
                                  #{item.batchNumber}
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-amber-400">
                                Tipo: {item.type}
                              </span>
                            </div>

                            <input
                              type="text"
                              value={item.title}
                              disabled={!item.selected}
                              onChange={(e) =>
                                handleUpdateCreateItem(item._uid, 'title', e.target.value)
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                              placeholder="Título da tarefa"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pl-7">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              Data Prevista:
                            </label>
                            <input
                              type="date"
                              value={item.dueDate || getLocalDateString()}
                              disabled={!item.selected}
                              onChange={(e) =>
                                handleUpdateCreateItem(item._uid, 'dueDate', e.target.value)
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              Tipo do Processo:
                            </label>
                            <select
                              value={item.type || 'OTHER'}
                              disabled={!item.selected}
                              onChange={(e) =>
                                handleUpdateCreateItem(item._uid, 'type', e.target.value)
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                            >
                              <option value="PURGE">Purga de Levedura</option>
                              <option value="DRY_HOPPING">Dry Hopping (DH)</option>
                              <option value="MEASUREMENT">Medição (Densidade/FG)</option>
                              <option value="ADDITIVE">Clarificante / Aditivo</option>
                              <option value="TEMPERATURE">Temperatura / Crash</option>
                              <option value="TRANSFER">Transferência</option>
                              <option value="OTHER">Outro Processo</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASSO 4: SALVANDO NA ADEGA */}
          {step === 'SAVING' && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Atualizando Adega no PintTech...</h4>
                <p className="text-xs text-slate-400">
                  Gravando o status das tarefas nos lotes de produção com segurança.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé / Ações */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4 shrink-0">
          <div>
            {!showApiKeyConfig && (
              <button
                type="button"
                onClick={() => setShowApiKeyConfig(true)}
                className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition"
                title="Configurar chave de API de IA"
              >
                <Key className="w-3 h-3" />
                <span>Chave IA</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Cancelar
            </button>

            {step === 'CAPTURE' && imagePreview && (
              <button
                type="button"
                onClick={handleAnalyzePhoto}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md transition active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analisar Foto com IA</span>
              </button>
            )}

            {step === 'REVIEW' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('CAPTURE')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  Tirar Outra Foto
                </button>

                <button
                  type="button"
                  onClick={handleApplyChanges}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md transition active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Aplicar Alterações (
                    {tasksToComplete.filter((t) => t.selected).length +
                      tasksToCreate.filter((t) => t.selected).length}
                    )
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
