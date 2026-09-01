'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Flame,
  Cylinder,
  Thermometer,
  Sparkles,
  Droplets,
  Layers,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Clock,
  Beaker,
  Check,
  Activity,
  Tag,
  ArrowRight,
  Edit3,
  Package,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateShort } from '@/lib/utils';

export interface TankTaskItem {
  id: string;
  title: string;
  type: 'DRY_HOPPING' | 'ANTIOXIDANT' | 'PURGE' | 'COLD_CRASH' | 'MEASUREMENT' | 'CLARIFIER' | 'OTHER';
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
  notes?: string;
  amount?: number;
  unit?: string;
}

export interface FermentationLogItem {
  id: string;
  date: string; // YYYY-MM-DD
  gravity: number; // ex: 1.025
  tempCelsius: number; // ex: 19.5
  ph?: number; // ex: 4.4
  notes?: string;
}

export interface LiveBatchIngredient {
  id?: string;
  inventoryItemId?: string | null;
  name: string;
  category: 'MALTE' | 'LUPULO' | 'LEVEDURA' | 'ADJUNTO' | 'AGUA_SAIS' | 'QUIMICO_LIMPEZA' | 'OUTRO';
  amount: number;
  unit: string;
  stage: 'MOSTURA' | 'FIRST_WORT' | 'FERVURA_60MIN' | 'FERVURA_15MIN' | 'WHIRLPOOL' | 'DRY_HOPPING' | 'FERMENTACAO' | 'MATURACAO' | 'OUTRO';
  supplierName?: string;
  supplierLot?: string;
  costPerUnit?: number;
  notes?: string;
}

interface LiveBatchManagerModalProps {
  batch: any;
  tanks: any[];
  inventoryItems?: any[];
  onClose: () => void;
  onSaved: (updatedBatch: any) => void;
}

