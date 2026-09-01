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

interface LiveBatchManagerModalProps {
  batch: any;
  tanks: any[];
  inventoryItems: any[];
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
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'FERMENTATION_LOG' | 'EDIT_RECIPE'>('TASKS');
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

  // Tarefas de Tanque (Dry Hopping, Antioxidante, etc.)
  const initialTasks: TankTaskItem[] = useMemo(() => {
    if (batch.tankTasksJson) {
      try {
        const parsed = JSON.parse(batch.tankTasksJson);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    // Tarefas padrão sugeridas baseadas na data de brassagem
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

  // Histórico de Medições de Fermentação
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

  // Nova Medição Rápida
  const todayStr = new Date().toISOString().split('T')[0];
  const [newLogDate, setNewLogDate] = useState<string>(todayStr);
  const [newLogGravity, setNewLogGravity] = useState<string>('');
  const [newLogTemp, setNewLogTemp] = useState<string>('19.0');
  const [newLogPh, setNewLogPh] = useState<string>('');
  const [newLogNotes, setNewLogNotes] = useState<string>('');

  // Nova Tarefa de Tanque Rápida
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskType, setNewTaskType] = useState<TankTaskItem['type']>('DRY_HOPPING');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>(todayStr);
  const [newTaskAmount, setNewTaskAmount] = useState<string>('');
  const [newTaskUnit, setNewTaskUnit] = useState<string>('KG');
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');

  // Adicionar Medição
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

  // Adicionar Tarefa
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const task: TankTaskItem = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      type: newTaskType,
      dueDate: newTaskDueDate,
      completed: false,
      amount: newTaskAmount ? parseFloat(newTaskAmount) : undefined,
      unit: newTaskUnit,
      notes: newTaskNotes.trim() || undefined,
    };
    setTasks([...tasks, task]);
    setNewTaskTitle('');
    setNewTaskAmount('');
    setNewTaskNotes('');
  };

  const handleToggleTask = (id: string) => {
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

  const handleRemoveTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  // Salvar Alterações no Lote e Tanque
  const handleSaveChanges = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        status,
        tankId: tankId || null,
        volumePlannedLiters: volumePlanned,
        volumeProducedLiters: volumeProduced,
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
                  Acompanhamento de processos de tanque, tarefas de adega e edições ao vivo
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
                activeTab === 'OVERVIEW' ? 'bg-amber-500 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
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

          {/* ABA 1: TAREFAS DE TANQUE & CRONOGRAMA DA ADEGA */}
          {activeTab === 'TASKS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Lembretes & Tarefas Programadas no Tanque</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cronograma de adições de Dry Hopping, dosagem de antioxidante, purgas e descidas térmicas.
                  </p>
                </div>
              </div>

              {/* Lista de Tarefas */}
              <div className="space-y-2.5">
                {tasks.map((task) => {
                  const isLate = !task.completed && new Date(task.dueDate).getTime() < new Date().setHours(0,0,0,0);
                  const isToday = !task.completed && task.dueDate === todayStr;

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        task.completed
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : isLate
                          ? 'bg-rose-50 border-rose-200'
                          : isToday
                          ? 'bg-amber-50 border-amber-300 shadow-sm'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors mt-0.5 ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300 hover:border-amber-500'
                          }`}
                        >
                          {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
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

                      <button
                        type="button"
                        onClick={() => handleRemoveTask(task.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Adicionar Nova Tarefa */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-amber-600" />
                  <span>Programar Nova Tarefa para este Lote</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Título da Tarefa</label>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="ex: Dry Hopping 3kg Citra ou Dosar 10g Ácido Ascórbico"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de Processo</label>
                    <select
                      value={newTaskType}
                      onChange={(e) => setNewTaskType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                    >
                      <option value="DRY_HOPPING">🌿 Dry Hopping</option>
                      <option value="ANTIOXIDANT">🧪 Antioxidante</option>
                      <option value="COLD_CRASH">❄️ Cold Crash</option>
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
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Quantidade / Dosagem (Opcional)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newTaskAmount}
                      onChange={(e) => setNewTaskAmount(e.target.value)}
                      placeholder="ex: 2.5"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Unidade</label>
                    <select
                      value={newTaskUnit}
                      onChange={(e) => setNewTaskUnit(e.target.value)}
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
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Observações Técnicas</label>
                    <input
                      type="text"
                      value={newTaskNotes}
                      onChange={(e) => setNewTaskNotes(e.target.value)}
                      placeholder="ex: Purgar CO2 antes de abrir a escotilha"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddTask}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  + Salvar Tarefa na Lista
                </button>
              </div>
            </div>
          )}

          {/* ABA 2: CURVA DE FERMENTAÇÃO & MEDIÇÕES */}
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

          {/* ABA 3: PARÂMETROS GERAIS E EDIÇÃO FÍSICO-QUÍMICA */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-amber-600" />
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
