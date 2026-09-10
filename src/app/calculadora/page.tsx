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
  Sun,
  Moon,
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // -------------------------------------------------------------
  // ABA 1: CORREÇÃO DE FG COM REFRATÔMETRO NA FERMENTAÇÃO
  // -------------------------------------------------------------
  const [ogInputUnit, setOgInputUnit] = useState<'SG' | 'BRIX'>('SG');
  const [refOgSg, setRefOgSg] = useState<string>('1.054');
  const [refOgBrix, setRefOgBrix] = useState<string>('13.3');
  const [currentBrixInput, setCurrentBrixInput] = useState<string>('6.5');

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
    const wcf = 1.00; // Fator de correção padrão (WCF 1.00)

    if (isNaN(currentBrix) || currentBrix <= 0) {
      return null;
    }

    const corrected = correctRefractometerBrix(baseOgSg, currentBrix, wcf);
    const calories = calculateCalories(baseOgSg, corrected.fgSg);

    const apparentExtract = Math.max(0, Math.round(sgToBrix(corrected.fgSg) * 10) / 10);
    const realExtract = Math.max(0, Math.round((0.1808 * sgToBrix(baseOgSg) + 0.8192 * apparentExtract) * 10) / 10);
    const realAttenuation = Math.max(
      0,
      Math.min(100, Math.round((((sgToBrix(baseOgSg) - realExtract) / sgToBrix(baseOgSg)) * 100) * 10) / 10)
    );
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
  }, [ogInputUnit, refOgSg, refOgBrix, currentBrixInput]);

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
    <div className={`min-h-screen transition-colors duration-200 flex flex-col font-sans selection:bg-amber-500 selection:text-white ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* HEADER PRINCIPAL */}
      <header className={`border-b sticky top-0 z-50 transition-colors ${
        isDarkMode ? 'border-slate-800 bg-slate-900/90 backdrop-blur-md' : 'border-slate-200 bg-white/95 backdrop-blur-md shadow-xs'
      }`}>
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-black">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Pint<span className="text-amber-600">Tech</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Brew Tools
                </span>
              </div>
              <p className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Calculadora Analítica & Físico-Química Cervejeira
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* TOGGLE MODO CLARO / ESCURO */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl border transition-all ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              href="https://pinttech.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-black transition-colors ${
                isDarkMode ? 'text-slate-300 hover:text-amber-400' : 'text-slate-700 hover:text-amber-600'
              }`}
            >
              <span>Conheça a Plataforma</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO / APRESENTAÇÃO */}
      <div className={`border-b px-4 py-8 sm:py-10 text-center transition-colors ${
        isDarkMode
          ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800'
          : 'bg-gradient-to-b from-slate-100 via-amber-50/30 to-slate-50 border-slate-200'
      }`}>
        <div className="max-w-3xl mx-auto space-y-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
            isDarkMode
              ? 'bg-slate-800 border-slate-700 text-amber-400'
              : 'bg-amber-100/90 border-amber-300 text-amber-900'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Fórmulas Oficiais ASBC & Equação Cúbica de Sean Terrill</span>
          </div>

          <h1 className={`text-2xl sm:text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
            Calculadora de <span className="text-amber-600">Refratômetro, Densidade & ABV</span>
          </h1>

          <p className={`text-xs sm:text-sm font-medium max-w-2xl mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Converta medições de °Brix para SG no mosto cru, faça a correção exata de álcool no refratômetro durante a fermentação e calcule o teor alcoólico (% ABV) com alta precisão e leitura limpa.
          </p>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <div className="max-w-5xl mx-auto px-4 w-full pt-6">
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl border transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('FG_REFRACTOMETER')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all ${
              activeTab === 'FG_REFRACTOMETER'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : isDarkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <Beaker className="w-4 h-4" />
            <span>1. Refratômetro (FG)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OG_CONVERTER')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all ${
              activeTab === 'OG_CONVERTER'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : isDarkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>2. Mosto Cru (OG)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TEMP_CORRECTION')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all ${
              activeTab === 'TEMP_CORRECTION'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : isDarkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <Thermometer className="w-4 h-4" />
            <span>3. Temperatura</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ABV_DIRECT')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all ${
              activeTab === 'ABV_DIRECT'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : isDarkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
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
            <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-5 mb-6 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h2 className={`text-xl font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                    <Beaker className="w-5 h-5 text-amber-600" />
                    <span>Correção de FG com Refratômetro (Com Álcool / Fermentação)</span>
                  </h2>
                  <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    O etanol distorce o índice de refração do refratômetro. Esta ferramenta aplica a equação cúbica de Sean Terrill para revelar a densidade real, o teor alcoólico e a atenuação.
                  </p>
                </div>

                {fgCalcResults && (
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border transition-all self-start sm:self-auto shadow-xs ${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    <span>{copied ? '✓ Copiado!' : 'Copiar Resultado'}</span>
                  </button>
                )}
              </div>

              {/* GRID DE ENTRADA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* 1. OG INICIAL */}
                <div className={`rounded-2xl p-5 border space-y-3 ${
                  isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      1. Densidade Inicial (OG)
                    </label>
                    <div className={`inline-flex p-0.5 rounded-lg text-[10px] font-black border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setOgInputUnit('SG')}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          ogInputUnit === 'SG'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : isDarkMode ? 'text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        SG
                      </button>
                      <button
                        type="button"
                        onClick={() => setOgInputUnit('BRIX')}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          ogInputUnit === 'BRIX'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : isDarkMode ? 'text-slate-400' : 'text-slate-700'
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
                        className={`w-full rounded-xl px-4 py-3 text-base font-mono font-black border-2 focus:outline-none transition-all shadow-xs ${
                          isDarkMode
                            ? 'bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500'
                            : 'bg-white border-slate-300 text-amber-800 focus:border-amber-500'
                        }`}
                      />
                      <span className={`text-xs font-bold block mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Equivalente: ≈ <strong className="text-amber-600">{sgToBrix(parseBreweryGravity(refOgSg) || 1.054).toFixed(1)} °Bx</strong>
                      </span>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={refOgBrix}
                        onChange={(e) => setRefOgBrix(e.target.value)}
                        placeholder="Ex: 13.3"
                        className={`w-full rounded-xl px-4 py-3 text-base font-mono font-black border-2 focus:outline-none transition-all shadow-xs ${
                          isDarkMode
                            ? 'bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500'
                            : 'bg-white border-slate-300 text-amber-800 focus:border-amber-500'
                        }`}
                      />
                      <span className={`text-xs font-bold block mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Equivalente: ≈ <strong className="text-amber-600">{brixToSg(parseFloat(refOgBrix.replace(',', '.')) || 13.3).toFixed(3)} SG</strong>
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['1.045', '1.054', '1.065', '1.080'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setOgInputUnit('SG');
                          setRefOgSg(preset);
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                          isDarkMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            : 'bg-white hover:bg-amber-50 text-slate-800 border-slate-200 hover:border-amber-300'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. LEITURA ATUAL NO REFRATÔMETRO */}
                <div className={`rounded-2xl p-5 border space-y-3 ${
                  isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className={`text-xs font-black block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    2. Leitura no Refratômetro (°Brix)
                  </label>
                  <input
                    type="text"
                    value={currentBrixInput}
                    onChange={(e) => setCurrentBrixInput(e.target.value)}
                    placeholder="Ex: 6.5 ou 7.0"
                    className={`w-full rounded-xl px-4 py-3 text-base font-mono font-black border-2 focus:outline-none transition-all shadow-xs ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-cyan-400 focus:border-cyan-500'
                        : 'bg-white border-slate-300 text-cyan-800 focus:border-cyan-500'
                    }`}
                  />
                  <span className={`text-xs font-medium block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Valor medido na escala do aparelho com álcool.
                  </span>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['5.5', '6.5', '7.0', '8.0'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCurrentBrixInput(preset)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                          isDarkMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            : 'bg-white hover:bg-cyan-50 text-slate-800 border-slate-200 hover:border-cyan-300'
                        }`}
                      >
                        {preset}°Bx
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* PAINEL DE RESULTADOS COM ALTO CONTRASTE */}
              {fgCalcResults && (
                <div className={`mt-8 pt-7 border-t space-y-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Resultados da Fermentação Corrigida (Sean Terrill)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* FG CORRIGIDA */}
                    <div className="p-5 rounded-2xl bg-cyan-50 border-2 border-cyan-300 text-cyan-950 shadow-xs">
                      <span className="text-[11px] font-black text-cyan-900 uppercase tracking-wider block">
                        FG Real Corrigida
                      </span>
                      <div className="text-3xl sm:text-4xl font-black font-mono text-cyan-950 mt-1.5">
                        {fgCalcResults.fgSg.toFixed(3)} <span className="text-sm font-sans font-black text-cyan-700">SG</span>
                      </div>
                      <span className="text-xs font-bold text-cyan-800 block mt-2">
                        Sem correção pareceria ~{brixToSg(fgCalcResults.measuredBrix).toFixed(3)}
                      </span>
                    </div>

                    {/* TEOR ALCOÓLICO */}
                    <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-xs">
                      <span className="text-[11px] font-black text-emerald-900 uppercase tracking-wider block">
                        Teor Alcoólico (% ABV)
                      </span>
                      <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-950 mt-1.5">
                        {fgCalcResults.abv.toFixed(1)}% <span className="text-sm font-sans font-black text-emerald-700">v/v</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-800 block mt-2">
                        {fgCalcResults.abw.toFixed(1)}% peso/peso (ABW)
                      </span>
                    </div>

                    {/* ATENUAÇÃO */}
                    <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-xs">
                      <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider block">
                        Atenuação Aparente
                      </span>
                      <div className="text-3xl sm:text-4xl font-black font-mono text-amber-950 mt-1.5">
                        {fgCalcResults.attenuation.toFixed(1)}%
                      </div>
                      <span className="text-xs font-bold text-amber-800 block mt-2">
                        Atenuação Real: {fgCalcResults.realAttenuation.toFixed(1)}%
                      </span>
                    </div>

                    {/* EXTRATO REAL */}
                    <div className="p-5 rounded-2xl bg-purple-50 border-2 border-purple-300 text-purple-950 shadow-xs">
                      <span className="text-[11px] font-black text-purple-900 uppercase tracking-wider block">
                        Extrato Real / Aparente
                      </span>
                      <div className="text-3xl sm:text-4xl font-black font-mono text-purple-950 mt-1.5">
                        {fgCalcResults.realExtract.toFixed(1)} <span className="text-sm font-sans font-black text-purple-700">°P</span>
                      </div>
                      <span className="text-xs font-bold text-purple-800 block mt-2">
                        Aparente: {fgCalcResults.apparentExtract.toFixed(1)} °P
                      </span>
                    </div>
                  </div>

                  {/* CALORIAS & RESUMO DA LEITURA */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800 font-medium'
                  }`}>
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-slate-500 font-bold">Calorias por Lata (355ml):</span>{' '}
                        <strong className="font-mono font-black text-slate-900 dark:text-white">{fgCalcResults.caloriesCan} kcal</strong>
                      </div>
                      <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
                      <div>
                        <span className="text-slate-500 font-bold">Por Pint (473ml):</span>{' '}
                        <strong className="font-mono font-black text-slate-900 dark:text-white">{fgCalcResults.caloriesPint} kcal</strong>
                      </div>
                    </div>

                    <div className="text-xs font-bold">
                      OG Base: <span className="text-amber-700 dark:text-amber-400 font-mono font-black">{fgCalcResults.ogSg.toFixed(3)}</span> | 
                      Brix Lido: <span className="text-cyan-700 dark:text-cyan-400 font-mono font-black">{fgCalcResults.measuredBrix}°Bx</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CARD DIDÁTICO: POR QUE CORRIGIR? */}
            <div className={`p-6 rounded-3xl border space-y-3 text-xs leading-relaxed ${
              isDarkMode
                ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                : 'bg-amber-50/70 border-amber-200 text-amber-950 font-medium'
            }`}>
              <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-400 text-sm">
                <Info className="w-5 h-5 text-amber-600" />
                <span>Por que a leitura do refratômetro precisa de correção durante a fermentação?</span>
              </div>
              <p>
                O refratômetro mede o desvio da luz através do líquido e é calibrado de fábrica para soluções de <strong>água + sacarose</strong>. Quando a levedura fermenta os açúcares e produz <strong>etanol</strong>, o índice óptico se altera profundamente (o álcool desvia a luz muito mais que a água pura).
              </p>
              <p>
                Sem essa correção, uma cerveja que começou em 1.054 e fermentou até 1.010 mostraria aproximadamente <strong>6.5 °Brix</strong> no visor. Se convertida diretamente como mosto cru, pareceria estar travada em 1.026. A fórmula de Sean Terrill elimina essa distorção e revela a gravidade real.
              </p>
            </div>
          </div>
        )}

        {/* ABA 2: CONVERSOR DE MOSTO CRU (OG: BRIX ⟷ SG) */}
        {activeTab === 'OG_CONVERTER' && (
          <div className="space-y-6">
            <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-5 mb-6 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h2 className={`text-xl font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                    <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                    <span>Conversor de Mosto Cru (OG: Brix ⟷ SG)</span>
                  </h2>
                  <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Para medições antes da fermentação (mosturação, pós-fervura e whirlpool). Sem presença de álcool.
                  </p>
                </div>

                {rawWortResults && (
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border transition-all self-start sm:self-auto shadow-xs ${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    <span>{copied ? '✓ Copiado!' : 'Copiar Resultado'}</span>
                  </button>
                )}
              </div>

              {/* SELETOR DE DIREÇÃO */}
              <div className="flex flex-wrap items-center gap-3 pb-6">
                <button
                  type="button"
                  onClick={() => setConvertMode('BRIX_TO_SG')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    convertMode === 'BRIX_TO_SG'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                      : isDarkMode
                      ? 'bg-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Converter °Brix ➔ SG (Gravidade)
                </button>
                <button
                  type="button"
                  onClick={() => setConvertMode('SG_TO_BRIX')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    convertMode === 'SG_TO_BRIX'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                      : isDarkMode
                      ? 'bg-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Converter SG (Gravidade) ➔ °Brix
                </button>
              </div>

              {/* INPUT & RESULTADO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div className={`rounded-2xl p-6 border space-y-4 ${
                  isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  {convertMode === 'BRIX_TO_SG' ? (
                    <div>
                      <label className={`text-xs font-black block mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        Extrato do Mosto Cru (°Brix / °Plato)
                      </label>
                      <input
                        type="text"
                        value={brixValue}
                        onChange={(e) => setBrixValue(e.target.value)}
                        placeholder="Ex: 12.5"
                        className={`w-full rounded-xl px-4 py-3 text-xl font-mono font-black border-2 focus:outline-none transition-all shadow-xs ${
                          isDarkMode
                            ? 'bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500'
                            : 'bg-white border-slate-300 text-amber-800 focus:border-amber-500'
                        }`}
                      />
                      <div className="flex flex-wrap gap-2 pt-4">
                        {['10.0', '12.0', '13.5', '15.0', '18.0', '20.0'].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setBrixValue(b)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                              isDarkMode
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                : 'bg-white hover:bg-amber-50 text-slate-800 border-slate-200 hover:border-amber-300'
                            }`}
                          >
                            {b}°Bx
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className={`text-xs font-black block mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        Densidade do Mosto Cru (SG)
                      </label>
                      <input
                        type="text"
                        value={sgValue}
                        onChange={(e) => setSgValue(e.target.value)}
                        placeholder="Ex: 1.050 ou 1050"
                        className={`w-full rounded-xl px-4 py-3 text-xl font-mono font-black border-2 focus:outline-none transition-all shadow-xs ${
                          isDarkMode
                            ? 'bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500'
                            : 'bg-white border-slate-300 text-amber-800 focus:border-amber-500'
                        }`}
                      />
                      <div className="flex flex-wrap gap-2 pt-4">
                        {['1.040', '1.048', '1.055', '1.062', '1.075', '1.085'].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSgValue(s)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                              isDarkMode
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                : 'bg-white hover:bg-amber-50 text-slate-800 border-slate-200 hover:border-amber-300'
                            }`}
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
                  <div className={`rounded-2xl p-6 border-2 space-y-4 shadow-xs ${
                    isDarkMode ? 'bg-slate-950 border-amber-500/40' : 'bg-amber-50/90 border-amber-300'
                  }`}>
                    <span className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                      Equivalência Calculada
                    </span>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase block">
                          Gravidade Específica (SG)
                        </span>
                        <div className="text-3xl sm:text-4xl font-black font-mono text-slate-950 dark:text-white mt-1">
                          {rawWortResults.sg}
                        </div>
                        <span className="text-xs font-black text-amber-700 dark:text-amber-400 block mt-1">
                          {rawWortResults.points} pontos de gravidade
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase block">
                          Extrato Solúvel (°Brix)
                        </span>
                        <div className="text-3xl sm:text-4xl font-black font-mono text-cyan-900 dark:text-cyan-300 mt-1">
                          {rawWortResults.plato} <span className="text-sm font-sans text-cyan-700 dark:text-cyan-500 font-bold">°P</span>
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mt-1">
                          % sacarose por peso
                        </span>
                      </div>
                    </div>

                    <div className={`pt-3 border-t text-[11px] font-medium ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-amber-200 text-amber-900'}`}>
                      Fórmula: Polinômio oficial ASBC para soluções aquosas de mosto não fermentado.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* TABELA DE REFERÊNCIA RÁPIDA */}
            <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className={`text-sm font-black mb-4 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                Tabela de Consulta Rápida (Mosto Cru)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 text-xs">
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
                  <div key={row.b} className={`p-3 rounded-xl border flex items-center justify-between font-bold shadow-xs ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="font-mono font-black text-cyan-800 dark:text-cyan-400">{row.b.toFixed(1)}°Bx</span>
                    <span className="font-mono font-black text-amber-800 dark:text-amber-300">{row.sg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: CORREÇÃO DE DENSÍMETRO POR TEMPERATURA */}
        {activeTab === 'TEMP_CORRECTION' && (
          <div className="space-y-6">
            <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-5 mb-6 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h2 className={`text-xl font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                    <Thermometer className="w-5 h-5 text-amber-600" />
                    <span>Correção de Densímetro por Temperatura</span>
                  </h2>
                  <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Densímetros de vidro são calibrados para 20°C (ou 15°C). Quando a amostra está quente ou fria, o vidro e o líquido dilatam, alterando a leitura.
                  </p>
                </div>

                {tempCorrectionResults && (
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border transition-all self-start sm:self-auto shadow-xs ${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    <span>{copied ? '✓ Copiado!' : 'Copiar Resultado'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className={`rounded-2xl p-5 border space-y-2 ${
                  isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className={`text-xs font-black block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    Densidade Lida na Proveta (SG)
                  </label>
                  <input
                    type="text"
                    value={tempSgInput}
                    onChange={(e) => setTempSgInput(e.target.value)}
                    placeholder="Ex: 1.045 ou 1045"
                    className={`w-full rounded-xl px-4 py-3 text-base font-mono font-black border-2 focus:outline-none transition-all shadow-xs ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500'
                        : 'bg-white border-slate-300 text-amber-800 focus:border-amber-500'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-slate-500 block">Valor marcado na escala de vidro</span>
                </div>

                <div className={`rounded-2xl p-5 border space-y-2 ${
                  isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className={`text-xs font-black block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    Temperatura da Amostra (°C)
                  </label>
                  <input
                    type="text"
                    value={sampleTempC}
                    onChange={(e) => setSampleTempC(e.target.value)}
                    placeholder="Ex: 35 ou 50"
                    className={`w-full rounded-xl px-4 py-3 text-base font-mono font-black border-2 focus:outline-none transition-all shadow-xs ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-cyan-400 focus:border-cyan-500'
                        : 'bg-white border-slate-300 text-cyan-800 focus:border-cyan-500'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-slate-500 block">Temperatura do líquido na proveta</span>
                </div>

                <div className={`rounded-2xl p-5 border space-y-2 ${
                  isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className={`text-xs font-black block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    Calibração do Densímetro (°C)
                  </label>
                  <input
                    type="text"
                    value={calibTempC}
                    onChange={(e) => setCalibTempC(e.target.value)}
                    placeholder="20"
                    className={`w-full rounded-xl px-4 py-3 text-base font-mono font-black border-2 focus:outline-none transition-all shadow-xs ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-slate-500 block">Geralmente 20°C no Brasil (ou 15°C)</span>
                </div>
              </div>

              {tempCorrectionResults && (
                <div className={`mt-8 pt-7 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-xs">
                      <span className="text-[11px] font-black text-emerald-900 uppercase tracking-wider block">
                        Densidade Real Corrigida
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-emerald-950 font-mono mt-1.5">
                        {tempCorrectionResults.correctedSg.toFixed(3)}{' '}
                        <span className="text-sm font-sans font-black text-emerald-700">SG</span>
                      </div>
                      <span className="text-xs font-black text-emerald-800 block mt-2">
                        ≈ {tempCorrectionResults.correctedBrix.toFixed(1)} °Bx / Plato
                      </span>
                    </div>

                    <div className={`p-5 rounded-2xl border ${
                      isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                        Ajuste Térmico Aplicado
                      </span>
                      <div className={`text-3xl sm:text-4xl font-black font-mono mt-1.5 ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {tempCorrectionResults.diffPoints > 0 ? `+${tempCorrectionResults.diffPoints}` : tempCorrectionResults.diffPoints}{' '}
                        <span className="text-sm font-sans font-bold text-slate-500">pontos</span>
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mt-2">
                        Diferença de {Math.abs(tempCorrectionResults.sampleTemp - tempCorrectionResults.calibTemp)}°C
                      </span>
                    </div>

                    <div className={`p-5 rounded-2xl border flex flex-col justify-center text-xs font-medium space-y-1.5 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div>
                        Lido na proveta: <strong className="font-mono font-black text-slate-950 dark:text-white">{tempCorrectionResults.measuredSg.toFixed(3)}</strong>
                      </div>
                      <div>
                        Temperatura da amostra: <strong className="font-mono font-black text-cyan-700 dark:text-cyan-400">{tempCorrectionResults.sampleTemp}°C</strong>
                      </div>
                      <div>
                        Temperatura padrão: <strong className="font-mono font-black text-slate-950 dark:text-white">{tempCorrectionResults.calibTemp}°C</strong>
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
            <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-5 mb-6 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h2 className={`text-xl font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                    <Flame className="w-5 h-5 text-amber-600" />
                    <span>Cálculo Direto de Teor Alcoólico & Atenuação (SG Direto)</span>
                  </h2>
                  <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Para medições feitas em Gravidade Específica com densímetro de vidro, Anton Paar EasyDens ou densímetros digitais.
                  </p>
                </div>

                {directAbvResults && (
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border transition-all self-start sm:self-auto shadow-xs ${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    <span>{copied ? '✓ Copiado!' : 'Copiar Resultado'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className={`rounded-2xl p-5 border space-y-2 ${
                  isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className={`text-xs font-black block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    OG Medida (Densidade Inicial)
                  </label>
                  <input
                    type="text"
                    value={directOg}
                    onChange={(e) => setDirectOg(e.target.value)}
                    placeholder="Ex: 1.055 ou 1055"
                    className={`w-full rounded-xl px-4 py-3 text-base font-mono font-black border-2 focus:outline-none transition-all shadow-xs ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500'
                        : 'bg-white border-slate-300 text-amber-800 focus:border-amber-500'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mt-1">
                    ≈ <strong className="text-amber-600">{sgToBrix(parseBreweryGravity(directOg) || 1.055).toFixed(1)} °Plato / °Brix</strong>
                  </span>
                </div>

                <div className={`rounded-2xl p-5 border space-y-2 ${
                  isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className={`text-xs font-black block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    FG Medida (Densidade Final)
                  </label>
                  <input
                    type="text"
                    value={directFg}
                    onChange={(e) => setDirectFg(e.target.value)}
                    placeholder="Ex: 1.012 ou 1012"
                    className={`w-full rounded-xl px-4 py-3 text-base font-mono font-black border-2 focus:outline-none transition-all shadow-xs ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-cyan-400 focus:border-cyan-500'
                        : 'bg-white border-slate-300 text-cyan-800 focus:border-cyan-500'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mt-1">
                    ≈ <strong className="text-cyan-600">{sgToBrix(parseBreweryGravity(directFg) || 1.012).toFixed(1)} °Plato / °Brix</strong>
                  </span>
                </div>
              </div>

              {directAbvResults && (
                <div className={`mt-8 pt-7 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-xs">
                      <span className="text-[11px] font-black text-emerald-900 uppercase tracking-wider block">
                        Teor Alcoólico (% ABV)
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-emerald-950 font-mono mt-1.5">
                        {directAbvResults.abv.toFixed(1)}% <span className="text-sm font-sans font-black text-emerald-700">v/v</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-800 block mt-2">
                        {directAbvResults.abw.toFixed(1)}% peso/peso (ABW)
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-xs">
                      <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider block">
                        Atenuação Aparente
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-amber-950 font-mono mt-1.5">
                        {directAbvResults.attenuation.toFixed(1)}%
                      </div>
                      <span className="text-xs font-bold text-amber-800 block mt-2">
                        Açúcares consumidos
                      </span>
                    </div>

                    <div className={`p-5 rounded-2xl border ${
                      isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                        Calorias por Pint (473ml)
                      </span>
                      <div className={`text-3xl sm:text-4xl font-black font-mono mt-1.5 ${
                        isDarkMode ? 'text-white' : 'text-slate-950'
                      }`}>
                        {directAbvResults.calPint} <span className="text-sm font-sans text-slate-500 font-bold">kcal</span>
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mt-2">
                        Lata (355ml): {directAbvResults.calCan} kcal
                      </span>
                    </div>

                    <div className={`p-5 rounded-2xl border flex flex-col justify-center text-xs font-medium space-y-1.5 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div>
                        OG Inicial: <strong className="font-mono font-black text-amber-700 dark:text-amber-400">{directAbvResults.og.toFixed(3)}</strong>
                      </div>
                      <div>
                        FG Final: <strong className="font-mono font-black text-cyan-700 dark:text-cyan-400">{directAbvResults.fg.toFixed(3)}</strong>
                      </div>
                      <div>
                        Pontos atenuados: <strong className="font-mono font-black text-slate-950 dark:text-white">{Math.round((directAbvResults.og - directAbvResults.fg) * 1000)} pts</strong>
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
      <footer className={`border-t py-8 mt-12 text-center text-xs transition-colors ${
        isDarkMode ? 'border-slate-800 bg-slate-900/50 text-slate-500' : 'border-slate-200 bg-white text-slate-500 shadow-xs'
      }`}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className={`font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>PintTech Brew Tools</span>
            <span>•</span>
            <span className="font-medium">Calculadora Cervejeira Oficial</span>
          </div>

          <Link
            href="https://pinttech.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-black text-amber-600 hover:text-amber-700 transition-colors"
          >
            <span>Gerencie sua cervejaria com o PintTech ERP</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