export default function LiveBatchManagerModal({
  batch,
  tanks = [],
  inventoryItems = [],
  onClose,
  onSaved,
}: LiveBatchManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'TASKS' | 'INGREDIENTS' | 'FERMENTATION_LOG' | 'OVERVIEW'>('TASKS');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Parâmetros do Lote
  const [status, setStatus] = useState<string>(batch.status || 'FERMENTANDO');
  const [tankId, setTankId] = useState<string>(batch.tankId || '');
  const [volumePlanned, setVolumePlanned] = useState<number>(batch.volumePlannedLiters || 500);
  const [volumeProduced, setVolumeProduced] = useState<number>(batch.volumeProducedLiters || batch.volumePlannedLiters || 500);
  const [measuredOg, setMeasuredOg] = useState<string>(batch.measuredOg ? String(batch.measuredOg) : '');
  const [measuredFg, setMeasuredFg] = useState<string>(batch.measuredFg ? String(batch.measuredFg) : '');
  const [phMash, setPhMash] = useState<string>(batch.phMash ? String(batch.phMash) : '');
  const [phBoil, setPhBoil] = useState<string>(batch.phBoil ? String(batch.phBoil) : '');
  const [phFinal, setPhFinal] = useState<string>(batch.phFinal ? String(batch.phFinal) : '');
  const [tempFermentation, setTempFermentation] = useState<string>(batch.tempFermentation ? String(batch.tempFermentation) : '');
  const [tempMaturation, setTempMaturation] = useState<string>(batch.tempMaturation ? String(batch.tempMaturation) : '');
  const [sensoryNotes, setSensoryNotes] = useState<string>(batch.sensoryNotes || '');
  const [notes, setNotes] = useState<string>(batch.notes || '');

  // 1. TAREFAS DE TANQUE & EDIÇÃO
  const initialTasks: TankTaskItem[] = useMemo(() => {
    if (batch.tankTasksJson) {
      try {
        const parsed = JSON.parse(batch.tankTasksJson);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    const brewTime = batch.brewDate ? new Date(batch.brewDate).getTime() : Date.now();
    const dayMs = 86400000;
    return [
      {
        id: 't-1',
        title: 'Medição de Densidade & Subida Diacetil',
        type: 'MEASUREMENT',
        dueDate: new Date(brewTime + 4 * dayMs).toISOString().split('T')[0],
        completed: false,
        notes: 'Verificar atenuação e elevar temperatura para descanso de diacetil',
      },
      {
        id: 't-2',
        title: 'Adição de Dry Hopping (Citra / Mosaic)',
        type: 'DRY_HOPPING',
        dueDate: new Date(brewTime + 6 * dayMs).toISOString().split('T')[0],
        completed: false,
        amount: 2.5,
        unit: 'KG',
        notes: 'Adicionar lúpulo em pellets sob purga de CO2',
      },
      {
        id: 't-3',
        title: 'Dosagem de Antioxidante & Início do Cold Crash',
        type: 'ANTIOXIDANT',
        dueDate: new Date(brewTime + 10 * dayMs).toISOString().split('T')[0],
        completed: false,
        notes: 'Dosar antioxidante e baixar rampa térmica para 0°C - 1°C',
      },
      {
        id: 't-4',
        title: 'Purga de Levedura & Clarificação',
        type: 'PURGE',
        dueDate: new Date(brewTime + 12 * dayMs).toISOString().split('T')[0],
        completed: false,
        notes: 'Purgar cone do tanque para clarificação antes do envase',
      },
    ];
  }, [batch]);

  const [tasks, setTasks] = useState<TankTaskItem[]>(initialTasks);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Formulário de Nova / Edição de Tarefa
  const todayStr = new Date().toISOString().split('T')[0];
  const [taskFormTitle, setTaskFormTitle] = useState<string>('');
  const [taskFormType, setTaskFormType] = useState<TankTaskItem['type']>('DRY_HOPPING');
  const [taskFormDueDate, setTaskFormDueDate] = useState<string>(todayStr);
  const [taskFormAmount, setTaskFormAmount] = useState<string>('');
  const [taskFormUnit, setTaskFormUnit] = useState<string>('KG');
  const [taskFormNotes, setTaskFormNotes] = useState<string>('');

  const startEditTask = (task: TankTaskItem) => {
    setEditingTaskId(task.id);
    setTaskFormTitle(task.title);
    setTaskFormType(task.type);
    setTaskFormDueDate(task.dueDate);
    setTaskFormAmount(task.amount ? String(task.amount) : '');
    setTaskFormUnit(task.unit || 'KG');
    setTaskFormNotes(task.notes || '');
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setTaskFormTitle('');
    setTaskFormAmount('');
    setTaskFormNotes('');
  };

  const saveTask = () => {
    if (!taskFormTitle.trim()) return;

    if (editingTaskId) {
      // Atualizar tarefa existente
      setTasks(
        tasks.map((t) =>
          t.id === editingTaskId
            ? {
                ...t,
                title: taskFormTitle.trim(),
                type: taskFormType,
                dueDate: taskFormDueDate,
                amount: taskFormAmount ? parseFloat(taskFormAmount) : undefined,
                unit: taskFormUnit,
                notes: taskFormNotes.trim() || undefined,
              }
            : t
        )
      );
      setEditingTaskId(null);
    } else {
      // Criar nova tarefa
      const newTask: TankTaskItem = {
        id: `task-${Date.now()}`,
        title: taskFormTitle.trim(),
        type: taskFormType,
        dueDate: taskFormDueDate,
        completed: false,
        amount: taskFormAmount ? parseFloat(taskFormAmount) : undefined,
        unit: taskFormUnit,
        notes: taskFormNotes.trim() || undefined,
      };
      setTasks([...tasks, newTask]);
    }

    setTaskFormTitle('');
    setTaskFormAmount('');
    setTaskFormNotes('');
  };

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
    if (editingTaskId === id) cancelEditTask();
  };

  // 2. INSUMOS DO LOTE (EDIÇÃO DINÂMICA DA RECEITA DO LOTE)
  const initialIngredients: LiveBatchIngredient[] = useMemo(() => {
    if (Array.isArray(batch.ingredients) && batch.ingredients.length > 0) {
      return batch.ingredients.map((ing: any) => ({
        id: ing.id,
        inventoryItemId: ing.inventoryItemId,
        name: ing.name,
        category: (ing.category || 'MALTE') as any,
        amount: ing.quantityUsed || ing.amount || 0,
        unit: ing.unit || 'KG',
        stage: (ing.stage || 'MOSTURA') as any,
        supplierName: ing.supplierName || ing.supplier?.name || '',
        supplierLot: ing.supplierLot || '',
        costPerUnit: ing.costPerUnit || 0,
        notes: ing.notes || '',
      }));
    }

    // Se não tiver gravado em BatchIngredient, puxa da receita base escalonada
    const baseRecipe = batch.recipe;
    if (baseRecipe?.recipeDataJson) {
      try {
        const parsed = JSON.parse(baseRecipe.recipeDataJson);
        const scale = (baseRecipe.batchYieldLiters && baseRecipe.batchYieldLiters > 0)
          ? (batch.volumePlannedLiters || 500) / baseRecipe.batchYieldLiters
          : 1;

        const list: LiveBatchIngredient[] = [];
        for (const f of parsed.fermentables || []) {
          list.push({
            name: f.name,
            category: 'MALTE',
            amount: Math.round((f.amountKg || 0) * scale * 10) / 10,
            unit: 'KG',
            stage: 'MOSTURA',
            costPerUnit: f.costPerKg || 0,
            notes: `${f.colorEbc || 4} EBC`,
          });
        }
        for (const h of parsed.hops || []) {
          list.push({
            name: h.name,
            category: 'LUPULO',
            amount: Math.round((h.amountGrams || 0) * scale),
            unit: 'G',
            stage: h.use === 'FIRST_WORT' ? 'FIRST_WORT' : h.use === 'WHIRLPOOL' ? 'WHIRLPOOL' : h.use === 'DRY_HOP' ? 'DRY_HOPPING' : 'FERVURA_60MIN',
            costPerUnit: h.costPerGram ? h.costPerGram * 1000 : 0,
            notes: `${h.alphaAcidPercent || 12}% AA`,
          });
        }
        if (parsed.yeast) {
          list.push({
            name: parsed.yeast.name,
            category: 'LEVEDURA',
            amount: 1,
            unit: 'PACOTE',
            stage: 'FERMENTACAO',
            costPerUnit: parsed.yeast.costPerUnit || 0,
          });
        }
        return list;
      } catch (e) {}
    }

    return [];
  }, [batch]);

  const [batchIngredients, setBatchIngredients] = useState<LiveBatchIngredient[]>(initialIngredients);

  const addBatchIngredient = (category: LiveBatchIngredient['category'] = 'MALTE') => {
    const newItem: LiveBatchIngredient = {
      name: category === 'LUPULO' ? 'Novo Lúpulo (Dry Hop / Whirlpool)' : category === 'ADJUNTO' ? 'Novo Adjunto / Fruta' : 'Novo Malte',
      category,
      amount: category === 'LUPULO' ? 1000 : category === 'MALTE' ? 25 : 1,
      unit: category === 'LUPULO' ? 'G' : category === 'MALTE' ? 'KG' : 'KG',
      stage: category === 'LUPULO' ? 'DRY_HOPPING' : category === 'ADJUNTO' ? 'MATURACAO' : 'MOSTURA',
      costPerUnit: 0,
    };
    setBatchIngredients([...batchIngredients, newItem]);
  };

  const updateBatchIngredient = (index: number, fields: Partial<LiveBatchIngredient>) => {
    const next = [...batchIngredients];
    next[index] = { ...next[index], ...fields };
    setBatchIngredients(next);
  };

  const removeBatchIngredient = (index: number) => {
    setBatchIngredients(batchIngredients.filter((_, i) => i !== index));
  };

  // Custo total calculado dos insumos do lote
  const batchTotalCost = useMemo(() => {
    return batchIngredients.reduce((acc, item) => {
      const isG = item.unit === 'G';
      const qty = isG ? item.amount / 1000 : item.amount;
      return acc + qty * (item.costPerUnit || 0);
    }, 0);
  }, [batchIngredients]);

  const batchCostPerLiter = useMemo(() => {
    const vol = volumeProduced || volumePlanned || 500;
    return vol > 0 ? batchTotalCost / vol : 0;
  }, [batchTotalCost, volumeProduced, volumePlanned]);

  // 3. MEDIÇÕES DIÁRIAS (CURVA DE FERMENTAÇÃO)
  const initialLogs: FermentationLogItem[] = useMemo(() => {
    if (batch.fermentationLogsJson) {
      try {
        const parsed = JSON.parse(batch.fermentationLogsJson);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  }, [batch]);

  const [logs, setLogs] = useState<FermentationLogItem[]>(initialLogs);
  const [newLogDate, setNewLogDate] = useState<string>(todayStr);
  const [newLogGravity, setNewLogGravity] = useState<string>('');
  const [newLogTemp, setNewLogTemp] = useState<string>('19.0');
  const [newLogPh, setNewLogPh] = useState<string>('');
  const [newLogNotes, setNewLogNotes] = useState<string>('');

  const handleAddLog = () => {
    if (!newLogGravity) return;
    const item: FermentationLogItem = {
      id: `log-${Date.now()}`,
      date: newLogDate,
      gravity: parseFloat(newLogGravity),
      tempCelsius: parseFloat(newLogTemp) || 19.0,
      ph: newLogPh ? parseFloat(newLogPh) : undefined,
      notes: newLogNotes.trim() || undefined,
    };
    setLogs([...logs, item]);
    setNewLogGravity('');
    setNewLogPh('');
    setNewLogNotes('');
  };

  const handleRemoveLog = (id: string) => {
    setLogs(logs.filter((l) => l.id !== id));
  };

  // SALVAR TUDO (LOTE + INSUMOS + TAREFAS + MEDIÇÕES)
  const handleSaveChanges = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        status,
        tankId: tankId || null,
        volumePlannedLiters: volumePlanned,
        volumeProducedLiters: volumeProduced,
        costPerLiter: batchCostPerLiter,
        totalCost: batchTotalCost,
        measuredOg: measuredOg ? parseFloat(measuredOg) : null,
        measuredFg: measuredFg ? parseFloat(measuredFg) : null,
        phMash: phMash ? parseFloat(phMash) : null,
        phBoil: phBoil ? parseFloat(phBoil) : null,
        phFinal: phFinal ? parseFloat(phFinal) : null,
        tempFermentation: tempFermentation ? parseFloat(tempFermentation) : null,
        tempMaturation: tempMaturation ? parseFloat(tempMaturation) : null,
        sensoryNotes: sensoryNotes.trim() || null,
        notes: notes.trim() || null,
        tankTasksJson: JSON.stringify(tasks),
        fermentationLogsJson: JSON.stringify(logs),
        ingredients: batchIngredients.map((item) => ({
          name: item.name,
          category: item.category,
          quantityUsed: item.amount,
          unit: item.unit,
          stage: item.stage,
          supplierName: item.supplierName || null,
          supplierLot: item.supplierLot || null,
          costPerUnit: item.costPerUnit || 0,
          totalCost: (item.unit === 'G' ? item.amount / 1000 : item.amount) * (item.costPerUnit || 0),
          notes: item.notes || null,
        })),
      };

      const res = await fetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar alterações do lote');

      onSaved(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl text-slate-800 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* HEADER LIGHT */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Cylinder className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {batch.recipe?.name || 'Lote de Produção'}
                  </h2>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    {batch.batchNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Acompanhamento ao vivo: tarefas editáveis, troca e adição de insumos, curva de atenuação
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm mt-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('TASKS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'TASKS' ? 'bg-amber-500 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Tarefas de Tanque ({tasks.filter((t) => !t.completed).length} pendentes)</span>
            </button>

            <button
              onClick={() => setActiveTab('INGREDIENTS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'INGREDIENTS' ? 'bg-emerald-600 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Insumos & Adições do Lote ({batchIngredients.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('FERMENTATION_LOG')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'FERMENTATION_LOG' ? 'bg-cyan-600 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Curva & Medições Diárias ({logs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'OVERVIEW' ? 'bg-purple-600 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Thermometer className="w-4 h-4" />
              <span>Status & Físico-Química</span>
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ABA 1: TAREFAS DE TANQUE & EDIÇÃO */}
          {activeTab === 'TASKS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Cronograma de Tarefas & Lembretes da Adega</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Você pode alterar datas, quantidades, editar ou adicionar novas tarefas a qualquer momento.
                  </p>
                </div>
              </div>

              {/* Lista de Tarefas */}
              <div className="space-y-2.5">
                {tasks.map((task) => {
                  const isLate = !task.completed && new Date(task.dueDate).getTime() < new Date().setHours(0,0,0,0);
                  const isToday = !task.completed && task.dueDate === todayStr;
                  const isBeingEdited = editingTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isBeingEdited
                          ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20'
                          : task.completed
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : isLate
                          ? 'bg-rose-50 border-rose-200'
                          : isToday
                          ? 'bg-amber-50 border-amber-300 shadow-sm'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors mt-0.5 ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300 hover:border-amber-500'
                          }`}
                        >
                          {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>

                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-bold ${task.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {task.title}
                            </span>
                            {task.type === 'DRY_HOPPING' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                🌿 Dry Hopping
                              </span>
                            )}
                            {task.type === 'ANTIOXIDANT' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800">
                                🧪 Antioxidante
                              </span>
                            )}
                            {task.type === 'COLD_CRASH' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                ❄️ Cold Crash
                              </span>
                            )}
                            {task.type === 'PURGE' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
                                ⚗️ Purga
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1 font-bold">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              Data Prevista: {formatDate(task.dueDate)}
                            </span>
                            {task.amount && (
                              <span>Dosagem: <strong>{task.amount} {task.unit}</strong></span>
                            )}
                            {task.completedAt && (
                              <span className="text-emerald-700 font-bold">✓ Executado em {formatDateShort(task.completedAt)}</span>
                            )}
                          </div>

                          {task.notes && (
                            <p className="text-xs text-slate-600 bg-slate-100/60 p-2 rounded-lg mt-1">{task.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditTask(task)}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Editar Tarefa Salva"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeTask(task.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Tarefa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formulário de Adição / Edição de Tarefa */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    {editingTaskId ? <Edit3 className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-amber-600" />}
                    <span>{editingTaskId ? 'Editar Tarefa de Tanque' : 'Programar Nova Tarefa para este Lote'}</span>
                  </h4>
                  {editingTaskId && (
                    <button
                      type="button"
                      onClick={cancelEditTask}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Título da Tarefa</label>
                    <input
                      type="text"
                      value={taskFormTitle}
                      onChange={(e) => setTaskFormTitle(e.target.value)}
                      placeholder="ex: Dry Hopping 3kg Citra ou Dosar 15g Antioxidante"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de Processo</label>
                    <select
                      value={taskFormType}
                      onChange={(e) => setTaskFormType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                    >
                      <option value="DRY_HOPPING">🌿 Dry Hopping</option>
                      <option value="ANTIOXIDANT">🧪 Antioxidante / Redutor</option>
                      <option value="COLD_CRASH">❄️ Cold Crash (0°C)</option>
                      <option value="PURGE">⚗️ Purga de Levedura</option>
                      <option value="CLARIFIER">✨ Clarificante / Biofine</option>
                      <option value="MEASUREMENT">📊 Medição Densidade/pH</option>
                      <option value="OTHER">📋 Outra Tarefa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Data Programada</label>
                    <input
                      type="date"
                      value={taskFormDueDate}
                      onChange={(e) => setTaskFormDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Dosagem / Quantidade</label>
                    <input
                      type="number"
                      step="0.1"
                      value={taskFormAmount}
                      onChange={(e) => setTaskFormAmount(e.target.value)}
                      placeholder="ex: 2.5"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Unidade</label>
                    <select
                      value={taskFormUnit}
                      onChange={(e) => setTaskFormUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                    >
                      <option value="KG">KG</option>
                      <option value="G">G (Gramas)</option>
                      <option value="L">L (Litros)</option>
                      <option value="ML">ML</option>
                      <option value="UN">UN / Pacotes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Instruções / Notas</label>
                    <input
                      type="text"
                      value={taskFormNotes}
                      onChange={(e) => setTaskFormNotes(e.target.value)}
                      placeholder="ex: Purgar CO2 antes de injetar lúpulo"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={saveTask}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-sm transition-all"
                  >
                    {editingTaskId ? 'Salvar Alterações da Tarefa' : '+ Salvar Tarefa na Lista'}
                  </button>
                  {editingTaskId && (
                    <button
                      type="button"
                      onClick={cancelEditTask}
                      className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: INSUMOS & ADIÇÕES DO LOTE (EDITÁVEIS POR LOTE) */}
          {activeTab === 'INGREDIENTS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Insumos Utilizados Neste Lote Específico</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ajuste maltes, lúpulos ou adicione insumos no tanque (ex: Dry Hopping, Frutas, Clarificantes) exclusivamente para este lote.
                  </p>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addBatchIngredient('MALTE')}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all"
                  >
                    + Malte
                  </button>
                  <button
                    type="button"
                    onClick={() => addBatchIngredient('LUPULO')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all"
                  >
                    + Lúpulo / Dry Hop
                  </button>
                  <button
                    type="button"
                    onClick={() => addBatchIngredient('ADJUNTO')}
                    className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-xl text-xs font-bold transition-all"
                  >
                    + Fruta / Adjunto
                  </button>
                </div>
              </div>

              {/* Tabela de Insumos do Lote */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Insumo</th>
                      <th className="p-3 w-28">Categoria</th>
                      <th className="p-3 w-28">Qtd Real</th>
                      <th className="p-3 w-24">Unidade</th>
                      <th className="p-3 w-36">Etapa de Uso</th>
                      <th className="p-3 w-32">Lote Fornecedor</th>
                      <th className="p-3 w-28 text-right">Custo Unit (R$)</th>
                      <th className="p-3 w-12 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchIngredients.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateBatchIngredient(idx, { name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:bg-white"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={item.category}
                            onChange={(e) => updateBatchIngredient(idx, { category: e.target.value as any })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold focus:outline-none"
                          >
                            <option value="MALTE">Malte</option>
                            <option value="LUPULO">Lúpulo</option>
                            <option value="LEVEDURA">Levedura</option>
                            <option value="ADJUNTO">Adjunto/Fruta</option>
                            <option value="AGUA_SAIS">Sais/Química</option>
                            <option value="OUTRO">Outro</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.1"
                            value={item.amount}
                            onChange={(e) => updateBatchIngredient(idx, { amount: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-amber-700 font-black focus:outline-none text-right"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={item.unit}
                            onChange={(e) => updateBatchIngredient(idx, { unit: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold focus:outline-none"
                          >
                            <option value="KG">KG</option>
                            <option value="G">G</option>
                            <option value="L">L</option>
                            <option value="ML">ML</option>
                            <option value="PACOTE">Pacote</option>
                            <option value="UN">UN</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            value={item.stage}
                            onChange={(e) => updateBatchIngredient(idx, { stage: e.target.value as any })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold focus:outline-none"
                          >
                            <option value="MOSTURA">Mostura</option>
                            <option value="FERVURA_60MIN">Fervura (60m)</option>
                            <option value="FERVURA_15MIN">Fervura (15m)</option>
                            <option value="WHIRLPOOL">Whirlpool</option>
                            <option value="FERMENTACAO">Fermentação</option>
                            <option value="DRY_HOPPING">🌿 Dry Hopping</option>
                            <option value="MATURACAO">❄️ Maturação / Tanque</option>
                            <option value="OUTRO">Outro</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.supplierLot || ''}
                            onChange={(e) => updateBatchIngredient(idx, { supplierLot: e.target.value })}
                            placeholder="ex: Lote 24A-99"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            step="0.1"
                            value={item.costPerUnit || 0}
                            onChange={(e) => updateBatchIngredient(idx, { costPerUnit: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-emerald-700 font-bold focus:outline-none text-right"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeBatchIngredient(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumo de Custos do Lote */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500">Custo Total de Insumos Deste Lote:</span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {formatCurrency(batchTotalCost)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500">CPV (Custo por Litro Real):</span>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">
                    {formatCurrency(batchCostPerLiter)} / Litro
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: CURVA DE FERMENTAÇÃO & MEDIÇÕES */}
          {activeTab === 'FERMENTATION_LOG' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-600" />
                  <span>Histórico de Medições Diárias (Atenuação & Temperatura)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Registre as medições de densidade (SG), temperatura do tanque e pH ao longo da fermentação.
                </p>
              </div>

              {/* Registro Rápido */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Data da Medição</label>
                  <input
                    type="date"
                    value={newLogDate}
                    onChange={(e) => setNewLogDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Densidade (SG)</label>
                  <input
                    type="text"
                    value={newLogGravity}
                    onChange={(e) => setNewLogGravity(e.target.value)}
                    placeholder="ex: 1.020"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Temp. Tanque (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newLogTemp}
                    onChange={(e) => setNewLogTemp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">pH Atual</label>
                  <input
                    type="text"
                    value={newLogPh}
                    onChange={(e) => setNewLogPh(e.target.value)}
                    placeholder="ex: 4.5"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddLog}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs rounded-xl shadow-sm transition-all"
                >
                  + Gravar Medição
                </button>
              </div>

              {/* Tabela de Medições */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3 text-right">Densidade (SG)</th>
                      <th className="p-3 text-right">Temperatura</th>
                      <th className="p-3 text-right">pH</th>
                      <th className="p-3">Observações</th>
                      <th className="p-3 w-12 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{formatDate(item.date)}</td>
                        <td className="p-3 text-right font-black text-amber-700">{item.gravity.toFixed(3)}</td>
                        <td className="p-3 text-right font-bold text-cyan-700">{item.tempCelsius}°C</td>
                        <td className="p-3 text-right font-bold text-slate-700">{item.ph ? item.ph.toFixed(2) : '-'}</td>
                        <td className="p-3 text-slate-600 font-medium">{item.notes || '-'}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLog(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 4: PARÂMETROS GERAIS E EDIÇÃO FÍSICO-QUÍMICA */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-purple-600" />
                  <span>Ajuste de Parâmetros, Físico-Química e Tanque</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Edite qualquer parâmetro técnico do lote durante a produção ou maturação.
                </p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status da Produção</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-800 focus:outline-none"
                    >
                      <option value="PLANEJADO">PLANEJADO</option>
                      <option value="BRASSAGEM">BRASSAGEM</option>
                      <option value="FERMENTANDO">FERMENTANDO</option>
                      <option value="MATURANDO">MATURANDO / COLD CRASH</option>
                      <option value="PRONTO_ENVASE">PRONTO P/ ENVASE</option>
                      <option value="ENVASADO">ENVASADO</option>
                      <option value="FINALIZADO">FINALIZADO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanque Atribuído</label>
                    <select
                      value={tankId}
                      onChange={(e) => setTankId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      <option value="">Sem tanque</option>
                      {tanks.map((t) => (
                        <option key={t.id} value={t.id}>
                          🏺 {t.name} ({t.capacityLiters}L - {t.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Volume Real Produzido (L)</label>
                    <input
                      type="number"
                      value={volumeProduced}
                      onChange={(e) => setVolumeProduced(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">OG Medida</label>
                    <input
                      type="text"
                      value={measuredOg}
                      onChange={(e) => setMeasuredOg(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">FG Medida / Final</label>
                    <input
                      type="text"
                      value={measuredFg}
                      onChange={(e) => setMeasuredFg(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-cyan-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">pH Mostura</label>
                    <input
                      type="text"
                      value={phMash}
                      onChange={(e) => setPhMash(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">pH Final</label>
                    <input
                      type="text"
                      value={phFinal}
                      onChange={(e) => setPhFinal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Análise Sensorial & Degustação</label>
                  <textarea
                    rows={2}
                    value={sensoryNotes}
                    onChange={(e) => setSensoryNotes(e.target.value)}
                    placeholder="Perfil aromático, atenuação, formação de espuma, liberação técnica..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER LIGHT */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSaveChanges}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Atualizações do Lote & Tarefas</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
