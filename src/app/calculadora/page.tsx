'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Beaker,
  Thermometer,
  Activity,
  Flame,
  Sparkles,
  ArrowRightLeft,
  Copy,
  Check,
  RotateCcw,
  Info,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  brixToSg,
  sgToBrix,
  parseBreweryGravity,
  correctRefractometerBrix,
  correctHydrometerTemp,
  calculateAbv,
  calculateCalories,
} from '@/lib/brewing/calculations';

export default function CalculadoraCervejeiraPage() {
  const [activeTab, setActiveTab] = useState<'FG_REFRACTOMETER' | 'OG_CONVERTER' | 'TEMP_CORRECTION' | 'ABV_DIRECT'>('FG_REFRACTOMETER');
  const [copied, setCopied] = useState<boolean>(false);

  // -------------------------------------------------------------
  // ABA 1: CORREÇÃO DE FG COM REFRATÔMETRO NA FERMENTAÇÃO
  // -------------------------------------------------------------
  const [ogInputUnit, setOgInputUnit] = useState<'SG' | 'BRIX'>('SG');
  const [refOgSg, setRefOgSg] = useState<string>('1.054');
  const [refOgBrix, setRefOgBrix] = useState<string>('13.3');
  const [currentBrixInput, setCurrentBrixInput] = useState<string>('6.5');
  const [wcfInput, setWcfInput] = useState<string>('1.00');

  const fgCalcResults = useMemo(() => {
    let baseOgSg = 1.050;
    if (ogInputUnit === 'SG') {
      const parsed = parseBreweryGravity(refOgSg);
      if (parsed && parsed > 1.0) baseOgSg = parsed;
    } else {
      const parsedBrix = parseFloat(refOgBrix.replace(',', '.'));
      if (!isNaN(parsedBrix) && parsedBrix > 0) {
        baseOgSg = Math.round(brixToSg(parsedBrix) * 1000) / 1000;
      }
    }

    const currentBrix = parseFloat(currentBrixInput.replace(',', '.'));
    const wcf = parseFloat(wcfInput.replace(',', '.')) || 1.0;

    if (isNaN(currentBrix) || currentBrix <= 0) {
      return null;
    }

    const corrected = correctRefractometerBrix(baseOgSg, currentBrix, wcf);
    const calories = calculateCalories(baseOgSg, corrected.fgSg);

    // Extrato Aparente (Plato da FG corrigida)
    const apparentExtract = Math.max(0, Math.round(sgToBrix(corrected.fgSg) * 10) / 10);
    // Extrato Real (ASBC)
    const realExtract = Math.max(0, Math.round((0.1808 * sgToBrix(baseOgSg) + 0.8192 * apparentExtract) * 10) / 10);
    // Atenuação Real
    const realAttenuation = Math.max(
      0,
      Math.min(100, Math.round((((sgToBrix(baseOgSg) - realExtract) / sgToBrix(baseOgSg)) * 100) * 10) / 10)
    );
    // ABW (Álcool por Peso)
    const abw = Math.max(0, Math.round(((0.79 * corrected.abv) / corrected.fgSg) * 10) / 10);

    return {
      ogSg: baseOgSg,
      ogBrix: Math.round(sgToBrix(baseOgSg) * 10) / 10,
      measuredBrix: currentBrix,
      fgSg: corrected.fgSg,
      realExtract,
      apparentExtract,
      abv: corrected.abv,
      abw,
      attenuation: corrected.attenuationPercent,
      realAttenuation,
      caloriesPint: calories.calPint,
      caloriesCan: Math.round(calories.cal100ml * 3.55),
    };
  }, [ogInputUnit, refOgSg, refOgBrix, currentBrixInput, wcfInput]);

  // -------------------------------------------------------------
  // ABA 2: CONVERSOR DE MOSTO CRU (OG: BRIX ⟷ SG)
  // -------------------------------------------------------------
  const [convertMode, setConvertMode] = useState<'BRIX_TO_SG' | 'SG_TO_BRIX'>('BRIX_TO_SG');
  const [brixValue, setBrixValue] = useState<string>('12.5');
  const [sgValue, setSgValue] = useState<string>('1.050');

  const rawWortResults = useMemo(() => {
    if (convertMode === 'BRIX_TO_SG') {
      const brix = parseFloat(brixValue.replace(',', '.'));
      if (isNaN(brix) || brix <= 0) return null;
      const calculatedSg = Math.round(brixToSg(brix) * 1000) / 1000;
      const gravityPoints = Math.round((calculatedSg - 1.0) * 1000);
      return {
        input: `${brix.toFixed(1)} °Bx`,
        sg: calculatedSg.toFixed(3),
        points: gravityPoints,
        plato: brix.toFixed(1),
      };
    } else {
      const parsedSg = parseBreweryGravity(sgValue);
      if (!parsedSg || parsedSg <= 1.0) return null;
      const calculatedBrix = Math.round(sgToBrix(parsedSg) * 10) / 10;
      const gravityPoints = Math.round((parsedSg - 1.0) * 1000);
      return {
        input: `${parsedSg.toFixed(3)} SG`,
        sg: parsedSg.toFixed(3),
        points: gravityPoints,
        plato: calculatedBrix.toFixed(1),
      };
    }
  }, [convertMode, brixValue, sgValue]);

  // -------------------------------------------------------------
  // ABA 3: CORREÇÃO DE DENSÍMETRO POR TEMPERATURA
  // -------------------------------------------------------------
  const [tempSgInput, setTempSgInput] = useState<string>('1.045');
  const [sampleTempC, setSampleTempC] = useState<string>('35');
  const [calibTempC, setCalibTempC] = useState<string>('20');

  const tempCorrectionResults = useMemo(() => {
    const parsedSg = parseBreweryGravity(tempSgInput);
    const sTemp = parseFloat(sampleTempC.replace(',', '.'));
    const cTemp = parseFloat(calibTempC.replace(',', '.')) || 20;

    if (!parsedSg || isNaN(sTemp)) return null;

    const correctedSg = correctHydrometerTemp(parsedSg, sTemp, cTemp);
    const diffPoints = Math.round((correctedSg - parsedSg) * 1000);

    return {
      measuredSg: parsedSg,
      sampleTemp: sTemp,
      calibTemp: cTemp,
      correctedSg,
      diffPoints,
      correctedBrix: Math.round(sgToBrix(correctedSg) * 10) / 10,
    };
  }, [tempSgInput, sampleTempC, calibTempC]);

  // -------------------------------------------------------------
  // ABA 4: CALCULADORA DIRETA DE ABV & ATENUAÇÃO (SG DIRETO)
  // -------------------------------------------------------------
  const [directOg, setDirectOg] = useState<string>('1.055');
  const [directFg, setDirectFg] = useState<string>('1.012');

  const directAbvResults = useMemo(() => {
    const og = parseBreweryGravity(directOg);
    const fg = parseBreweryGravity(directFg);

    if (!og || !fg || og <= fg || og <= 1.0) return null;

    const abv = calculateAbv(og, fg);
    const attPercent = Math.round(((og - fg) / (og - 1.0)) * 1000) / 10;
    const calories = calculateCalories(og, fg);
    const abw = Math.round(((0.79 * abv) / fg) * 10) / 10;

    return {
      og,
      fg,
      abv,
      abw,
      attenuation: attPercent,
      calPint: calories.calPint,
      calCan: Math.round(calories.cal100ml * 3.55),
    };
  }, [directOg, directFg]);

  // Copiar resumo
  const handleCopySummary = () => {
    let text = '';
    if (activeTab === 'FG_REFRACTOMETER' && fgCalcResults) {
      text = `📊 *Calculadora PintTech — Correção de Refratômetro*\nOG: ${fgCalcResults.ogSg.toFixed(3)} (${fgCalcResults.ogBrix}°Bx)\nBrix Lido: ${fgCalcResults.measuredBrix}°Bx\n✅ FG Corrigida: ${fgCalcResults.fgSg.toFixed(3)} SG\n🍺 Teor Alcoólico: ${fgCalcResults.abv.toFixed(1)}% ABV\n📈 Atenuação Aparente: ${fgCalcResults.attenuation.toFixed(1)}%\nCalorias: ${fgCalcResults.caloriesPint} kcal/pint\nhttps://calculadora.pinttech.com.br`;
    } else if (activeTab === 'OG_CONVERTER' && rawWortResults) {
      text = `📊 *Calculadora PintTech — Conversão de Mosto Cru*\nEntrada: ${rawWortResults.input}\nDensidade: ${rawWortResults.sg} SG (${rawWortResults.points} pts)\nExtrato: ${rawWortResults.plato} °Plato / °Brix\nhttps://calculadora.pinttech.com.br`;
    } else if (activeTab === 'TEMP_CORRECTION' && tempCorrectionResults) {
      text = `📊 *Calculadora PintTech — Correção de Temperatura*\nDensidade Medida: ${tempCorrectionResults.measuredSg.toFixed(3)} a ${tempCorrectionResults.sampleTemp}°C\n✅ SG Corrigida: ${tempCorrectionResults.correctedSg.toFixed(3)} SG (${tempCorrectionResults.diffPoints > 0 ? `+${tempCorrectionResults.diffPoints}` : tempCorrectionResults.diffPoints} pts)\nhttps://calculadora.pinttech.com.br`;
    } else if (activeTab === 'ABV_DIRECT' && directAbvResults) {
      text = `📊 *Calculadora PintTech — Cálculo de ABV*\nOG: ${directAbvResults.og.toFixed(3)} | FG: ${directAbvResults.fg.toFixed(3)}\n🍺 Teor Alcoólico: ${directAbvResults.abv.toFixed(1)}% ABV\n📈 Atenuação: ${directAbvResults.attenuation.toFixed(1)}%\nCalorias: ${directAbvResults.calPint} kcal/pint\nhttps://calculadora.pinttech.com.br`;
    }

    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* HEADER PRINCIPAL */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white">
                  Pint<span className="text-amber-500">Tech</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Brew Tools
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Calculadora Analítica & Físico-Química Cervejeira</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="https://pinttech.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-amber-400 transition-colors"
            >
              <span>Conheça a Plataforma</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO / APRESENTAÇÃO */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/50 to-slate-950 border-b border-slate-800/80 px-4 py-8 sm:py-10 text-center">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-amber-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Fórmulas Oficiais ASBC & Equação Cúbica de Sean Terrill</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Calculadora de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">Refratômetro, Densidade & ABV</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Converta medições de °Brix para SG no mosto cru, faça a correção exata de álcool no refratômetro durante a fermentação e calcule o teor alcoólico (% ABV) sem complicar sua rotina na cervejaria.
          </p>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <div className="max-w-5xl mx-auto px-4 w-full pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('FG_REFRACTOMETER')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
              activeTab === 'FG_REFRACTOMETER'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Beaker className="w-4 h-4" />
            <span>1. Refratômetro (FG)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OG_CONVERTER')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
              activeTab === 'OG_CONVERTER'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>2. Mosto Cru (OG)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TEMP_CORRECTION')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
              activeTab === 'TEMP_CORRECTION'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Thermometer className="w-4 h-4" />
            <span>3. Temperatura</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ABV_DIRECT')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
              activeTab === 'ABV_DIRECT'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>4. ABV & Densímetro</span>
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-5xl mx-auto px-4 py-8 w-full flex-1">
        {/* ABA 1: CORREÇÃO DE REFRATÔMETRO NA FERMENTAÇÃO */}
        {activeTab === 'FG_REFRACTOMETER' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5 mb-6">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Beaker className="w-5 h-5 text-amber-500" />
                    <span>Correção de FG com Refratômetro (Com Álcool / Fermentação)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Durante a fermentação, o etanol altera o índice de refração do refratômetro. Esta calculadora utiliza a equação cúbica de Sean Terrill para descobrir a FG real, ABV e atenuação.
                  </p>
                </div>

                {fgCalcResults && (
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all self-start sm:self-auto"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Resultado'}</span>
                  </button>
                )}
              </div>

              {/* GRID DE ENTRADA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* 1. OG INICIAL */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-300">1. Densidade Inicial (OG)</label>
                    <div className="inline-flex p-0.5 bg-slate-800 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setOgInputUnit('SG')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          ogInputUnit === 'SG' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'
                        }`}
                      >
                        SG
                      </button>
                      <button
                        type="button"
                        onClick={() => setOgInputUnit('BRIX')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          ogInputUnit === 'BRIX' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'
                        }`}
                      >
                        °Brix
                      </button>
                    </div>
                  </div>

                  {ogInputUnit === 'SG' ? (
                    <div>
                      <input
                        type="text"
                        value={refOgSg}
                        onChange={(e) => setRefOgSg(e.target.value)}
                        placeholder="Ex: 1.054 ou 1054"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-[11px] font-medium text-slate-400 block mt-1.5">
                        Equivalente: ≈ {sgToBrix(parseBreweryGravity(refOgSg) || 1.054).toFixed(1)} °Bx
                      </span>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={refOgBrix}
                        onChange={(e) => setRefOgBrix(e.target.value)}
                        placeholder="Ex: 13.3"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-[11px] font-medium text-slate-400 block mt-1.5">
                        Equivalente: ≈ {brixToSg(parseFloat(refOgBrix.replace(',', '.')) || 13.3).toFixed(3)} SG
                      </span>
                    </div>
                  )}

                  <div className="flex gap-1.5 pt-1">
                    {['1.045', '1.054', '1.065', '1.080'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setOgInputUnit('SG');
                          setRefOgSg(preset);
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 rounded-lg transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. LEITURA ATUAL NO REFRATÔMETRO */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <label className="text-xs font-black text-slate-300 block">
                    2. Leitura Atual no Refratômetro (°Brix)
                  </label>
                  <input
                    type="text"
                    value={currentBrixInput}
                    onChange={(e) => setCurrentBrixInput(e.target.value)}
                    placeholder="Ex: 6.5 ou 7.0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-[11px] font-medium text-slate-400 block">
                    A leitura pura na escala do refratômetro com álcool presente.
                  </span>

                  <div className="flex gap-1.5 pt-1">
                    {['5.5', '6.5', '7.0', '8.0'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCurrentBrixInput(preset)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 rounded-lg transition-colors"
                      >
                        {preset}°Bx
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. FATOR DE CORREÇÃO DO REFRATÔMETRO (WCF) */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-300">3. Fator de Correção (WCF)</label>
                    <span className="text-[10px] font-bold text-slate-500">Padrão: 1.00</span>
                  </div>
                  <input
                    type="text"
                    value={wcfInput}
                    onChange={(e) => setWcfInput(e.target.value)}
                    placeholder="1.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                  <span className="text-[11px] font-medium text-slate-400 block">
                    Wort Correction Factor (WCF). Cervejarias profissionais usam 1.00 a 1.04.
                  </span>

                  <div className="flex gap-1.5 pt-1">
                    {['1.00', '1.02', '1.04'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setWcfInput(val)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 rounded-lg transition-colors"
                      >
                        WCF {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* PAINEL DE RESULTADOS */}
              {fgCalcResults && (
                <div className="mt-7 pt-6 border-t border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Resultados da Fermentação (Corrigido por Sean Terrill)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* FG CORRIGIDA */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/60 to-slate-900 border border-cyan-500/30">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">FG Real Corrigida</span>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        {fgCalcResults.fgSg.toFixed(3)} <span className="text-xs text-cyan-400 font-sans">SG</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 block mt-1">
                        Sem correção pareceria ~{brixToSg(fgCalcResults.measuredBrix).toFixed(3)}
                      </span>
                    </div>

                    {/* TEOR ALCOÓLICO */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Teor Alcoólico (% ABV)</span>
                      <div className="text-2xl font-black text-emerald-300 font-mono mt-1">
                        {fgCalcResults.abv.toFixed(1)}% <span className="text-xs text-emerald-500 font-sans">v/v</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 block mt-1">
                        {fgCalcResults.abw.toFixed(1)}% p/p (ABW)
                      </span>
                    </div>

                    {/* ATENUAÇÃO */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/30">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Atenuação Aparente</span>
                      <div className="text-2xl font-black text-amber-300 font-mono mt-1">
                        {fgCalcResults.attenuation.toFixed(1)}%
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 block mt-1">
                        Atenuação Real: {fgCalcResults.realAttenuation.toFixed(1)}%
                      </span>
                    </div>

                    {/* EXTRATO REAL */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-500/30">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Extrato Real / Aparente</span>
                      <div className="text-2xl font-black text-purple-300 font-mono mt-1">
                        {fgCalcResults.realExtract.toFixed(1)} <span className="text-xs text-purple-400 font-sans">°P</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 block mt-1">
                        Aparente: {fgCalcResults.apparentExtract.toFixed(1)} °P
                      </span>
                    </div>
                  </div>

                  {/* CALORIAS & DETALHES TÉCNICOS */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4 text-slate-300">
                      <div>
                        <span className="text-slate-500 font-medium">Calorias por Lata (355ml):</span>{' '}
                        <strong className="text-white font-mono">{fgCalcResults.caloriesCan} kcal</strong>
                      </div>
                      <div className="h-4 w-px bg-slate-800" />
                      <div>
                        <span className="text-slate-500 font-medium">Por Pint (473ml):</span>{' '}
                        <strong className="text-white font-mono">{fgCalcResults.caloriesPint} kcal</strong>
                      </div>
                    </div>

                    <span className="text-slate-400 text-[11px]">
                      OG Base: <strong className="text-amber-400">{fgCalcResults.ogSg.toFixed(3)}</strong> | Leitura: <strong className="text-cyan-400">{fgCalcResults.measuredBrix}°Bx</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CARD DIDÁTICO: POR QUE CORRIGIR? */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3 text-xs text-slate-400">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Info className="w-4 h-4 text-amber-500" />
                <span>Por que a leitura do refratômetro precisa ser corrigida na fermentação?</span>
              </div>
              <p>
                O refratômetro mede como a luz é refratada ao passar pelo líquido. Ele é calibrado para soluções de <strong>água + sacarose</strong>. Quando a levedura consome os açúcares e produz <strong>etanol</strong>, o índice de refração muda drasticamente (o álcool desvia o feixe de luz muito mais que a água pura).
              </p>
              <p>
                Sem a correção, uma cerveja que começou em 1.054 e atenuou completamente para 1.010 mostraria cerca de <strong>6.5 °Brix</strong> no visor. Se você usasse a conversão direta de mosto cru, acharia que a cerveja estava em 1.026 (travada!). A fórmula de Sean Terrill neutraliza o desvio óptico do álcool e revela a densidade exata.
              </p>
            </div>
          </div>
        )}

        {/* ABA 2: CONVERSOR DE MOSTO CRU (OG: BRIX ⟷ SG) */}
        {activeTab === 'OG_CONVERTER' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5 mb-6">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                    <span>Conversor de Mosto Cru (OG: Brix ⟷ SG)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Para uso antes da fermentação (mosturação, pós-fervura e whirlpool). Sem presença de álcool.
                  </p>
                </div>

                {rawWortResults && (
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all self-start sm:self-auto"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Resultado'}</span>
                  </button>
                )}
              </div>

              {/* SELETOR DE DIREÇÃO */}
              <div className="flex items-center gap-2 pb-6">
                <button
                  type="button"
                  onClick={() => setConvertMode('BRIX_TO_SG')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    convertMode === 'BRIX_TO_SG'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Converter °Brix ➔ SG (Gravidade)
                </button>
                <button
                  type="button"
                  onClick={() => setConvertMode('SG_TO_BRIX')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    convertMode === 'SG_TO_BRIX'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Converter SG (Gravidade) ➔ °Brix
                </button>
              </div>

              {/* INPUT & RESULTADO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4">
                  {convertMode === 'BRIX_TO_SG' ? (
                    <div>
                      <label className="text-xs font-black text-slate-300 block mb-1.5">
                        Extrato do Mosto Cru (°Brix / °Plato)
                      </label>
                      <input
                        type="text"
                        value={brixValue}
                        onChange={(e) => setBrixValue(e.target.value)}
                        placeholder="Ex: 12.5"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-black text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="flex flex-wrap gap-2 pt-3">
                        {['10.0', '12.0', '13.5', '15.0', '18.0', '20.0'].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setBrixValue(b)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg transition-colors"
                          >
                            {b}°Bx
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-black text-slate-300 block mb-1.5">
                        Densidade do Mosto Cru (SG)
                      </label>
                      <input
                        type="text"
                        value={sgValue}
                        onChange={(e) => setSgValue(e.target.value)}
                        placeholder="Ex: 1.050 ou 1050"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-black text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="flex flex-wrap gap-2 pt-3">
                        {['1.040', '1.048', '1.055', '1.062', '1.075', '1.085'].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSgValue(s)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* CARD DE RESULTADO */}
                {rawWortResults && (
                  <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-4">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                      Equivalência Calculada
                    </span>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Gravidade Específica (SG)</span>
                        <div className="text-3xl font-black font-mono text-white mt-1">
                          {rawWortResults.sg}
                        </div>
                        <span className="text-xs font-bold text-amber-400 block mt-0.5">
                          {rawWortResults.points} pontos de gravidade
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Extrato Solúvel (°Brix / Plato)</span>
                        <div className="text-3xl font-black font-mono text-cyan-300 mt-1">
                          {rawWortResults.plato} <span className="text-sm font-sans text-cyan-500">°P</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 block mt-0.5">
                          % de açúcares por peso
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                      Fórmula: Polinômio ASBC de alta precisão para soluções aquosas de sacarose e maltose.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* TABELA DE REFERÊNCIA RÁPIDA */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
              <h3 className="text-sm font-black text-white mb-3">Tabela de Consulta Rápida (Mosto Cru)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                {[
                  { b: 8.0, sg: '1.032' },
                  { b: 10.0, sg: '1.040' },
                  { b: 11.0, sg: '1.044' },
                  { b: 12.0, sg: '1.048' },
                  { b: 12.5, sg: '1.050' },
                  { b: 13.0, sg: '1.053' },
                  { b: 14.0, sg: '1.057' },
                  { b: 15.0, sg: '1.061' },
                  { b: 16.0, sg: '1.065' },
                  { b: 18.0, sg: '1.074' },
                  { b: 20.0, sg: '1.083' },
                  { b: 22.0, sg: '1.092' },
                ].map((row) => (
                  <div key={row.b} className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="font-mono font-black text-cyan-400">{row.b.toFixed(1)}°Bx</span>
                    <span className="font-mono font-bold text-amber-300">{row.sg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: CORREÇÃO DE DENSÍMETRO POR TEMPERATURA */}
        {activeTab === 'TEMP_CORRECTION' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5 mb-6">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-amber-500" />
                    <span>Correção de Densímetro por Temperatura</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Densímetros de vidro são calibrados a 20°C (ou 15°C). Quando você mede o mosto quente ou a cerveja muito fria, a densidade lida fica incorreta.
                  </p>
                </div>

                {tempCorrectionResults && (
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all self-start sm:self-auto"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Resultado'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <label className="text-xs font-black text-slate-300 block">
                    Densidade Lida no Densímetro (SG)
                  </label>
                  <input
                    type="text"
                    value={tempSgInput}
                    onChange={(e) => setTempSgInput(e.target.value)}
                    placeholder="Ex: 1.045 ou 1045"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-500 block">Valor marcado no tubo de vidro</span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <label className="text-xs font-black text-slate-300 block">
                    Temperatura da Amostra (°C)
                  </label>
                  <input
                    type="text"
                    value={sampleTempC}
                    onChange={(e) => setSampleTempC(e.target.value)}
                    placeholder="Ex: 35 ou 50"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-[11px] text-slate-500 block">Temperatura do líquido no momento da medição</span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <label className="text-xs font-black text-slate-300 block">
                    Calibração do Densímetro (°C)
                  </label>
                  <input
                    type="text"
                    value={calibTempC}
                    onChange={(e) => setCalibTempC(e.target.value)}
                    placeholder="20"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                  <span className="text-[11px] text-slate-500 block">Normalmente 20°C no Brasil (ou 15°C / 68°F)</span>
                </div>
              </div>

              {tempCorrectionResults && (
                <div className="mt-7 pt-6 border-t border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Densidade Real Corrigida
                      </span>
                      <div className="text-3xl font-black text-white font-mono mt-1">
                        {tempCorrectionResults.correctedSg.toFixed(3)}{' '}
                        <span className="text-xs font-sans text-emerald-400">SG</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 block mt-1">
                        ≈ {tempCorrectionResults.correctedBrix.toFixed(1)} °Bx / Plato
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Ajuste Térmico Aplicado
                      </span>
                      <div className="text-3xl font-black font-mono text-slate-200 mt-1">
                        {tempCorrectionResults.diffPoints > 0 ? `+${tempCorrectionResults.diffPoints}` : tempCorrectionResults.diffPoints}{' '}
                        <span className="text-xs font-sans text-slate-400">pontos</span>
                      </div>
                      <span className="text-xs text-slate-400 block mt-1">
                        Diferença de {Math.abs(tempCorrectionResults.sampleTemp - tempCorrectionResults.calibTemp)}°C
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-center text-xs text-slate-400 space-y-1">
                      <div>
                        Lido na proveta: <strong className="text-white font-mono">{tempCorrectionResults.measuredSg.toFixed(3)}</strong>
                      </div>
                      <div>
                        Temperatura da amostra: <strong className="text-cyan-400 font-mono">{tempCorrectionResults.sampleTemp}°C</strong>
                      </div>
                      <div>
                        Temperatura padrão: <strong className="text-slate-200 font-mono">{tempCorrectionResults.calibTemp}°C</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 4: ABV DIRETO COM DENSÍMETRO (OG & FG) */}
        {activeTab === 'ABV_DIRECT' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5 mb-6">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-500" />
                    <span>Cálculo Direto de Teor Alcoólico & Atenuação (SG Direto)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Para medições feitas diretamente em Gravidade Específica (Densímetro de vidro, Anton Paar EasyDens ou densímetros digitais).
                  </p>
                </div>

                {directAbvResults && (
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all self-start sm:self-auto"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Resultado'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <label className="text-xs font-black text-slate-300 block">
                    OG Medida (Densidade Inicial)
                  </label>
                  <input
                    type="text"
                    value={directOg}
                    onChange={(e) => setDirectOg(e.target.value)}
                    placeholder="Ex: 1.055 ou 1055"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-500 block">
                    ≈ {sgToBrix(parseBreweryGravity(directOg) || 1.055).toFixed(1)} °Plato / °Brix
                  </span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <label className="text-xs font-black text-slate-300 block">
                    FG Medida (Densidade Final)
                  </label>
                  <input
                    type="text"
                    value={directFg}
                    onChange={(e) => setDirectFg(e.target.value)}
                    placeholder="Ex: 1.012 ou 1012"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-[11px] text-slate-500 block">
                    ≈ {sgToBrix(parseBreweryGravity(directFg) || 1.012).toFixed(1)} °Plato / °Brix
                  </span>
                </div>
              </div>

              {directAbvResults && (
                <div className="mt-7 pt-6 border-t border-slate-800">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Teor Alcoólico (% ABV)
                      </span>
                      <div className="text-3xl font-black text-emerald-300 font-mono mt-1">
                        {directAbvResults.abv.toFixed(1)}% <span className="text-xs font-sans text-emerald-500">v/v</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 block mt-1">
                        {directAbvResults.abw.toFixed(1)}% p/p (ABW)
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/30">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Atenuação Aparente
                      </span>
                      <div className="text-3xl font-black text-amber-300 font-mono mt-1">
                        {directAbvResults.attenuation.toFixed(1)}%
                      </div>
                      <span className="text-xs text-slate-400 block mt-1">
                        Consumo de açúcares
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Calorias por Pint (473ml)
                      </span>
                      <div className="text-3xl font-black font-mono text-white mt-1">
                        {directAbvResults.calPint} <span className="text-xs font-sans text-slate-400">kcal</span>
                      </div>
                      <span className="text-xs text-slate-400 block mt-1">
                        Lata (355ml): {directAbvResults.calCan} kcal
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-center text-xs text-slate-400 space-y-1">
                      <div>
                        OG: <strong className="text-amber-400 font-mono">{directAbvResults.og.toFixed(3)}</strong>
                      </div>
                      <div>
                        FG: <strong className="text-cyan-400 font-mono">{directAbvResults.fg.toFixed(3)}</strong>
                      </div>
                      <div>
                        Pontos fermentados: <strong className="text-white font-mono">{Math.round((directAbvResults.og - directAbvResults.fg) * 1000)} pts</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-900/50 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">PintTech Brew Tools</span>
            <span>•</span>
            <span>Calculadora Cervejeira Oficial</span>
          </div>

          <Link
            href="https://pinttech.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-amber-500 hover:text-amber-400 transition-colors"
          >
            <span>Gerencie toda a sua cervejaria com o PintTech ERP</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
