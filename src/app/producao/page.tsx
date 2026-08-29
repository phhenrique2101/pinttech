'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  Beer,
  Layers,
  Thermometer,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Droplet,
  Trash2,
  Cylinder,
  DollarSign,
  TrendingUp,
  Edit3,
  Tag,
  Percent,
  Calculator,
  AlertTriangle,
  Search,
  ArrowRight,
  Zap,
  Check,
  X,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Eye,
  Activity,
  Printer,
  Building2,
} from 'lucide-react';
import { formatDateShort, formatCurrency, formatDate } from '@/lib/utils';

export default function ProducaoPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'BATCHES' | 'TANKS' | 'RECIPES'>('BATCHES');

  // Modals
  const [newBatchModal, setNewBatchModal] = useState(false);
  const [editBatchModal, setEditBatchModal] = useState<any>(null);
  const [newRecipeModal, setNewRecipeModal] = useState(false);
  const [editRecipeModal, setEditRecipeModal] = useState<any>(null);
  const [newTankModal, setNewTankModal] = useState(false);
  const [batchTraceabilityModal, setBatchTraceabilityModal] = useState<any | null>(null);

  // Batch Quality & Tank Traceability Modal State (MAPA & Acompanhamento)
  const [batchQualityModal, setBatchQualityModal] = useState<any | null>(null);
  const [qStatus, setQStatus] = useState('FERMENTANDO');
  const [qVolumeProduced, setQVolumeProduced] = useState('');
  const [qTankId, setQTankId] = useState('');
  const [qMeasuredOg, setQMeasuredOg] = useState('');
  const [qMeasuredFg, setQMeasuredFg] = useState('');
  const [qMeasuredAbv, setQMeasuredAbv] = useState('');
  const [qMeasuredIbu, setQMeasuredIbu] = useState('');
  const [qMeasuredEbc, setQMeasuredEbc] = useState('');
  const [qAttenuation, setQAttenuation] = useState('');
  const [qPhMash, setQPhMash] = useState('');
  const [qPhBoil, setQPhBoil] = useState('');
  const [qPhFermentationStart, setQPhFermentationStart] = useState('');
  const [qPhFinal, setQPhFinal] = useState('');
  const [qTempMash, setQTempMash] = useState('');
  const [qTempFermentation, setQTempFermentation] = useState('');
  const [qTempMaturation, setQTempMaturation] = useState('');
  const [qYeastStrain, setQYeastStrain] = useState('');
  const [qYeastGeneration, setQYeastGeneration] = useState('1');
  const [qYeastLot, setQYeastLot] = useState('');
  const [qMapaRegistration, setQMapaRegistration] = useState('');
  const [qCommercialDenomination, setQCommercialDenomination] = useState('');
  const [qTechnicalResponsible, setQTechnicalResponsible] = useState('');
  const [qBrewDate, setQBrewDate] = useState('');
  const [qFermentationStartDate, setQFermentationStartDate] = useState('');
  const [qMaturationStartDate, setQMaturationStartDate] = useState('');
  const [qPackagingDate, setQPackagingDate] = useState('');
  const [qSensoryNotes, setQSensoryNotes] = useState('');
  const [qNotes, setQNotes] = useState('');
  const [savingBatchQuality, setSavingBatchQuality] = useState(false);

  // Edit Tank Modal State
  const [editTankModal, setEditTankModal] = useState<any>(null);
  const [editTankName, setEditTankName] = useState('');
  const [editTankCapacity, setEditTankCapacity] = useState('1000');
  const [editTankType, setEditTankType] = useState('Fermentador Isotérmico');
  const [editTankStatus, setEditTankStatus] = useState('LIVRE');
  const [editTankNotes, setEditTankNotes] = useState('');
  const [editTankBatchId, setEditTankBatchId] = useState('');
  const [editTankPackagingDate, setEditTankPackagingDate] = useState('');
  const [editTankBatchStatus, setEditTankBatchStatus] = useState('FERMENTANDO');
  const [editTankFermentationStartDate, setEditTankFermentationStartDate] = useState('');
  const [editTankVolumeProduced, setEditTankVolumeProduced] = useState('');
  const [editTankMeasuredOg, setEditTankMeasuredOg] = useState('');
  const [editTankMeasuredFg, setEditTankMeasuredFg] = useState('');
  const [editTankMeasuredAbv, setEditTankMeasuredAbv] = useState('');
  const [savingTank, setSavingTank] = useState(false);

  // Filters for Tanks Tab & Recipes Tab
  const [tankStatusFilter, setTankStatusFilter] = useState('ALL');
  const [tankSearch, setTankSearch] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  // New batch form
  const [recipeId, setRecipeId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [volumePlanned, setVolumePlanned] = useState('500');
  const [tankId, setTankId] = useState('');
  const [costPerLiter, setCostPerLiter] = useState('4.50');
  const [notes, setNotes] = useState('');
  const [batchIngredients, setBatchIngredients] = useState<any[]>([]);
  const [batchDeductStock, setBatchDeductStock] = useState(true);

  // Edit batch form
  const [editBatchStatus, setEditBatchStatus] = useState('BRASSAGEM');
  const [editBatchCostPerLiter, setEditBatchCostPerLiter] = useState('0');
  const [editBatchVolumeProduced, setEditBatchVolumeProduced] = useState('500');
  const [editBatchTankId, setEditBatchTankId] = useState('');
  const [editBatchNotes, setEditBatchNotes] = useState('');
  const [editBatchIngredients, setEditBatchIngredients] = useState<any[]>([]);

  // New / Edit recipe form
  const [recipeName, setRecipeName] = useState('');
  const [recipeStyle, setRecipeStyle] = useState('American IPA');
  const [abv, setAbv] = useState('6.5');
  const [ibu, setIbu] = useState('55');
  const [recipeYieldLiters, setRecipeYieldLiters] = useState('500');
  const [recipeOg, setRecipeOg] = useState('1.054');
  const [recipeFg, setRecipeFg] = useState('1.010');
  const [recipeEbc, setRecipeEbc] = useState('12');
  const [recipeTargetPhMash, setRecipeTargetPhMash] = useState('5.2');
  const [recipeTargetPhFinal, setRecipeTargetPhFinal] = useState('4.2');
  const [recipeMapaRegistration, setRecipeMapaRegistration] = useState('');
  const [recipeCommercialDenomination, setRecipeCommercialDenomination] = useState('');
  const [recipeCostPerLiter, setRecipeCostPerLiter] = useState('4.80');
  const [pricingModel, setPricingModel] = useState('MANUAL'); // MANUAL, AT_COST, MARKUP, BY_STYLE
  const [profitMargin, setProfitMargin] = useState('150');
  const [styleCategory, setStyleCategory] = useState('PREMIUM');
  const [salePricePerLiter, setSalePricePerLiter] = useState('22.0');
  const [description, setDescription] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);

  // New tank form
  const [tankName, setTankName] = useState('');
  const [tankCapacity, setTankCapacity] = useState('500');
  const [tankType, setTankType] = useState('Fermentador Isotérmico');
  const [tankNotes, setTankNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, rRes, tRes, invRes, supRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/recipes'),
        fetch('/api/tanks'),
        fetch('/api/inventory'),
        fetch('/api/suppliers'),
      ]);
      const [bData, rData, tData, invData, supData] = await Promise.all([
        bRes.json(),
        rRes.json(),
        tRes.json(),
        invRes.json(),
        supRes.json(),
      ]);

      if (Array.isArray(bData)) setBatches(bData);
      if (Array.isArray(rData)) {
        setRecipes(rData);
        if (rData.length > 0 && !recipeId) {
          setRecipeId(rData[0].id);
          populateBatchIngredientsFromRecipe(rData[0], 500, Array.isArray(invData) ? invData : []);
        }
      }
      if (Array.isArray(tData)) {
        setTanks(tData);
        if (tData.length > 0 && !tankId) setTankId(tData[0].id);
      }
      if (Array.isArray(invData)) setInventoryItems(invData);
      if (Array.isArray(supData)) setSuppliers(supData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update sale price dynamically based on pricing model
  useEffect(() => {
    const cost = parseFloat(recipeCostPerLiter) || 0;
    const margin = parseFloat(profitMargin) || 0;

    if (pricingModel === 'AT_COST') {
      setSalePricePerLiter(cost.toFixed(2));
    } else if (pricingModel === 'MARKUP') {
      const calculated = cost > 0 ? cost * (1 + margin / 100) : 18;
      setSalePricePerLiter(calculated.toFixed(2));
    } else if (pricingModel === 'BY_STYLE') {
      if (styleCategory === 'STANDARD') setSalePricePerLiter('16.00');
      else if (styleCategory === 'PREMIUM') setSalePricePerLiter('22.00');
      else if (styleCategory === 'ESPECIAL') setSalePricePerLiter('28.00');
      else if (styleCategory === 'HIGH_GRAVITY') setSalePricePerLiter('34.00');
    }
  }, [pricingModel, recipeCostPerLiter, profitMargin, styleCategory]);

  // Helper to load recipe ingredients when choosing a recipe for batch
  const populateBatchIngredientsFromRecipe = (rec: any, plannedVol: number, stockItems: any[] = inventoryItems) => {
    if (!rec) return;
    const ratio = plannedVol > 0 ? plannedVol / 500 : 1;
    const ingredients = (rec.ingredients || []).map((ing: any) => {
      // Look up current stock for this inventory item or by matching name
      const stock = stockItems.find((s) => (ing.inventoryItemId && s.id === ing.inventoryItemId) || s.name.toLowerCase() === ing.name.toLowerCase());
      const scaledQty = Math.round(ing.amount * ratio * 100) / 100;
      const activeLots = (stock?.lots || []).filter((l: any) => (l.currentQuantity || 0) > 0);
      const chosenLot = activeLots.length > 0 ? activeLots[0] : null;
      const unitCost = chosenLot?.costPerUnit || ing.costPerUnit || stock?.costPerUnit || 0;

      return {
        inventoryItemId: stock?.id || ing.inventoryItemId || null,
        inventoryLotId: chosenLot?.id || null,
        availableLots: activeLots,
        supplierId: chosenLot?.supplierId || stock?.supplierId || null,
        name: ing.name,
        category: ing.category || 'MALTE',
        quantityUsed: scaledQty,
        unit: ing.unit || 'KG',
        supplierName: chosenLot?.supplier?.name || chosenLot?.supplierName || stock?.supplier?.name || '',
        supplierLot: chosenLot?.lotNumber || stock?.supplierLot || '',
        costPerUnit: unitCost,
        totalCost: Math.round(scaledQty * unitCost * 100) / 100,
        expirationDate: chosenLot?.expirationDate ? chosenLot.expirationDate.split('T')[0] : (stock?.expirationDate ? stock.expirationDate.split('T')[0] : ''),
        harvestYear: chosenLot?.harvestYear || stock?.harvestYear || '',
        stage: ing.stage || 'MOSTURA',
        notes: '',
      };
    });

    setBatchIngredients(ingredients);

    // Sum up total ingredient cost to suggest cost per liter
    const totalIngredientsCost = ingredients.reduce((sum: number, it: any) => sum + (it.totalCost || 0), 0);
    if (totalIngredientsCost > 0 && plannedVol > 0) {
      setCostPerLiter((totalIngredientsCost / plannedVol).toFixed(2));
    } else if (rec.costPerLiter) {
      setCostPerLiter(String(rec.costPerLiter));
    }
  };

  const handleRecipeChangeInBatch = (selectedRecId: string) => {
    setRecipeId(selectedRecId);
    const rec = recipes.find((r) => r.id === selectedRecId);
    const vol = parseFloat(volumePlanned) || 500;
    populateBatchIngredientsFromRecipe(rec, vol);
  };

  const handleVolumeChangeInBatch = (newVolStr: string) => {
    setVolumePlanned(newVolStr);
    const vol = parseFloat(newVolStr) || 500;
    const rec = recipes.find((r) => r.id === recipeId);
    if (rec) populateBatchIngredientsFromRecipe(rec, vol);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cost = parseFloat(costPerLiter) || 0;
      const vol = parseFloat(volumePlanned) || 0;

      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId,
          batchNumber,
          tankId: tankId || null,
          volumePlannedLiters: vol,
          costPerLiter: cost,
          totalCost: cost * vol,
          status: 'BRASSAGEM',
          notes,
          ingredients: batchIngredients,
          deductStock: batchDeductStock,
        }),
      });
      if (res.ok) {
        setNewBatchModal(false);
        setBatchNumber('');
        setNotes('');
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao iniciar lote');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao criar lote');
    }
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBatchModal) return;
    try {
      const cost = parseFloat(editBatchCostPerLiter) || 0;
      const vol = parseFloat(editBatchVolumeProduced) || 0;

      const res = await fetch(`/api/batches/${editBatchModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editBatchStatus,
          costPerLiter: cost,
          volumeProducedLiters: vol,
          totalCost: cost * vol,
          tankId: editBatchTankId || null,
          notes: editBatchNotes,
          ingredients: editBatchIngredients,
        }),
      });
      if (res.ok) {
        setEditBatchModal(null);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar lote');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao atualizar lote');
    }
  };

  const openEditBatchModal = (batch: any) => {
    setEditBatchModal(batch);
    setEditBatchStatus(batch.status || 'BRASSAGEM');
    setEditBatchCostPerLiter(String(batch.costPerLiter || '0'));
    setEditBatchVolumeProduced(String(batch.volumeProducedLiters || batch.volumePlannedLiters || '500'));
    setEditBatchTankId(batch.tankId || '');
    setEditBatchNotes(batch.notes || '');
    setEditBatchIngredients(
      (batch.ingredients || []).map((ing: any) => {
        const stockItem = inventoryItems.find((s) => (ing.inventoryItemId && s.id === ing.inventoryItemId) || s.name.toLowerCase() === ing.name.toLowerCase());
        const activeLots = stockItem?.lots || [];
        return {
          id: ing.id,
          inventoryItemId: ing.inventoryItemId || stockItem?.id || null,
          inventoryLotId: ing.inventoryLotId || null,
          availableLots: activeLots,
          supplierId: ing.supplierId || stockItem?.supplierId || null,
          name: ing.name,
          category: ing.category || 'MALTE',
          quantityUsed: ing.quantityUsed || ing.amount || 0,
          unit: ing.unit || 'KG',
          supplierName: ing.supplierName || ing.supplier?.name || stockItem?.supplier?.name || '',
          supplierLot: ing.supplierLot || '',
          costPerUnit: ing.costPerUnit || 0,
          totalCost: ing.totalCost || ((ing.quantityUsed || 0) * (ing.costPerUnit || 0)),
          stage: ing.stage || 'MOSTURA',
          expirationDate: ing.expirationDate ? ing.expirationDate.split('T')[0] : '',
          harvestYear: ing.harvestYear || '',
          notes: ing.notes || '',
        };
      })
    );
  };

  // Helper functions for New Batch Ingredients
  const addIngredientRowToNewBatch = (category: string = 'MALTE', stage: string = 'MOSTURA') => {
    const unit = category === 'MALTE' ? 'KG' : category === 'LUPULO' ? 'G' : category === 'LEVEDURA' ? 'PACOTE' : 'KG';
    setBatchIngredients([
      ...batchIngredients,
      {
        inventoryItemId: null,
        inventoryLotId: null,
        availableLots: [],
        supplierId: null,
        name: '',
        category,
        quantityUsed: category === 'MALTE' ? 25 : category === 'LUPULO' ? 500 : 1,
        unit,
        supplierName: '',
        supplierLot: '',
        costPerUnit: 0,
        totalCost: 0,
        expirationDate: '',
        harvestYear: '',
        stage,
        notes: '',
      },
    ]);
  };

  const updateIngredientInNewBatch = (idx: number, field: string, value: any) => {
    const updated = [...batchIngredients];
    updated[idx] = { ...updated[idx], [field]: value };

    if (field === 'inventoryItemId') {
      const item = inventoryItems.find((it) => it.id === value);
      if (item) {
        updated[idx].name = item.name;
        updated[idx].category = item.category || updated[idx].category;
        updated[idx].unit = item.unit || updated[idx].unit;
        const activeLots = (item.lots || []).filter((l: any) => (l.currentQuantity || 0) > 0);
        updated[idx].availableLots = activeLots;
        const chosenLot = activeLots.length > 0 ? activeLots[0] : null;
        if (chosenLot) {
          updated[idx].inventoryLotId = chosenLot.id;
          updated[idx].supplierId = chosenLot.supplierId || item.supplierId;
          updated[idx].supplierName = chosenLot.supplier?.name || chosenLot.supplierName || item.supplier?.name || '';
          updated[idx].supplierLot = chosenLot.lotNumber || '';
          updated[idx].costPerUnit = chosenLot.costPerUnit || item.costPerUnit || 0;
          updated[idx].expirationDate = chosenLot.expirationDate ? chosenLot.expirationDate.split('T')[0] : '';
          updated[idx].harvestYear = chosenLot.harvestYear || '';
        } else {
          updated[idx].inventoryLotId = null;
          updated[idx].costPerUnit = item.costPerUnit || 0;
          updated[idx].supplierName = item.supplier?.name || '';
        }
      } else {
        updated[idx].availableLots = [];
        updated[idx].inventoryLotId = null;
      }
    }

    if (field === 'inventoryLotId') {
      const chosenLot = (updated[idx].availableLots || []).find((l: any) => l.id === value);
      if (chosenLot) {
        updated[idx].supplierLot = chosenLot.lotNumber || '';
        updated[idx].costPerUnit = chosenLot.costPerUnit || updated[idx].costPerUnit || 0;
        updated[idx].supplierName = chosenLot.supplier?.name || chosenLot.supplierName || updated[idx].supplierName;
        updated[idx].expirationDate = chosenLot.expirationDate ? chosenLot.expirationDate.split('T')[0] : '';
        updated[idx].harvestYear = chosenLot.harvestYear || '';
      }
    }

    const q = parseFloat(updated[idx].quantityUsed) || 0;
    const c = parseFloat(updated[idx].costPerUnit) || 0;
    updated[idx].totalCost = Math.round(q * c * 100) / 100;

    setBatchIngredients(updated);
  };

  const removeIngredientFromNewBatch = (idx: number) => {
    setBatchIngredients(batchIngredients.filter((_, i) => i !== idx));
  };

  const autoCalculateCostInNewBatch = () => {
    const totalIngredientsCost = batchIngredients.reduce((sum: number, it: any) => sum + (parseFloat(it.totalCost) || 0), 0);
    const vol = parseFloat(volumePlanned) || 500;
    if (totalIngredientsCost > 0 && vol > 0) {
      setCostPerLiter((totalIngredientsCost / vol).toFixed(2));
    }
  };

  // Helper functions for Edit Batch Ingredients
  const addIngredientRowToEditBatch = (category: string = 'MALTE', stage: string = 'MOSTURA') => {
    const unit = category === 'MALTE' ? 'KG' : category === 'LUPULO' ? 'G' : category === 'LEVEDURA' ? 'PACOTE' : 'KG';
    setEditBatchIngredients([
      ...editBatchIngredients,
      {
        inventoryItemId: null,
        inventoryLotId: null,
        availableLots: [],
        supplierId: null,
        name: '',
        category,
        quantityUsed: category === 'MALTE' ? 25 : category === 'LUPULO' ? 500 : 1,
        unit,
        supplierName: '',
        supplierLot: '',
        costPerUnit: 0,
        totalCost: 0,
        expirationDate: '',
        harvestYear: '',
        stage,
        notes: '',
      },
    ]);
  };

  const updateIngredientInEditBatch = (idx: number, field: string, value: any) => {
    const updated = [...editBatchIngredients];
    updated[idx] = { ...updated[idx], [field]: value };

    if (field === 'inventoryItemId') {
      const item = inventoryItems.find((it) => it.id === value);
      if (item) {
        updated[idx].name = item.name;
        updated[idx].category = item.category || updated[idx].category;
        updated[idx].unit = item.unit || updated[idx].unit;
        const activeLots = (item.lots || []).filter((l: any) => (l.currentQuantity || 0) > 0);
        updated[idx].availableLots = activeLots;
        const chosenLot = activeLots.length > 0 ? activeLots[0] : null;
        if (chosenLot) {
          updated[idx].inventoryLotId = chosenLot.id;
          updated[idx].supplierId = chosenLot.supplierId || item.supplierId;
          updated[idx].supplierName = chosenLot.supplier?.name || chosenLot.supplierName || item.supplier?.name || '';
          updated[idx].supplierLot = chosenLot.lotNumber || '';
          updated[idx].costPerUnit = chosenLot.costPerUnit || item.costPerUnit || 0;
          updated[idx].expirationDate = chosenLot.expirationDate ? chosenLot.expirationDate.split('T')[0] : '';
          updated[idx].harvestYear = chosenLot.harvestYear || '';
        } else {
          updated[idx].inventoryLotId = null;
          updated[idx].costPerUnit = item.costPerUnit || 0;
          updated[idx].supplierName = item.supplier?.name || '';
        }
      } else {
        updated[idx].availableLots = [];
        updated[idx].inventoryLotId = null;
      }
    }

    if (field === 'inventoryLotId') {
      const chosenLot = (updated[idx].availableLots || []).find((l: any) => l.id === value);
      if (chosenLot) {
        updated[idx].supplierLot = chosenLot.lotNumber || '';
        updated[idx].costPerUnit = chosenLot.costPerUnit || updated[idx].costPerUnit || 0;
        updated[idx].supplierName = chosenLot.supplier?.name || chosenLot.supplierName || updated[idx].supplierName;
        updated[idx].expirationDate = chosenLot.expirationDate ? chosenLot.expirationDate.split('T')[0] : '';
        updated[idx].harvestYear = chosenLot.harvestYear || '';
      }
    }

    const q = parseFloat(updated[idx].quantityUsed) || 0;
    const c = parseFloat(updated[idx].costPerUnit) || 0;
    updated[idx].totalCost = Math.round(q * c * 100) / 100;

    setEditBatchIngredients(updated);
  };

  const removeIngredientFromEditBatch = (idx: number) => {
    setEditBatchIngredients(editBatchIngredients.filter((_, i) => i !== idx));
  };

  const autoCalculateCostInEditBatch = () => {
    const totalIngredientsCost = editBatchIngredients.reduce((sum: number, it: any) => sum + (parseFloat(it.totalCost) || 0), 0);
    const vol = parseFloat(editBatchVolumeProduced) || parseFloat(editBatchModal?.volumePlannedLiters) || 500;
    if (totalIngredientsCost > 0 && vol > 0) {
      setEditBatchCostPerLiter((totalIngredientsCost / vol).toFixed(2));
    }
  };

  // Recipe Ingredients Dynamic Handlers
  const addRecipeIngredientRow = () => {
    setRecipeIngredients([
      ...recipeIngredients,
      {
        inventoryItemId: '',
        name: '',
        category: 'MALTE',
        amount: 10,
        unit: 'KG',
        stage: 'MOSTURA',
        costPerUnit: 0,
        notes: '',
      },
    ]);
  };

  const removeRecipeIngredientRow = (idx: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx));
  };

  const updateRecipeIngredientRow = (idx: number, field: string, value: any) => {
    const updated = [...recipeIngredients];
    updated[idx] = { ...updated[idx], [field]: value };

    // If selecting inventory item from stock, auto-populate details
    if (field === 'inventoryItemId') {
      const item = inventoryItems.find((it) => it.id === value);
      if (item) {
        updated[idx].name = item.name;
        updated[idx].category = item.category;
        updated[idx].unit = item.unit;
        updated[idx].costPerUnit = item.costPerUnit || 0;
      }
    }

    setRecipeIngredients(updated);
  };

  const autoCalculateRecipeCostFromIngredients = () => {
    const totalCost = recipeIngredients.reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0) * (parseFloat(ing.costPerUnit) || 0), 0);
    const standardVolume = 500; // 500 litros padrão
    const costL = totalCost / standardVolume;
    setRecipeCostPerLiter(costL.toFixed(2));
  };

  const openNewRecipeModal = () => {
    setEditRecipeModal(null);
    setRecipeName('');
    setRecipeStyle('American IPA');
    setAbv('6.5');
    setIbu('55');
    setRecipeYieldLiters('500');
    setRecipeOg('1.054');
    setRecipeFg('1.010');
    setRecipeEbc('12');
    setRecipeTargetPhMash('5.2');
    setRecipeTargetPhFinal('4.2');
    setRecipeMapaRegistration('');
    setRecipeCommercialDenomination('Cerveja Puro Malte Clara tipo IPA');
    setRecipeCostPerLiter('4.80');
    setPricingModel('MANUAL');
    setProfitMargin('150');
    setStyleCategory('PREMIUM');
    setSalePricePerLiter('22.00');
    setDescription('');
    setRecipeIngredients([]);
    setNewRecipeModal(true);
  };

  const openEditRecipeModal = (r: any) => {
    setEditRecipeModal(r);
    setRecipeName(r.name || '');
    setRecipeStyle(r.style || '');
    setAbv(String(r.abv || '5.0'));
    setIbu(String(r.ibu || '20'));
    setRecipeYieldLiters(String(r.batchYieldLiters || '500'));
    setRecipeOg(String(r.og || '1.050'));
    setRecipeFg(String(r.fg || '1.010'));
    setRecipeEbc(String(r.ebc || '12'));
    setRecipeTargetPhMash(String(r.targetPhMash || '5.2'));
    setRecipeTargetPhFinal(String(r.targetPhFinal || '4.2'));
    setRecipeMapaRegistration(r.mapaRegistration || '');
    setRecipeCommercialDenomination(r.commercialDenomination || '');
    setRecipeCostPerLiter(String(r.costPerLiter || '4.50'));
    setPricingModel(r.pricingModel || 'MANUAL');
    setProfitMargin(String(r.profitMarginPercent || '100'));
    setStyleCategory(r.styleCategory || 'STANDARD');
    setSalePricePerLiter(String(r.salePricePerLiter || r.suggestedPricePerLiter || '18.00'));
    setDescription(r.description || '');
    setRecipeIngredients(
      (r.ingredients || []).map((ing: any) => ({
        id: ing.id,
        inventoryItemId: ing.inventoryItemId || '',
        name: ing.name,
        category: ing.category,
        amount: ing.amount,
        unit: ing.unit,
        stage: ing.stage || 'MOSTURA',
        costPerUnit: ing.costPerUnit || 0,
        notes: ing.notes || '',
      }))
    );
    setNewRecipeModal(false);
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipeName,
          style: recipeStyle,
          abv: abv ? parseFloat(abv) : null,
          ibu: ibu ? parseInt(ibu, 10) : null,
          og: recipeOg ? parseFloat(recipeOg) : null,
          fg: recipeFg ? parseFloat(recipeFg) : null,
          ebc: recipeEbc ? parseFloat(recipeEbc) : null,
          batchYieldLiters: recipeYieldLiters ? parseFloat(recipeYieldLiters) : 500,
          targetPhMash: recipeTargetPhMash ? parseFloat(recipeTargetPhMash) : null,
          targetPhFinal: recipeTargetPhFinal ? parseFloat(recipeTargetPhFinal) : null,
          mapaRegistration: recipeMapaRegistration,
          commercialDenomination: recipeCommercialDenomination,
          costPerLiter: recipeCostPerLiter,
          salePricePerLiter,
          pricingModel,
          profitMarginPercent: profitMargin,
          styleCategory,
          description,
          ingredients: recipeIngredients,
        }),
      });
      if (res.ok) {
        setNewRecipeModal(false);
        setRecipeName('');
        setDescription('');
        setRecipeIngredients([]);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar receita');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecipeModal) return;
    try {
      const res = await fetch(`/api/recipes/${editRecipeModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipeName,
          style: recipeStyle,
          abv: abv ? parseFloat(abv) : null,
          ibu: ibu ? parseInt(ibu, 10) : null,
          og: recipeOg ? parseFloat(recipeOg) : null,
          fg: recipeFg ? parseFloat(recipeFg) : null,
          ebc: recipeEbc ? parseFloat(recipeEbc) : null,
          batchYieldLiters: recipeYieldLiters ? parseFloat(recipeYieldLiters) : 500,
          targetPhMash: recipeTargetPhMash ? parseFloat(recipeTargetPhMash) : null,
          targetPhFinal: recipeTargetPhFinal ? parseFloat(recipeTargetPhFinal) : null,
          mapaRegistration: recipeMapaRegistration,
          commercialDenomination: recipeCommercialDenomination,
          costPerLiter: recipeCostPerLiter,
          salePricePerLiter,
          pricingModel,
          profitMarginPercent: profitMargin,
          styleCategory,
          description,
          ingredients: recipeIngredients,
        }),
      });
      if (res.ok) {
        setEditRecipeModal(null);
        setRecipeIngredients([]);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar receita');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRecipe = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a receita "${name}"?`)) return;
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao excluir receita');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openBatchQualityModal = (batch: any) => {
    if (!batch) return;
    setBatchQualityModal(batch);
    setQStatus(batch.status || 'FERMENTANDO');
    setQVolumeProduced(String(batch.volumeProducedLiters || batch.volumePlannedLiters || ''));
    setQTankId(batch.tankId || '');
    setQMeasuredOg(batch.measuredOg ? String(batch.measuredOg) : (batch.recipe?.og ? String(batch.recipe.og) : ''));
    setQMeasuredFg(batch.measuredFg ? String(batch.measuredFg) : (batch.recipe?.fg ? String(batch.recipe.fg) : ''));
    setQMeasuredAbv(batch.measuredAbv ? String(batch.measuredAbv) : (batch.recipe?.abv ? String(batch.recipe.abv) : ''));
    setQMeasuredIbu(batch.measuredIbu ? String(batch.measuredIbu) : (batch.recipe?.ibu ? String(batch.recipe.ibu) : ''));
    setQMeasuredEbc(batch.measuredEbc ? String(batch.measuredEbc) : (batch.recipe?.ebc ? String(batch.recipe.ebc) : ''));
    setQAttenuation(batch.attenuationPercent ? String(batch.attenuationPercent) : '');
    setQPhMash(batch.phMash ? String(batch.phMash) : (batch.recipe?.targetPhMash ? String(batch.recipe.targetPhMash) : '5.2'));
    setQPhBoil(batch.phBoil ? String(batch.phBoil) : '5.1');
    setQPhFermentationStart(batch.phFermentationStart ? String(batch.phFermentationStart) : '5.0');
    setQPhFinal(batch.phFinal ? String(batch.phFinal) : (batch.recipe?.targetPhFinal ? String(batch.recipe.targetPhFinal) : '4.2'));
    setQTempMash(batch.tempMash ? String(batch.tempMash) : '66.0');
    setQTempFermentation(batch.tempFermentation ? String(batch.tempFermentation) : '18.0');
    setQTempMaturation(batch.tempMaturation ? String(batch.tempMaturation) : '0.0');
    setQYeastStrain(batch.yeastStrain || '');
    setQYeastGeneration(batch.yeastGeneration ? String(batch.yeastGeneration) : '1');
    setQYeastLot(batch.yeastLot || '');
    setQMapaRegistration(batch.mapaRegistration || batch.recipe?.mapaRegistration || '');
    setQCommercialDenomination(batch.commercialDenomination || batch.recipe?.commercialDenomination || '');
    setQTechnicalResponsible(batch.technicalResponsible || '');
    setQBrewDate(batch.brewDate ? new Date(batch.brewDate).toISOString().split('T')[0] : '');
    setQFermentationStartDate(batch.fermentationStartDate ? new Date(batch.fermentationStartDate).toISOString().split('T')[0] : '');
    setQMaturationStartDate(batch.maturationStartDate ? new Date(batch.maturationStartDate).toISOString().split('T')[0] : '');
    setQPackagingDate(batch.packagingDate ? new Date(batch.packagingDate).toISOString().split('T')[0] : '');
    setQSensoryNotes(batch.sensoryNotes || '');
    setQNotes(batch.notes || '');
  };

  const handleOgFgChange = (newOg: string, newFg: string) => {
    setQMeasuredOg(newOg);
    setQMeasuredFg(newFg);
    const ogNum = parseFloat(newOg);
    const fgNum = parseFloat(newFg);
    if (ogNum && fgNum && ogNum > 1.0 && fgNum >= 0.99) {
      const calcAbv = Math.round(((ogNum - fgNum) * 131.25) * 10) / 10;
      const calcAtt = Math.round(((ogNum - fgNum) / (ogNum - 1.0)) * 1000) / 10;
      setQMeasuredAbv(String(calcAbv));
      setQAttenuation(String(calcAtt));
    }
  };

  const handleSaveBatchQuality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchQualityModal) return;
    setSavingBatchQuality(true);
    try {
      const res = await fetch(`/api/batches/${batchQualityModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: qStatus,
          volumeProducedLiters: qVolumeProduced ? parseFloat(qVolumeProduced) : undefined,
          tankId: qTankId || null,
          measuredOg: qMeasuredOg ? parseFloat(qMeasuredOg) : null,
          measuredFg: qMeasuredFg ? parseFloat(qMeasuredFg) : null,
          measuredAbv: qMeasuredAbv ? parseFloat(qMeasuredAbv) : null,
          measuredIbu: qMeasuredIbu ? parseInt(qMeasuredIbu, 10) : null,
          measuredEbc: qMeasuredEbc ? parseFloat(qMeasuredEbc) : null,
          attenuationPercent: qAttenuation ? parseFloat(qAttenuation) : null,
          phMash: qPhMash ? parseFloat(qPhMash) : null,
          phBoil: qPhBoil ? parseFloat(qPhBoil) : null,
          phFermentationStart: qPhFermentationStart ? parseFloat(qPhFermentationStart) : null,
          phFinal: qPhFinal ? parseFloat(qPhFinal) : null,
          tempMash: qTempMash ? parseFloat(qTempMash) : null,
          tempFermentation: qTempFermentation ? parseFloat(qTempFermentation) : null,
          tempMaturation: qTempMaturation ? parseFloat(qTempMaturation) : null,
          yeastStrain: qYeastStrain,
          yeastGeneration: qYeastGeneration ? parseInt(qYeastGeneration, 10) : null,
          yeastLot: qYeastLot,
          mapaRegistration: qMapaRegistration,
          commercialDenomination: qCommercialDenomination,
          technicalResponsible: qTechnicalResponsible,
          sensoryNotes: qSensoryNotes,
          notes: qNotes,
          fermentationStartDate: qFermentationStartDate || null,
          maturationStartDate: qMaturationStartDate || null,
          packagingDate: qPackagingDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar ficha de controle');
      setBatchQualityModal(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar acompanhamento');
    } finally {
      setSavingBatchQuality(false);
    }
  };

  const handleCreateTank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tanks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tankName,
          capacityLiters: tankCapacity,
          type: tankType,
          notes: tankNotes,
        }),
      });
      if (res.ok) {
        setNewTankModal(false);
        setTankName('');
        setTankNotes('');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTank = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o tanque ${name}?`)) return;
    try {
      const res = await fetch(`/api/tanks/${id}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const openEditTankModal = (tank: any) => {
    setEditTankModal(tank);
    setEditTankName(tank.name || '');
    setEditTankCapacity(String(tank.capacityLiters || '1000'));
    setEditTankType(tank.type ? (tank.type.includes('_') ? tank.type.replace(/_/g, ' ') : tank.type) : 'Fermentador Isotérmico');
    setEditTankStatus(tank.status || 'LIVRE');
    setEditTankNotes(tank.notes || '');

    // Active batch in tank if any
    const activeBatch = (tank.batches || []).find((b: any) => b.status !== 'FINALIZADO') || tank.batches?.[0];
    if (activeBatch && tank.status === 'OCUPADO') {
      setEditTankBatchId(activeBatch.id || '');
      setEditTankPackagingDate(activeBatch.packagingDate ? new Date(activeBatch.packagingDate).toISOString().split('T')[0] : '');
      setEditTankBatchStatus(activeBatch.status || 'FERMENTANDO');
      setEditTankFermentationStartDate(activeBatch.fermentationStartDate ? new Date(activeBatch.fermentationStartDate).toISOString().split('T')[0] : (activeBatch.brewDate ? new Date(activeBatch.brewDate).toISOString().split('T')[0] : ''));
      setEditTankVolumeProduced(String(activeBatch.volumeProducedLiters || activeBatch.volumePlannedLiters || ''));
      setEditTankMeasuredOg(String(activeBatch.measuredOg || ''));
      setEditTankMeasuredFg(String(activeBatch.measuredFg || ''));
      setEditTankMeasuredAbv(String(activeBatch.measuredAbv || ''));
    } else {
      setEditTankBatchId('');
      setEditTankPackagingDate('');
      setEditTankBatchStatus('FERMENTANDO');
      setEditTankFermentationStartDate('');
      setEditTankVolumeProduced('');
      setEditTankMeasuredOg('');
      setEditTankMeasuredFg('');
      setEditTankMeasuredAbv('');
    }
  };

  const handleSaveTankEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTankModal) return;
    setSavingTank(true);
    try {
      const res = await fetch(`/api/tanks/${editTankModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editTankName,
          capacityLiters: editTankCapacity,
          type: editTankType,
          status: editTankStatus,
          notes: editTankNotes,
          batchId: editTankBatchId,
          packagingDate: editTankPackagingDate || null,
          batchStatus: editTankBatchStatus,
          fermentationStartDate: editTankFermentationStartDate || null,
          volumeProducedLiters: editTankVolumeProduced ? parseFloat(editTankVolumeProduced) : undefined,
          measuredOg: editTankMeasuredOg ? parseFloat(editTankMeasuredOg) : undefined,
          measuredFg: editTankMeasuredFg ? parseFloat(editTankMeasuredFg) : undefined,
          measuredAbv: editTankMeasuredAbv ? parseFloat(editTankMeasuredAbv) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar tanque');
      setEditTankModal(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações do tanque');
    } finally {
      setSavingTank(false);
    }
  };

  const handleQuickTankStatusChange = async (tankId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tanks/${tankId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLiberateTank = async (tank: any) => {
    if (!confirm(`Deseja desocupar e liberar o tanque ${tank.name}? O lote atual será desvinculado e o status passará para LIVRE.`)) return;
    try {
      const res = await fetch(`/api/tanks/${tank.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'LIVRE',
          batchId: '',
        }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-600" />
            Produção, Tanques, Custos & Preços
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Brassagens com custo por litro, precificação inteligente, tanques e catálogo de receitas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setNewTankModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all"
          >
            <Cylinder className="w-4 h-4 text-blue-600" />
            <span>Novo Tanque</span>
          </button>

          <button
            onClick={() => {
              setPricingModel('MANUAL');
              setRecipeCostPerLiter('4.50');
              setSalePricePerLiter('18.00');
              setNewRecipeModal(true);
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all"
          >
            <Beer className="w-4 h-4 text-purple-600" />
            <span>Nova Receita / Preço</span>
          </button>

          <button
            onClick={() => {
              setBatchNumber(`LOTE-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, '0')}`);
              setNewBatchModal(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Brassagem</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-200/80 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('BATCHES')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'BATCHES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Lotes & Custos ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('TANKS')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'TANKS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tanques & Fermentadores ({tanks.length})
        </button>
        <button
          onClick={() => setActiveTab('RECIPES')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'RECIPES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Cervejas & Lotes ({recipes.length})
        </button>
      </div>

      {/* Tab: Batches */}
      {activeTab === 'BATCHES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-400">Carregando lotes...</div>
          ) : batches.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">Nenhum lote registrado.</div>
          ) : (
            batches.map((batch) => {
              const isReady = batch.status === 'PRONTO_ENVASE' || batch.status === 'ENVASADO';
              const vol = batch.volumeProducedLiters || batch.volumePlannedLiters || 0;
              const costL = batch.costPerLiter || 0;
              const totalCost = batch.totalCost || costL * vol;
              const salePriceL = batch.recipe?.salePricePerLiter || batch.recipe?.suggestedPricePerLiter || 20;
              const projectedRevenue = vol * salePriceL;
              const projectedProfit = projectedRevenue - totalCost;
              const marginPercent = totalCost > 0 ? ((projectedProfit / totalCost) * 100) : 0;

              return (
                <div
                  key={batch.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-700 block">
                          {batch.batchNumber}
                        </span>
                        <h3 className="font-black text-slate-900 text-base mt-0.5">
                          {batch.recipe?.name || 'Cerveja'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {batch.recipe?.style || 'Estilo'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isReady
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {batch.status}
                        </span>
                        <button
                          onClick={() => openEditBatchModal(batch)}
                          className="p-1 text-slate-400 hover:text-amber-600 rounded"
                          title="Editar Lote e Custos"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Cost & Financial Analysis Box */}
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Custo por Litro:</span>
                        <span className="font-black text-rose-700">
                          {costL > 0 ? formatCurrency(costL) + '/L' : 'Não informado'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Custo Total Brassagem:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(totalCost)}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500 font-medium">Preço Venda Sugerido:</span>
                        <span className="font-extrabold text-emerald-700">
                          {formatCurrency(salePriceL)}/L
                        </span>
                      </div>

                      {costL > 0 && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500 font-medium">Margem Projetada:</span>
                          <span className="font-black text-emerald-600 flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />
                            +{marginPercent.toFixed(0)}% ({formatCurrency(projectedProfit)})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Volume:</span>
                        <span className="font-bold text-slate-800">{vol} Litros</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Tanque:</span>
                        <span className="font-semibold text-blue-700">{batch.tank?.name || 'Sem tanque'}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Data Brassagem:</span>
                        <span className="font-semibold">{formatDateShort(batch.brewDate)}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Barris Vinculados:</span>
                        <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          {batch._count?.kegs || 0} barris
                        </span>
                      </div>

                      {/* Botões Ficha de Rastreabilidade e Ficha MAPA */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <button
                          type="button"
                          onClick={() => openBatchQualityModal(batch)}
                          className="w-full py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Activity className="w-4 h-4" />
                          <span>Ficha de Acompanhamento & MAPA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBatchTraceabilityModal(batch)}
                          className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>Rastreabilidade de Insumos ({batch.ingredients?.length || 0})</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => openEditBatchModal(batch)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900"
                    >
                      Alterar Etapa / Custo
                    </button>
                    <a
                      href="/scanner"
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Envasar Barris
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Tanques & Fermentadores */}
      {activeTab === 'TANKS' && (() => {
        const totalTankCapacity = tanks.reduce((acc, t) => acc + (t.capacityLiters || 0), 0);
        const occupiedTanksList = tanks.filter((t) => t.status === 'OCUPADO');
        const occupiedVolume = tanks.reduce((acc, t) => {
          if (t.status !== 'OCUPADO') return acc;
          const b = (t.batches || []).find((x: any) => x.status !== 'FINALIZADO') || t.batches?.[0];
          return acc + (b ? (b.volumeProducedLiters || b.volumePlannedLiters || t.capacityLiters) : t.capacityLiters);
        }, 0);
        const occupancyPercent = totalTankCapacity > 0 ? Math.round((occupiedVolume / totalTankCapacity) * 100) : 0;
        const freeTanksList = tanks.filter((t) => t.status === 'LIVRE');
        const freeCapacity = freeTanksList.reduce((acc, t) => acc + (t.capacityLiters || 0), 0);
        const cleaningTanksList = tanks.filter((t) => t.status === 'HIGIENIZANDO');
        const maintenanceTanksList = tanks.filter((t) => t.status === 'MANUTENCAO');
        const readyForPackagingList = tanks.filter((t) =>
          (t.batches || []).some((b: any) => b.status === 'PRONTO_ENVASE' || b.status === 'MATURANDO')
        );

        const filteredTanks = tanks.filter((t) => {
          const matchesStatus = tankStatusFilter === 'ALL' || t.status === tankStatusFilter;
          const activeBatch = (t.batches || []).find((b: any) => b.status !== 'FINALIZADO') || t.batches?.[0];
          const matchesSearch =
            !tankSearch ||
            t.name.toLowerCase().includes(tankSearch.toLowerCase()) ||
            t.type.toLowerCase().includes(tankSearch.toLowerCase()) ||
            (activeBatch && (
              (activeBatch.batchNumber && activeBatch.batchNumber.toLowerCase().includes(tankSearch.toLowerCase())) ||
              (activeBatch.recipe?.name && activeBatch.recipe.name.toLowerCase().includes(tankSearch.toLowerCase())) ||
              (activeBatch.recipe?.style && activeBatch.recipe.style.toLowerCase().includes(tankSearch.toLowerCase()))
            ));
          return matchesStatus && matchesSearch;
        });

        return (
          <div className="space-y-6">
            {/* Top KPI Cards for Tanks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Cylinder className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Capacidade Instalada
                  </span>
                  <span className="text-xl font-black text-slate-900">{totalTankCapacity} Litros</span>
                  <span className="text-[10px] text-slate-500 block">{tanks.length} tanques cadastrados</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm flex items-center gap-3 bg-purple-50/20">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block">
                    Ocupação da Planta
                  </span>
                  <span className="text-xl font-black text-purple-900">{occupancyPercent}% Ocupado</span>
                  <span className="text-[10px] text-purple-700 font-bold block">
                    {occupiedVolume}L em fermentação/maturação
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center gap-3 bg-emerald-50/20">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                    Tanques Livres
                  </span>
                  <span className="text-xl font-black text-emerald-900">{freeTanksList.length} Livres</span>
                  <span className="text-[10px] text-emerald-600 font-bold block">
                    {freeCapacity}L disponíveis para brassagem
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center gap-3 bg-amber-50/20">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    Prontos p/ Envase
                  </span>
                  <span className="text-xl font-black text-amber-900">{readyForPackagingList.length} Lotes</span>
                  <span className="text-[10px] text-amber-700 font-bold block">
                    Em maturação final / cold crash
                  </span>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar tanque por nome, cerveja ou lote..."
                  value={tankSearch}
                  onChange={(e) => setTankSearch(e.target.value)}
                  className="bg-transparent w-full text-xs font-bold text-slate-800 focus:outline-none"
                />
                {tankSearch && (
                  <button onClick={() => setTankSearch('')} className="text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'ALL', label: `Todos (${tanks.length})` },
                  { id: 'OCUPADO', label: `Ocupados (${occupiedTanksList.length})`, color: 'text-purple-700' },
                  { id: 'LIVRE', label: `Livres (${freeTanksList.length})`, color: 'text-emerald-700' },
                  { id: 'HIGIENIZANDO', label: `CIP / Limpeza (${cleaningTanksList.length})`, color: 'text-blue-700' },
                  { id: 'MANUTENCAO', label: `Manutenção (${maintenanceTanksList.length})`, color: 'text-amber-700' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTankStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      tankStatusFilter === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tanks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTanks.length === 0 ? (
                <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                  <Cylinder className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold">Nenhum tanque encontrado com os filtros selecionados.</p>
                </div>
              ) : (
                filteredTanks.map((tank) => {
                  const isOccupied = tank.status === 'OCUPADO';
                  const isCleaning = tank.status === 'HIGIENIZANDO';
                  const isMaintenance = tank.status === 'MANUTENCAO';
                  const isFree = tank.status === 'LIVRE';

                  // Active batch in this tank
                  const activeBatch = (tank.batches || []).find((b: any) => b.status !== 'FINALIZADO') || tank.batches?.[0];
                  const hasActiveBatch = isOccupied && activeBatch;

                  const batchVol = hasActiveBatch ? (activeBatch.volumeProducedLiters || activeBatch.volumePlannedLiters || tank.capacityLiters) : 0;
                  const fillPercentage = tank.capacityLiters > 0 ? Math.min(100, Math.round((batchVol / tank.capacityLiters) * 100)) : 0;

                  // Days in tank calculation
                  let daysInTank = 0;
                  if (hasActiveBatch) {
                    const startDate = activeBatch.fermentationStartDate || activeBatch.brewDate || activeBatch.createdAt;
                    if (startDate) {
                      const diffTime = Math.abs(new Date().getTime() - new Date(startDate).getTime());
                      daysInTank = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    }
                  }

                  // Packaging forecast calculation
                  let packagingBadge = null;
                  if (hasActiveBatch && activeBatch.packagingDate) {
                    const pkgDate = new Date(activeBatch.packagingDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    pkgDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.round((pkgDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                      packagingBadge = { text: `Venceu há ${Math.abs(diffDays)}d (Envase Imediato!)`, color: 'bg-rose-100 text-rose-800 border-rose-300' };
                    } else if (diffDays === 0) {
                      packagingBadge = { text: 'Envase Previsto para HOJE!', color: 'bg-amber-100 text-amber-900 border-amber-300' };
                    } else if (diffDays === 1) {
                      packagingBadge = { text: 'Envase Amanhã', color: 'bg-amber-50 text-amber-800 border-amber-200' };
                    } else {
                      packagingBadge = { text: `Faltam ${diffDays} dias`, color: 'bg-blue-50 text-blue-800 border-blue-200' };
                    }
                  }

                  return (
                    <div
                      key={tank.id}
                      className={`bg-white rounded-2xl border shadow-sm flex flex-col justify-between overflow-hidden transition-all hover:shadow-md ${
                        isOccupied
                          ? 'border-purple-200 hover:border-purple-300'
                          : isFree
                          ? 'border-emerald-200 hover:border-emerald-300'
                          : isCleaning
                          ? 'border-blue-200 hover:border-blue-300'
                          : 'border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="p-5 space-y-3.5">
                        {/* Tank Header */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              {tank.type?.replace(/_/g, ' ') || 'FERMENTADOR ISOTÉRMICO'}
                            </span>
                            <h3 className="font-black text-slate-900 text-lg flex items-center gap-1.5">
                              <span>{tank.name}</span>
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Status Badge */}
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 shadow-2xs ${
                                isOccupied
                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                  : isFree
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : isCleaning
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isOccupied ? 'bg-purple-600' : isFree ? 'bg-emerald-600' : isCleaning ? 'bg-blue-600' : 'bg-amber-600'
                              }`} />
                              {tank.status}
                            </span>

                            {/* Edit & Delete Buttons */}
                            <button
                              onClick={() => openEditTankModal(tank)}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-slate-200"
                              title="Editar Tanque & Lote"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteTank(tank.id, tank.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
                              title="Excluir Tanque"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Tank Visual Level & Capacity Gauge */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span className="text-[11px] text-slate-500">
                              Capacidade: <strong>{tank.capacityLiters}L</strong>
                            </span>
                            <span className={`text-[11px] ${isOccupied ? 'text-purple-700 font-black' : 'text-slate-500'}`}>
                              {isOccupied ? `${batchVol}L (${fillPercentage}%)` : isFree ? 'Vazio / Pronto' : tank.status}
                            </span>
                          </div>

                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOccupied
                                  ? 'bg-purple-600'
                                  : isCleaning
                                  ? 'bg-blue-500 animate-pulse'
                                  : isMaintenance
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500/30'
                              }`}
                              style={{ width: isOccupied ? `${fillPercentage}%` : isCleaning || isMaintenance ? '100%' : '0%' }}
                            />
                          </div>
                        </div>

                        {/* Active Batch Card in Tank */}
                        {hasActiveBatch ? (
                          <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2.5 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold text-purple-700 block uppercase tracking-wider">
                                  Lote em Produção:
                                </span>
                                <h4 className="font-black text-purple-950 text-sm">
                                  🍺 {activeBatch.recipe?.name || 'Cerveja'}
                                </h4>
                                <span className="text-[10px] text-purple-700 font-semibold block">
                                  {activeBatch.recipe?.style || 'Estilo'} • Lote <strong className="font-mono">{activeBatch.batchNumber}</strong>
                                </span>
                              </div>

                              <span className="px-2 py-0.5 bg-purple-200/80 text-purple-900 rounded-md font-black text-[10px] uppercase">
                                {activeBatch.status}
                              </span>
                            </div>

                            {/* Forecast Date & Days Counter */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-200/60 text-[11px]">
                              <div>
                                <span className="text-slate-400 block text-[10px] font-bold">📅 Previsão de Envase:</span>
                                {activeBatch.packagingDate ? (
                                  <div>
                                    <strong className="text-purple-950 font-extrabold block">
                                      {formatDateShort(activeBatch.packagingDate)}
                                    </strong>
                                    {packagingBadge && (
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border inline-block mt-0.5 ${packagingBadge.color}`}>
                                        {packagingBadge.text}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openEditTankModal(tank)}
                                    className="text-amber-800 font-bold hover:underline text-[10px] flex items-center gap-1 mt-0.5"
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>Definir previsão</span>
                                  </button>
                                )}
                              </div>

                              <div>
                                <span className="text-slate-400 block text-[10px] font-bold">⏱️ Tempo no Tanque:</span>
                                <strong className="text-purple-950 font-extrabold block">
                                  {daysInTank > 0 ? `${daysInTank} dias` : 'Hoje'}
                                </strong>
                                <span className="text-[9px] text-slate-500">
                                  Desde {formatDateShort(activeBatch.fermentationStartDate || activeBatch.brewDate || activeBatch.createdAt)}
                                </span>
                              </div>
                            </div>

                            {/* Parâmetros Físico-Químicos & Qualidade */}
                            <div className="pt-2 border-t border-purple-200/60 space-y-1 text-[10px] font-bold text-purple-900">
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <span>OG: <strong>{activeBatch.measuredOg || '-'}</strong></span>
                                <span>FG: <strong>{activeBatch.measuredFg || '-'}</strong></span>
                                <span>ABV: <strong>{activeBatch.measuredAbv ? `${activeBatch.measuredAbv}%` : '-'}</strong></span>
                                {activeBatch.attenuationPercent && (
                                  <span>Aten: <strong>{activeBatch.attenuationPercent}%</strong></span>
                                )}
                                {activeBatch.measuredIbu && (
                                  <span>IBU: <strong>{activeBatch.measuredIbu}</strong></span>
                                )}
                              </div>

                              {/* Indicadores de pH */}
                              {(activeBatch.phMash || activeBatch.phFermentationStart || activeBatch.phFinal) && (
                                <div className="flex items-center gap-1.5 pt-1 border-t border-purple-200/40 text-[9px] text-purple-800 flex-wrap">
                                  {activeBatch.phMash && <span className="bg-white/80 px-1 py-0.5 rounded border border-purple-200">pH Mostura: {activeBatch.phMash}</span>}
                                  {activeBatch.phFermentationStart && <span className="bg-white/80 px-1 py-0.5 rounded border border-purple-200">pH Início: {activeBatch.phFermentationStart}</span>}
                                  {activeBatch.phFinal && <span className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded border border-emerald-300 font-black">pH Pronto: {activeBatch.phFinal}</span>}
                                </div>
                              )}
                            </div>

                            {/* Botão Ficha de Acompanhamento & MAPA */}
                            <button
                              type="button"
                              onClick={() => openBatchQualityModal(activeBatch)}
                              className="w-full py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1 shadow-2xs transition-all"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span>Ficha MAPA & Acompanhamento</span>
                            </button>
                          </div>
                        ) : isCleaning ? (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1 text-blue-900">
                            <span className="font-black flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                              Higienização CIP em Andamento
                            </span>
                            <p className="text-[11px] text-blue-700">
                              Tanque em ciclo de limpeza e sanitização química.
                            </p>
                          </div>
                        ) : isMaintenance ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1 text-amber-900">
                            <span className="font-black flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              Em Manutenção / Inspeção
                            </span>
                            <p className="text-[11px] text-amber-700">
                              {tank.notes || 'Tanque temporariamente indisponível para produção.'}
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-xs space-y-1 text-emerald-900">
                            <span className="font-black flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Tanque Vazio & Pronto para Uso
                            </span>
                            <p className="text-[11px] text-emerald-700">
                              Disponível para receber nova brassagem de até {tank.capacityLiters}L.
                            </p>
                          </div>
                        )}

                        {tank.notes && !isMaintenance && (
                          <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                            {tank.notes}
                          </p>
                        )}
                      </div>

                      {/* Card Footer Quick Actions */}
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                        <button
                          onClick={() => openEditTankModal(tank)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Gerenciar</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {isOccupied && (
                            <>
                              <a
                                href="/scanner"
                                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center gap-1 transition-colors shadow-2xs text-[11px]"
                                title="Bipar e Envasar Barris deste Tanque"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Envasar</span>
                              </a>

                              <button
                                onClick={() => handleLiberateTank(tank)}
                                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors text-[11px]"
                                title="Desocupar e Liberar Tanque"
                              >
                                Liberar
                              </button>
                            </>
                          )}

                          {isFree && (
                            <>
                              <button
                                onClick={() => handleQuickTankStatusChange(tank.id, 'HIGIENIZANDO')}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl transition-colors text-[11px] flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>CIP</span>
                              </button>

                              <button
                                onClick={() => {
                                  setTankId(tank.id);
                                  setNewBatchModal(true);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-2xs text-[11px] flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Brassagem</span>
                              </button>
                            </>
                          )}

                          {isCleaning && (
                            <button
                              onClick={() => handleQuickTankStatusChange(tank.id, 'LIVRE')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-2xs text-[11px] flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Concluir CIP</span>
                            </button>
                          )}

                          {isMaintenance && (
                            <button
                              onClick={() => handleQuickTankStatusChange(tank.id, 'LIVRE')}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors shadow-2xs text-[11px] flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Liberar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* Tab: Recipes & Pricing Table */}
      {activeTab === 'RECIPES' && (() => {
        const filteredRecipes = recipes.filter((r) => {
          if (!recipeSearch) return true;
          const s = recipeSearch.toLowerCase();
          return (
            r.name.toLowerCase().includes(s) ||
            r.style.toLowerCase().includes(s) ||
            (r.mapaRegistration && r.mapaRegistration.toLowerCase().includes(s)) ||
            (r.commercialDenomination && r.commercialDenomination.toLowerCase().includes(s))
          );
        });

        return (
          <div className="space-y-6">
            {/* Toolbar de Receitas / Cervejas */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar cerveja por nome, estilo ou registro MAPA..."
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  className="bg-transparent w-full text-xs font-bold text-slate-800 focus:outline-none"
                />
                {recipeSearch && (
                  <button onClick={() => setRecipeSearch('')} className="text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-2 bg-purple-50 border border-purple-200 text-purple-900 font-bold rounded-xl flex items-center gap-1.5">
                  <Beer className="w-4 h-4 text-purple-700" />
                  <span>{recipes.length} Cervejas Cadastradas</span>
                </div>

                <button
                  type="button"
                  onClick={openNewRecipeModal}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cadastrar Nova Cerveja (Rótulo)</span>
                </button>
              </div>
            </div>

            {/* Grid de Cervejas & Lotes Produzidos */}
            {filteredRecipes.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 space-y-3">
                <Beer className="w-12 h-12 mx-auto text-slate-300" />
                <p className="font-bold">Nenhuma cerveja cadastrada.</p>
                <button
                  onClick={openNewRecipeModal}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  + Cadastrar Primeira Cerveja
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredRecipes.map((recipe) => {
                  const saleL = recipe.salePricePerLiter || recipe.suggestedPricePerLiter || 18.0;
                  const costL = recipe.costPerLiter || 0;
                  const modelLabel =
                    recipe.pricingModel === 'AT_COST'
                      ? 'Preço de Custo'
                      : recipe.pricingModel === 'MARKUP'
                      ? `Custo + ${recipe.profitMarginPercent || 100}%`
                      : recipe.pricingModel === 'BY_STYLE'
                      ? `Tabela (${recipe.styleCategory || 'Estilo'})`
                      : 'Preço Manual';

                  const recipeBatches = batches.filter((b: any) => b.recipeId === recipe.id);
                  const isExpanded = expandedRecipeId === recipe.id;

                  return (
                    <div
                      key={recipe.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-purple-300 transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        {/* Header da Cerveja */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                {recipe.styleCategory || 'STANDARD'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                Rendimento: {recipe.batchYieldLiters || 500}L
                              </span>
                            </div>
                            <h3 className="font-black text-slate-900 text-lg mt-1 leading-tight">{recipe.name}</h3>
                            <p className="text-xs font-bold text-purple-700">{recipe.style}</p>
                            {recipe.commercialDenomination && (
                              <span className="text-[11px] text-slate-500 italic block mt-0.5">
                                &quot;{recipe.commercialDenomination}&quot;
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditRecipeModal(recipe)}
                              className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                              title="Editar Dados da Cerveja / Rótulo"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Excluir Cerveja"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Badges de Registro MAPA */}
                        {recipe.mapaRegistration ? (
                          <div className="p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px]">
                            <span className="font-bold text-emerald-900 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                              Registro MAPA:
                            </span>
                            <span className="font-mono font-black text-emerald-950">{recipe.mapaRegistration}</span>
                          </div>
                        ) : (
                          <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[10px] text-slate-400">
                            <span>Registro MAPA não preenchido</span>
                            <button
                              onClick={() => openEditRecipeModal(recipe)}
                              className="text-purple-700 font-bold hover:underline"
                            >
                              + Adicionar
                            </button>
                          </div>
                        )}

                        {/* Metas Físico-Químicas da Receita */}
                        <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[9px] text-slate-400 block font-bold uppercase">ABV Alvo</span>
                            <span className="font-black text-slate-900">{recipe.abv ? `${recipe.abv}%` : '-'}</span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[9px] text-slate-400 block font-bold uppercase">IBU</span>
                            <span className="font-black text-slate-900">{recipe.ibu || '-'}</span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[9px] text-slate-400 block font-bold uppercase">OG Alvo</span>
                            <span className="font-black text-purple-900">{recipe.og || '-'}</span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[9px] text-slate-400 block font-bold uppercase">FG Alvo</span>
                            <span className="font-black text-purple-900">{recipe.fg || '-'}</span>
                          </div>
                        </div>

                        {/* Tabela de Preços e Margens */}
                        <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-purple-900">{modelLabel}</span>
                            <span className="text-xs font-black text-emerald-800">
                              Venda: {formatCurrency(saleL)}/L
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-purple-100">
                            <span>Custo Estimado: <strong>{formatCurrency(costL)}/L</strong></span>
                            <span className="text-emerald-700 font-black">
                              Lucro: +{formatCurrency(Math.max(0, saleL - costL))}/L
                            </span>
                          </div>
                        </div>

                        {/* SEÇÃO EXPANSÍVEL: HISTÓRICO DE LOTES PRODUZIDOS DESTA CERVEJA */}
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
                            className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 rounded-xl font-black text-xs flex items-center justify-between transition-colors shadow-2xs"
                          >
                            <div className="flex items-center gap-1.5">
                              <Activity className="w-4 h-4 text-purple-700" />
                              <span>Lotes Produzidos ({recipeBatches.length})</span>
                            </div>
                            <span className="text-[11px] font-bold text-purple-700 flex items-center gap-1">
                              {isExpanded ? 'Recolher ▲' : 'Ver Lotes & Rastrear ▼'}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="space-y-2 pt-1 animate-in fade-in">
                              {recipeBatches.length === 0 ? (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 space-y-1">
                                  <p className="font-bold">Nenhum lote registrado para {recipe.name}.</p>
                                  <p className="text-[10px] text-slate-400">
                                    Clique em &quot;Iniciar Brassagem&quot; abaixo para registrar o lote e inserir os insumos na hora!
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                  {recipeBatches.map((b: any) => (
                                    <div
                                      key={b.id}
                                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs hover:border-purple-300 transition-all"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono font-black text-slate-900 text-xs">
                                          #{b.batchNumber}
                                        </span>
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-full font-black text-[9px]">
                                          {b.status}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600">
                                        <span>Data: <strong>{formatDateShort(b.brewDate)}</strong></span>
                                        <span>Tanque: <strong>{b.tank?.name || 'S/ Tanque'}</strong></span>
                                        <span>Vol: <strong>{b.volumeProducedLiters || b.volumePlannedLiters}L</strong></span>
                                        <span>Insumos: <strong>{b.ingredients?.length || 0}</strong></span>
                                      </div>

                                      {/* Ações Diretas no Lote */}
                                      <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-200">
                                        <button
                                          type="button"
                                          onClick={() => setBatchTraceabilityModal(b)}
                                          className="py-1 px-1 bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 rounded-lg text-[9px] font-bold flex items-center justify-center gap-0.5 shadow-2xs"
                                          title="Ver insumos, fornecedores e lotes utilizados"
                                        >
                                          <ShieldCheck className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                          <span>Insumos</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openBatchQualityModal(b)}
                                          className="py-1 px-1 bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 rounded-lg text-[9px] font-bold flex items-center justify-center gap-0.5 shadow-2xs"
                                          title="Ver parâmetros MAPA, pHs e sensorial"
                                        >
                                          <Activity className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                          <span>MAPA & pH</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openEditBatchModal(b)}
                                          className="py-1 px-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[9px] font-bold flex items-center justify-center gap-0.5 shadow-2xs"
                                          title="Editar insumos e dados deste lote"
                                        >
                                          <Edit3 className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                          <span>Editar</span>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Botão Iniciar Brassagem desta Cerveja */}
                      <div className="pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setRecipeId(recipe.id);
                            setBatchNumber(`LOTE-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, '0')}`);
                            setVolumePlanned(String(recipe.batchYieldLiters || 500));
                            populateBatchIngredientsFromRecipe(recipe, recipe.batchYieldLiters || 500);
                            setNewBatchModal(true);
                          }}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Iniciar Brassagem de {recipe.name}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal: Nova Brassagem com Rastreabilidade de Insumos */}
      {newBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div>
              <h3 className="font-black text-lg text-slate-900 mb-0.5">Iniciar Nova Brassagem</h3>
              <p className="text-xs text-slate-500">
                Selecione a cerveja que vai brassar e adicione os insumos e lotes utilizados livremente na hora
              </p>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cerveja / Rótulo a Brassar *</label>
                  <select
                    value={recipeId}
                    onChange={(e) => handleRecipeChangeInBatch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.style})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número / Código do Lote *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: LOTE-2026-003"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Volume Previsto da Brassagem (L)</label>
                  <input
                    type="number"
                    required
                    value={volumePlanned}
                    onChange={(e) => handleVolumeChangeInBatch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanque de Destino / Fermentador</label>
                  <select
                    value={tankId}
                    onChange={(e) => setTankId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="">-- Sem Tanque (Alocar Depois) --</option>
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.capacityLiters}L) - {t.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SEÇÃO RASTREABILIDADE DE INSUMOS DA BRASSAGEM (DINÂMICA) */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-purple-950 font-black flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-purple-700" />
                      Insumos Utilizados nesta Brassagem ({batchIngredients.length})
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Adicione os maltes, lúpulos e leveduras que foram realmente para a panela/tanque
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => addIngredientRowToNewBatch('MALTE', 'MOSTURA')}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold"
                    >
                      + Malte
                    </button>
                    <button
                      type="button"
                      onClick={() => addIngredientRowToNewBatch('LUPULO', 'FERVURA_60MIN')}
                      className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-bold"
                    >
                      + Lúpulo
                    </button>
                    <button
                      type="button"
                      onClick={() => addIngredientRowToNewBatch('LEVEDURA', 'FERMENTACAO')}
                      className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded-lg text-[10px] font-bold"
                    >
                      + Levedura
                    </button>
                    <button
                      type="button"
                      onClick={() => addIngredientRowToNewBatch('OUTRO', 'MOSTURA')}
                      className="px-2 py-1 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-[10px] font-bold"
                    >
                      + Outro
                    </button>
                  </div>
                </div>

                {batchIngredients.length === 0 ? (
                  <div className="p-4 bg-white rounded-xl border border-purple-200 text-center text-[11px] text-slate-500 space-y-2">
                    <p className="font-bold">Nenhum insumo lançado nesta brassagem ainda.</p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => addIngredientRowToNewBatch('MALTE', 'MOSTURA')}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold"
                      >
                        + Adicionar Primeiro Insumo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto">
                    {batchIngredients.map((ing: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-purple-200/80 space-y-2 shadow-2xs">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <span className="text-[10px] text-slate-500 block font-bold">Insumo do Estoque</span>
                            <select
                              value={ing.inventoryItemId || ''}
                              onChange={(e) => updateIngredientInNewBatch(idx, 'inventoryItemId', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                            >
                              <option value="">-- Selecionar do Estoque ou Personalizar --</option>
                              {inventoryItems.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.name} ({it.category}) - R$ {it.costPerUnit}/{it.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block font-bold">Qtd Utilizada ({ing.unit})</span>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={ing.quantityUsed}
                                onChange={(e) => updateIngredientInNewBatch(idx, 'quantityUsed', e.target.value)}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                              />
                              <select
                                value={ing.unit}
                                onChange={(e) => updateIngredientInNewBatch(idx, 'unit', e.target.value)}
                                className="px-1.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-bold"
                              >
                                <option value="KG">KG</option>
                                <option value="G">G</option>
                                <option value="L">L</option>
                                <option value="ML">ML</option>
                                <option value="PACOTE">PCT</option>
                                <option value="UN">UN</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block font-bold">Etapa de Adição</span>
                            <select
                              value={ing.stage}
                              onChange={(e) => updateIngredientInNewBatch(idx, 'stage', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-[11px]"
                            >
                              <option value="MOSTURA">Mostura</option>
                              <option value="FERVURA_60MIN">Fervura 60m</option>
                              <option value="FERVURA_15MIN">Fervura 15m</option>
                              <option value="WHIRLPOOL">Whirlpool</option>
                              <option value="DRY_HOPPING">Dry Hopping</option>
                              <option value="FERMENTACAO">Fermentação</option>
                              <option value="MATURACAO">Maturação</option>
                            </select>
                          </div>
                        </div>

                        {/* Linha do Lote do Insumo e Fornecedor */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-purple-50">
                          <div className="sm:col-span-2">
                            <span className="text-[10px] text-purple-900 block font-black">Lote do Insumo em Estoque (Rastreabilidade MAPA) *</span>
                            {ing.availableLots && ing.availableLots.length > 0 ? (
                              <select
                                value={ing.inventoryLotId || ''}
                                onChange={(e) => updateIngredientInNewBatch(idx, 'inventoryLotId', e.target.value)}
                                className="w-full px-2 py-1 bg-purple-50 border border-purple-300 rounded-lg font-mono font-bold text-xs text-purple-950"
                              >
                                {ing.availableLots.map((lot: any) => (
                                  <option key={lot.id} value={lot.id}>
                                    Lote #{lot.lotNumber} ({lot.currentQuantity} {ing.unit} disp. {lot.supplier?.name ? `- ${lot.supplier.name}` : ''})
                                  </option>
                                ))}
                                <option value="">-- Digitar Lote Manual --</option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder="Digite o Lote do Fornecedor (ex: AGR-2026-081)"
                                value={ing.supplierLot || ''}
                                onChange={(e) => updateIngredientInNewBatch(idx, 'supplierLot', e.target.value.toUpperCase())}
                                className="w-full px-2 py-1 bg-purple-50 border border-purple-300 rounded-lg font-mono font-bold text-xs text-purple-950"
                              />
                            )}
                          </div>

                          {!ing.inventoryItemId && (
                            <div>
                              <span className="text-[10px] text-slate-500 block font-bold">Nome do Insumo</span>
                              <input
                                type="text"
                                placeholder="Ex: Lúpulo Citra T90"
                                value={ing.name}
                                onChange={(e) => updateIngredientInNewBatch(idx, 'name', e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span className="text-slate-500 truncate max-w-[250px]">
                            {ing.supplierName ? `Fornecedor: ${ing.supplierName}` : `Etapa: ${ing.stage}`}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700 font-bold">
                              Custo: {formatCurrency(ing.costPerUnit || 0)}/{ing.unit} (Total: {formatCurrency(ing.totalCost || 0)})
                            </span>
                            <button
                              type="button"
                              onClick={() => removeIngredientFromNewBatch(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                              title="Remover Insumo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Baixa Automática no Estoque & Recalcular Custo */}
                <div className="pt-2 border-t border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={batchDeductStock}
                      onChange={(e) => setBatchDeductStock(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="font-bold text-slate-800 text-xs">
                      Dar baixa automática no estoque de insumos
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={autoCalculateCostInNewBatch}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs self-end sm:self-auto"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Calcular Custo/L dos Insumos</span>
                  </button>
                </div>
              </div>

              {/* Cost per Liter Input */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-900">Preço de Custo Apurado da Cerveja</span>
                  <span className="text-[10px] text-amber-700">Calculado a partir dos insumos adicionados</span>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Custo por Litro (R$/L)</label>
                    <input
                      type="number"
                      step="0.10"
                      value={costPerLiter}
                      onChange={(e) => setCostPerLiter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-900"
                      placeholder="Ex: 4.80"
                    />
                  </div>
                  <div className="text-right pr-2">
                    <span className="text-[10px] text-slate-500 block">Custo Total Brassagem:</span>
                    <span className="text-base font-black text-rose-700">
                      {formatCurrency((parseFloat(volumePlanned) || 0) * (parseFloat(costPerLiter) || 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas da Brassagem</label>
                <textarea
                  rows={2}
                  placeholder="Observações da brassagem, correção de água, dry hopping previsto..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewBatchModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-md"
                >
                  Iniciar Brassagem & Rastrear Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Lote, Status & Insumos Utilizados (Sempre Editável) */}
      {editBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <span>Editar Lote #{editBatchModal.batchNumber}</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  {editBatchModal.recipe?.name} ({editBatchModal.recipe?.style}) • Ajuste de Etapas e Insumos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditBatchModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBatch} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Etapa de Produção (Status)</label>
                  <select
                    value={editBatchStatus}
                    onChange={(e) => setEditBatchStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="BRASSAGEM">BRASSAGEM</option>
                    <option value="FERMENTANDO">FERMENTANDO</option>
                    <option value="MATURANDO">MATURANDO</option>
                    <option value="PRONTO_ENVASE">PRONTO P/ ENVASE</option>
                    <option value="ENVASADO">ENVASADO</option>
                    <option value="FINALIZADO">FINALIZADO (Liberar Tanque)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanque Alocado</label>
                  <select
                    value={editBatchTankId}
                    onChange={(e) => setEditBatchTankId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="">-- Sem Tanque --</option>
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.capacityLiters}L)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Volume Real Produzido (L)</label>
                  <input
                    type="number"
                    value={editBatchVolumeProduced}
                    onChange={(e) => setEditBatchVolumeProduced(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* SEÇÃO INSUMOS DO LOTE (SEMPRE EDITÁVEIS) */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-purple-950 font-black flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-purple-700" />
                      Insumos Utilizados neste Lote ({editBatchIngredients.length})
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Adicione ou ajuste os insumos, quantidades e lotes utilizados a qualquer momento
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => addIngredientRowToEditBatch('MALTE', 'MOSTURA')}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold"
                    >
                      + Malte
                    </button>
                    <button
                      type="button"
                      onClick={() => addIngredientRowToEditBatch('LUPULO', 'FERVURA_60MIN')}
                      className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-bold"
                    >
                      + Lúpulo
                    </button>
                    <button
                      type="button"
                      onClick={() => addIngredientRowToEditBatch('LEVEDURA', 'FERMENTACAO')}
                      className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded-lg text-[10px] font-bold"
                    >
                      + Levedura
                    </button>
                    <button
                      type="button"
                      onClick={() => addIngredientRowToEditBatch('OUTRO', 'MOSTURA')}
                      className="px-2 py-1 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-[10px] font-bold"
                    >
                      + Outro
                    </button>
                  </div>
                </div>

                {editBatchIngredients.length === 0 ? (
                  <div className="p-3 bg-white rounded-xl border border-purple-200 text-center text-[11px] text-slate-400">
                    Nenhum insumo registrado para este lote. Clique nos botões acima para adicionar.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto">
                    {editBatchIngredients.map((ing: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-purple-200/80 space-y-2 shadow-2xs">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <span className="text-[10px] text-slate-500 block font-bold">Insumo</span>
                            <select
                              value={ing.inventoryItemId || ''}
                              onChange={(e) => updateIngredientInEditBatch(idx, 'inventoryItemId', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                            >
                              <option value="">-- Selecionar do Estoque ou Personalizar --</option>
                              {inventoryItems.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.name} ({it.category}) - R$ {it.costPerUnit}/{it.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block font-bold">Qtd ({ing.unit})</span>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={ing.quantityUsed}
                                onChange={(e) => updateIngredientInEditBatch(idx, 'quantityUsed', e.target.value)}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                              />
                              <select
                                value={ing.unit}
                                onChange={(e) => updateIngredientInEditBatch(idx, 'unit', e.target.value)}
                                className="px-1.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-bold"
                              >
                                <option value="KG">KG</option>
                                <option value="G">G</option>
                                <option value="L">L</option>
                                <option value="ML">ML</option>
                                <option value="PACOTE">PCT</option>
                                <option value="UN">UN</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block font-bold">Etapa</span>
                            <select
                              value={ing.stage}
                              onChange={(e) => updateIngredientInEditBatch(idx, 'stage', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-[11px]"
                            >
                              <option value="MOSTURA">Mostura</option>
                              <option value="FERVURA_60MIN">Fervura 60m</option>
                              <option value="FERVURA_15MIN">Fervura 15m</option>
                              <option value="WHIRLPOOL">Whirlpool</option>
                              <option value="DRY_HOPPING">Dry Hopping</option>
                              <option value="FERMENTACAO">Fermentação</option>
                              <option value="MATURACAO">Maturação</option>
                            </select>
                          </div>
                        </div>

                        {/* Lote do Insumo */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-purple-50">
                          <div className="sm:col-span-2">
                            <span className="text-[10px] text-purple-900 block font-black">Lote do Insumo (Rastreabilidade) *</span>
                            {ing.availableLots && ing.availableLots.length > 0 ? (
                              <select
                                value={ing.inventoryLotId || ''}
                                onChange={(e) => updateIngredientInEditBatch(idx, 'inventoryLotId', e.target.value)}
                                className="w-full px-2 py-1 bg-purple-50 border border-purple-300 rounded-lg font-mono font-bold text-xs text-purple-950"
                              >
                                {ing.availableLots.map((lot: any) => (
                                  <option key={lot.id} value={lot.id}>
                                    Lote #{lot.lotNumber} ({lot.currentQuantity} {ing.unit} disp. {lot.supplier?.name ? `- ${lot.supplier.name}` : ''})
                                  </option>
                                ))}
                                <option value="">-- Digitar Lote Manual --</option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder="Digite o Lote do Fornecedor (ex: AGR-2026-081)"
                                value={ing.supplierLot || ''}
                                onChange={(e) => updateIngredientInEditBatch(idx, 'supplierLot', e.target.value.toUpperCase())}
                                className="w-full px-2 py-1 bg-purple-50 border border-purple-300 rounded-lg font-mono font-bold text-xs text-purple-950"
                              />
                            )}
                          </div>

                          {!ing.inventoryItemId && (
                            <div>
                              <span className="text-[10px] text-slate-500 block font-bold">Nome do Insumo</span>
                              <input
                                type="text"
                                placeholder="Ex: Lúpulo Citra T90"
                                value={ing.name}
                                onChange={(e) => updateIngredientInEditBatch(idx, 'name', e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span className="text-slate-500 truncate max-w-[250px]">
                            {ing.supplierName ? `Fornecedor: ${ing.supplierName}` : `Etapa: ${ing.stage}`}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700 font-bold">
                              Custo: {formatCurrency(ing.costPerUnit || 0)}/{ing.unit} (Total: {formatCurrency(ing.totalCost || 0)})
                            </span>
                            <button
                              type="button"
                              onClick={() => removeIngredientFromEditBatch(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-purple-200 flex justify-end">
                  <button
                    type="button"
                    onClick={autoCalculateCostInEditBatch}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Recalcular Custo/L a partir dos Insumos</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custo por Litro Apurado (R$/L)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={editBatchCostPerLiter}
                    onChange={(e) => setEditBatchCostPerLiter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-rose-700"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Custo Total Apurado:</span>
                  <span className="text-base font-black text-slate-900">
                    {formatCurrency((parseFloat(editBatchVolumeProduced) || 0) * (parseFloat(editBatchCostPerLiter) || 0))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Anotações / Densidades</label>
                <textarea
                  rows={2}
                  value={editBatchNotes}
                  onChange={(e) => setEditBatchNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditBatchModal(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-md"
                >
                  Salvar Alterações do Lote & Insumos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova / Editar Receita com Insumos & Precificação */}
      {(newRecipeModal || editRecipeModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div>
              <h3 className="font-black text-lg text-slate-900 mb-0.5">
                {editRecipeModal ? 'Editar Cerveja (Rótulo)' : 'Cadastrar Nova Cerveja (Rótulo)'}
              </h3>
              <p className="text-xs text-slate-500">
                Cadastre o estilo, registros MAPA e parâmetros da cerveja. Os insumos reais e seus lotes podem ser inseridos livremente na hora de cada brassagem.
              </p>
            </div>

            <form onSubmit={editRecipeModal ? handleUpdateRecipe : handleCreateRecipe} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome da Cerveja *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Hop Storm IPA"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estilo Cervejeiro *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: American IPA"
                    value={recipeStyle}
                    onChange={(e) => setRecipeStyle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rendimento Padrão (L)</label>
                  <input
                    type="number"
                    value={recipeYieldLiters}
                    onChange={(e) => setRecipeYieldLiters(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-purple-900"
                    placeholder="Ex: 500"
                  />
                </div>
              </div>

              {/* Seção MAPA & Denominação Legal */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-emerald-950 font-black text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Conformidade & Registro MAPA do Produto</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nº Registro MAPA do Rótulo</label>
                    <input
                      type="text"
                      placeholder="Ex: MAPA RS 001234-5.000001"
                      value={recipeMapaRegistration}
                      onChange={(e) => setRecipeMapaRegistration(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono font-bold text-emerald-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Denominação Comercial MAPA</label>
                    <input
                      type="text"
                      placeholder="Ex: Cerveja Puro Malte Clara tipo IPA"
                      value={recipeCommercialDenomination}
                      onChange={(e) => setRecipeCommercialDenomination(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Metas Físico-Químicas & pH Alvo */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                  Metas Físico-Químicas & pH Alvo da Receita:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">OG Alvo (Dens. Inicial)</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="1.054"
                      value={recipeOg}
                      onChange={(e) => setRecipeOg(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">FG Alvo (Dens. Final)</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="1.010"
                      value={recipeFg}
                      onChange={(e) => setRecipeFg(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">ABV Alvo (% Álcool)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="6.5"
                      value={abv}
                      onChange={(e) => setAbv(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">IBU (Amargor)</label>
                    <input
                      type="number"
                      placeholder="55"
                      value={ibu}
                      onChange={(e) => setIbu(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Cor Alvo (EBC / SRM)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="12.0"
                      value={recipeEbc}
                      onChange={(e) => setRecipeEbc(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">pH Alvo Mostura (Inicial)</label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder="5.20"
                      value={recipeTargetPhMash}
                      onChange={(e) => setRecipeTargetPhMash(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-purple-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">pH Alvo Cerveja Pronta</label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder="4.20"
                      value={recipeTargetPhFinal}
                      onChange={(e) => setRecipeTargetPhFinal(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-purple-900"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO INSUMOS DA RECEITA */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-950 font-black">
                    <Layers className="w-4 h-4 text-purple-700" />
                    <span>Insumos Padrão (Opcional) ({recipeIngredients.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={autoCalculateRecipeCostFromIngredients}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs"
                      title="Calcular custo por litro considerando o rendimento padrão"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Calcular Custo/L</span>
                    </button>
                    <button
                      type="button"
                      onClick={addRecipeIngredientRow}
                      className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-[10px] font-bold"
                    >
                      + Insumo
                    </button>
                  </div>
                </div>

                {recipeIngredients.length === 0 ? (
                  <div className="p-3 bg-white rounded-xl border border-purple-200 text-center text-[11px] text-slate-400">
                    Nenhum ingrediente adicionado. Clique em &quot;+ Insumo&quot; para compor sua receita.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {recipeIngredients.map((ing: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-white rounded-xl border border-purple-200/80 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <span className="text-[10px] text-slate-400 block font-bold">Selecionar Insumo do Estoque:</span>
                            <select
                              value={ing.inventoryItemId || ''}
                              onChange={(e) => updateRecipeIngredientRow(idx, 'inventoryItemId', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                            >
                              <option value="">-- Insumo Personalizado / Digitar --</option>
                              {inventoryItems.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.name} ({it.category}) - R$ {it.costPerUnit}/{it.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Qtd na Brassagem ({recipeYieldLiters}L)</span>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={ing.amount}
                                onChange={(e) => updateRecipeIngredientRow(idx, 'amount', e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                              />
                              <select
                                value={ing.unit}
                                onChange={(e) => updateRecipeIngredientRow(idx, 'unit', e.target.value)}
                                className="px-1.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-bold"
                              >
                                <option value="KG">KG</option>
                                <option value="G">G</option>
                                <option value="L">L</option>
                                <option value="ML">ML</option>
                                <option value="PACOTE">PCT</option>
                                <option value="UN">UN</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Etapa de Adição</span>
                            <select
                              value={ing.stage}
                              onChange={(e) => updateRecipeIngredientRow(idx, 'stage', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold"
                            >
                              <option value="MOSTURA">Mostura</option>
                              <option value="FERVURA_60MIN">Fervura 60m</option>
                              <option value="FERVURA_15MIN">Fervura 15m</option>
                              <option value="WHIRLPOOL">Whirlpool</option>
                              <option value="DRY_HOPPING">Dry Hopping</option>
                              <option value="FERMENTACAO">Fermentação</option>
                              <option value="MATURACAO">Maturação</option>
                            </select>
                          </div>
                        </div>

                        {!ing.inventoryItemId && (
                          <div>
                            <input
                              type="text"
                              placeholder="Nome do Insumo Personalizado (ex: Lúpulo Mosaic, Malte Munich)"
                              value={ing.name}
                              onChange={(e) => updateRecipeIngredientRow(idx, 'name', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span className="text-slate-500 font-semibold">
                            Custo: R$ {(parseFloat(ing.costPerUnit) || 0).toFixed(2)}/{ing.unit} (Subtotal: {formatCurrency((parseFloat(ing.amount) || 0) * (parseFloat(ing.costPerUnit) || 0))})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRecipeIngredientRow(idx)}
                            className="text-rose-500 hover:text-rose-700 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Precificação Inteligente */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-purple-950 font-black">
                  <Calculator className="w-4 h-4 text-purple-600" />
                  <span>Regra de Precificação e Preço de Venda</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Preço de Custo (R$/Litro)</label>
                    <input
                      type="number"
                      step="0.10"
                      value={recipeCostPerLiter}
                      onChange={(e) => setRecipeCostPerLiter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Modelo de Preço</label>
                    <select
                      value={pricingModel}
                      onChange={(e) => setPricingModel(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold"
                    >
                      <option value="MANUAL">Preço Manual Fixo</option>
                      <option value="AT_COST">A Preço de Custo (Venda = Custo)</option>
                      <option value="MARKUP">Margem de Lucro % (Markup)</option>
                      <option value="BY_STYLE">Tabela de Preço por Estilo</option>
                    </select>
                  </div>
                </div>

                {pricingModel === 'MARKUP' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Margem de Lucro (%)</label>
                    <input
                      type="number"
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold"
                      placeholder="Ex: 150%"
                    />
                  </div>
                )}

                {pricingModel === 'BY_STYLE' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Categoria de Estilo na Tabela</label>
                    <select
                      value={styleCategory}
                      onChange={(e) => setStyleCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold"
                    >
                      <option value="STANDARD">Standard (Pilsen / Lager) - R$ 16,00/L</option>
                      <option value="PREMIUM">Premium (IPA / APA / Weizen) - R$ 22,00/L</option>
                      <option value="ESPECIAL">Especial (Sour / Stout / Belgian) - R$ 28,00/L</option>
                      <option value="HIGH_GRAVITY">High Gravity (Imperial Stout / Barleywine) - R$ 34,00/L</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Preço Final de Venda por Litro (R$/L)</label>
                  <input
                    type="number"
                    step="0.50"
                    disabled={pricingModel === 'AT_COST' || pricingModel === 'BY_STYLE'}
                    value={salePricePerLiter}
                    onChange={(e) => setSalePricePerLiter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-purple-400 rounded-xl font-black text-emerald-800 text-sm"
                  />
                </div>

                {/* Live Preview of Keg Prices */}
                <div className="pt-2 border-t border-purple-200">
                  <span className="text-[10px] font-black uppercase text-purple-900 block mb-1">
                    Preço Calculado por Barril:
                  </span>
                  <div className="grid grid-cols-4 gap-1 text-center text-[11px] font-bold">
                    <span className="bg-white p-1 rounded border border-purple-200">10L: {formatCurrency((parseFloat(salePricePerLiter) || 0) * 10)}</span>
                    <span className="bg-white p-1 rounded border border-purple-200">20L: {formatCurrency((parseFloat(salePricePerLiter) || 0) * 20)}</span>
                    <span className="bg-white p-1 rounded border border-purple-200">30L: {formatCurrency((parseFloat(salePricePerLiter) || 0) * 30)}</span>
                    <span className="bg-white p-1 rounded border border-purple-200 text-amber-800 font-black">50L: {formatCurrency((parseFloat(salePricePerLiter) || 0) * 50)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas do Cervejeiro / Perfil Sensorial</label>
                <textarea
                  rows={2}
                  placeholder="Instruções de brassagem, perfil de água, maltes especiais..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setNewRecipeModal(false);
                    setEditRecipeModal(null);
                  }}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm"
                >
                  {editRecipeModal ? 'Salvar Alterações da Receita' : 'Cadastrar Receita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Tanque */}
      {newTankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-4">Cadastrar Novo Tanque</h3>
            <form onSubmit={handleCreateTank} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome / Identificação do Tanque</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: F-03 (1000L) ou BBT-02"
                  value={tankName}
                  onChange={(e) => setTankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Capacidade (Litros)</label>
                  <input
                    type="number"
                    required
                    placeholder="1000"
                    value={tankCapacity}
                    onChange={(e) => setTankCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Tipo do Tanque (Livre)</span>
                    <span className="text-[9px] text-slate-400 font-normal">Digite ou selecione</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Fermentador, BBT, Tina de Mostura..."
                    value={tankType}
                    onChange={(e) => setTankType(e.target.value)}
                    list="new-tank-types-list"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                  <datalist id="new-tank-types-list">
                    <option value="Fermentador Isotérmico" />
                    <option value="Fermentador Cônico" />
                    <option value="Maturador" />
                    <option value="Brite Tank (BBT)" />
                    <option value="Panela de Brassagem" />
                    <option value="Tina de Mostura" />
                    <option value="Tina de Fervura" />
                    <option value="Whirlpool" />
                    <option value="Tanque de Servir / Pressurizado" />
                    <option value="Barril de Maturação em Madeira" />
                  </datalist>
                </div>
              </div>

              {/* Quick Preset Buttons for Tank Types */}
              <div>
                <span className="text-[10px] text-slate-500 font-bold block mb-1">Sugestões rápidas de tipos:</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    'Fermentador Isotérmico',
                    'Fermentador Cônico',
                    'Maturador',
                    'Brite Tank (BBT)',
                    'Panela de Brassagem',
                    'Tina de Mostura',
                    'Whirlpool',
                    'Tanque de Servir',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTankType(preset)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                        tankType.toLowerCase() === preset.toLowerCase()
                          ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Fabricante, pressão máxima, etc."
                  value={tankNotes}
                  onChange={(e) => setTankNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewTankModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Salvar Tanque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Tanque & Gerenciar Lote / Envase */}
      {editTankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-2xl border border-purple-200">
                  <Cylinder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Editar Tanque & Gestão de Lote</h3>
                  <p className="text-xs text-slate-500">
                    Tanque <strong className="text-slate-900">{editTankModal.name}</strong> ({editTankModal.capacityLiters}L)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditTankModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTankEdit} className="space-y-4 text-xs">
              {/* Seção 1: Dados do Tanque */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                  1. Configuração do Tanque
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nome / Tag do Tanque</label>
                    <input
                      type="text"
                      required
                      value={editTankName}
                      onChange={(e) => setEditTankName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Capacidade (Litros)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editTankCapacity}
                      onChange={(e) => setEditTankCapacity(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Tipo do Tanque (Livre)</span>
                      <span className="text-[9px] text-slate-400 font-normal">Digite ou selecione</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Fermentador, BBT, Tina de Mostura..."
                      value={editTankType}
                      onChange={(e) => setEditTankType(e.target.value)}
                      list="edit-tank-types-list"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                    <datalist id="edit-tank-types-list">
                      <option value="Fermentador Isotérmico" />
                      <option value="Fermentador Cônico" />
                      <option value="Maturador" />
                      <option value="Brite Tank (BBT)" />
                      <option value="Panela de Brassagem" />
                      <option value="Tina de Mostura" />
                      <option value="Tina de Fervura" />
                      <option value="Whirlpool" />
                      <option value="Tanque de Servir / Pressurizado" />
                      <option value="Barril de Maturação em Madeira" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status Operacional</label>
                    <select
                      value={editTankStatus}
                      onChange={(e) => setEditTankStatus(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl font-black border ${
                        editTankStatus === 'LIVRE'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : editTankStatus === 'OCUPADO'
                          ? 'bg-purple-50 text-purple-900 border-purple-300'
                          : editTankStatus === 'HIGIENIZANDO'
                          ? 'bg-blue-50 text-blue-900 border-blue-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}
                    >
                      <option value="LIVRE">🟢 LIVRE (Vazio / Pronto)</option>
                      <option value="OCUPADO">🟣 OCUPADO (Em Produção)</option>
                      <option value="HIGIENIZANDO">🔵 HIGIENIZANDO (CIP / Limpeza)</option>
                      <option value="MANUTENCAO">🟡 MANUTENÇÃO</option>
                    </select>
                  </div>
                </div>

                {/* Quick Preset Buttons for Edit Tank Types */}
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">Sugestões rápidas de tipos:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Fermentador Isotérmico',
                      'Fermentador Cônico',
                      'Maturador',
                      'Brite Tank (BBT)',
                      'Panela de Brassagem',
                      'Tina de Mostura',
                      'Whirlpool',
                      'Tanque de Servir',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditTankType(preset)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                          editTankType.toLowerCase() === preset.toLowerCase()
                            ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seção 2: Lote Vinculado ao Tanque & Previsão de Envase */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 block">
                  2. Lote Alocado & Controle de Envase
                </span>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lote de Produção no Tanque
                  </label>
                  <select
                    value={editTankBatchId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setEditTankBatchId(newId);
                      if (newId) {
                        setEditTankStatus('OCUPADO');
                        const b = batches.find((x) => x.id === newId);
                        if (b) {
                          setEditTankPackagingDate(b.packagingDate ? new Date(b.packagingDate).toISOString().split('T')[0] : '');
                          setEditTankBatchStatus(b.status || 'FERMENTANDO');
                          setEditTankFermentationStartDate(b.fermentationStartDate ? new Date(b.fermentationStartDate).toISOString().split('T')[0] : (b.brewDate ? new Date(b.brewDate).toISOString().split('T')[0] : ''));
                          setEditTankVolumeProduced(String(b.volumeProducedLiters || b.volumePlannedLiters || ''));
                          setEditTankMeasuredOg(String(b.measuredOg || ''));
                          setEditTankMeasuredFg(String(b.measuredFg || ''));
                          setEditTankMeasuredAbv(String(b.measuredAbv || ''));
                        }
                      } else {
                        setEditTankStatus('LIVRE');
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold"
                  >
                    <option value="">-- Nenhum Lote / Tanque Vazio --</option>
                    {batches
                      .filter((b) => b.status !== 'FINALIZADO' || b.tankId === editTankModal.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          🍺 {b.recipe?.name || 'Cerveja'} ({b.batchNumber}) - {b.volumePlannedLiters}L [{b.status}]
                        </option>
                      ))}
                  </select>
                </div>

                {editTankBatchId && (
                  <div className="space-y-3 pt-2 border-t border-purple-200/80">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Fase da Produção</label>
                        <select
                          value={editTankBatchStatus}
                          onChange={(e) => setEditTankBatchStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold"
                        >
                          <option value="BRASSAGEM">BRASSAGEM (Fervura/Mosto)</option>
                          <option value="FERMENTANDO">FERMENTANDO (Atenuação)</option>
                          <option value="MATURANDO">MATURANDO (Aromas/Sabor)</option>
                          <option value="PRONTO_ENVASE">PRONTO P/ ENVASE (Cold Crash)</option>
                          <option value="ENVASADO">ENVASADO</option>
                          <option value="FINALIZADO">FINALIZADO (Liberar)</option>
                        </select>
                      </div>

                      {/* Previsão de Envase */}
                      <div>
                        <label className="block font-bold text-purple-950 mb-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-purple-600" />
                          <span>Previsão de Envase</span>
                        </label>
                        <input
                          type="date"
                          value={editTankPackagingDate}
                          onChange={(e) => setEditTankPackagingDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-purple-400 rounded-xl font-black text-purple-950"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Início da Fermentação</label>
                        <input
                          type="date"
                          value={editTankFermentationStartDate}
                          onChange={(e) => setEditTankFermentationStartDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Volume Real no Tanque (L)</label>
                        <input
                          type="number"
                          step="1"
                          placeholder="Ex: 950"
                          value={editTankVolumeProduced}
                          onChange={(e) => setEditTankVolumeProduced(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                        />
                      </div>
                    </div>

                    {/* Parâmetros Cervejeiros (OG, FG, ABV) */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-200/60">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">OG Medida</label>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="Ex: 1.054"
                          value={editTankMeasuredOg}
                          onChange={(e) => setEditTankMeasuredOg(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">FG Medida</label>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="Ex: 1.010"
                          value={editTankMeasuredFg}
                          onChange={(e) => setEditTankMeasuredFg(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ABV (% Álcool)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Ex: 5.8"
                          value={editTankMeasuredAbv}
                          onChange={(e) => setEditTankMeasuredAbv(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações do Tanque / Histórico</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais, dry hopping, controle de pressão..."
                  value={editTankNotes}
                  onChange={(e) => setEditTankNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditTankModal(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTank}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingTank ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: FICHA DE ACOMPANHAMENTO DE PROCESSO, QUALIDADE & MAPA */}
      {batchQualityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-5 print:p-0 print:border-none print:shadow-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:border-slate-300">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 text-purple-800 flex items-center justify-center print:hidden">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                    <span>Ficha de Acompanhamento & MAPA</span>
                    <span className="font-mono text-xs px-2.5 py-0.5 bg-purple-100 text-purple-900 rounded-full font-black">
                      Lote #{batchQualityModal.batchNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    🍺 {batchQualityModal.recipe?.name} ({batchQualityModal.recipe?.style}) • Tanque {batchQualityModal.tank?.name || 'Não alocado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-purple-700" />
                  <span>Imprimir Ficha MAPA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBatchQualityModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveBatchQuality} className="space-y-4 text-xs">
              {/* Seção 1: Status & Dados Gerais MAPA */}
              <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  1. Dados Gerais da Brassagem & Registro MAPA
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status da Produção *</label>
                    <select
                      value={qStatus}
                      onChange={(e) => setQStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold text-purple-950"
                    >
                      <option value="BRASSAGEM">BRASSAGEM</option>
                      <option value="FERMENTANDO">FERMENTANDO</option>
                      <option value="MATURANDO">MATURANDO</option>
                      <option value="PRONTO_ENVASE">PRONTO P/ ENVASE</option>
                      <option value="ENVASADO">ENVASADO</option>
                      <option value="FINALIZADO">FINALIZADO (Liberar Tanque)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tanque / Fermentador</label>
                    <select
                      value={qTankId}
                      onChange={(e) => setQTankId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold text-slate-800"
                    >
                      <option value="">-- Sem Tanque --</option>
                      {tanks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.capacityLiters}L - {t.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Volume Real Produzido (L)</label>
                    <input
                      type="number"
                      step="1"
                      value={qVolumeProduced}
                      onChange={(e) => setQVolumeProduced(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-black text-slate-900"
                      placeholder="Ex: 500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-100">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nº Registro MAPA do Rótulo</label>
                    <input
                      type="text"
                      placeholder="Ex: RS 001234-5.000001"
                      value={qMapaRegistration}
                      onChange={(e) => setQMapaRegistration(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-mono font-bold text-purple-950"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Denominação Comercial MAPA</label>
                    <input
                      type="text"
                      placeholder="Ex: Cerveja Puro Malte Clara tipo IPA"
                      value={qCommercialDenomination}
                      onChange={(e) => setQCommercialDenomination(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Responsável Técnico (CRQ / Nome)</label>
                    <input
                      type="text"
                      placeholder="Ex: Pedro Cardoso - CRQ 05102938"
                      value={qTechnicalResponsible}
                      onChange={(e) => setQTechnicalResponsible(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Parâmetros Físico-Químicos & Cálculo de ABV / Atenuação */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-purple-600" />
                    2. Parâmetros Físico-Químicos & Densidades
                  </span>
                  <span className="text-[10px] text-purple-800 font-bold bg-purple-100 px-2 py-0.5 rounded-md">
                    Cálculo Automático de ABV & Atenuação
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">OG Medida (Dens. Inicial)</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="1.054"
                      value={qMeasuredOg}
                      onChange={(e) => handleOgFgChange(e.target.value, qMeasuredFg)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-purple-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">FG Medida (Dens. Final)</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="1.010"
                      value={qMeasuredFg}
                      onChange={(e) => handleOgFgChange(qMeasuredOg, e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-purple-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Teor Alcoólico Real (ABV % v/v)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="5.8"
                      value={qMeasuredAbv}
                      onChange={(e) => setQMeasuredAbv(e.target.value)}
                      className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl font-black text-emerald-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Atenuação Aparente (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="81.5"
                      value={qAttenuation}
                      onChange={(e) => setQAttenuation(e.target.value)}
                      className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl font-black text-emerald-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">IBU Real Medido (Amargor)</label>
                    <input
                      type="number"
                      placeholder="55"
                      value={qMeasuredIbu}
                      onChange={(e) => setQMeasuredIbu(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">EBC Real Medido (Cor SRM/EBC)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="12.0"
                      value={qMeasuredEbc}
                      onChange={(e) => setQMeasuredEbc(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Controle Completo de pH do Processo */}
              <div className="p-4 bg-purple-50/40 border border-purple-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                  3. Curva de Controle de pH por Etapa de Fabricação
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-white rounded-xl border border-purple-200">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">pH Mostura (Inicial)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="5.20 - 5.40"
                      value={qPhMash}
                      onChange={(e) => setQPhMash(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-purple-900"
                    />
                    <span className="text-[9px] text-slate-400 block mt-1">Alvo ideal: 5.2 - 5.4</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-purple-200">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">pH Pós-Fervura / Whirlpool</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="5.00 - 5.20"
                      value={qPhBoil}
                      onChange={(e) => setQPhBoil(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-purple-900"
                    />
                    <span className="text-[9px] text-slate-400 block mt-1">Alvo ideal: 5.0 - 5.2</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-purple-200">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">pH Início Fermentação</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="4.90 - 5.10"
                      value={qPhFermentationStart}
                      onChange={(e) => setQPhFermentationStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-purple-900"
                    />
                    <span className="text-[9px] text-slate-400 block mt-1">Momento do pitch</span>
                  </div>

                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-300">
                    <label className="block text-[10px] font-black text-emerald-950 mb-1">pH Cerveja Pronta (Envase)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="4.10 - 4.40"
                      value={qPhFinal}
                      onChange={(e) => setQPhFinal(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg font-black text-emerald-900"
                    />
                    <span className="text-[9px] text-emerald-700 block mt-1 font-bold">Alvo: 4.1 - 4.4 (Sour &lt; 3.8)</span>
                  </div>
                </div>
              </div>

              {/* Seção 4: Temperaturas de Processo & Controle da Levedura */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-purple-600" />
                  4. Controle Térmico (°C) & Rastreabilidade de Levedura
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Temp. Mostura (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="66.0"
                      value={qTempMash}
                      onChange={(e) => setQTempMash(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Temp. Fermentação (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="18.0"
                      value={qTempFermentation}
                      onChange={(e) => setQTempFermentation(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Temp. Maturação / Cold Crash (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="0.0"
                      value={qTempMaturation}
                      onChange={(e) => setQTempMaturation(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Cepa da Levedura (Strain)</label>
                    <input
                      type="text"
                      placeholder="Ex: US-05 / W-34/70 / Verdant"
                      value={qYeastStrain}
                      onChange={(e) => setQYeastStrain(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Geração da Levedura</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={qYeastGeneration}
                      onChange={(e) => setQYeastGeneration(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Lote da Levedura</label>
                    <input
                      type="text"
                      placeholder="Ex: LEV-2026-081"
                      value={qYeastLot}
                      onChange={(e) => setQYeastLot(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 5: Datas de Produção */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  5. Cronograma & Datas de Etapas
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Data Brassagem</label>
                    <input
                      type="date"
                      value={qBrewDate}
                      onChange={(e) => setQBrewDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Início Fermentação</label>
                    <input
                      type="date"
                      value={qFermentationStartDate}
                      onChange={(e) => setQFermentationStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Início Maturação</label>
                    <input
                      type="date"
                      value={qMaturationStartDate}
                      onChange={(e) => setQMaturationStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Previsão / Data Envase</label>
                    <input
                      type="date"
                      value={qPackagingDate}
                      onChange={(e) => setQPackagingDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-xl font-bold text-purple-950"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 6: Avaliação Sensorial & Notas */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                  6. Análise Sensorial & Liberação do Lote (MAPA / Qualidade)
                </span>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Perfil Sensorial / Análise de Conformidade</label>
                  <textarea
                    rows={2}
                    placeholder="Aroma limpo, perfil cítrico/floral evidente, amargor redondo sem adstringência, turbidez adequada, ausência de off-flavors..."
                    value={qSensoryNotes}
                    onChange={(e) => setQSensoryNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Observações Técnicas Gerais do Tanque</label>
                  <textarea
                    rows={2}
                    placeholder="Dry hopping realizado no dia X, purga de levedura concluída, clarificação OK..."
                    value={qNotes}
                    onChange={(e) => setQNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Seção 7: Matérias-Primas Rastreáveis Cadastradas no Lote */}
              {batchQualityModal.ingredients && batchQualityModal.ingredients.length > 0 && (
                <div className="p-4 bg-purple-50/30 border border-purple-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-purple-700" />
                      Insumos & Lotes de Fornecedores Rastreáveis ({batchQualityModal.ingredients.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setBatchTraceabilityModal(batchQualityModal)}
                      className="text-[10px] text-purple-700 font-bold hover:underline"
                    >
                      Ver Tabela Completa
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                    {batchQualityModal.ingredients.map((ing: any, iIdx: number) => (
                      <div key={iIdx} className="bg-white p-2 rounded-xl border border-purple-100 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800 truncate">• {ing.name} ({ing.quantityUsed} {ing.unit})</span>
                        <span className="font-mono font-black text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                          {ing.supplierLot || 'S/ Lote'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 print:hidden">
                <button
                  type="button"
                  onClick={() => setBatchQualityModal(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir</span>
                  </button>

                  <button
                    type="submit"
                    disabled={savingBatchQuality}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-1.5 disabled:opacity-50 transition-all"
                  >
                    {savingBatchQuality ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Salvar Ficha de Acompanhamento & MAPA</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: FICHA DE RASTREABILIDADE DO LOTE (MAPA & QUALIDADE) */}
      {batchTraceabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4 print:p-0 print:border-none print:shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:border-slate-300">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center print:hidden">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                    <span>Ficha de Rastreabilidade do Lote</span>
                    <span className="font-mono text-xs px-2.5 py-0.5 bg-purple-100 text-purple-900 rounded-full font-black">
                      #{batchTraceabilityModal.batchNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    {batchTraceabilityModal.recipe?.name} ({batchTraceabilityModal.recipe?.style}) • Controle de Qualidade & MAPA
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-purple-700" />
                  <span>Imprimir Ficha</span>
                </button>
                <button
                  onClick={() => setBatchTraceabilityModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cabeçalho do Lote */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Dados Gerais da Brassagem:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">Data da Brassagem</span>
                  <span className="font-bold text-slate-900">{formatDate(batchTraceabilityModal.brewDate)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">Tanque de Origem</span>
                  <span className="font-bold text-blue-700">{batchTraceabilityModal.tank?.name || 'Não alocado'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">Volume Produzido</span>
                  <span className="font-black text-slate-900">
                    {batchTraceabilityModal.volumeProducedLiters || batchTraceabilityModal.volumePlannedLiters} Litros
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">Status Atual</span>
                  <span className="font-black text-emerald-700">{batchTraceabilityModal.status}</span>
                </div>
              </div>
            </div>

            {/* TABELA DE MATÉRIAS-PRIMAS & INSUMOS (CHAVE DA RASTREABILIDADE) */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-700" />
                Matérias-Primas Utilizadas & Lotes dos Fornecedores ({batchTraceabilityModal.ingredients?.length || 0}):
              </span>

              {(!batchTraceabilityModal.ingredients || batchTraceabilityModal.ingredients.length === 0) ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                  Nenhum insumo registrado especificamente para este lote no momento da criação.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-purple-50/80 text-purple-950 font-black text-[10px] uppercase tracking-wider border-b border-purple-200">
                      <tr>
                        <th className="p-2.5">Insumo / Matéria-Prima</th>
                        <th className="p-2.5">Categoria</th>
                        <th className="p-2.5">Qtd Utilizada</th>
                        <th className="p-2.5">Fornecedor</th>
                        <th className="p-2.5">Lote do Insumo *</th>
                        <th className="p-2.5">Validade</th>
                        <th className="p-2.5 text-right">Custo Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {batchTraceabilityModal.ingredients.map((ing: any) => (
                        <tr key={ing.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">
                            {ing.name}
                            {ing.stage && <span className="text-[10px] text-slate-400 block">({ing.stage})</span>}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold">
                              {ing.category}
                            </span>
                          </td>
                          <td className="p-2.5 font-black text-slate-900">
                            {ing.quantityUsed} {ing.unit}
                          </td>
                          <td className="p-2.5 text-slate-700">
                            {ing.supplierName || ing.supplier?.name || 'Não vinculado'}
                          </td>
                          <td className="p-2.5">
                            <span className="font-mono font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {ing.supplierLot || 'N/A'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">
                            {ing.expirationDate ? formatDate(ing.expirationDate) : (ing.harvestYear ? `Safra ${ing.harvestYear}` : '-')}
                          </td>
                          <td className="p-2.5 text-right font-black text-slate-900">
                            {formatCurrency(ing.totalCost || (ing.quantityUsed * (ing.costPerUnit || 0)))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* BARRIS ENVASADOS DESTE LOTE */}
            {batchTraceabilityModal.kegs && batchTraceabilityModal.kegs.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Cylinder className="w-4 h-4 text-slate-600" />
                  Barris Físicos Envasados a partir deste Lote ({batchTraceabilityModal.kegs.length}):
                </span>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  {batchTraceabilityModal.kegs.map((k: any) => (
                    <span
                      key={k.id}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5"
                    >
                      <span>{k.code} ({k.capacity}L)</span>
                      <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {k.status}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer / Assinatura */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="italic">
                PintTech • Relatório de Rastreabilidade e Boas Práticas de Fabricação (BPF)
              </span>
              <button
                type="button"
                onClick={() => setBatchTraceabilityModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl print:hidden"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
