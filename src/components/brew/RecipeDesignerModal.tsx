'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Flame,
  Droplets,
  Thermometer,
  Layers,
  Scale,
  DollarSign,
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
  Beaker,
  ShieldCheck,
  Percent,
  Timer,
  Zap,
  AlertCircle,
  Package,
  Calendar,
} from 'lucide-react';
import {
  FermentableItem,
  HopItem,
  YeastItem,
  WaterProfile,
  WaterSaltsAddition,
  MashStep,
  calculateOg,
  calculateFg,
  calculateAbv,
  calculateIbu,
  calculateColor,
  calculateBuGu,
  calculateWaterProfile,
  estimateLacticAcidRequirement,
  calculateMashAndWaterVolumes,
  srmToHex,
  sgToPlato,
} from '@/lib/brewing/calculations';
import { BJCP_STYLES, BjcpStyle, findBjcpStyle, checkStyleCompliance } from '@/lib/brewing/bjcpStyles';
import {
  POPULAR_MALTS,
  POPULAR_HOPS,
  POPULAR_YEASTS,
  STANDARD_WATER_PROFILES,
} from '@/lib/brewing/defaultCatalog';
import { exportToBeerXml } from '@/lib/brewing/beerXml';
import { formatCurrency } from '@/lib/utils';

interface RecipeDesignerModalProps {
  recipe?: any | null; // null se criando nova receita
  inventoryItems?: any[];
  onClose: () => void;
  onSaved: (savedRecipe: any) => void;
}

