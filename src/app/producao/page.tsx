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

  // Filters for Tanks Tab
  const [tankStatusFilter, setTankStatusFilter] = useState('ALL');
  const [tankSearch, setTankSearch] = useState('');

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

  // New / Edit recipe form
  const [recipeName, setRecipeName] = useState('');
  const [recipeStyle, setRecipeStyle] = useState('American IPA');
  const [abv, setAbv] = useState('6.5');
  const [ibu, setIbu] = useState('55');
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
        }),
      });
      if (res.ok) {
        setEditBatchModal(null);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditBatchModal = (batch: any) => {
    setEditBatchModal(batch);
    setEditBatchStatus(batch.status || 'BRASSAGEM');
    setEditBatchCostPerLiter(String(batch.costPerLiter || '0'));
    setEditBatchVolumeProduced(String(batch.volumeProducedLiters || batch.volumePlannedLiters || '500'));
    setEditBatchTankId(batch.tankId || '');
    setEditBatchNotes(batch.notes || '');
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

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipeName,
          style: recipeStyle,
          abv,
          ibu,
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
          abv,
          ibu,
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

  const openEditRecipeModal = (r: any) => {
    setEditRecipeModal(r);
    setRecipeName(r.name || '');
    setRecipeStyle(r.style || '');
    setAbv(String(r.abv || '5.0'));
    setIbu(String(r.ibu || '20'));
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
          Tabela de Preços & Receitas ({recipes.length})
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

                      {/* Botão Ficha de Rastreabilidade */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setBatchTraceabilityModal(batch)}
                          className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>Ficha de Rastreabilidade ({batch.ingredients?.length || 0} Insumos)</span>
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

                            {/* Measured Parameters */}
                            {(activeBatch.measuredOg || activeBatch.measuredFg || activeBatch.measuredAbv) && (
                              <div className="flex items-center gap-2 pt-2 border-t border-purple-200/60 text-[10px] font-bold text-purple-900 flex-wrap">
                                {activeBatch.measuredOg && <span>OG: {activeBatch.measuredOg}</span>}
                                {activeBatch.measuredFg && <span>• FG: {activeBatch.measuredFg}</span>}
                                {activeBatch.measuredAbv && <span>• {activeBatch.measuredAbv}% ABV</span>}
                              </div>
                            )}
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
      {activeTab === 'RECIPES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => {
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

            const maltCount = (recipe.ingredients || []).filter((i: any) => i.category === 'MALTE').length;
            const hopCount = (recipe.ingredients || []).filter((i: any) => i.category === 'LUPULO').length;
            const yeastCount = (recipe.ingredients || []).filter((i: any) => i.category === 'LEVEDURA').length;
            const otherCount = (recipe.ingredients || []).filter((i: any) => !['MALTE', 'LUPULO', 'LEVEDURA'].includes(i.category)).length;

            return (
              <div
                key={recipe.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-purple-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 text-base">{recipe.name}</h3>
                      <p className="text-xs font-bold text-purple-700">{recipe.style}</p>
                    </div>
                    <button
                      onClick={() => openEditRecipeModal(recipe)}
                      className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                      title="Editar Receita & Insumos"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Pricing Badges */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                      {modelLabel}
                    </span>
                    {costL > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Custo: {formatCurrency(costL)}/L
                      </span>
                    )}
                    <span className="text-[11px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Venda: {formatCurrency(saleL)}/L
                    </span>
                  </div>

                  {/* Insumos da Receita Badge & Summary */}
                  <div className="mt-3 p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-purple-700" />
                        Insumos da Receita:
                      </span>
                      <span className="text-[10px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                        {recipe.ingredients?.length || 0} cadastrados
                      </span>
                    </div>

                    {(recipe.ingredients && recipe.ingredients.length > 0) ? (
                      <div className="space-y-1 pt-1 border-t border-purple-100 text-[11px]">
                        {recipe.ingredients.slice(0, 3).map((ing: any, iIdx: number) => (
                          <div key={iIdx} className="flex items-center justify-between text-slate-700">
                            <span className="truncate font-semibold">• {ing.name} ({ing.stage})</span>
                            <span className="font-bold text-slate-900">{ing.amount} {ing.unit}</span>
                          </div>
                        ))}
                        {recipe.ingredients.length > 3 && (
                          <span className="text-[10px] text-purple-700 font-bold block text-right">
                            + {recipe.ingredients.length - 3} outros insumos
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic block">
                        Clique em editar para cadastrar os insumos desta receita.
                      </span>
                    )}
                  </div>

                  {/* Calculated Keg Pricing Table */}
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Tabela de Preços por Barril:
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 block">10 Litros</span>
                        <span className="text-xs font-black text-slate-900">{formatCurrency(saleL * 10)}</span>
                      </div>
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 block">20 Litros</span>
                        <span className="text-xs font-black text-slate-900">{formatCurrency(saleL * 20)}</span>
                      </div>
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 block">30 Litros</span>
                        <span className="text-xs font-black text-slate-900">{formatCurrency(saleL * 30)}</span>
                      </div>
                      <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-300">
                        <span className="text-[9px] font-bold text-amber-700 block">50 Litros</span>
                        <span className="text-xs font-black text-amber-900">{formatCurrency(saleL * 50)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center text-xs">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">ABV</span>
                      <span className="font-black text-slate-800">{recipe.abv || '-'}%</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">IBU</span>
                      <span className="font-black text-slate-800">{recipe.ibu || '-'}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">Lotes</span>
                      <span className="font-black text-purple-700">{recipe._count?.batches || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Nova Brassagem com Rastreabilidade de Insumos */}
      {newBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div>
              <h3 className="font-black text-lg text-slate-900 mb-0.5">Iniciar Nova Brassagem</h3>
              <p className="text-xs text-slate-500">Cadastre o lote, confirme os lotes de insumos utilizados e faça a baixa no estoque</p>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Receita da Cerveja</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Número / Código do Lote</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Volume Previsto (L)</label>
                  <input
                    type="number"
                    required
                    value={volumePlanned}
                    onChange={(e) => handleVolumeChangeInBatch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanque / Fermentador</label>
                  <select
                    value={tankId}
                    onChange={(e) => setTankId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="">-- Sem Tanque --</option>
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.capacityLiters}L) - {t.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SEÇÃO RASTREABILIDADE DE INSUMOS DA BRASSAGEM */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-950 font-black">
                    <ShieldCheck className="w-4 h-4 text-purple-700" />
                    <span>Insumos & Rastreabilidade de Lotes ({batchIngredients.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchIngredients([
                        ...batchIngredients,
                        {
                          name: '',
                          category: 'MALTE',
                          quantityUsed: 10,
                          unit: 'KG',
                          supplierName: '',
                          supplierLot: '',
                          costPerUnit: 0,
                          totalCost: 0,
                          stage: 'MOSTURA',
                        },
                      ]);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-[10px] font-bold"
                  >
                    + Adicionar Insumo Extra
                  </button>
                </div>

                {batchIngredients.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic p-2 bg-white rounded-xl border border-purple-100 text-center">
                    Nenhum insumo configurado nesta receita. Adicione os insumos abaixo para garantir rastreabilidade completa.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {batchIngredients.map((ing: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-white rounded-xl border border-purple-200/80 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Insumo</span>
                            <input
                              type="text"
                              required
                              value={ing.name}
                              onChange={(e) => {
                                const updated = [...batchIngredients];
                                updated[idx].name = e.target.value;
                                setBatchIngredients(updated);
                              }}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Qtd ({ing.unit})</span>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={ing.quantityUsed}
                                onChange={(e) => {
                                  const updated = [...batchIngredients];
                                  const q = parseFloat(e.target.value) || 0;
                                  updated[idx].quantityUsed = q;
                                  updated[idx].totalCost = Math.round(q * (updated[idx].costPerUnit || 0) * 100) / 100;
                                  setBatchIngredients(updated);
                                }}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                              />
                              <span className="p-1 bg-slate-100 rounded text-[10px] font-bold self-center">
                                {ing.unit}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-purple-900 block font-black">Lote do Insumo em Estoque *</span>
                            {ing.availableLots && ing.availableLots.length > 0 ? (
                              <select
                                value={ing.inventoryLotId || ''}
                                onChange={(e) => {
                                  const selectedLotId = e.target.value;
                                  const chosenLot = ing.availableLots.find((l: any) => l.id === selectedLotId);
                                  const updated = [...batchIngredients];
                                  if (chosenLot) {
                                    updated[idx].inventoryLotId = chosenLot.id;
                                    updated[idx].supplierLot = chosenLot.lotNumber;
                                    updated[idx].supplierName = chosenLot.supplier?.name || chosenLot.supplierName || updated[idx].supplierName;
                                    updated[idx].costPerUnit = chosenLot.costPerUnit || updated[idx].costPerUnit;
                                    updated[idx].expirationDate = chosenLot.expirationDate ? chosenLot.expirationDate.split('T')[0] : '';
                                    updated[idx].harvestYear = chosenLot.harvestYear || '';
                                    updated[idx].totalCost = Math.round((updated[idx].quantityUsed || 0) * (updated[idx].costPerUnit || 0) * 100) / 100;
                                  } else {
                                    updated[idx].inventoryLotId = null;
                                  }
                                  setBatchIngredients(updated);
                                }}
                                className="w-full px-2 py-1 bg-purple-50 border border-purple-300 rounded-lg font-mono font-bold text-xs text-purple-950"
                              >
                                {ing.availableLots.map((lot: any) => (
                                  <option key={lot.id} value={lot.id}>
                                    Lote #{lot.lotNumber} ({lot.currentQuantity} {ing.unit} disp.{lot.expirationDate ? ` - Venc: ${formatDate(lot.expirationDate)}` : ''})
                                  </option>
                                ))}
                                <option value="">-- Digitar Lote Manual --</option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder="Ex: AGR-2026-991"
                                value={ing.supplierLot || ''}
                                onChange={(e) => {
                                  const updated = [...batchIngredients];
                                  updated[idx].supplierLot = e.target.value.toUpperCase();
                                  setBatchIngredients(updated);
                                }}
                                className="w-full px-2 py-1 bg-purple-50 border border-purple-300 rounded-lg font-mono font-bold text-xs text-purple-950"
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span className="text-slate-500 truncate max-w-[200px]">
                            {ing.supplierName ? `Fornecedor: ${ing.supplierName}` : `Etapa: ${ing.stage}`}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700 font-bold">
                              Custo: {formatCurrency(ing.costPerUnit || 0)}/{ing.unit} (Total: {formatCurrency(ing.totalCost || (ing.quantityUsed * (ing.costPerUnit || 0)))})
                            </span>
                            <button
                              type="button"
                              onClick={() => setBatchIngredients(batchIngredients.filter((_, i) => i !== idx))}
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

                {/* Baixa Automática no Estoque */}
                <div className="p-2.5 bg-white rounded-xl border border-purple-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={batchDeductStock}
                      onChange={(e) => setBatchDeductStock(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="font-bold text-slate-800 text-xs">
                      Dar baixa automática no estoque de insumos ao iniciar esta brassagem
                    </span>
                  </label>
                  <span className="text-[10px] text-purple-800 font-black bg-purple-100 px-2 py-0.5 rounded">
                    Recomendado
                  </span>
                </div>
              </div>

              {/* Cost per Liter Input */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-900">Preço de Custo da Cerveja</span>
                  <span className="text-[10px] text-amber-700">Calculado a partir dos insumos</span>
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
                    <span className="text-[10px] text-slate-500 block">Custo Total Lote:</span>
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
                  placeholder="OG medida, temperatura de mostura, observações do lote..."
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
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Iniciar Lote & Rastrear Insumos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Lote e Custo */}
      {editBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-lg text-slate-900 mb-1">Editar Lote {editBatchModal.batchNumber}</h3>
            <p className="text-xs text-slate-500 mb-4">{editBatchModal.recipe?.name} ({editBatchModal.recipe?.style})</p>

            <form onSubmit={handleUpdateBatch} className="space-y-3 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Volume Produzido Real (L)</label>
                  <input
                    type="number"
                    value={editBatchVolumeProduced}
                    onChange={(e) => setEditBatchVolumeProduced(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custo por Litro (R$/L)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={editBatchCostPerLiter}
                    onChange={(e) => setEditBatchCostPerLiter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-rose-700"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-slate-500 font-bold">Custo Total Apurado:</span>
                <span className="text-base font-black text-slate-900">
                  {formatCurrency((parseFloat(editBatchVolumeProduced) || 0) * (parseFloat(editBatchCostPerLiter) || 0))}
                </span>
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
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Salvar Alterações
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
                {editRecipeModal ? 'Editar Receita & Insumos' : 'Cadastrar Nova Receita & Insumos'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure os insumos da receita para cálculo automático de custos e rastreabilidade total
              </p>
            </div>

            <form onSubmit={editRecipeModal ? handleUpdateRecipe : handleCreateRecipe} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome da Cerveja</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Estilo Cervejeiro</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: American IPA"
                    value={recipeStyle}
                    onChange={(e) => setRecipeStyle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* SEÇÃO INSUMOS DA RECEITA */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-950 font-black">
                    <Layers className="w-4 h-4 text-purple-700" />
                    <span>Insumos & Ingredientes da Receita ({recipeIngredients.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={autoCalculateRecipeCostFromIngredients}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs"
                      title="Calcular custo por litro considerando brassagem de 500L padrão"
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
                            <span className="text-[10px] text-slate-400 block font-bold">Qtd na Brassagem (500L)</span>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ABV (% Álcool)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={abv}
                    onChange={(e) => setAbv(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">IBU (Amargor)</label>
                  <input
                    type="number"
                    value={ibu}
                    onChange={(e) => setIbu(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
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
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  {editRecipeModal ? 'Salvar Alterações' : 'Salvar Receita & Insumos'}
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
