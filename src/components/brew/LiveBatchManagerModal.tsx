'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  Boxes,
  RotateCcw,
  ShieldCheck,
  FileText,
  Zap,
  TrendingUp,
  Printer,
  Filter,
  CheckSquare,
  Square,
  Percent,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateShort, getLocalDateString } from '@/lib/utils';
import {
  brixToSg,
  sgToBrix,
  parseBreweryGravity,
  correctRefractometerBrix,
  calculateMeasurementMetrics,
  calculateAbv,
} from '@/lib/brewing/calculations';
import MapaSelectorInput from '@/components/brew/MapaSelectorInput';

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
  gravity: number; // ex: 1.025 (SG normalizada)
  tempCelsius: number; // ex: 19.5
  ph?: number; // ex: 4.4
  notes?: string;
  brix?: number; // ex: 6.5
  inputUnit?: 'SG' | 'BRIX';
  rawInputBrix?: number; // Leitura original se foi em Brix
  isRefractometerCorrected?: boolean;
  abv?: number; // ex: 5.2
  attenuation?: number; // ex: 78
}

export interface LiveBatchIngredient {
  id?: string;
  inventoryItemId?: string | null;
  inventoryLotId?: string | null;
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

export type BatchTab = 'OVERVIEW' | 'FERMENTATION' | 'INGREDIENTS' | 'MAPA';

export function getEbcHexColor(ebc: number): string {
  if (isNaN(ebc) || ebc <= 0) return '#F8F753';
  if (ebc <= 4) return '#F8F753';
  if (ebc <= 6) return '#F6F512';
  if (ebc <= 8) return '#ECE61A';
  if (ebc <= 12) return '#D5BC26';
  if (ebc <= 16) return '#BF923B';
  if (ebc <= 20) return '#BF813A';
  if (ebc <= 26) return '#BC6733';
  if (ebc <= 33) return '#8D4C32';
  if (ebc <= 39) return '#5D341A';
  if (ebc <= 47) return '#261716';
  if (ebc <= 57) return '#0F0B0A';
  return '#080504';
}

export function getEbcDescription(ebc: number): string {
  if (isNaN(ebc) || ebc <= 0) return 'Palha Claro';
  if (ebc <= 4) return 'Palha Pálido';
  if (ebc <= 7) return 'Amarelo Palha';
  if (ebc <= 11) return 'Dourado';
  if (ebc <= 15) return 'Dourado Âmbar';
  if (ebc <= 20) return 'Âmbar';
  if (ebc <= 26) return 'Cobre / Âmbar Escuro';
  if (ebc <= 35) return 'Marrom Claro';
  if (ebc <= 45) return 'Marrom Escuro';
  return 'Preto Opaco';
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
  // 4 Abas Consolidadas (sem sub-abas aninhadas)
  const [activeTab, setActiveTab] = useState<BatchTab>('OVERVIEW');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Parâmetros do Lote
  const [batchNumber, setBatchNumber] = useState<string>(batch.batchNumber || '');
  const [brewDate, setBrewDate] = useState<string>(
    batch.brewDate ? new Date(batch.brewDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [mapaRegistration, setMapaRegistration] = useState<string>(batch.mapaRegistration || '');
  const [commercialDenomination, setCommercialDenomination] = useState<string>(batch.commercialDenomination || '');
  const [technicalResponsible, setTechnicalResponsible] = useState<string>(batch.technicalResponsible || '');
  const [status, setStatus] = useState<string>(batch.status || 'FERMENTANDO');
  const [tankId, setTankId] = useState<string>(batch.tankId || '');
  const [volumePlanned, setVolumePlanned] = useState<number>(batch.volumePlannedLiters || 500);
  const [volumeProduced, setVolumeProduced] = useState<number>(batch.volumeProducedLiters || batch.volumePlannedLiters || 500);
  const [measuredOg, setMeasuredOg] = useState<string>(batch.measuredOg ? String(batch.measuredOg) : '');
  const [measuredFg, setMeasuredFg] = useState<string>(batch.measuredFg ? String(batch.measuredFg) : '');
  const [measuredIbu, setMeasuredIbu] = useState<string>(
    batch.measuredIbu ? String(batch.measuredIbu) : batch.recipe?.ibu ? String(batch.recipe.ibu) : ''
  );
  const [measuredEbc, setMeasuredEbc] = useState<string>(
    batch.measuredEbc ? String(batch.measuredEbc) : batch.recipe?.ebc ? String(batch.recipe.ebc) : ''
  );
  const [phBoil, setPhBoil] = useState<string>(batch.phBoil ? String(batch.phBoil) : '');
  const [phFermentationStart, setPhFermentationStart] = useState<string>(batch.phFermentationStart ? String(batch.phFermentationStart) : '');
  const [phFinal, setPhFinal] = useState<string>(batch.phFinal ? String(batch.phFinal) : '');
  const [tempMash, setTempMash] = useState<string>(batch.tempMash ? String(batch.tempMash) : '');
  const [tempFermentation, setTempFermentation] = useState<string>(batch.tempFermentation ? String(batch.tempFermentation) : '');
  const [tempMaturation, setTempMaturation] = useState<string>(batch.tempMaturation ? String(batch.tempMaturation) : '');
  const [yeastStrain, setYeastStrain] = useState<string>(batch.yeastStrain || '');
  const [yeastLot, setYeastLot] = useState<string>(batch.yeastLot || '');
  const [yeastGeneration, setYeastGeneration] = useState<string>(batch.yeastGeneration ? String(batch.yeastGeneration) : '1');
  const [sensoryNotes, setSensoryNotes] = useState<string>(batch.sensoryNotes || '');
  const [notes, setNotes] = useState<string>(batch.notes || '');

  // Múltiplas Mosturas (pH & Temperatura com botão +)
  const initialMashList: { id: string; name: string; ph: string; tempCelsius: string }[] = useMemo(() => {
    if (batch.customRecipeDataJson) {
      try {
        const parsed = JSON.parse(batch.customRecipeDataJson);
        if (Array.isArray(parsed.mashList) && parsed.mashList.length > 0) {
          return parsed.mashList;
        }
        if (Array.isArray(parsed.mashPhList) && parsed.mashPhList.length > 0) {
          return parsed.mashPhList.map((m: any) => ({
            id: m.id || `mash-${Date.now()}`,
            name: m.name || 'Mostura',
            ph: m.ph || '',
            tempCelsius: m.tempCelsius || (batch.tempMash ? String(batch.tempMash) : ''),
          }));
        }
      } catch (e) {}
    }
    return [{
      id: 'mash-1',
      name: 'Mostura 1',
      ph: batch.phMash ? String(batch.phMash) : '',
      tempCelsius: batch.tempMash ? String(batch.tempMash) : '',
    }];
  }, [batch]);

  const [mashList, setMashList] = useState(initialMashList);

  const handleAddMash = () => {
    const num = mashList.length + 1;
    setMashList([
      ...mashList,
      { id: `mash-${Date.now()}`, name: `Mostura ${num}`, ph: '', tempCelsius: '' },
    ]);
  };

  const handleUpdateMash = (id: string, field: 'ph' | 'tempCelsius', value: string) => {
    setMashList(mashList.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const handleRemoveMash = (id: string) => {
    if (mashList.length <= 1) return;
    setMashList(mashList.filter((m) => m.id !== id));
  };

  // Múltiplas Fervuras (pH da Fervura com botão +)
  const initialBoilList: { id: string; name: string; ph: string }[] = useMemo(() => {
    if (batch.customRecipeDataJson) {
      try {
        const parsed = JSON.parse(batch.customRecipeDataJson);
        if (Array.isArray(parsed.boilPhList) && parsed.boilPhList.length > 0) {
          return parsed.boilPhList;
        }
      } catch (e) {}
    }
    return [{
      id: 'boil-1',
      name: 'Fervura 1',
      ph: batch.phBoil ? String(batch.phBoil) : '',
    }];
  }, [batch]);

  const [boilList, setBoilList] = useState(initialBoilList);

  const handleAddBoil = () => {
    const num = boilList.length + 1;
    setBoilList([
      ...boilList,
      { id: `boil-${Date.now()}`, name: `Fervura ${num}`, ph: '' },
    ]);
  };

  const handleUpdateBoil = (id: string, ph: string) => {
    setBoilList(boilList.map((b) => (b.id === id ? { ...b, ph } : b)));
  };

  const handleRemoveBoil = (id: string) => {
    if (boilList.length <= 1) return;
    setBoilList(boilList.filter((b) => b.id !== id));
  };

  // 1. TAREFAS DE TANQUE & ADEGA
  const initialTasks: TankTaskItem[] = useMemo(() => {
    if (batch.tankTasksJson) {
      try {
        const parsed = JSON.parse(batch.tankTasksJson);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  }, [batch]);

  const [tasks, setTasks] = useState<TankTaskItem[]>(initialTasks);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Formulário de Tarefa
  const todayStr = getLocalDateString();
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

  const handleAddQuickTask = (
    type: TankTaskItem['type'],
    defaultTitle: string,
    defaultUnit = 'KG',
    defaultAmount?: number
  ) => {
    const newTask: TankTaskItem = {
      id: `task-${Date.now()}`,
      title: defaultTitle,
      type,
      dueDate: todayStr,
      completed: false,
      amount: defaultAmount,
      unit: defaultUnit,
    };
    setTasks((prev) => [...prev, newTask]);
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

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'PENDING') return tasks.filter((t) => !t.completed);
    if (taskFilter === 'COMPLETED') return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, taskFilter]);

  // 2. INSUMOS DO LOTE (EDIÇÃO DINÂMICA DA RECEITA)
  const initialIngredients: LiveBatchIngredient[] = useMemo(() => {
    if (Array.isArray(batch.ingredients) && batch.ingredients.length > 0) {
      return batch.ingredients.map((ing: any) => ({
        id: ing.id,
        inventoryItemId: ing.inventoryItemId,
        inventoryLotId: ing.inventoryLotId,
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

  // Vincular item do estoque ao ingrediente do lote
  const handleSelectInventoryItem = (index: number, inventoryItemId: string) => {
    const stockItem = inventoryItems.find((i) => i.id === inventoryItemId);
    if (!stockItem) return;

    const availableLot = stockItem.lots?.find((l: any) => l.currentQuantity > 0) || stockItem.lots?.[0];

    const next = [...batchIngredients];
    next[index] = {
      ...next[index],
      inventoryItemId: stockItem.id,
      inventoryLotId: availableLot?.id || null,
      name: stockItem.name,
      category: stockItem.category as any,
      unit: stockItem.unit,
      costPerUnit: stockItem.costPerUnit || availableLot?.costPerUnit || 0,
      supplierLot: availableLot?.lotNumber || stockItem.supplierLot || '',
      supplierName: stockItem.supplier?.name || availableLot?.supplierName || '',
    };
    setBatchIngredients(next);
  };

  const addBatchIngredient = (category: LiveBatchIngredient['category'] = 'MALTE', fromStockItem?: any) => {
    if (fromStockItem) {
      const lot = fromStockItem.lots?.find((l: any) => l.currentQuantity > 0) || fromStockItem.lots?.[0];
      const newItem: LiveBatchIngredient = {
        inventoryItemId: fromStockItem.id,
        inventoryLotId: lot?.id || null,
        name: fromStockItem.name,
        category: fromStockItem.category as any,
        amount: fromStockItem.category === 'LUPULO' ? 1000 : fromStockItem.category === 'MALTE' ? 25 : 1,
        unit: fromStockItem.unit || 'KG',
        stage: fromStockItem.category === 'LUPULO' ? 'DRY_HOPPING' : fromStockItem.category === 'ADJUNTO' ? 'MATURACAO' : 'MOSTURA',
        costPerUnit: fromStockItem.costPerUnit || 0,
        supplierLot: lot?.lotNumber || fromStockItem.supplierLot || '',
        supplierName: fromStockItem.supplier?.name || '',
      };
      setBatchIngredients([...batchIngredients, newItem]);
      return;
    }

    const newItem: LiveBatchIngredient = {
      name: category === 'LUPULO' ? 'Novo Lúpulo' : category === 'ADJUNTO' ? 'Novo Adjunto / Fruta' : category === 'LEVEDURA' ? 'Nova Levedura' : category === 'AGUA_SAIS' ? 'Sais de Brassagem' : 'Novo Malte',
      category,
      amount: category === 'LUPULO' ? 1000 : category === 'MALTE' ? 25 : 1,
      unit: category === 'LUPULO' ? 'G' : category === 'MALTE' ? 'KG' : category === 'LEVEDURA' ? 'PACOTE' : 'KG',
      stage: category === 'LUPULO' ? 'DRY_HOPPING' : category === 'ADJUNTO' ? 'MATURACAO' : category === 'LEVEDURA' ? 'FERMENTACAO' : 'MOSTURA',
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

  const effectiveBatchVolume = useMemo(() => {
    return volumeProduced || volumePlanned || 500;
  }, [volumeProduced, volumePlanned]);

  // CUSTOS E PRECIFICAÇÃO (SINCRONIZAÇÃO BIDIRECIONAL)
  const initialCostPerLiter = useMemo(() => {
    if (batch.costPerLiter !== null && batch.costPerLiter !== undefined && batch.costPerLiter > 0) {
      return batch.costPerLiter.toFixed(2);
    }
    if (batch.recipe?.costPerLiter !== null && batch.recipe?.costPerLiter !== undefined && batch.recipe.costPerLiter > 0) {
      return batch.recipe.costPerLiter.toFixed(2);
    }
    if (batchCostPerLiter > 0) {
      return batchCostPerLiter.toFixed(2);
    }
    return '';
  }, [batch, batchCostPerLiter]);

  const initialTotalCost = useMemo(() => {
    if (batch.totalCost !== null && batch.totalCost !== undefined && batch.totalCost > 0) {
      return batch.totalCost.toFixed(2);
    }
    const vol = volumeProduced || volumePlanned || 500;
    if (batch.costPerLiter && batch.costPerLiter > 0) {
      return (batch.costPerLiter * vol).toFixed(2);
    }
    if (batch.recipe?.costPerLiter && batch.recipe.costPerLiter > 0) {
      return (batch.recipe.costPerLiter * vol).toFixed(2);
    }
    if (batchTotalCost > 0) {
      return batchTotalCost.toFixed(2);
    }
    return '';
  }, [batch, batchTotalCost, volumeProduced, volumePlanned]);

  const [totalCostManual, setTotalCostManual] = useState<string>(initialTotalCost);
  const [costPerLiterManual, setCostPerLiterManual] = useState<string>(initialCostPerLiter);

  const initialSalePrice = useMemo(() => {
    if (batch.recipe?.salePricePerLiter !== null && batch.recipe?.salePricePerLiter !== undefined && batch.recipe.salePricePerLiter > 0) {
      return String(batch.recipe.salePricePerLiter);
    }
    if (batch.recipe?.suggestedPricePerLiter !== null && batch.recipe?.suggestedPricePerLiter !== undefined && batch.recipe.suggestedPricePerLiter > 0) {
      return String(batch.recipe.suggestedPricePerLiter);
    }
    return '18.00';
  }, [batch]);

  const [salePricePerLiter, setSalePricePerLiter] = useState<string>(initialSalePrice);

  const handleTotalCostChange = (val: string) => {
    setTotalCostManual(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && effectiveBatchVolume > 0) {
      const perLiter = num / effectiveBatchVolume;
      setCostPerLiterManual(perLiter.toFixed(2));
    } else if (val === '') {
      setCostPerLiterManual('');
    }
  };

  const handleCostPerLiterChange = (val: string) => {
    setCostPerLiterManual(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && effectiveBatchVolume > 0) {
      const total = num * effectiveBatchVolume;
      setTotalCostManual(total.toFixed(2));
    } else if (val === '') {
      setTotalCostManual('');
    }
  };

  const handlePullFromIngredients = () => {
    if (batchCostPerLiter > 0 || batchTotalCost > 0) {
      setCostPerLiterManual(batchCostPerLiter.toFixed(2));
      setTotalCostManual((batchTotalCost || batchCostPerLiter * effectiveBatchVolume).toFixed(2));
    }
  };

  const handleVolumeProducedChange = (newVol: number) => {
    setVolumeProduced(newVol);
    if (newVol > 0) {
      const numTotal = parseFloat(totalCostManual);
      const numPerLiter = parseFloat(costPerLiterManual);
      if (!isNaN(numTotal) && numTotal > 0) {
        setCostPerLiterManual((numTotal / newVol).toFixed(2));
      } else if (!isNaN(numPerLiter) && numPerLiter > 0) {
        setTotalCostManual((numPerLiter * newVol).toFixed(2));
      }
    }
  };

  const effectiveCostPerLiter = useMemo(() => {
    const num = parseFloat(costPerLiterManual);
    if (!isNaN(num) && num >= 0) return num;
    const numTot = parseFloat(totalCostManual);
    if (!isNaN(numTot) && numTot >= 0 && effectiveBatchVolume > 0) {
      return numTot / effectiveBatchVolume;
    }
    return 0;
  }, [costPerLiterManual, totalCostManual, effectiveBatchVolume]);

  const effectiveTotalCost = useMemo(() => {
    const numTot = parseFloat(totalCostManual);
    if (!isNaN(numTot) && numTot >= 0) return numTot;
    return effectiveCostPerLiter * effectiveBatchVolume;
  }, [totalCostManual, effectiveCostPerLiter, effectiveBatchVolume]);

  const numSalePrice = useMemo(() => {
    return parseFloat(salePricePerLiter) || 0;
  }, [salePricePerLiter]);

  const grossMarginPercent = useMemo(() => {
    if (numSalePrice <= 0) return 0;
    return ((numSalePrice - effectiveCostPerLiter) / numSalePrice) * 100;
  }, [numSalePrice, effectiveCostPerLiter]);

  const totalEstimatedRevenue = useMemo(() => {
    return numSalePrice * effectiveBatchVolume;
  }, [numSalePrice, effectiveBatchVolume]);

  const totalEstimatedProfit = useMemo(() => {
    return totalEstimatedRevenue - effectiveTotalCost;
  }, [totalEstimatedRevenue, effectiveTotalCost]);

  // 3. MEDIÇÕES DIÁRIAS (CURVA DE FERMENTAÇÃO)
  const initialLogs: FermentationLogItem[] = useMemo(() => {
    if (batch.fermentationLogsJson) {
      try {
        const parsed = JSON.parse(batch.fermentationLogsJson);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            ...item,
            gravity: item.gravity > 50 ? item.gravity / 1000 : item.gravity,
          }));
        }
      } catch (e) {}
    }
    return [];
  }, [batch]);

  const [logs, setLogs] = useState<FermentationLogItem[]>(initialLogs);
  const [logInputUnit, setLogInputUnit] = useState<'SG' | 'BRIX'>('SG');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pinttech_measurement_unit');
      if (saved === 'BRIX' || saved === 'SG') {
        setLogInputUnit(saved);
      }
    } catch {}
  }, []);

  const handleUnitChange = (unit: 'SG' | 'BRIX') => {
    setLogInputUnit(unit);
    try {
      localStorage.setItem('pinttech_measurement_unit', unit);
    } catch {}
  };

  const [newLogDate, setNewLogDate] = useState<string>(todayStr);
  const [newLogGravity, setNewLogGravity] = useState<string>('');
  const [newLogBrix, setNewLogBrix] = useState<string>('');
  const [applyRefractometerCorrection, setApplyRefractometerCorrection] = useState<boolean>(true);
  const [newLogTemp, setNewLogTemp] = useState<string>('19.0');
  const [newLogPh, setNewLogPh] = useState<string>('');
  const [newLogNotes, setNewLogNotes] = useState<string>('');
  const [fgUpdatedFeedback, setFgUpdatedFeedback] = useState<boolean>(false);

  // OG de referência do lote para cálculos de correção e ABV
  const referenceOg = useMemo(() => {
    const parsedBatchOg = parseBreweryGravity(measuredOg || batch.measuredOg);
    if (parsedBatchOg && parsedBatchOg > 1.0) return parsedBatchOg;

    const parsedRecipeOg = parseBreweryGravity(batch.recipe?.og);
    if (parsedRecipeOg && parsedRecipeOg > 1.0) return parsedRecipeOg;

    if (logs.length > 0) {
      const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
      const firstG = sorted[0].gravity > 50 ? sorted[0].gravity / 1000 : sorted[0].gravity;
      if (firstG >= 1.020) return firstG;
    }

    return 1.050;
  }, [measuredOg, batch.measuredOg, batch.recipe?.og, logs]);

  // Cálculo e preview em tempo real ao digitar Brix ou SG
  const liveMeasurementPreview = useMemo(() => {
    if (logInputUnit === 'BRIX') {
      if (!newLogBrix.trim()) return null;
      const brixVal = parseFloat(newLogBrix.replace(',', '.'));
      if (isNaN(brixVal) || brixVal <= 0) return null;

      if (applyRefractometerCorrection && referenceOg > 1.0) {
        const corrected = correctRefractometerBrix(referenceOg, brixVal);
        return {
          sg: corrected.fgSg,
          rawBrix: brixVal,
          realBrix: corrected.realBrix,
          abv: corrected.abv,
          attenuation: corrected.attenuationPercent,
          isCorrected: true,
        };
      } else {
        const rawSg = Math.round(brixToSg(brixVal) * 1000) / 1000;
        const metrics = calculateMeasurementMetrics(referenceOg, rawSg);
        return {
          sg: rawSg,
          rawBrix: brixVal,
          realBrix: brixVal,
          abv: metrics.abv,
          attenuation: metrics.attenuationPercent,
          isCorrected: false,
        };
      }
    } else {
      if (!newLogGravity.trim()) return null;
      const parsedSg = parseBreweryGravity(newLogGravity);
      if (!parsedSg) return null;
      const metrics = calculateMeasurementMetrics(referenceOg, parsedSg);
      return {
        sg: parsedSg,
        rawBrix: metrics.brix,
        realBrix: metrics.brix,
        abv: metrics.abv,
        attenuation: metrics.attenuationPercent,
        isCorrected: false,
      };
    }
  }, [logInputUnit, newLogBrix, newLogGravity, applyRefractometerCorrection, referenceOg]);

  const enrichedLogs = useMemo(() => {
    return logs.map((log) => {
      const normGravity = log.gravity > 50 ? log.gravity / 1000 : log.gravity;
      const metrics = calculateMeasurementMetrics(referenceOg, normGravity);
      return {
        ...log,
        gravity: normGravity,
        brix: log.brix ?? metrics.brix,
        abv: log.abv ?? metrics.abv,
        attenuation: log.attenuation ?? metrics.attenuationPercent,
      };
    });
  }, [logs, referenceOg]);

  const latestLog = useMemo(() => {
    if (enrichedLogs.length === 0) return null;
    return [...enrichedLogs].sort((a, b) => a.date.localeCompare(b.date))[enrichedLogs.length - 1];
  }, [enrichedLogs]);

  const handleAddLog = () => {
    if (!liveMeasurementPreview) return;
    const item: FermentationLogItem = {
      id: `log-${Date.now()}`,
      date: newLogDate,
      gravity: liveMeasurementPreview.sg,
      tempCelsius: parseFloat(newLogTemp) || 19.0,
      ph: newLogPh ? parseFloat(newLogPh.replace(',', '.')) : undefined,
      notes: newLogNotes.trim() || undefined,
      brix: liveMeasurementPreview.realBrix,
      inputUnit: logInputUnit,
      rawInputBrix: logInputUnit === 'BRIX' ? liveMeasurementPreview.rawBrix : undefined,
      isRefractometerCorrected: liveMeasurementPreview.isCorrected,
      abv: liveMeasurementPreview.abv,
      attenuation: liveMeasurementPreview.attenuation,
    };
    setLogs([...logs, item]);
    setNewLogGravity('');
    setNewLogBrix('');
    setNewLogPh('');
    setNewLogNotes('');
  };

  const handleApplyLatestFg = (fgVal: number) => {
    setMeasuredFg(fgVal.toFixed(3));
    setFgUpdatedFeedback(true);
    setTimeout(() => setFgUpdatedFeedback(false), 3000);
  };

  const handleRemoveLog = (id: string) => {
    setLogs(logs.filter((l) => l.id !== id));
  };

  // SALVAR TUDO (LOTE + INSUMOS + TAREFAS + MEDIÇÕES)
  const handleSaveChanges = async () => {
    setLoading(true);
    setError('');

    try {
      const validMashPhs = mashList.map((m) => parseFloat(m.ph)).filter((n) => !isNaN(n) && n > 0);
      const computedMashPh = validMashPhs.length > 0
        ? Math.round((validMashPhs.reduce((a, b) => a + b, 0) / validMashPhs.length) * 100) / 100
        : null;

      const validMashTemps = mashList.map((m) => parseFloat(m.tempCelsius)).filter((n) => !isNaN(n) && n > 0);
      const computedMashTemp = validMashTemps.length > 0
        ? Math.round((validMashTemps.reduce((a, b) => a + b, 0) / validMashTemps.length) * 10) / 10
        : (tempMash ? parseFloat(tempMash) : null);

      const validBoilPhs = boilList.map((b) => parseFloat(b.ph)).filter((n) => !isNaN(n) && n > 0);
      const computedBoilPh = validBoilPhs.length > 0
        ? Math.round((validBoilPhs.reduce((a, b) => a + b, 0) / validBoilPhs.length) * 100) / 100
        : null;

      let customObj: any = {};
      if (batch.customRecipeDataJson) {
        try {
          customObj = JSON.parse(batch.customRecipeDataJson);
        } catch (e) {}
      }
      customObj.mashList = mashList;
      customObj.mashPhList = mashList;
      customObj.boilPhList = boilList;

      const parsedOgNum = parseBreweryGravity(measuredOg);
      const parsedFgNum = parseBreweryGravity(measuredFg);
      const computedAbv = (parsedOgNum && parsedFgNum && parsedOgNum > parsedFgNum && parsedOgNum > 1.0)
        ? calculateAbv(parsedOgNum, parsedFgNum)
        : null;
      const computedAttenuation = (parsedOgNum && parsedFgNum && parsedOgNum > parsedFgNum && parsedOgNum > 1.0)
        ? Math.round(((parsedOgNum - parsedFgNum) / (parsedOgNum - 1.0)) * 1000) / 10
        : null;

      const payload = {
        batchNumber: batchNumber.trim() || undefined,
        brewDate: brewDate ? new Date(brewDate).toISOString() : undefined,
        mapaRegistration: mapaRegistration.trim() || null,
        commercialDenomination: commercialDenomination.trim() || null,
        technicalResponsible: technicalResponsible.trim() || null,
        status,
        tankId: tankId || null,
        volumePlannedLiters: volumePlanned,
        volumeProducedLiters: volumeProduced,
        costPerLiter: effectiveCostPerLiter,
        totalCost: effectiveTotalCost,
        salePricePerLiter: numSalePrice,
        recipeCostPerLiter: effectiveCostPerLiter,
        measuredOg: parsedOgNum,
        measuredFg: parsedFgNum,
        measuredAbv: computedAbv,
        measuredIbu: measuredIbu ? parseInt(measuredIbu, 10) : (batch.recipe?.ibu ?? null),
        measuredEbc: measuredEbc ? parseFloat(measuredEbc) : (batch.recipe?.ebc ?? null),
        attenuationPercent: computedAttenuation,
        phMash: computedMashPh,
        phBoil: computedBoilPh,
        phFermentationStart: phFermentationStart ? parseFloat(phFermentationStart) : null,
        phFinal: phFinal ? parseFloat(phFinal) : null,
        tempMash: computedMashTemp,
        tempFermentation: tempFermentation ? parseFloat(tempFermentation) : null,
        tempMaturation: tempMaturation ? parseFloat(tempMaturation) : null,
        yeastStrain: yeastStrain.trim() || null,
        yeastLot: yeastLot.trim() || null,
        yeastGeneration: yeastGeneration ? parseInt(yeastGeneration, 10) : null,
        sensoryNotes: sensoryNotes.trim() || null,
        notes: notes.trim() || null,
        customRecipeDataJson: JSON.stringify(customObj),
        tankTasksJson: JSON.stringify(tasks),
        fermentationLogsJson: JSON.stringify(enrichedLogs),
        ingredients: batchIngredients.map((item) => ({
          inventoryItemId: item.inventoryItemId || null,
          inventoryLotId: item.inventoryLotId || null,
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

  const handleDeleteBatch = async () => {
    if (
      !confirm(
        `Tem certeza que deseja excluir o lote ${batchNumber || batch.batchNumber}? Esta ação é permanente, o tanque será liberado e o histórico será removido.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/batches/${batch.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir lote');

      onSaved(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir lote');
      setLoading(false);
    }
  };

  // Ação de Impressão de Laudo / Ficha Técnica
  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl text-slate-800 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/90">
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
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    {batchNumber || batch.batchNumber}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                    {status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {batch.recipe?.style || 'Cerveja Artesanal'} • Volume: {volumeProduced || volumePlanned}L • Iniciado em {formatDate(brewDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintSheet}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-xs"
                title="Imprimir Ficha Técnica do Lote"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Imprimir Ficha</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* AS 4 ABAS UNIFICADAS E DIRETAS (SEM SUB-ABAS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl border border-slate-200 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'OVERVIEW'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400'
                  : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Zap className={`w-4 h-4 ${activeTab === 'OVERVIEW' ? 'text-slate-950' : 'text-amber-600'}`} />
              <span className="truncate">1. Status & Físico-Química</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FERMENTATION')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'FERMENTATION'
                  ? 'bg-cyan-600 text-white font-black shadow-sm ring-1 ring-cyan-500'
                  : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Activity className={`w-4 h-4 ${activeTab === 'FERMENTATION' ? 'text-white' : 'text-cyan-600'}`} />
              <span className="truncate">2. Adega & Medições</span>
              {tasks.filter((t) => !t.completed).length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'FERMENTATION' ? 'bg-cyan-900 text-cyan-100' : 'bg-amber-100 text-amber-800'}`}>
                  {tasks.filter((t) => !t.completed).length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INGREDIENTS')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'INGREDIENTS'
                  ? 'bg-emerald-600 text-white font-black shadow-sm ring-1 ring-emerald-500'
                  : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Boxes className={`w-4 h-4 ${activeTab === 'INGREDIENTS' ? 'text-white' : 'text-emerald-600'}`} />
              <span className="truncate">3. Insumos & Custos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'INGREDIENTS' ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
                {batchIngredients.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MAPA')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'MAPA'
                  ? 'bg-purple-600 text-white font-black shadow-sm ring-1 ring-purple-500'
                  : 'bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${activeTab === 'MAPA' ? 'text-white' : 'text-purple-600'}`} />
              <span className="truncate">4. Rótulo, MAPA & Laudo</span>
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 1: STATUS & FÍSICO-QUÍMICA (OPERACIONAL, TANQUE, RENDIMENTO E LABORATÓRIO) */}
          {/* ========================================================================= */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-5">
              {/* STEPPER INTERATIVO DE 7 ETAPAS COM CLIQUE DIRETO */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Estágio da Produção (Clique para Avançar de Etapa)</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      O status atualiza imediatamente os tanques, relatórios de adega e previsões de envase.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 w-fit">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Etapa Atual: {status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
                  {[
                    { value: 'PLANEJADO', label: '1. Planejado', icon: Clock, activeClass: 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-400' },
                    { value: 'BRASSAGEM', label: '2. Brassagem', icon: Flame, activeClass: 'bg-amber-500 text-slate-950 font-black border-amber-500 ring-2 ring-amber-400' },
                    { value: 'FERMENTANDO', label: '3. Fermentando', icon: Activity, activeClass: 'bg-cyan-600 text-white font-black border-cyan-600 ring-2 ring-cyan-400' },
                    { value: 'MATURANDO', label: '4. Maturando', icon: Thermometer, activeClass: 'bg-purple-600 text-white font-black border-purple-600 ring-2 ring-purple-400' },
                    { value: 'PRONTO_ENVASE', label: '5. Pronto Envase', icon: CheckCircle2, activeClass: 'bg-emerald-600 text-white font-black border-emerald-600 ring-2 ring-emerald-400' },
                    { value: 'ENVASADO', label: '6. Envasado', icon: Package, activeClass: 'bg-blue-600 text-white font-black border-blue-600 ring-2 ring-blue-400' },
                    { value: 'FINALIZADO', label: '7. Finalizado', icon: Check, activeClass: 'bg-slate-700 text-white font-black border-slate-700 ring-2 ring-slate-400' },
                  ].map((step) => {
                    const Icon = step.icon;
                    const isSelected = status === step.value;
                    return (
                      <button
                        key={step.value}
                        type="button"
                        onClick={() => setStatus(step.value)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? step.activeClass + ' shadow-md scale-[1.03]'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-4 h-4 ${isSelected ? 'opacity-100' : 'text-slate-500'}`} />
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-[11px] font-bold leading-tight">{step.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CARD OPERACIONAL: TANQUE, VOLUMES & MEDIDOR DE RENDIMENTO % */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                    <Cylinder className="w-4 h-4 text-amber-600" />
                    <span>Tanque Atribuído & Rendimento Volumétrico</span>
                  </span>
                  {(() => {
                    const diff = volumeProduced - volumePlanned;
                    const efficiency = volumePlanned > 0 ? Math.round((volumeProduced / volumePlanned) * 100) : 100;
                    return (
                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${efficiency >= 95 && efficiency <= 105 ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
                        Rendimento: {efficiency}% ({diff >= 0 ? `+${diff}L` : `${diff}L`})
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanque Atribuído</label>
                    <select
                      value={tankId}
                      onChange={(e) => setTankId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Sem tanque atribuído</option>
                      {tanks.map((t) => (
                        <option key={t.id} value={t.id}>
                          🏺 {t.name} ({t.capacityLiters}L - {t.status})
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const selectedTank = tanks.find((t) => t.id === tankId);
                      if (!selectedTank) return null;
                      const occupationPercent = Math.round((volumeProduced / (selectedTank.capacityLiters || 1)) * 100);
                      return (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                          <span className="inline-block w-2 h-2 rounded-full bg-cyan-500" />
                          <span>Capacidade: <strong>{selectedTank.capacityLiters}L</strong> ({occupationPercent}% ocupado)</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Volume Planejado (L)</label>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 text-right">
                      {volumePlanned} L
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Definido na ordem de brassagem</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Volume Real Produzido (L)</label>
                    <input
                      type="number"
                      value={volumeProduced}
                      onChange={(e) => handleVolumeProducedChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1 text-right">Medido no tanque após resfriamento</span>
                  </div>
                </div>

                {/* BARRA DE RENDIMENTO VOLUMÉTRICO */}
                {(() => {
                  const efficiency = volumePlanned > 0 ? Math.round((volumeProduced / volumePlanned) * 100) : 100;
                  return (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600">Eficiência de Envasamento / Ocupação Planejada</span>
                        <span className="text-slate-900 font-black">{volumeProduced}L / {volumePlanned}L ({efficiency}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            efficiency > 105 ? 'bg-amber-500' : efficiency >= 90 ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(efficiency, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* CARD LABORATÓRIO VIVO: DENSIDADES, ÁLCOOL (% ABV) & ATENUAÇÃO */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/70 via-white to-cyan-50/70 rounded-2xl border border-amber-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-600" />
                    <span>Laboratório Físico-Química: OG, FG & Teor Alcoólico</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Sean Terrill Refractometer / Hydrometer ABV
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">OG Medida (Gravidade Inicial)</label>
                    <input
                      type="text"
                      placeholder="Ex: 1.054 ou 1054"
                      value={measuredOg}
                      onChange={(e) => setMeasuredOg(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {(() => {
                      const pOg = parseBreweryGravity(measuredOg);
                      return pOg ? (
                        <span className="text-[10px] font-bold text-amber-700 block mt-1">
                          ≈ {sgToBrix(pOg).toFixed(1)} °Bx / Plato
                        </span>
                      ) : null;
                    })()}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">FG Medida (Gravidade Final)</label>
                    <input
                      type="text"
                      placeholder="Ex: 1.010 ou 1010"
                      value={measuredFg}
                      onChange={(e) => setMeasuredFg(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {(() => {
                      const pFg = parseBreweryGravity(measuredFg);
                      return pFg ? (
                        <span className="text-[10px] font-bold text-cyan-700 block mt-1">
                          ≈ {sgToBrix(pFg).toFixed(1)} °Bx / Plato
                        </span>
                      ) : null;
                    })()}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Teor Alcoólico Real & Atenuação</label>
                    <div className="w-full bg-white border-2 border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-emerald-950 flex items-center justify-between shadow-xs">
                      {(() => {
                        const pOg = parseBreweryGravity(measuredOg);
                        const pFg = parseBreweryGravity(measuredFg);
                        if (pOg && pFg && pOg > pFg && pOg > 1.0) {
                          const abv = calculateAbv(pOg, pFg);
                          const att = Math.round(((pOg - pFg) / (pOg - 1.0)) * 1000) / 10;
                          return (
                            <>
                              <span className="text-sm font-black text-emerald-700">{abv.toFixed(1)}% ABV</span>
                              <span className="text-[11px] text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300 font-bold">
                                {att}% atenuação
                              </span>
                            </>
                          );
                        }
                        return <span className="text-slate-400 font-normal">Preencha OG e FG</span>;
                      })()}
                    </div>
                  </div>
                </div>

                {/* AMARGOR (IBU) E COR (EBC) COM PREVIEW REAL DA COR DA CERVEJA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-amber-200/50">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amargor Medido / Estimado (IBU)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder={batch.recipe?.ibu ? String(batch.recipe.ibu) : 'Ex: 40'}
                        value={measuredIbu}
                        onChange={(e) => setMeasuredIbu(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">IBU</span>
                    </div>
                    {batch.recipe?.ibu && (
                      <span className="text-[10px] text-slate-500 block mt-1">Alvo da receita: {batch.recipe.ibu} IBU</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cor Real da Cerveja (EBC) & Amostra Visual</label>
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.5"
                          placeholder={batch.recipe?.ebc ? String(batch.recipe.ebc) : 'Ex: 12'}
                          value={measuredEbc}
                          onChange={(e) => setMeasuredEbc(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">EBC</span>
                      </div>

                      {/* SWATCH VISUAL DA COR DA CERVEJA */}
                      {(() => {
                        const numEbc = parseFloat(measuredEbc) || parseFloat(batch.recipe?.ebc) || 8;
                        const hex = getEbcHexColor(numEbc);
                        const desc = getEbcDescription(numEbc);
                        return (
                          <div
                            className="h-9 px-3 rounded-xl border border-slate-300/80 shadow-xs flex items-center gap-2 min-w-[140px] transition-all"
                            style={{ backgroundColor: hex }}
                            title={`Cor aproximada: ${numEbc} EBC (${desc})`}
                          >
                            <span
                              className={`text-[10px] font-black uppercase drop-shadow-sm ${
                                numEbc > 18 ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {desc}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD MÚLTIPLAS MOSTURAS (+) */}
              <div className="bg-amber-50/70 border border-amber-300/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-amber-950 uppercase flex items-center gap-1.5">
                      <Beaker className="w-4 h-4 text-amber-700" />
                      <span>Mostura: pH & Temperatura (Múltiplas Mosturas)</span>
                    </span>
                    <p className="text-[11px] text-amber-800/80">
                      Registre o pH e a temperatura de cada mostura individual para controle de brassagem.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMash}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Mostura (+)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {mashList.map((mash) => (
                    <div
                      key={mash.id}
                      className="bg-white border border-amber-200 rounded-xl p-3 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-xs font-bold text-slate-800">{mash.name}</span>
                        {mashList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMash(mash.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                            title="Excluir esta mostura"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">pH Mostura</label>
                          <input
                            type="text"
                            placeholder="Ex: 5.35"
                            value={mash.ph}
                            onChange={(e) => handleUpdateMash(mash.id, 'ph', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Temp. (°C)</label>
                          <input
                            type="text"
                            placeholder="Ex: 66.0"
                            value={mash.tempCelsius}
                            onChange={(e) => handleUpdateMash(mash.id, 'tempCelsius', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD MÚLTIPLAS FERVURAS (+) */}
              <div className="bg-orange-50/70 border border-orange-300/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-orange-950 uppercase flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-700" />
                      <span>pH da Fervura (Múltiplas Fervuras)</span>
                    </span>
                    <p className="text-[11px] text-orange-800/80">
                      Adicione cada fervura individual se houver fracionamento ou mais de uma fervura.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBoil}
                    className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Fervura (+)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {boilList.map((boil) => (
                    <div
                      key={boil.id}
                      className="bg-white border border-orange-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs"
                    >
                      <span className="text-xs font-bold text-slate-800 whitespace-nowrap">
                        {boil.name}:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Ex: 5.10"
                          value={boil.ph}
                          onChange={(e) => handleUpdateBoil(boil.id, e.target.value)}
                          className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-orange-800 text-center focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                        />
                        {boilList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBoil(boil.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                            title="Excluir esta fervura"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD PARÂMETROS DE FERMENTAÇÃO, MATURAÇÃO & LEVEDURA */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-cyan-600" />
                  <span>pHs de Processo & Temperaturas de Controle</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">pH Início da Fermentação</label>
                    <input
                      type="text"
                      placeholder="Ex: 5.05"
                      value={phFermentationStart}
                      onChange={(e) => setPhFermentationStart(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">pH Final (Envase)</label>
                    <input
                      type="text"
                      placeholder="Ex: 4.30"
                      value={phFinal}
                      onChange={(e) => setPhFinal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Temp. Fermentação (°C)</label>
                    <input
                      type="text"
                      placeholder="Ex: 19.0"
                      value={tempFermentation}
                      onChange={(e) => setTempFermentation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Temp. Maturação (°C)</label>
                    <input
                      type="text"
                      placeholder="Ex: 0.5"
                      value={tempMaturation}
                      onChange={(e) => setTempMaturation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* RASTREABILIDADE DA LEVEDURA */}
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1.5 mb-2.5">
                    <Droplets className="w-3.5 h-3.5 text-amber-600" />
                    <span>Inóculo & Rastreabilidade de Levedura</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Cepa da Levedura</label>
                      <input
                        type="text"
                        placeholder="Ex: Fermentis US-05 / W-34/70"
                        value={yeastStrain}
                        onChange={(e) => setYeastStrain(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Nº Lote da Levedura</label>
                      <input
                        type="text"
                        placeholder="Ex: 881-A"
                        value={yeastLot}
                        onChange={(e) => setYeastLot(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Geração da Levedura</label>
                      <input
                        type="number"
                        min="1"
                        value={yeastGeneration}
                        onChange={(e) => setYeastGeneration(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: ADEGA, MEDIÇÕES & TAREFAS (UNIFICA CURVA DIÁRIA E CRONOGRAMA DE ADEGA) */}
          {/* ========================================================================= */}
          {activeTab === 'FERMENTATION' && (
            <div className="space-y-6">
              {/* TOP CARDS: KPIS DA FERMENTAÇÃO */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">OG de Referência</span>
                  <div className="text-base font-black text-amber-800 mt-0.5">
                    {referenceOg.toFixed(3)} <span className="text-xs font-bold text-amber-600">SG</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 block mt-0.5">
                    ≈ {sgToBrix(referenceOg).toFixed(1)} °Bx
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Última Densidade</span>
                  <div className="text-base font-black text-cyan-800 mt-0.5">
                    {latestLog ? `${latestLog.gravity.toFixed(3)} ` : '— '}
                    <span className="text-xs font-bold text-cyan-600">SG</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 block mt-0.5">
                    {latestLog ? `≈ ${(latestLog.brix ?? sgToBrix(latestLog.gravity)).toFixed(1)} °Bx` : 'Sem medições'}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Teor Alcoólico Atual</span>
                  <div className="text-base font-black text-emerald-700 mt-0.5">
                    {latestLog && latestLog.abv ? `${latestLog.abv.toFixed(1)}%` : '0.0%'} <span className="text-xs font-bold text-emerald-600">ABV</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 block mt-0.5">
                    {latestLog && latestLog.attenuation ? `${latestLog.attenuation.toFixed(1)}% atenuação` : 'Pré-fermentação'}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tanque & pH</span>
                    <div className="text-base font-black text-slate-800 mt-0.5">
                      {latestLog ? `${latestLog.tempCelsius}°C` : (tempFermentation ? `${tempFermentation}°C` : '—')}
                    </div>
                  </div>
                  {latestLog && (
                    <button
                      type="button"
                      onClick={() => handleApplyLatestFg(latestLog.gravity)}
                      className="mt-1 inline-flex items-center justify-center gap-1 py-1 px-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-black transition"
                      title="Salva essa última leitura como a FG oficial do lote"
                    >
                      <CheckCircle2 className="w-3 h-3 text-amber-700" />
                      <span>{fgUpdatedFeedback ? '✓ FG Atualizada!' : `Definir FG Oficial`}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* FORMULÁRIO DE MEDIÇÃO RÁPIDA (COM PREVIEW INSTANTÂNEO) */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-600" />
                      <span>Nova Medição da Adega</span>
                    </span>
                    <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleUnitChange('SG')}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                          logInputUnit === 'SG'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        SG (Densímetro)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnitChange('BRIX')}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                          logInputUnit === 'BRIX'
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        °Brix (Refratômetro)
                      </button>
                    </div>
                  </div>

                  {logInputUnit === 'BRIX' && (
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={applyRefractometerCorrection}
                        onChange={(e) => setApplyRefractometerCorrection(e.target.checked)}
                        className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                      />
                      <span>Correção de Álcool (Sean Terrill)</span>
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Data da Medição</label>
                    <input
                      type="date"
                      value={newLogDate}
                      onChange={(e) => setNewLogDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  {logInputUnit === 'BRIX' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Leitura (°Brix)
                      </label>
                      <input
                        type="text"
                        value={newLogBrix}
                        onChange={(e) => setNewLogBrix(e.target.value)}
                        placeholder="ex: 6.5 ou 12.0"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Densidade (SG)
                      </label>
                      <input
                        type="text"
                        value={newLogGravity}
                        onChange={(e) => setNewLogGravity(e.target.value)}
                        placeholder="ex: 1.020 ou 1020"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Temp. Tanque (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newLogTemp}
                      onChange={(e) => setNewLogTemp(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">pH Atual</label>
                    <input
                      type="text"
                      value={newLogPh}
                      onChange={(e) => setNewLogPh(e.target.value)}
                      placeholder="ex: 4.4"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Observações</label>
                    <input
                      type="text"
                      value={newLogNotes}
                      onChange={(e) => setNewLogNotes(e.target.value)}
                      placeholder="Ex: Amostra límpida"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLog}
                    disabled={!liveMeasurementPreview}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-sm transition-all"
                  >
                    + Gravar Medição
                  </button>
                </div>

                {/* PREVIEW DINÂMICO EM TEMPO REAL AO DIGITAR BRIX OU SG */}
                {liveMeasurementPreview && (
                  <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-cyan-800 uppercase block">
                          {logInputUnit === 'BRIX' && liveMeasurementPreview.isCorrected ? 'SG Corrigida (Refratômetro):' : 'Densidade (SG):'}
                        </span>
                        <span className="font-mono font-black text-sm text-cyan-950">
                          {liveMeasurementPreview.sg.toFixed(3)}
                        </span>
                      </div>

                      <div className="h-6 w-px bg-cyan-200" />

                      <div>
                        <span className="text-[10px] font-bold text-cyan-800 uppercase block">Extrato (°Bx / Plato):</span>
                        <span className="font-mono font-bold text-xs text-cyan-900">
                          ≈ {liveMeasurementPreview.realBrix.toFixed(1)} °Bx
                        </span>
                      </div>

                      <div className="h-6 w-px bg-cyan-200" />

                      <div>
                        <span className="text-[10px] font-bold text-cyan-800 uppercase block">Teor Alcoólico Atual:</span>
                        <span className="font-mono font-black text-xs text-emerald-700">
                          {liveMeasurementPreview.abv.toFixed(1)}% ABV
                        </span>
                      </div>

                      <div className="h-6 w-px bg-cyan-200" />

                      <div>
                        <span className="text-[10px] font-bold text-cyan-800 uppercase block">Atenuação:</span>
                        <span className="font-mono font-bold text-xs text-slate-700">
                          {liveMeasurementPreview.attenuation.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-cyan-800">
                      {logInputUnit === 'BRIX' && liveMeasurementPreview.isCorrected
                        ? `✓ Sean Terrill aplicado (OG base: ${referenceOg.toFixed(3)})`
                        : `OG base: ${referenceOg.toFixed(3)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* HISTÓRICO DE MEDIÇÕES */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-600" />
                    <span>Curva Diária de Atenuação ({enrichedLogs.length} medições)</span>
                  </span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3 text-right">Densidade (SG / °Bx)</th>
                      <th className="p-3 text-center">Teor Alcoólico (ABV)</th>
                      <th className="p-3 text-right">Temperatura</th>
                      <th className="p-3 text-right">pH</th>
                      <th className="p-3">Observações</th>
                      <th className="p-3 w-12 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrichedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">
                          Nenhuma medição diária registrada para este lote ainda.
                        </td>
                      </tr>
                    ) : (
                      enrichedLogs.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{formatDate(item.date)}</td>
                          <td className="p-3 text-right">
                            <span className="font-black text-amber-700 block text-xs font-mono">
                              {item.gravity.toFixed(3)} SG
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 block">
                              ≈ {(item.brix ?? sgToBrix(item.gravity)).toFixed(1)} °Bx
                              {item.rawInputBrix ? ` (Lido: ${item.rawInputBrix}°Bx)` : ''}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {item.abv && item.abv > 0 ? (
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                                  {item.abv.toFixed(1)}% v/v
                                </span>
                                {item.attenuation !== undefined && (
                                  <span className="block text-[10px] font-bold text-slate-500 mt-0.5">
                                    {item.attenuation.toFixed(1)}% aten.
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                Início / OG
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-cyan-700">{item.tempCelsius}°C</td>
                          <td className="p-3 text-right font-bold text-slate-700">{item.ph ? item.ph.toFixed(2) : '-'}</td>
                          <td className="p-3 text-slate-600 font-medium">{item.notes || '-'}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLog(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remover medição"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* CHECKLIST INTERATIVO DE TAREFAS DA ADEGA & TANQUE */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Tarefas da Adega & Cronograma do Tanque</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Marque tarefas como concluídas, edite prazos e utilize os presets rápidos de adega.
                    </p>
                  </div>

                  {/* FILTROS DE TAREFAS */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setTaskFilter('ALL')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${taskFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                    >
                      Todas ({tasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskFilter('PENDING')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${taskFilter === 'PENDING' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-600'}`}
                    >
                      Pendentes ({tasks.filter((t) => !t.completed).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskFilter('COMPLETED')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${taskFilter === 'COMPLETED' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600'}`}
                    >
                      Concluídas ({tasks.filter((t) => t.completed).length})
                    </button>
                  </div>
                </div>

                {/* PRESETS RÁPIDOS DE 1-CLIQUE */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Presets Rápidos:</span>
                  <button
                    type="button"
                    onClick={() => handleAddQuickTask('DRY_HOPPING', 'Dry Hopping de Lúpulo', 'KG', 2.0)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    🌿 + Dry Hopping
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuickTask('PURGE', 'Purga de Levedura / Lama', 'L')}
                    className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    ⚗️ + Purga
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuickTask('COLD_CRASH', 'Iniciar Cold Crash (0°C)')}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    ❄️ + Cold Crash
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuickTask('ANTIOXIDANT', 'Dosagem de Antioxidante / Ácido Ascórbico', 'G', 20)}
                    className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    🧪 + Antioxidante
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuickTask('CLARIFIER', 'Dosagem de Clarificante / Biofine', 'ML', 100)}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    ✨ + Clarificante
                  </button>
                </div>

                {/* LISTA INTERATIVA DE TAREFAS */}
                <div className="space-y-2 pt-1">
                  {filteredTasks.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-500 font-medium">Nenhuma tarefa encontrada neste filtro.</p>
                    </div>
                  ) : (
                    filteredTasks.map((task) => {
                      const isLate = !task.completed && task.dueDate < todayStr;
                      const isToday = !task.completed && task.dueDate === todayStr;
                      const isBeingEdited = editingTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                            isBeingEdited
                              ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20'
                              : task.completed
                              ? 'bg-slate-50/80 border-slate-200 opacity-60'
                              : isLate
                              ? 'bg-rose-50/70 border-rose-200'
                              : isToday
                              ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleTask(task.id)}
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors mt-0.5 ${
                                task.completed
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                                  : 'bg-white border-slate-300 hover:border-amber-500'
                              }`}
                            >
                              {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                            </button>

                            <div className="space-y-1 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-xs font-bold ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
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

                              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1 font-bold">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  Data: {formatDate(task.dueDate)}
                                </span>
                                {task.amount && (
                                  <span>Dosagem: <strong>{task.amount} {task.unit}</strong></span>
                                )}
                                {task.completedAt && (
                                  <span className="text-emerald-700 font-bold">✓ Concluído em {formatDateShort(task.completedAt)}</span>
                                )}
                              </div>

                              {task.notes && (
                                <p className="text-[11px] text-slate-600 bg-slate-100/70 p-2 rounded-lg mt-1">{task.notes}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditTask(task)}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                              title="Editar Tarefa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeTask(task.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Excluir Tarefa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* FORMULÁRIO DE NOVA / EDIÇÃO DE TAREFA */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                      {editingTaskId ? <Edit3 className="w-3.5 h-3.5 text-amber-600" /> : <Plus className="w-3.5 h-3.5 text-amber-600" />}
                      <span>{editingTaskId ? 'Editar Tarefa' : 'Programar Tarefa Personalizada'}</span>
                    </span>
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
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Título da Tarefa</label>
                      <input
                        type="text"
                        value={taskFormTitle}
                        onChange={(e) => setTaskFormTitle(e.target.value)}
                        placeholder="ex: Dry Hopping 3kg Citra ou Purga da lama"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Tipo</label>
                      <select
                        value={taskFormType}
                        onChange={(e) => setTaskFormType(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="DRY_HOPPING">🌿 Dry Hopping</option>
                        <option value="ANTIOXIDANT">🧪 Antioxidante</option>
                        <option value="COLD_CRASH">❄️ Cold Crash (0°C)</option>
                        <option value="PURGE">⚗️ Purga de Levedura</option>
                        <option value="CLARIFIER">✨ Clarificante</option>
                        <option value="MEASUREMENT">📊 Medição Densidade/pH</option>
                        <option value="OTHER">📋 Outra Tarefa</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Data Programada</label>
                      <input
                        type="date"
                        value={taskFormDueDate}
                        onChange={(e) => setTaskFormDueDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Dosagem / Quantidade</label>
                      <input
                        type="number"
                        step="0.1"
                        value={taskFormAmount}
                        onChange={(e) => setTaskFormAmount(e.target.value)}
                        placeholder="ex: 2.5"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Unidade</label>
                      <select
                        value={taskFormUnit}
                        onChange={(e) => setTaskFormUnit(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="KG">KG</option>
                        <option value="G">G (Gramas)</option>
                        <option value="L">L (Litros)</option>
                        <option value="ML">ML</option>
                        <option value="UN">UN / Pacotes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Instruções / Notas</label>
                      <input
                        type="text"
                        value={taskFormNotes}
                        onChange={(e) => setTaskFormNotes(e.target.value)}
                        placeholder="ex: Purgar CO2 antes de dosar"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={saveTask}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition"
                    >
                      {editingTaskId ? 'Salvar Alterações da Tarefa' : '+ Adicionar Tarefa'}
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
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: INSUMOS & CUSTOS (UNIFICA INSUMOS COM PRECIFICAÇÃO E MARGEM BRUTA) */}
          {/* ========================================================================= */}
          {activeTab === 'INGREDIENTS' && (
            <div className="space-y-6">
              {/* PAINEL FINANCEIRO NO TOPO: CUSTO TOTAL, CUSTO/L, PREÇO VENDA & MARGEM BRUTA */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 via-white to-amber-50/20 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span>Precificação, Custo do Tanque & Margem Bruta</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          {effectiveBatchVolume}L no Tanque
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Sincronização bidirecional: altere o <strong>Custo Total</strong> ou o <strong>Custo/Litro</strong> que o sistema recalcula instantaneamente.
                      </p>
                    </div>
                  </div>

                  {(batchCostPerLiter > 0 || batchTotalCost > 0) && (
                    <button
                      type="button"
                      onClick={handlePullFromIngredients}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold shadow-xs transition-colors self-start sm:self-auto"
                      title="Usar soma exata dos insumos calculados na tabela"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Puxar da Tabela ({formatCurrency(batchTotalCost || batchCostPerLiter * effectiveBatchVolume)})</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Custo Total Bruto do Tanque */}
                  <div className="p-3.5 bg-amber-50/40 rounded-xl border-2 border-amber-300/80 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-amber-900">Custo Total do Tanque</label>
                      <span className="text-[10px] font-extrabold bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded">
                        {effectiveBatchVolume}L
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-amber-700">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={totalCostManual}
                        onChange={(e) => handleTotalCostChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-amber-300 rounded-lg pl-10 pr-3 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-amber-800 font-bold pt-0.5">
                      <span>Custo / Litro:</span>
                      <span className="font-black text-amber-950">{formatCurrency(effectiveCostPerLiter)} / L</span>
                    </div>
                  </div>

                  {/* Custo por Litro (CPV) */}
                  <div className="p-3.5 bg-emerald-50/40 rounded-xl border-2 border-emerald-300/80 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-emerald-900">Custo / Litro (CPV)</label>
                      <span className="text-[10px] font-extrabold bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded">
                        R$ / L
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-700">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={costPerLiterManual}
                        onChange={(e) => handleCostPerLiterChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-emerald-300 rounded-lg pl-10 pr-3 py-2 text-sm font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold pt-0.5">
                      <span>Total ({effectiveBatchVolume}L):</span>
                      <span className="font-black text-emerald-950">{formatCurrency(effectiveTotalCost)}</span>
                    </div>
                  </div>

                  {/* Preço de Venda / Litro */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">Preço de Venda / Litro</label>
                      <span className="text-[10px] font-bold text-slate-400">Catálogo</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={salePricePerLiter}
                        onChange={(e) => setSalePricePerLiter(e.target.value)}
                        placeholder="18.00"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>Venda Total Projetada:</span>
                      <strong className="text-slate-800 font-bold">{formatCurrency(totalEstimatedRevenue)}</strong>
                    </div>
                  </div>

                  {/* Margem Bruta & Lucro do Tanque */}
                  <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-900">Margem Bruta Estimada</span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            grossMarginPercent >= 50
                              ? 'bg-emerald-200 text-emerald-900'
                              : grossMarginPercent >= 30
                              ? 'bg-amber-200 text-amber-900'
                              : grossMarginPercent > 0
                              ? 'bg-rose-200 text-rose-900'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {grossMarginPercent >= 50 ? 'Ótima' : grossMarginPercent >= 30 ? 'Adequada' : grossMarginPercent > 0 ? 'Atenção' : 'Sem Margem'}
                        </span>
                      </div>
                      <div className="text-2xl font-black text-emerald-950 mt-1">
                        {grossMarginPercent.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-800 pt-1 border-t border-emerald-200/80 mt-2 flex items-center justify-between font-bold">
                      <span>Lucro Total Tanque:</span>
                      <strong className="font-black text-emerald-950">{formatCurrency(totalEstimatedProfit)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* AÇÕES RÁPIDAS COLORIDAS PARA ADICIONAR INSUMOS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    <span>Insumos do Lote Vinculados ao Estoque Físico</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ajuste quantidades e vincule ao estoque físico. Ao salvar, baixas e devoluções serão processadas automaticamente.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => addBatchIngredient('MALTE')}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    🌾 + Malte
                  </button>
                  <button
                    type="button"
                    onClick={() => addBatchIngredient('LUPULO')}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    🌿 + Lúpulo / Dry Hop
                  </button>
                  <button
                    type="button"
                    onClick={() => addBatchIngredient('LEVEDURA')}
                    className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-300 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    🧪 + Levedura
                  </button>
                  <button
                    type="button"
                    onClick={() => addBatchIngredient('ADJUNTO')}
                    className="px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    🍊 + Adjunto / Fruta
                  </button>
                  <button
                    type="button"
                    onClick={() => addBatchIngredient('AGUA_SAIS')}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-300 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    💧 + Sais / Água
                  </button>
                </div>
              </div>

              {/* ALERTA DE SINCRONIZAÇÃO DE ESTOQUE */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-900">
                <RotateCcw className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Controle de Estoque Ativo:</strong> Aumentos darão baixa imediata no estoque da cervejaria e reduções farão a <strong>devolução automática</strong> do saldo físico.
                </span>
              </div>

              {/* TABELA DE INSUMOS DO LOTE */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Insumo do Estoque / Nome</th>
                      <th className="p-3 w-28">Categoria</th>
                      <th className="p-3 w-24 text-right">Qtd Real</th>
                      <th className="p-3 w-20">Unidade</th>
                      <th className="p-3 w-32">Etapa de Uso</th>
                      <th className="p-3 w-28">Lote Fornecedor</th>
                      <th className="p-3 w-28 text-right">Custo Unit (R$)</th>
                      <th className="p-3">Saldo Estoque</th>
                      <th className="p-3 w-24 text-right">Subtotal</th>
                      <th className="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchIngredients.map((item, idx) => {
                      const stockMatch = inventoryItems.find((i) =>
                        i.id === item.inventoryItemId ||
                        i.name.toLowerCase() === item.name.toLowerCase()
                      );

                      const stockUnit = stockMatch ? stockMatch.unit : item.unit;
                      const isStockSuff = stockMatch ? (item.unit === 'G' && stockUnit === 'KG' ? stockMatch.currentQuantity * 1000 >= item.amount : stockMatch.currentQuantity >= item.amount) : false;
                      const subtotal = (item.unit === 'G' ? item.amount / 1000 : item.amount) * (item.costPerUnit || 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="space-y-1">
                              {inventoryItems.length > 0 && (
                                <select
                                  value={item.inventoryItemId || ''}
                                  onChange={(e) => handleSelectInventoryItem(idx, e.target.value)}
                                  className="w-full bg-amber-50/70 border border-amber-200 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-950 focus:outline-none focus:bg-white"
                                >
                                  <option value="">-- Vincular ao Estoque Disponível --</option>
                                  {inventoryItems.map((inv) => (
                                    <option key={inv.id} value={inv.id}>
                                      📦 {inv.name} (Saldo: {inv.currentQuantity} {inv.unit} {inv.supplierLot ? `| Lote: ${inv.supplierLot}` : ''})
                                    </option>
                                  ))}
                                </select>
                              )}

                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateBatchIngredient(idx, { name: e.target.value })}
                                placeholder="Nome do insumo"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:bg-white"
                              />
                            </div>
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
                              <option value="FIRST_WORT">First Wort</option>
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

                          <td className="p-3">
                            {stockMatch ? (
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${isStockSuff ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span className={`text-[11px] font-bold ${isStockSuff ? 'text-slate-700' : 'text-rose-700'}`}>
                                  {stockMatch.currentQuantity} {stockMatch.unit}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Não vinculado</span>
                            )}
                          </td>

                          <td className="p-3 text-right font-black text-slate-900">
                            {formatCurrency(subtotal)}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: RÓTULO, MAPA & LAUDO */}
          {/* ========================================================================= */}
          {activeTab === 'MAPA' && (
            <div className="space-y-5">
              {/* IDENTIFICAÇÃO OFICIAL E REGISTRO MAPA */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-black text-amber-950 uppercase flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Identificação Oficial, Lote & Responsabilidade Técnica</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Dados legais para rastreabilidade de conformidade com o Ministério da Agricultura e Pecuária (MAPA).
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    IN 65/2019 MAPA
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nº do Lote</label>
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">Identificador exclusivo do lote</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Data de Brassagem</label>
                    <input
                      type="date"
                      value={brewDate}
                      onChange={(e) => setBrewDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">Data de início da produção</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Responsável Técnico / CRQ</label>
                    <input
                      type="text"
                      value={technicalResponsible}
                      onChange={(e) => setTechnicalResponsible(e.target.value)}
                      placeholder="Ex: João da Silva - CRQ IV 04123456"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">Químico ou Cervejeiro responsável</span>
                  </div>
                </div>

                {/* SELETOR INTELIGENTE DE MAPA */}
                <div className="pt-3 border-t border-slate-100">
                  <MapaSelectorInput
                    mapaRegistration={mapaRegistration}
                    onChangeMapa={setMapaRegistration}
                    commercialDenomination={commercialDenomination}
                    onChangeDenomination={setCommercialDenomination}
                    suggestedProductName={batch.recipe?.name || ''}
                    suggestedStyle={batch.recipe?.style || ''}
                  />
                </div>
              </div>

              {/* ANÁLISE SENSORIAL & DEGUSTAÇÃO */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>Análise Sensorial, Degustação & Liberação do Lote</span>
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">
                      Redimensionável
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={sensoryNotes}
                    onChange={(e) => setSensoryNotes(e.target.value)}
                    placeholder="Perfil aromático, atenuação, formação de espuma, instruções da receita e brassagem, liberação técnica para envase..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-y min-h-[100px] shadow-xs"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Observações Gerais / Ocorrências de Produção</span>
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anotações gerais do cervejeiro, desvios operacionais, incidentes de manutenção..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-y min-h-[70px] shadow-xs"
                  />
                </div>
              </div>

              {/* GUIA DE CONFORMIDADE LEGAL MAPA */}
              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-amber-950">
                  <span className="font-black block">Regras Obrigatórias de Rotulagem & Rastreabilidade</span>
                  <p className="text-amber-900/90 leading-relaxed text-[11px]">
                    Conforme a Instrução Normativa nº 65/2019 e Decreto nº 6.871/2009, todo lote destinado à comercialização deve conter no rótulo:
                    o número do registro do produto no MAPA, a denominação padronizada (ex: <em>Cerveja Puro Malte Forte Escura</em>),
                    o número do lote legível, prazo de validade, graduação alcoólica real e dados do fabricante.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER DO MODAL */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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
              onClick={handleDeleteBatch}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
              title="Excluir lote permanentemente"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir este Lote</span>
            </button>
          </div>

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
                <span>Salvar Parâmetros do Lote</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
