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

  // 1. TAREFAS DE TANQUE & EDIÇÃO
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

  // Formulário de Nova / Edição de Tarefa
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
      name: category === 'LUPULO' ? 'Novo Lúpulo' : category === 'ADJUNTO' ? 'Novo Adjunto / Fruta' : 'Novo Malte',
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

  // 2.1 CUSTO POR LITRO E PREÇO DE VENDA DA RECEITA / LOTE
  const initialCostPerLiter = useMemo(() => {
    if (batch.costPerLiter !== null && batch.costPerLiter !== undefined && batch.costPerLiter > 0) {
      return String(batch.costPerLiter);
    }
    if (batch.recipe?.costPerLiter !== null && batch.recipe?.costPerLiter !== undefined && batch.recipe.costPerLiter > 0) {
      return String(batch.recipe.costPerLiter);
    }
    if (batchCostPerLiter > 0) {
      return String(batchCostPerLiter.toFixed(2));
    }
    return '';
  }, [batch, batchCostPerLiter]);

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

  const effectiveCostPerLiter = useMemo(() => {
    if (costPerLiterManual !== '' && !isNaN(parseFloat(costPerLiterManual))) {
      return parseFloat(costPerLiterManual);
    }
    if (batchCostPerLiter > 0) {
      return batchCostPerLiter;
    }
    if (batch.costPerLiter && batch.costPerLiter > 0) {
      return batch.costPerLiter;
    }
    if (batch.recipe?.costPerLiter && batch.recipe.costPerLiter > 0) {
      return batch.recipe.costPerLiter;
    }
    return 0;
  }, [costPerLiterManual, batchCostPerLiter, batch]);

  const effectiveBatchVolume = useMemo(() => {
    return volumeProduced || volumePlanned || 500;
  }, [volumeProduced, volumePlanned]);

  const effectiveTotalCost = useMemo(() => {
    if (costPerLiterManual === '' && batchTotalCost > 0) {
      return batchTotalCost;
    }
    return effectiveCostPerLiter * effectiveBatchVolume;
  }, [costPerLiterManual, batchTotalCost, effectiveCostPerLiter, effectiveBatchVolume]);

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

  // Restaurar preferência de unidade de medição do dispositivo ('SG' ou 'BRIX')
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

    return 1.050; // valor padrão para base de cálculo se nada for informado
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

  // Logs enriquecidos com SG normalizada, Brix equivalente e ABV calculado (retrocompatível)
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

  // Última medição registrada
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

  // SALVAR TUDO (LOTE + INSUMOS + TAREFAS + MEDIÇÕES COM SINCRONIZAÇÃO AUTOMÁTICA DE ESTOQUE)
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
        measuredOg: parseBreweryGravity(measuredOg),
        measuredFg: parseBreweryGravity(measuredFg),
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
                  Acompanhamento ao vivo: medições de adega, pH, temperaturas e parâmetros do lote
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
              <span>Insumos do Lote & Estoque ({batchIngredients.length})</span>
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
                    Você pode alterar datas, dosagens, editar tarefas salvas ou cadastrar novas a qualquer momento.
                  </p>
                </div>
              </div>

              {/* Lista de Tarefas */}
              <div className="space-y-2.5">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="text-xs font-bold text-slate-700">Nenhuma tarefa programada para este lote</p>
                    <p className="text-[11px] text-slate-500">
                      Utilize o formulário abaixo para adicionar medições, dry hopping, purga ou lembretes da adega.
                    </p>
                  </div>
                ) : (
                  tasks.map((task) => {
                    const isLate = !task.completed && task.dueDate < todayStr;
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
                  })
                )}
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

          {/* ABA 2: INSUMOS & ADIÇÕES DO LOTE (VINCULADOS AO ESTOQUE FÍSICO COM ATUALIZAÇÃO AUTOMÁTICA) */}
          {activeTab === 'INGREDIENTS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    <span>Insumos e Lotes do Estoque Utilizados Neste Lote</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecione preferencialmente os insumos disponíveis no seu estoque. Todas as alterações darão baixa ou devolução automática.
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

              {/* Informação de Sincronização Bidirecional */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900">
                <RotateCcw className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Controle de Estoque Ativo:</strong> Ao salvar, aumentos de quantidade darão baixa no estoque físico e reduções/exclusões farão a <strong>devolução automática</strong> para o inventário da cervejaria.
                </span>
              </div>

              {/* Tabela de Insumos do Lote */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Insumo do Estoque / Nome</th>
                      <th className="p-3 w-28">Categoria</th>
                      <th className="p-3 w-28">Qtd Real</th>
                      <th className="p-3 w-20">Unidade</th>
                      <th className="p-3 w-32">Etapa de Uso</th>
                      <th className="p-3 w-32">Lote Fornecedor</th>
                      <th className="p-3 w-28 text-right">Custo Unit (R$)</th>
                      <th className="p-3">Saldo em Estoque</th>
                      <th className="p-3 w-12 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchIngredients.map((item, idx) => {
                      const stockMatch = inventoryItems.find((i) =>
                        i.id === item.inventoryItemId ||
                        i.name.toLowerCase() === item.name.toLowerCase()
                      );

                      const stockQty = stockMatch ? stockMatch.currentQuantity : null;
                      const stockUnit = stockMatch ? stockMatch.unit : item.unit;
                      const isStockSuff = stockMatch ? (item.unit === 'G' && stockUnit === 'KG' ? stockMatch.currentQuantity * 1000 >= item.amount : stockMatch.currentQuantity >= item.amount) : false;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="space-y-1">
                              {inventoryItems.length > 0 && (
                                <select
                                  value={item.inventoryItemId || ''}
                                  onChange={(e) => handleSelectInventoryItem(idx, e.target.value)}
                                  className="w-full bg-amber-50/60 border border-amber-200 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-950 focus:outline-none focus:bg-white"
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

              {/* Resumo & Edição de Custos e Valor da Receita */}
              <div className="p-5 bg-gradient-to-br from-slate-50 via-white to-amber-50/20 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Valor da Receita, Custos (CPV) & Margem do Lote
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Edite o custo por litro (CPV) e o valor de venda. Os valores serão salvos no lote e sincronizados com a receita.
                      </p>
                    </div>
                  </div>

                  {batchCostPerLiter > 0 && (
                    <button
                      type="button"
                      onClick={() => setCostPerLiterManual(batchCostPerLiter.toFixed(2))}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold shadow-xs transition-colors self-start sm:self-auto"
                      title="Usar soma exata dos insumos calculados na tabela acima"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Puxar da Tabela ({formatCurrency(batchCostPerLiter)}/L)</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Custo por Litro (CPV) */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-600">Custo / Litro (CPV)</label>
                      <span className="text-[10px] font-bold text-slate-400">R$ / L</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={costPerLiterManual}
                        onChange={(e) => setCostPerLiterManual(e.target.value)}
                        placeholder={batchCostPerLiter > 0 ? batchCostPerLiter.toFixed(2) : "0.00"}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>Custo Total ({effectiveBatchVolume}L):</span>
                      <strong className="text-slate-800 font-bold">{formatCurrency(effectiveTotalCost)}</strong>
                    </div>
                  </div>

                  {/* Preço de Venda / Litro */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-emerald-800">Preço de Venda / Litro</label>
                      <span className="text-[10px] font-bold text-emerald-600">Catálogo</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={salePricePerLiter}
                        onChange={(e) => setSalePricePerLiter(e.target.value)}
                        placeholder="18.00"
                        className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg pl-9 pr-3 py-2 text-sm font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>Venda Total Projetada:</span>
                      <strong className="text-emerald-700 font-bold">{formatCurrency(totalEstimatedRevenue)}</strong>
                    </div>
                  </div>

                  {/* Margem Bruta Estimada */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600">Margem Bruta Estimada</span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            grossMarginPercent >= 50
                              ? 'bg-emerald-100 text-emerald-800'
                              : grossMarginPercent >= 30
                              ? 'bg-amber-100 text-amber-800'
                              : grossMarginPercent > 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {grossMarginPercent >= 50 ? 'Ótima' : grossMarginPercent >= 30 ? 'Adequada' : grossMarginPercent > 0 ? 'Atenção' : 'Sem Margem'}
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        {grossMarginPercent.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 mt-2 flex items-center justify-between">
                      <span>Lucro Bruto / Litro:</span>
                      <strong className="text-slate-800 font-bold">{formatCurrency(Math.max(0, numSalePrice - effectiveCostPerLiter))} / L</strong>
                    </div>
                  </div>

                  {/* Lucro Total Estimado */}
                  <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-900">Lucro Bruto Total do Lote</span>
                      <div className="text-2xl font-black text-emerald-800 mt-1">
                        {formatCurrency(totalEstimatedProfit)}
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-800/80 pt-1 border-t border-emerald-200/60 mt-2 flex items-center justify-between">
                      <span>Volume Base:</span>
                      <strong className="font-bold">{effectiveBatchVolume} Litros</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: CURVA DE FERMENTAÇÃO & MEDIÇÕES */}
          {activeTab === 'FERMENTATION_LOG' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-600" />
                    <span>Histórico de Medições Diárias (Atenuação & Temperatura)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registre densidade em SG ou °Brix com correção automática de refratômetro, cálculo de teor alcoólico (% ABV) e temperatura.
                  </p>
                </div>

                {latestLog && (
                  <button
                    type="button"
                    onClick={() => handleApplyLatestFg(latestLog.gravity)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black transition-all shadow-sm self-start sm:self-auto"
                    title="Preenche a FG do lote com o valor da última medição"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>{fgUpdatedFeedback ? '✓ FG Atualizada!' : `Definir ${latestLog.gravity.toFixed(3)} como FG`}</span>
                  </button>
                )}
              </div>

              {/* CARDS DE RESUMO DA FERMENTAÇÃO (KPIs) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">OG de Referência</span>
                  <div className="text-base font-black text-amber-800 mt-0.5">
                    {referenceOg.toFixed(3)} <span className="text-xs font-bold text-amber-600">SG</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 block mt-0.5">
                    ≈ {sgToBrix(referenceOg).toFixed(1)} °Bx
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Última Densidade</span>
                  <div className="text-base font-black text-cyan-800 mt-0.5">
                    {latestLog ? `${latestLog.gravity.toFixed(3)} ` : '— '}
                    <span className="text-xs font-bold text-cyan-600">SG</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 block mt-0.5">
                    {latestLog ? `≈ ${(latestLog.brix ?? sgToBrix(latestLog.gravity)).toFixed(1)} °Bx` : 'Sem medições'}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Teor Alcoólico Atual</span>
                  <div className="text-base font-black text-emerald-700 mt-0.5">
                    {latestLog && latestLog.abv ? `${latestLog.abv.toFixed(1)}%` : '0.0%'} <span className="text-xs font-bold text-emerald-600">ABV</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 block mt-0.5">
                    {latestLog && latestLog.attenuation ? `${latestLog.attenuation.toFixed(1)}% atenuação` : 'Início / Pré-fermentação'}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tanque & pH Atual</span>
                  <div className="text-base font-black text-slate-800 mt-0.5">
                    {latestLog ? `${latestLog.tempCelsius}°C` : (tempFermentation ? `${tempFermentation}°C` : '—')}
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 block mt-0.5">
                    {latestLog?.ph ? `pH: ${latestLog.ph.toFixed(2)}` : 'pH não aferido'}
                  </span>
                </div>
              </div>

              {/* REGISTRO RÁPIDO COM OPÇÃO SG / BRIX E CORREÇÃO AUTOMÁTICA */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                {/* SELETOR DE UNIDADE & CONTROLE DE CORREÇÃO DE REFRATÔMETRO */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Unidade de Medição:</span>
                    <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleUnitChange('SG')}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                          logInputUnit === 'SG'
                            ? 'bg-amber-600 text-white shadow-sm'
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
                            ? 'bg-cyan-600 text-white shadow-sm'
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
                      <span>Correção de Álcool (Refratômetro em Fermentação - Sean Terrill)</span>
                    </label>
                  )}
                </div>

                {/* FORMULÁRIO DE INPUT */}
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Data da Medição</label>
                    <input
                      type="date"
                      value={newLogDate}
                      onChange={(e) => setNewLogDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-cyan-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">pH Atual</label>
                    <input
                      type="text"
                      value={newLogPh}
                      onChange={(e) => setNewLogPh(e.target.value)}
                      placeholder="ex: 4.4"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Observações</label>
                    <input
                      type="text"
                      value={newLogNotes}
                      onChange={(e) => setNewLogNotes(e.target.value)}
                      placeholder="Ex: Amostra límpida"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
                        ? `✓ Correção Sean Terrill aplicada (OG base: ${referenceOg.toFixed(3)})`
                        : `OG base: ${referenceOg.toFixed(3)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* TABELA DE MEDIÇÕES */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
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
                          Nenhuma medição registrada ainda. Use o formulário acima para registrar SG ou °Brix.
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
                                0.0% (Início / OG)
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
                {/* IDENTIFICAÇÃO DO LOTE & REGISTRO MAPA */}
                <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Identificação Oficial, Nº do Lote & Exigências MAPA</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nº do Lote</label>
                      <input
                        type="text"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Data de Brassagem</label>
                      <input
                        type="date"
                        value={brewDate}
                        onChange={(e) => setBrewDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Registro MAPA do Rótulo</label>
                      <input
                        type="text"
                        value={mapaRegistration}
                        onChange={(e) => setMapaRegistration(e.target.value)}
                        placeholder="Ex: SP 001234-5.000001"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Denominação Legal / Comercial</label>
                      <input
                        type="text"
                        value={commercialDenomination}
                        onChange={(e) => setCommercialDenomination(e.target.value)}
                        placeholder="Ex: Cerveja Clara Puro Malte"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Responsável Técnico / CRQ</label>
                      <input
                        type="text"
                        value={technicalResponsible}
                        onChange={(e) => setTechnicalResponsible(e.target.value)}
                        placeholder="Ex: João da Silva - CRQ IV 04123456"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

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

                {/* PRECIFICAÇÃO DA RECEITA & CUSTOS DO LOTE */}
                <div className="p-4 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Valor de Venda da Receita & Custo por Litro (CPV)
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-lg border border-emerald-200">
                      Margem Bruta: <strong>{grossMarginPercent.toFixed(1)}%</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Preço de Venda / Litro (R$)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={salePricePerLiter}
                          onChange={(e) => setSalePricePerLiter(e.target.value)}
                          placeholder="18.00"
                          className="w-full bg-white border border-emerald-300 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Custo por Litro / CPV (R$)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={costPerLiterManual}
                          onChange={(e) => setCostPerLiterManual(e.target.value)}
                          placeholder={batchCostPerLiter > 0 ? batchCostPerLiter.toFixed(2) : "0.00"}
                          className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* DENSIDADES */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">OG Medida (Inicial)</label>
                    <input
                      type="text"
                      placeholder="Ex: 1.054 ou 1054"
                      value={measuredOg}
                      onChange={(e) => setMeasuredOg(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-700 focus:outline-none"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">FG Medida (Final)</label>
                    <input
                      type="text"
                      placeholder="Ex: 1.010 ou 1010"
                      value={measuredFg}
                      onChange={(e) => setMeasuredFg(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-cyan-700 focus:outline-none"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Teor Alcoólico (% ABV Estimado)</label>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-800">
                      {(() => {
                        const pOg = parseBreweryGravity(measuredOg);
                        const pFg = parseBreweryGravity(measuredFg);
                        if (pOg && pFg && pOg > pFg && pOg > 1.0) {
                          const abv = calculateAbv(pOg, pFg);
                          const att = Math.round(((pOg - pFg) / (pOg - 1.0)) * 1000) / 10;
                          return `${abv.toFixed(1)}% v/v (${att}% aten.)`;
                        }
                        return 'Preencha OG e FG';
                      })()}
                    </div>
                  </div>
                </div>

                {/* MOSTURA: pH & TEMPERATURA COM SUPORTE A MÚLTIPLAS MOSTURAS (+) */}
                <div className="bg-amber-50/70 border-2 border-amber-300/80 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-xs font-black text-amber-950 uppercase flex items-center gap-1.5">
                        <Beaker className="w-4 h-4 text-amber-700" />
                        <span>Mostura: pH & Temperatura (Múltiplas Mosturas)</span>
                      </span>
                      <p className="text-[11px] text-amber-800/80">
                        Adicione cada mostura individual para registrar o pH e a temperatura (°C) de cada brassagem deste lote.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddMash}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition"
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

                {/* FERVURA: pH DA FERVURA COM SUPORTE A MÚLTIPLAS FERVURAS (+) */}
                <div className="bg-orange-50/70 border-2 border-orange-300/80 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-xs font-black text-orange-950 uppercase flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-700" />
                        <span>pH da Fervura (Múltiplas Fervuras)</span>
                      </span>
                      <p className="text-[11px] text-orange-800/80">
                        Adicione cada fervura individual se a cervejaria fizer mais de uma fervura para este lote.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBoil}
                      className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition"
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

                {/* DEMAIS pHs & TEMPERATURAS DO PROCESSO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">pH Início da Fermentação</label>
                    <input
                      type="text"
                      placeholder="Ex: 5.05"
                      value={phFermentationStart}
                      onChange={(e) => setPhFermentationStart(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">pH Final (Envase / Cerveja Pronta)</label>
                    <input
                      type="text"
                      placeholder="Ex: 4.30"
                      value={phFinal}
                      onChange={(e) => setPhFinal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Temp. Fermentação (°C)</label>
                    <input
                      type="text"
                      placeholder="Ex: 19.0"
                      value={tempFermentation}
                      onChange={(e) => setTempFermentation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Temp. Maturação / Cold Crash (°C)</label>
                    <input
                      type="text"
                      placeholder="Ex: 0.5"
                      value={tempMaturation}
                      onChange={(e) => setTempMaturation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* CONTROLE DE LEVEDURA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cepa da Levedura</label>
                    <input
                      type="text"
                      placeholder="Ex: Fermentis US-05"
                      value={yeastStrain}
                      onChange={(e) => setYeastStrain(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nº Lote da Levedura</label>
                    <input
                      type="text"
                      placeholder="Ex: 881-A"
                      value={yeastLot}
                      onChange={(e) => setYeastLot(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Geração da Levedura</label>
                    <input
                      type="number"
                      min="1"
                      value={yeastGeneration}
                      onChange={(e) => setYeastGeneration(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* ANÁLISE SENSORIAL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Análise Sensorial, Degustação & Liberação do Lote</label>
                  <textarea
                    rows={2}
                    value={sensoryNotes}
                    onChange={(e) => setSensoryNotes(e.target.value)}
                    placeholder="Perfil aromático, atenuação, formação de espuma, liberação técnica para envase..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER LIGHT */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
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