export default function RecipeDesignerModal({
  recipe,
  inventoryItems = [],
  onClose,
  onSaved,
}: RecipeDesignerModalProps) {
  const [activeTab, setActiveTab] = useState<'FERMENTABLES' | 'HOPS' | 'YEAST' | 'WATER' | 'MASH' | 'STOCK_PLAN' | 'COST'>('FERMENTABLES');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Dados Gerais da Receita
  const [name, setName] = useState(recipe?.name || '');
  const [selectedStyleCode, setSelectedStyleCode] = useState<string>(recipe?.bjcpStyleCode || '21A');
  const [styleName, setStyleName] = useState(recipe?.style || 'American IPA');
  const [batchVolumeLiters, setBatchVolumeLiters] = useState<number>(recipe?.batchYieldLiters || 500);
  const [efficiencyPercent, setEfficiencyPercent] = useState<number>(recipe?.efficiencyPercent || 75);
  const [boilTimeMinutes, setBoilTimeMinutes] = useState<number>(recipe?.boilTimeMinutes || 60);
  const [description, setDescription] = useState(recipe?.description || '');
  const [mapaRegistration, setMapaRegistration] = useState(recipe?.mapaRegistration || '');
  const [commercialDenomination, setCommercialDenomination] = useState(recipe?.commercialDenomination || '');

  // Precificação
  const [salePricePerLiter, setSalePricePerLiter] = useState<number>(recipe?.salePricePerLiter || 18.0);
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(recipe?.profitMarginPercent || 50.0);

  // Fermentáveis (Maltes / Adjuntos)
  const [fermentables, setFermentables] = useState<FermentableItem[]>([]);
  // Lupulagem
  const [hops, setHops] = useState<HopItem[]>([]);
  // Levedura
  const [yeast, setYeast] = useState<YeastItem>({
    name: 'Fermentis SafAle US-05',
    attenuationPercent: 81,
    minTempCelsius: 18,
    maxTempCelsius: 22,
    form: 'DRY',
  });
  // Perfil de Água & Sais
  const [baseWater, setBaseWater] = useState<WaterProfile>(STANDARD_WATER_PROFILES[0]);
  const [salts, setSalts] = useState<WaterSaltsAddition>({
    gypsumGrams: 0,
    calciumChlorideGrams: 0,
    epsomSaltGrams: 0,
    tableSaltGrams: 0,
    bakingSodaGrams: 0,
    lacticAcid85Ml: 0,
  });
  // Rampas de Mostura
  const [targetMashTemp, setTargetMashTemp] = useState<number>(66);
  const [mashRatio, setMashRatio] = useState<number>(3.0);
  const [mashSteps, setMashSteps] = useState<MashStep[]>([
    { name: 'Sacarificação (Beta + Alfa)', type: 'TEMPERATURE', stepTempCelsius: 66, stepTimeMinutes: 60 },
    { name: 'Mash Out', type: 'TEMPERATURE', stepTempCelsius: 76, stepTimeMinutes: 10 },
  ]);

  // Inicialização ao carregar receita existente
  useEffect(() => {
    if (recipe) {
      setName(recipe.name || '');
      setStyleName(recipe.style || 'American IPA');
      setBatchVolumeLiters(recipe.batchYieldLiters || 500);
      setEfficiencyPercent(recipe.efficiencyPercent || 75);
      setBoilTimeMinutes(recipe.boilTimeMinutes || 60);
      setDescription(recipe.description || '');
      setMapaRegistration(recipe.mapaRegistration || '');
      setCommercialDenomination(recipe.commercialDenomination || '');
      setSalePricePerLiter(recipe.salePricePerLiter || 18.0);
      setProfitMarginPercent(recipe.profitMarginPercent || 50.0);
      if (recipe.bjcpStyleCode) setSelectedStyleCode(recipe.bjcpStyleCode);

      if (recipe.recipeDataJson) {
        try {
          const parsed = JSON.parse(recipe.recipeDataJson);
          if (Array.isArray(parsed.fermentables) && parsed.fermentables.length > 0) {
            setFermentables(parsed.fermentables);
          }
          if (Array.isArray(parsed.hops) && parsed.hops.length > 0) {
            setHops(parsed.hops);
          }
          if (parsed.yeast) {
            setYeast(parsed.yeast);
          }
          if (Array.isArray(parsed.mashSteps) && parsed.mashSteps.length > 0) {
            setMashSteps(parsed.mashSteps);
          }
          if (parsed.salts) {
            setSalts(parsed.salts);
          }
          if (parsed.baseWater) {
            setBaseWater(parsed.baseWater);
          }
        } catch (e) {
          console.error('Error parsing recipeDataJson:', e);
        }
      } else if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
        const ferms: FermentableItem[] = [];
        const hp: HopItem[] = [];
        for (const ing of recipe.ingredients) {
          if (ing.category === 'MALTE' || ing.category === 'ADJUNTO') {
            ferms.push({
              name: ing.name,
              amountKg: ing.amount || 0,
              colorEbc: 4.0,
              potentialYieldPercent: 80,
              category: ing.category === 'ADJUNTO' ? 'ADJUNCT' : 'GRAIN',
              inventoryItemId: ing.inventoryItemId,
              costPerKg: ing.costPerUnit || 0,
            });
          } else if (ing.category === 'LUPULO') {
            hp.push({
              name: ing.name,
              amountGrams: ing.unit === 'KG' ? (ing.amount || 0) * 1000 : ing.amount || 0,
              alphaAcidPercent: 12.0,
              timeMinutes: ing.stage?.includes('60') ? 60 : 15,
              use: ing.stage === 'FIRST_WORT' ? 'FIRST_WORT' : ing.stage === 'WHIRLPOOL' ? 'WHIRLPOOL' : ing.stage === 'DRY_HOPPING' ? 'DRY_HOP' : 'BOIL',
              inventoryItemId: ing.inventoryItemId,
              costPerGram: ing.costPerUnit ? ing.costPerUnit / 1000 : 0,
            });
          } else if (ing.category === 'LEVEDURA') {
            setYeast({
              name: ing.name,
              attenuationPercent: 80,
              form: 'DRY',
              inventoryItemId: ing.inventoryItemId,
              costPerUnit: ing.costPerUnit || 0,
            });
          }
        }
        if (ferms.length > 0) setFermentables(ferms);
        if (hp.length > 0) setHops(hp);
      }
    } else {
      // Receita Padrão
      setFermentables([
        { name: 'Malte Pilsen (Agrária)', amountKg: 100, colorEbc: 3.5, potentialYieldPercent: 81, category: 'GRAIN', costPerKg: 5.8 },
        { name: 'Malte Munich I (15 EBC)', amountKg: 15, colorEbc: 15, potentialYieldPercent: 78, category: 'GRAIN', costPerKg: 7.5 },
        { name: 'Malte CaraPils / Dextrina', amountKg: 5, colorEbc: 5, potentialYieldPercent: 72, category: 'GRAIN', costPerKg: 8.9 },
      ]);
      setHops([
        { name: 'Columbus / CTZ', amountGrams: 500, alphaAcidPercent: 14.0, timeMinutes: 60, use: 'BOIL', costPerGram: 0.28 },
        { name: 'Citra', amountGrams: 1000, alphaAcidPercent: 12.5, timeMinutes: 15, use: 'WHIRLPOOL', tempCelsius: 85, costPerGram: 0.38 },
        { name: 'Mosaic', amountGrams: 1000, alphaAcidPercent: 12.0, timeMinutes: 15, use: 'WHIRLPOOL', tempCelsius: 85, costPerGram: 0.36 },
        { name: 'Citra', amountGrams: 1500, alphaAcidPercent: 12.5, timeMinutes: 4, use: 'DRY_HOP', costPerGram: 0.38 },
      ]);
    }
  }, [recipe]);

  // BJCP Style Selecionado
  const currentBjcpStyle: BjcpStyle | undefined = useMemo(() => {
    return BJCP_STYLES.find((s) => s.code === selectedStyleCode) || findBjcpStyle(styleName);
  }, [selectedStyleCode, styleName]);

  // CÁLCULOS FÍSICO-QUÍMICOS EM TEMPO REAL
  const og = useMemo(() => calculateOg(fermentables, batchVolumeLiters, efficiencyPercent), [fermentables, batchVolumeLiters, efficiencyPercent]);
  const fg = useMemo(() => calculateFg(og, yeast?.attenuationPercent || 78), [og, yeast]);
  const abv = useMemo(() => calculateAbv(og, fg), [og, fg]);
  const plato = useMemo(() => Math.round(sgToPlato(og) * 10) / 10, [og]);
  const ibuData = useMemo(() => calculateIbu(hops, og, batchVolumeLiters), [hops, og, batchVolumeLiters]);
  const colorData = useMemo(() => calculateColor(fermentables, batchVolumeLiters), [fermentables, batchVolumeLiters]);
  const bugu = useMemo(() => calculateBuGu(ibuData.totalIbu, og), [ibuData.totalIbu, og]);

  // Conformidade BJCP
  const compliance = useMemo(() => {
    if (!currentBjcpStyle) return null;
    return checkStyleCompliance(currentBjcpStyle, og, fg, ibuData.totalIbu, abv, colorData.ebc);
  }, [currentBjcpStyle, og, fg, ibuData.totalIbu, abv, colorData.ebc]);

  // Volumes de Mostura e Água
  const mashVolumes = useMemo(() => {
    return calculateMashAndWaterVolumes(
      fermentables,
      batchVolumeLiters,
      targetMashTemp,
      22,
      mashRatio,
      boilTimeMinutes
    );
  }, [fermentables, batchVolumeLiters, targetMashTemp, mashRatio, boilTimeMinutes]);

  // Balanço Iônico da Água
  const adjustedWater = useMemo(() => {
    return calculateWaterProfile(baseWater, salts, mashVolumes.totalWaterLiters);
  }, [baseWater, salts, mashVolumes.totalWaterLiters]);

  const lacticAcidEstimate = useMemo(() => {
    return estimateLacticAcidRequirement(mashVolumes.mashWaterLiters, mashVolumes.totalGrainKg, baseWater.hco3);
  }, [mashVolumes, baseWater.hco3]);

  // CUSTOS E PRECIFICAÇÃO
  const totalGristKg = useMemo(() => fermentables.reduce((acc, f) => acc + (f.amountKg || 0), 0), [fermentables]);
  const totalHopsGrams = useMemo(() => hops.reduce((acc, h) => acc + (h.amountGrams || 0), 0), [hops]);

  const totalCost = useMemo(() => {
    let cost = 0;
    for (const f of fermentables) cost += (f.amountKg || 0) * (f.costPerKg || 0);
    for (const h of hops) cost += (h.amountGrams || 0) * (h.costPerGram || 0);
    if (yeast?.costPerUnit) cost += yeast.costPerUnit;
    return Math.round(cost * 100) / 100;
  }, [fermentables, hops, yeast]);

  const costPerLiter = useMemo(() => {
    if (!batchVolumeLiters || batchVolumeLiters <= 0) return 0;
    return Math.round((totalCost / batchVolumeLiters) * 100) / 100;
  }, [totalCost, batchVolumeLiters]);

  // Helper para verificar saldo no estoque do PintTech
  const getStockStatus = (name: string) => {
    if (!inventoryItems || inventoryItems.length === 0) return null;
    const lower = name.toLowerCase();
    const match = inventoryItems.find((item) =>
      item.name.toLowerCase().includes(lower) || lower.includes(item.name.toLowerCase())
    );
    if (!match) return null;
    return {
      id: match.id,
      name: match.name,
      quantity: match.currentQuantity,
      unit: match.unit,
      costPerUnit: match.costPerUnit,
    };
  };

  // ANÁLISE DE DÉFICIT DE ESTOQUE (O QUE FALTA PARA O LOTE)
  const stockDeficitAnalysis = useMemo(() => {
    const deficits: Array<{
      name: string;
      category: string;
      required: number;
      available: number;
      deficit: number;
      unit: string;
      status: 'OK' | 'MISSING' | 'NOT_FOUND';
    }> = [];

    // Checa Maltes
    for (const f of fermentables) {
      const stock = getStockStatus(f.name);
      const req = f.amountKg || 0;
      if (!stock) {
        deficits.push({
          name: f.name,
          category: 'MALTE',
          required: req,
          available: 0,
          deficit: req,
          unit: 'KG',
          status: 'NOT_FOUND',
        });
      } else {
        const avail = stock.quantity || 0;
        const diff = req - avail;
        deficits.push({
          name: f.name,
          category: 'MALTE',
          required: req,
          available: avail,
          deficit: diff > 0 ? diff : 0,
          unit: 'KG',
          status: diff > 0 ? 'MISSING' : 'OK',
        });
      }
    }

    // Checa Lúpulos
    for (const h of hops) {
      const stock = getStockStatus(h.name);
      const reqG = h.amountGrams || 0;
      const reqKg = reqG / 1000;
      if (!stock) {
        deficits.push({
          name: h.name,
          category: 'LUPULO',
          required: reqG,
          available: 0,
          deficit: reqG,
          unit: 'G',
          status: 'NOT_FOUND',
        });
      } else {
        const availG = stock.unit === 'KG' ? stock.quantity * 1000 : stock.quantity;
        const diffG = reqG - availG;
        deficits.push({
          name: h.name,
          category: 'LUPULO',
          required: reqG,
          available: availG,
          deficit: diffG > 0 ? diffG : 0,
          unit: 'G',
          status: diffG > 0 ? 'MISSING' : 'OK',
        });
      }
    }

    const missingCount = deficits.filter((d) => d.status === 'MISSING' || d.status === 'NOT_FOUND').length;
    return { deficits, missingCount, allOk: missingCount === 0 };
  }, [fermentables, hops, inventoryItems]);

  // Manipuladores de Fermentáveis
  const addFermentable = (preset?: any) => {
    const item: FermentableItem = preset || {
      name: 'Malte Pilsen',
      amountKg: 10,
      colorEbc: 3.5,
      potentialYieldPercent: 81,
      category: 'GRAIN',
      costPerKg: 5.8,
    };
    setFermentables([...fermentables, item]);
  };

  const updateFermentable = (index: number, fields: Partial<FermentableItem>) => {
    const next = [...fermentables];
    next[index] = { ...next[index], ...fields };
    setFermentables(next);
  };

  const removeFermentable = (index: number) => {
    setFermentables(fermentables.filter((_, i) => i !== index));
  };

  // Manipuladores de Lúpulos
  const addHop = (preset?: any) => {
    const item: HopItem = preset || {
      name: 'Cascade',
      amountGrams: 500,
      alphaAcidPercent: 6.0,
      timeMinutes: 60,
      use: 'BOIL',
      costPerGram: 0.25,
    };
    setHops([...hops, item]);
  };

  const updateHop = (index: number, fields: Partial<HopItem>) => {
    const next = [...hops];
    next[index] = { ...next[index], ...fields };
    setHops(next);
  };

  const removeHop = (index: number) => {
    setHops(hops.filter((_, i) => i !== index));
  };

  // Salvar Receita no Banco
  const handleSaveRecipe = async () => {
    if (!name.trim()) {
      setError('Por favor, informe o nome da receita');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const ingredientsData = [
        ...fermentables.map((f) => ({
          inventoryItemId: f.inventoryItemId || null,
          name: f.name,
          category: f.category || 'MALTE',
          amount: f.amountKg,
          unit: 'KG',
          stage: 'MOSTURA',
          costPerUnit: f.costPerKg || 0,
          notes: `${f.potentialYieldPercent || 80}% rendimento | ${f.colorEbc} EBC`,
        })),
        ...hops.map((h) => ({
          inventoryItemId: h.inventoryItemId || null,
          name: h.name,
          category: 'LUPULO',
          amount: h.amountGrams,
          unit: 'G',
          stage: h.use === 'FIRST_WORT' ? 'FIRST_WORT' : h.use === 'WHIRLPOOL' ? 'WHIRLPOOL' : h.use === 'DRY_HOP' ? 'DRY_HOPPING' : 'FERVURA_60MIN',
          costPerUnit: (h.costPerGram || 0) * 1000,
          notes: `${h.alphaAcidPercent}% AA | ${h.timeMinutes}min (${h.use})`,
        })),
        ...(yeast ? [{
          inventoryItemId: yeast.inventoryItemId || null,
          name: yeast.name,
          category: 'LEVEDURA',
          amount: 1,
          unit: 'PACOTE',
          stage: 'FERMENTACAO',
          costPerUnit: yeast.costPerUnit || 0,
          notes: `${yeast.attenuationPercent}% atenuação`,
        }] : []),
      ];

      const fullRecipeData = {
        fermentables,
        hops,
        yeast,
        mashSteps,
        salts,
        baseWater,
      };

      const payload = {
        name: name.trim(),
        style: styleName,
        og,
        fg,
        abv,
        ibu: ibuData.totalIbu,
        ebc: colorData.ebc,
        batchYieldLiters: batchVolumeLiters,
        boilTimeMinutes,
        efficiencyPercent,
        description,
        mapaRegistration,
        commercialDenomination,
        costPerLiter,
        salePricePerLiter,
        profitMarginPercent,
        bjcpStyleCode: selectedStyleCode,
        waterProfileJson: JSON.stringify(adjustedWater),
        mashScheduleJson: JSON.stringify(mashSteps),
        recipeDataJson: JSON.stringify(fullRecipeData),
        ingredients: ingredientsData,
      };

      const url = recipe?.id ? `/api/recipes/${recipe.id}` : '/api/recipes';
      const method = recipe?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar receita');

      onSaved(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar receita');
    } finally {
      setSaving(false);
    }
  };

  const handleExportXml = () => {
    const xml = exportToBeerXml({
      name,
      style: styleName,
      batchYieldLiters: batchVolumeLiters,
      boilTimeMinutes,
      efficiencyPercent,
      og,
      fg,
      abv,
      ibu: ibuData.totalIbu,
      ebc: colorData.ebc,
      description,
      fermentables,
      hops,
      yeast,
      mashSteps,
    });

    const blob = new Blob([xml], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.xml`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-6xl text-slate-800 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* HEADER & COCKPIT LIGHT */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  <span>{name || 'Nova Receita Cervejeira'}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Calculadora Cervejeira
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Elaboração e planejamento técnico físico-químico com verificação de estoque
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportXml}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all shadow-sm"
                title="Exportar BeerXML"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>Exportar XML</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* REAL-TIME BREWING COCKPIT (GAUGES & METRICS - LIGHT THEME) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
            {/* OG & Plato */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>OG (Densidade)</span>
                <span className="text-amber-700 font-black">{plato}°P</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {og.toFixed(3)}
              </div>
              {currentBjcpStyle && (
                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-semibold">
                  <span>BJCP:</span>
                  <span className={compliance?.isOgOk ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {currentBjcpStyle.ogMin.toFixed(3)} - {currentBjcpStyle.ogMax.toFixed(3)}
                  </span>
                </div>
              )}
            </div>

            {/* FG & Atenuação */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>FG Estimada</span>
                <span className="text-cyan-700 font-black">{yeast?.attenuationPercent || 78}% Aten.</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {fg.toFixed(3)}
              </div>
              {currentBjcpStyle && (
                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-semibold">
                  <span>BJCP:</span>
                  <span className={compliance?.isFgOk ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {currentBjcpStyle.fgMin.toFixed(3)} - {currentBjcpStyle.fgMax.toFixed(3)}
                  </span>
                </div>
              )}
            </div>

            {/* ABV */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>ABV (Álcool)</span>
                <Percent className="w-3 h-3 text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                {abv.toFixed(1)}%
              </div>
              {currentBjcpStyle && (
                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-semibold">
                  <span>BJCP:</span>
                  <span className={compliance?.isAbvOk ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {currentBjcpStyle.abvMin.toFixed(1)}% - {currentBjcpStyle.abvMax.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {/* IBU */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>IBU (Amargor)</span>
                <span className="text-[10px] font-bold text-slate-400">Tinseth</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                {ibuData.totalIbu}
              </div>
              {currentBjcpStyle && (
                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-semibold">
                  <span>BJCP:</span>
                  <span className={compliance?.isIbuOk ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {currentBjcpStyle.ibuMin} - {currentBjcpStyle.ibuMax}
                  </span>
                </div>
              )}
            </div>

            {/* COR EBC & VISUAL COLOR SWATCH */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Cor (EBC)</span>
                <span className="text-[10px] font-bold text-slate-500">{colorData.srm} SRM</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="w-5 h-7 rounded-md border border-slate-300 shadow-inner"
                  style={{ backgroundColor: colorData.hexColor }}
                  title={`Cor calculada: ${colorData.ebc} EBC (${colorData.srm} SRM)`}
                />
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  {colorData.ebc} <span className="text-xs font-bold text-slate-400">EBC</span>
                </span>
              </div>
              {currentBjcpStyle && (
                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-semibold">
                  <span>BJCP:</span>
                  <span className={compliance?.isEbcOk ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {currentBjcpStyle.ebcMin} - {currentBjcpStyle.ebcMax}
                  </span>
                </div>
              )}
            </div>

            {/* EQUILÍBRIO BU:GU & STATUS DO ESTOQUE */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Relação BU:GU</span>
                <span className="text-xs font-black text-purple-600">{bugu.ratio.toFixed(2)}</span>
              </div>
              <div className="text-xs font-bold text-slate-700 mt-1">
                {bugu.balance === 'HOP_FORWARD' && '🌿 Lupulada'}
                {bugu.balance === 'BALANCED' && '⚖️ Equilibrada'}
                {bugu.balance === 'MALT_FORWARD' && '🍞 Maltada'}
                {bugu.balance === 'EXTREME_HOP' && '🔥 Amarga Extrema'}
              </div>
              <div className="text-[10px] font-bold mt-1 flex items-center justify-between">
                <span className="text-slate-500">Estoque:</span>
                {stockDeficitAnalysis.allOk ? (
                  <span className="text-emerald-600 font-black flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> 100% Disp.
                  </span>
                ) : (
                  <span className="text-rose-600 font-black flex items-center gap-0.5">
                    <AlertCircle className="w-3 h-3" /> {stockDeficitAnalysis.missingCount} item(ns) faltante(s)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLES DE RECEITA & NAVEGAÇÃO DE ABAS LIGHT */}
        <div className="px-4 sm:px-6 pt-4 pb-2 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          {/* Inputs Básicos */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da Cerveja (ex: American IPA)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>

            <div className="w-full sm:w-60">
              <select
                value={selectedStyleCode}
                onChange={(e) => {
                  setSelectedStyleCode(e.target.value);
                  const st = BJCP_STYLES.find((s) => s.code === e.target.value);
                  if (st) setStyleName(st.name);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
              >
                {BJCP_STYLES.map((style) => (
                  <option key={style.id} value={style.code}>
                    {style.code} - {style.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 border border-slate-300 rounded-xl text-xs">
                <span className="text-slate-500 font-bold">Lote:</span>
                <input
                  type="number"
                  value={batchVolumeLiters}
                  onChange={(e) => setBatchVolumeLiters(Math.max(10, parseFloat(e.target.value) || 0))}
                  className="w-16 bg-transparent text-slate-900 font-black text-right focus:outline-none"
                />
                <span className="text-slate-500 font-bold">L</span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 border border-slate-300 rounded-xl text-xs">
                <span className="text-slate-500 font-bold">Efic:</span>
                <input
                  type="number"
                  value={efficiencyPercent}
                  onChange={(e) => setEfficiencyPercent(Math.max(10, Math.min(100, parseFloat(e.target.value) || 0)))}
                  className="w-12 bg-transparent text-slate-900 font-black text-right focus:outline-none"
                />
                <span className="text-slate-500 font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Abas */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto w-full lg:w-auto">
            <button
              onClick={() => setActiveTab('FERMENTABLES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'FERMENTABLES' ? 'bg-amber-500 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Fermentáveis ({fermentables.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('HOPS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'HOPS' ? 'bg-emerald-600 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>Lúpulos ({hops.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('YEAST')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'YEAST' ? 'bg-cyan-600 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Levedura</span>
            </button>

            <button
              onClick={() => setActiveTab('STOCK_PLAN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'STOCK_PLAN'
                  ? 'bg-rose-600 text-white font-black shadow-sm'
                  : stockDeficitAnalysis.allOk
                  ? 'text-emerald-700 hover:text-emerald-900 font-bold'
                  : 'text-rose-600 hover:text-rose-800 font-bold bg-rose-50'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Verificar Estoque ({stockDeficitAnalysis.missingCount > 0 ? `-${stockDeficitAnalysis.missingCount}` : 'OK'})</span>
            </button>

            <button
              onClick={() => setActiveTab('WATER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'WATER' ? 'bg-blue-600 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Beaker className="w-3.5 h-3.5" />
              <span>Água & Sais</span>
            </button>

            <button
              onClick={() => setActiveTab('MASH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'MASH' ? 'bg-orange-600 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5" />
              <span>Mostura</span>
            </button>

            <button
              onClick={() => setActiveTab('COST')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'COST' ? 'bg-purple-600 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Custos & MAPA</span>
            </button>
          </div>
        </div>

        {/* CONTEÚDO DAS ABAS (LIGHT THEME) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ABA 1: FERMENTÁVEIS */}
          {activeTab === 'FERMENTABLES' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Maltes, Grãos e Adjuntos (Total: {totalGristKg.toFixed(1)} kg)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina o grist de malte. O potencial de extrato e cor calculam a gravidade e o EBC instantaneamente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => addFermentable()}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Malte</span>
                </button>
              </div>

              {/* Tabela de Maltes */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Insumo / Malte</th>
                      <th className="p-3 w-28">Quantidade (kg)</th>
                      <th className="p-3 w-20 text-center">% Grist</th>
                      <th className="p-3 w-24">Cor (EBC)</th>
                      <th className="p-3 w-24">Rend. (%)</th>
                      <th className="p-3 w-28">Custo (R$/kg)</th>
                      <th className="p-3">Disponibilidade no Estoque</th>
                      <th className="p-3 w-12 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fermentables.map((f, idx) => {
                      const gristPercent = totalGristKg > 0 ? Math.round(((f.amountKg || 0) / totalGristKg) * 1000) / 10 : 0;
                      const stock = getStockStatus(f.name);
                      const isStockSufficient = stock && stock.quantity >= (f.amountKg || 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="space-y-1">
                              {inventoryItems && inventoryItems.filter((i) => i.category === 'MALTE' || i.category === 'ADJUNTO').length > 0 && (
                                <select
                                  value={f.inventoryItemId || ''}
                                  onChange={(e) => {
                                    const inv = inventoryItems.find((item) => item.id === e.target.value);
                                    if (inv) {
                                      updateFermentable(idx, {
                                        name: inv.name,
                                        costPerKg: inv.costPerUnit || f.costPerKg,
                                        inventoryItemId: inv.id,
                                      });
                                    }
                                  }}
                                  className="w-full bg-amber-50/60 border border-amber-200 rounded-lg px-2 py-0.5 text-[10px] font-bold text-amber-950 focus:outline-none focus:bg-white"
                                >
                                  <option value="">-- Selecionar do Estoque --</option>
                                  {inventoryItems
                                    .filter((i) => i.category === 'MALTE' || i.category === 'ADJUNTO')
                                    .map((inv) => (
                                      <option key={inv.id} value={inv.id}>
                                        📦 {inv.name} (Saldo: {inv.currentQuantity} {inv.unit})
                                      </option>
                                    ))}
                                </select>
                              )}
                              <input
                                type="text"
                                value={f.name}
                                onChange={(e) => updateFermentable(idx, { name: e.target.value })}
                                placeholder="Nome do Malte"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.5"
                              value={f.amountKg}
                              onChange={(e) => updateFermentable(idx, { amountKg: Math.max(0, parseFloat(e.target.value) || 0) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-amber-700 font-black focus:outline-none focus:border-amber-500 focus:bg-white text-right"
                            />
                          </td>
                          <td className="p-3 text-center font-black text-slate-700">
                            {gristPercent}%
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.5"
                              value={f.colorEbc}
                              onChange={(e) => updateFermentable(idx, { colorEbc: Math.max(1, parseFloat(e.target.value) || 0) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold focus:outline-none text-right"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={f.potentialYieldPercent || 80}
                              onChange={(e) => updateFermentable(idx, { potentialYieldPercent: Math.max(10, Math.min(100, parseFloat(e.target.value) || 0)) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold focus:outline-none text-right"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.1"
                              value={f.costPerKg || 0}
                              onChange={(e) => updateFermentable(idx, { costPerKg: Math.max(0, parseFloat(e.target.value) || 0) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-emerald-700 font-bold focus:outline-none text-right"
                            />
                          </td>
                          <td className="p-3">
                            {stock ? (
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${isStockSufficient ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <div>
                                  <span className={`text-[11px] font-bold ${isStockSufficient ? 'text-slate-700' : 'text-rose-700'}`}>
                                    {stock.quantity} {stock.unit} disp.
                                  </span>
                                  {!isStockSufficient && (
                                    <span className="block text-[10px] text-rose-600 font-extrabold">
                                      Faltam {((f.amountKg || 0) - stock.quantity).toFixed(1)} kg
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Insumo não vinculado</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeFermentable(idx)}
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

              {/* Catálogo Rápido de Maltes */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-500 mb-2">Adição Rápida do Catálogo Comercial:</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_MALTS.slice(0, 10).map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addFermentable({ ...m, amountKg: 25, costPerKg: 6.5 })}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <span>+ {m.name}</span>
                      <span className="text-[10px] text-amber-600 font-extrabold">({m.colorEbc} EBC)</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: LUPULAGEM (HOPS) */}
          {activeTab === 'HOPS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-emerald-600" />
                    <span>Cronograma de Lupulagem (Total: {totalHopsGrams}g | IBU: {ibuData.totalIbu})</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cálculo Tinseth com suporte a First Wort, Whirlpool térmico e Dry Hopping.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => addHop()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Lúpulo</span>
                </button>
              </div>

              {/* Tabela de Lúpulos */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Variedade do Lúpulo</th>
                      <th className="p-3 w-28">Quantidade (g)</th>
                      <th className="p-3 w-24">Alfa-Ácido (%)</th>
                      <th className="p-3 w-32">Etapa de Uso</th>
                      <th className="p-3 w-24">Tempo (min/dias)</th>
                      <th className="p-3 w-24 text-center">IBU</th>
                      <th className="p-3 w-28">Custo (R$/g)</th>
                      <th className="p-3">Disponibilidade no Estoque</th>
                      <th className="p-3 w-12 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ibuData.hopDetails.map((h, idx) => {
                      const stock = getStockStatus(h.name);
                      const availG = stock ? (stock.unit === 'KG' ? stock.quantity * 1000 : stock.quantity) : 0;
                      const isStockSufficient = stock && availG >= (h.amountGrams || 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="space-y-1">
                              {inventoryItems && inventoryItems.filter((i) => i.category === 'LUPULO').length > 0 && (
                                <select
                                  value={h.inventoryItemId || ''}
                                  onChange={(e) => {
                                    const inv = inventoryItems.find((item) => item.id === e.target.value);
                                    if (inv) {
                                      updateHop(idx, {
                                        name: inv.name,
                                        costPerGram: inv.costPerUnit ? (inv.unit === 'KG' ? inv.costPerUnit / 1000 : inv.costPerUnit) : h.costPerGram,
                                        inventoryItemId: inv.id,
                                      });
                                    }
                                  }}
                                  className="w-full bg-emerald-50/60 border border-emerald-200 rounded-lg px-2 py-0.5 text-[10px] font-bold text-emerald-950 focus:outline-none focus:bg-white"
                                >
                                  <option value="">-- Selecionar do Estoque --</option>
                                  {inventoryItems
                                    .filter((i) => i.category === 'LUPULO')
                                    .map((inv) => (
                                      <option key={inv.id} value={inv.id}>
                                        🌿 {inv.name} (Saldo: {inv.unit === 'KG' ? inv.currentQuantity * 1000 : inv.currentQuantity}g)
                                      </option>
                                    ))}
                                </select>
                              )}
                              <input
                                type="text"
                                value={h.name}
                                onChange={(e) => updateHop(idx, { name: e.target.value })}
                                placeholder="Nome do Lúpulo"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="50"
                              value={h.amountGrams}
                              onChange={(e) => updateHop(idx, { amountGrams: Math.max(0, parseFloat(e.target.value) || 0) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-emerald-700 font-black focus:outline-none focus:border-emerald-500 focus:bg-white text-right"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.1"
                              value={h.alphaAcidPercent}
                              onChange={(e) => updateHop(idx, { alphaAcidPercent: Math.max(0.1, parseFloat(e.target.value) || 0) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold focus:outline-none text-right"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={h.use}
                              onChange={(e) => updateHop(idx, { use: e.target.value as any })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold focus:outline-none"
                            >
                              <option value="BOIL">Fervura</option>
                              <option value="FIRST_WORT">First Wort (FWH)</option>
                              <option value="WHIRLPOOL">Whirlpool (85°C)</option>
                              <option value="DRY_HOP">Dry Hopping</option>
                              <option value="MASH">Mash Hop</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={h.timeMinutes}
                              onChange={(e) => updateHop(idx, { timeMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold focus:outline-none text-right"
                            />
                          </td>
                          <td className="p-3 text-center font-black text-emerald-700">
                            {h.ibu}
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={h.costPerGram || 0}
                              onChange={(e) => updateHop(idx, { costPerGram: Math.max(0, parseFloat(e.target.value) || 0) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-purple-700 font-bold focus:outline-none text-right"
                            />
                          </td>
                          <td className="p-3">
                            {stock ? (
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${isStockSufficient ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <div>
                                  <span className={`text-[11px] font-bold ${isStockSufficient ? 'text-slate-700' : 'text-rose-700'}`}>
                                    {availG} g disp.
                                  </span>
                                  {!isStockSufficient && (
                                    <span className="block text-[10px] text-rose-600 font-extrabold">
                                      Faltam {((h.amountGrams || 0) - availG)} g
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Insumo não vinculado</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeHop(idx)}
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

              {/* Catálogo Rápido de Lúpulos */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-500 mb-2">Adição Rápida de Lúpulos Nobres & Modernos:</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_HOPS.map((hp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addHop({ ...hp, amountGrams: 500, costPerGram: 0.35 })}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <span>+ {hp.name}</span>
                      <span className="text-[10px] text-emerald-600 font-extrabold">({hp.alphaAcidPercent}% AA)</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: LEVEDURA */}
          {activeTab === 'YEAST' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  <span>Cepa de Levedura & Atenuação</span>
                </h3>
                <p className="text-xs text-slate-500">
                  A levedura define a atenuação aparente dos açúcares, influenciando diretamente na FG e no ABV final.
                </p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cepa / Nome da Levedura</label>
                  <input
                    type="text"
                    value={yeast?.name || ''}
                    onChange={(e) => setYeast({ ...yeast, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Atenuação Aparente (%)</label>
                    <input
                      type="number"
                      value={yeast?.attenuationPercent || 78}
                      onChange={(e) => setYeast({ ...yeast, attenuationPercent: Math.max(50, Math.min(100, parseFloat(e.target.value) || 78)) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-cyan-700 font-black focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Temp. Mínima (°C)</label>
                    <input
                      type="number"
                      value={yeast?.minTempCelsius || 18}
                      onChange={(e) => setYeast({ ...yeast, minTempCelsius: parseFloat(e.target.value) || 18 })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Temp. Máxima (°C)</label>
                    <input
                      type="number"
                      value={yeast?.maxTempCelsius || 22}
                      onChange={(e) => setYeast({ ...yeast, maxTempCelsius: parseFloat(e.target.value) || 22 })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Catálogo de Leveduras */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-500 mb-2">Selecionar Cepas Populares:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POPULAR_YEASTS.map((y, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setYeast(y)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                        yeast?.name === y.name
                          ? 'bg-cyan-50 border-cyan-500 text-cyan-900 font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{y.name}</span>
                      <span className="text-[10px] text-cyan-700 font-bold">{y.attenuationPercent}%</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: VERIFICAR ESTOQUE & DÉFICIT */}
          {activeTab === 'STOCK_PLAN' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-rose-600" />
                    <span>Diagnóstico de Estoque & Insumos Faltantes</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verifique se sua cervejaria tem todos os insumos necessários para produzir este lote de {batchVolumeLiters}L.
                  </p>
                </div>

                <div className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                  stockDeficitAnalysis.allOk
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {stockDeficitAnalysis.allOk ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  <span>{stockDeficitAnalysis.allOk ? 'Estoque 100% Garantido' : `${stockDeficitAnalysis.missingCount} Insumos em Falta`}</span>
                </div>
              </div>

              {/* Tabela Detalhada de Balanço */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Insumo</th>
                      <th className="p-3 w-28">Categoria</th>
                      <th className="p-3 w-32 text-right">Qtd. Necessária</th>
                      <th className="p-3 w-32 text-right">Saldo em Estoque</th>
                      <th className="p-3 w-36 text-right">Déficit / Falta</th>
                      <th className="p-3 w-32 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockDeficitAnalysis.deficits.map((item, idx) => (
                      <tr key={idx} className={item.status === 'OK' ? 'hover:bg-slate-50' : 'bg-rose-50/50 hover:bg-rose-50'}>
                        <td className="p-3 font-bold text-slate-900">{item.name}</td>
                        <td className="p-3 text-slate-500">{item.category}</td>
                        <td className="p-3 text-right font-black text-slate-800">
                          {item.required.toFixed(1)} {item.unit}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-600">
                          {item.available.toFixed(1)} {item.unit}
                        </td>
                        <td className="p-3 text-right font-black">
                          {item.deficit > 0 ? (
                            <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                              Faltam {item.deficit.toFixed(1)} {item.unit}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold">Suficiente</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.status === 'OK' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-black">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-[10px] font-black">
                              <AlertCircle className="w-3 h-3" /> Comprar
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 5: PERFIL DE ÁGUA & SAIS */}
          {activeTab === 'WATER' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-blue-600" />
                  <span>Química da Água & Correção de Sais (Total Água: {mashVolumes.totalWaterLiters} L)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Ajuste o balanço de Sulfato e Cloreto para realçar o amargor seco ou a maciez da cerveja.
                </p>
              </div>

              {/* Balanço Iônico Display */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-500">Cálcio (Ca²⁺)</span>
                  <div className="text-lg font-black text-slate-900 mt-1">{adjustedWater.ca} <span className="text-[10px] text-slate-400">ppm</span></div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-500">Magnésio (Mg²⁺)</span>
                  <div className="text-lg font-black text-slate-900 mt-1">{adjustedWater.mg} <span className="text-[10px] text-slate-400">ppm</span></div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-500">Sódio (Na⁺)</span>
                  <div className="text-lg font-black text-slate-900 mt-1">{adjustedWater.na} <span className="text-[10px] text-slate-400">ppm</span></div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-500">Sulfato (SO₄²⁻)</span>
                  <div className="text-lg font-black text-amber-700 mt-1">{adjustedWater.so4} <span className="text-[10px] text-slate-400">ppm</span></div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-500">Cloreto (Cl⁻)</span>
                  <div className="text-lg font-black text-cyan-700 mt-1">{adjustedWater.cl} <span className="text-[10px] text-slate-400">ppm</span></div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-500">Bicarbonato</span>
                  <div className="text-lg font-black text-slate-800 mt-1">{adjustedWater.hco3} <span className="text-[10px] text-slate-400">ppm</span></div>
                </div>
              </div>

              {/* Relação Sulfato / Cloreto */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500">Relação SO₄ : Cl</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {adjustedWater.sulfateChlorideRatio.toFixed(2)} : 1
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                  {adjustedWater.profileCharacter}
                </div>
              </div>

              {/* Adições de Sais */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Adição de Sais Cervejeiros (Gramas Totais)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Gipsita / CaSO₄ (g)</label>
                    <input
                      type="number"
                      value={salts.gypsumGrams}
                      onChange={(e) => setSalts({ ...salts, gypsumGrams: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-800 focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Cloreto de Cálcio / CaCl₂ (g)</label>
                    <input
                      type="number"
                      value={salts.calciumChlorideGrams}
                      onChange={(e) => setSalts({ ...salts, calciumChlorideGrams: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-cyan-800 focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Sal de Epsom / MgSO₄ (g)</label>
                    <input
                      type="number"
                      value={salts.epsomSaltGrams}
                      onChange={(e) => setSalts({ ...salts, epsomSaltGrams: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Sal de Cozinha / NaCl (g)</label>
                    <input
                      type="number"
                      value={salts.tableSaltGrams}
                      onChange={(e) => setSalts({ ...salts, tableSaltGrams: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs text-slate-700 font-bold">Acidificação Estimada da Mostura (pH ~5.3):</span>
                  </div>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    ~{lacticAcidEstimate} ml de Ácido Lático 85%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ABA 6: MOSTURA & VOLUMES */}
          {activeTab === 'MASH' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-orange-600" />
                  <span>Volumes de Água & Temperatura de Arriação (Strike Temp)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Balanço hídrico completo: água de mostura, temperatura da água para bater os grãos e água de lavagem (Sparge).
                </p>
              </div>

              {/* Grid de Balanço de Volumes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Água de Mostura</span>
                  <div className="text-2xl font-black text-amber-700 mt-1">
                    {mashVolumes.mashWaterLiters} <span className="text-xs font-bold text-slate-400">Litros</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Relação: {mashRatio} L/kg</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Temp. de Arriação (Strike)</span>
                  <div className="text-2xl font-black text-orange-600 mt-1">
                    {mashVolumes.strikeTempCelsius}°C
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Alvo na panela: {targetMashTemp}°C</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Água de Lavagem (Sparge)</span>
                  <div className="text-2xl font-black text-cyan-700 mt-1">
                    {mashVolumes.spargeWaterLiters} <span className="text-xs font-bold text-slate-400">Litros</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Aquecer a 76°C - 78°C</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Volume Pré-Fervura</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {mashVolumes.preBoilVolumeLiters} <span className="text-xs font-bold text-slate-400">Litros</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Evaporação: {mashVolumes.boilOffLiters}L ({boilTimeMinutes}m)</p>
                </div>
              </div>

              {/* Rampas de Temperatura */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Rampas de Mostura (Mash Schedule)</h4>
                  <button
                    type="button"
                    onClick={() => setMashSteps([...mashSteps, { name: 'Nova Rampa', type: 'TEMPERATURE', stepTempCelsius: 72, stepTimeMinutes: 15 }])}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 rounded-lg"
                  >
                    + Rampa
                  </button>
                </div>

                <div className="space-y-2">
                  {mashSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => {
                          const next = [...mashSteps];
                          next[idx].name = e.target.value;
                          setMashSteps(next);
                        }}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-bold focus:outline-none"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={step.stepTempCelsius}
                          onChange={(e) => {
                            const next = [...mashSteps];
                            next[idx].stepTempCelsius = parseFloat(e.target.value) || 0;
                            setMashSteps(next);
                          }}
                          className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-orange-700 font-black text-right focus:outline-none"
                        />
                        <span className="text-xs text-slate-500">°C</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={step.stepTimeMinutes}
                          onChange={(e) => {
                            const next = [...mashSteps];
                            next[idx].stepTimeMinutes = parseInt(e.target.value, 10) || 0;
                            setMashSteps(next);
                          }}
                          className="w-14 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold text-right focus:outline-none"
                        />
                        <span className="text-xs text-slate-500">min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 7: CUSTOS & MAPA */}
          {activeTab === 'COST' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  <span>Precificação, Custo por Litro (CPV) e Dados MAPA</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Controle financeiro do lote e dados de conformidade para emissão de relatórios regulatórios.
                </p>
              </div>

              {/* Cards de Custo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Custo Total de Insumos</span>
                  <div className="text-2xl font-black text-purple-700 mt-1">
                    {formatCurrency(totalCost)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Para lote de {batchVolumeLiters}L</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Custo por Litro (CPV)</span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {formatCurrency(costPerLiter)}/L
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Custo direto de fabricação</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Preço Sugerido de Venda</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {formatCurrency(salePricePerLiter)}/L
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Margem: {profitMarginPercent}%</p>
                </div>
              </div>

              {/* Formulário MAPA */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Registro & Conformidade MAPA</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nº Registro MAPA do Rótulo</label>
                    <input
                      type="text"
                      value={mapaRegistration}
                      onChange={(e) => setMapaRegistration(e.target.value)}
                      placeholder="ex: SP 000000-0.000001"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Denominação Comercial Legal</label>
                    <input
                      type="text"
                      value={commercialDenomination}
                      onChange={(e) => setCommercialDenomination(e.target.value)}
                      placeholder="ex: Cerveja Forte Puro Malte Tipo IPA"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notas Sensoriais & Descrição</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Aromas de frutas tropicais, notas cítricas, amargor limpo e final seco..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS LIGHT */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportXml}
              className="sm:hidden px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl"
            >
              XML
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSaveRecipe}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Receita</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
