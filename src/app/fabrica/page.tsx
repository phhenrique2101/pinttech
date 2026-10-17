'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Package,
  Cylinder,
  Flame,
  Calculator,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Clock,
  Droplet,
  Thermometer,
  Activity,
  ArrowRight,
  X,
  Sparkles,
  Check,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  ShieldCheck,
  Search,
  LayoutGrid,
  Layers,
  Beer,
  ChevronDown,
  Wrench,
  Sliders,
  CheckSquare,
  Square,
  ArrowLeft,
  Smartphone,
  Eye,
} from 'lucide-react';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import { playFeedback } from '@/lib/sound';
import {
  brixToSg,
  sgToBrix,
  parseBreweryGravity,
  correctRefractometerBrix,
  correctHydrometerTemp,
  calculateAbv,
  calculateCalories,
} from '@/lib/brewing/calculations';
import { formatDateShort, getLocalDateString } from '@/lib/utils';

type FabricaTab = 'ENVASE' | 'BARRIS' | 'TANQUES' | 'BRASSAGEM' | 'CALCULADORA';

export default function FabricaChaoDeFabricaPage() {
  const [activeTab, setActiveTab] = useState<FabricaTab>('ENVASE');
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Status feedback bar
  const [banner, setBanner] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // -------------------------------------------------------------
  // CARREGAR DADOS ESSENCIAIS (BATCHES, TANKS, USER)
  // -------------------------------------------------------------
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [batchesRes, tanksRes, userRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/tanks'),
        fetch('/api/auth/me'),
      ]);

      if (batchesRes.ok) {
        const data = await batchesRes.json();
        setBatches(Array.isArray(data) ? data : []);
      }
      if (tanksRes.ok) {
        const data = await tanksRes.json();
        setTanks(Array.isArray(data) ? data : []);
      }
      if (userRes.ok) {
        const data = await userRes.json();
        setSessionUser(data?.user || null);
      }
    } catch (err) {
      console.error('Erro ao carregar dados da fábrica:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const showBanner = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setBanner({ text, type });
    if (type === 'success') {
      playFeedback('success');
    } else if (type === 'error') {
      playFeedback('error');
    }
    setTimeout(() => {
      setBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // -------------------------------------------------------------
  // 1. MÓDULO DE ENVASE
  // -------------------------------------------------------------
  const [envaseSourceType, setEnvaseSourceType] = useState<'BATCH' | 'QUICK'>('BATCH');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [quickBeerName, setQuickBeerName] = useState<string>('');
  const [isPartialFill, setIsPartialFill] = useState<boolean>(false);
  const [customLiters, setCustomLiters] = useState<string>('30');
  const [envaseSessionLogs, setEnvaseSessionLogs] = useState<
    Array<{ code: string; beerName: string; liters: number; time: string }>
  >([]);
  const [isProcessingEnvase, setIsProcessingEnvase] = useState(false);

  // Auto-selecionar o primeiro lote em tanque para facilitar a vida do operador
  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) {
      const active = batches.find((b) => b.tankId && b.status !== 'FINALIZADO' && b.status !== 'CANCELADO');
      if (active) setSelectedBatchId(active.id);
    }
  }, [batches, selectedBatchId]);

  const activeBatchObj = useMemo(
    () => batches.find((b) => b.id === selectedBatchId) || null,
    [batches, selectedBatchId]
  );

  const handleScanForEnvase = async (scannedCode: string) => {
    const code = scannedCode.trim().toUpperCase();
    if (!code) return;
    if (isProcessingEnvase) return;

    if (envaseSourceType === 'BATCH' && !selectedBatchId) {
      showBanner('Por favor, selecione qual tanque / lote está envasando acima!', 'error');
      return;
    }
    if (envaseSourceType === 'QUICK' && !quickBeerName.trim()) {
      showBanner('Digite o nome da cerveja para o envase rápido!', 'error');
      return;
    }

    setIsProcessingEnvase(true);
    try {
      const payload: any = {
        code,
        action: 'FILL',
        volumeLiters: isPartialFill && customLiters ? parseFloat(customLiters) : undefined,
      };

      if (envaseSourceType === 'BATCH') {
        payload.batchId = selectedBatchId;
      } else {
        payload.isQuickFill = true;
        payload.quickBeerName = quickBeerName.trim();
      }

      const res = await fetch('/api/kegs/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showBanner(data.error || `Erro ao envasar barril ${code}`, 'error');
      } else {
        const beerName =
          envaseSourceType === 'BATCH' ? activeBatchObj?.recipe?.name || 'Cerveja' : quickBeerName.trim();
        const liters = payload.volumeLiters || data.item?.capacity || 50;

        showBanner(`✅ Barril ${code} envasado com sucesso (${liters}L de ${beerName})!`, 'success');

        setEnvaseSessionLogs((prev) => [
          {
            code,
            beerName,
            liters,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch {
      showBanner(`Falha de conexão ao tentar envasar barril ${code}`, 'error');
    } finally {
      setIsProcessingEnvase(false);
    }
  };

  // -------------------------------------------------------------
  // 2. MÓDULO DE BARRIS (CADASTRO RÁPIDO & LAVAGEM / CIP)
  // -------------------------------------------------------------
  const [kegSubMode, setKegSubMode] = useState<'WASH' | 'REGISTER' | 'MAINTENANCE' | 'LOOKUP'>('WASH');
  const [newKegCode, setNewKegCode] = useState('');
  const [newKegCapacity, setNewKegCapacity] = useState<number>(50);
  const [isRegisteringKeg, setIsRegisteringKeg] = useState(false);
  const [kegLookupResult, setKegLookupResult] = useState<any>(null);
  const [kegSessionActions, setKegSessionActions] = useState<
    Array<{ code: string; action: string; time: string; details?: string }>
  >([]);

  const handleScanForBarris = async (scannedCode: string) => {
    const code = scannedCode.trim().toUpperCase();
    if (!code) return;

    if (kegSubMode === 'REGISTER') {
      setNewKegCode(code);
      playFeedback('click');
      return;
    }

    try {
      if (kegSubMode === 'WASH') {
        const res = await fetch('/api/kegs/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, action: 'SANITIZE' }),
        });
        const data = await res.json();
        if (res.ok) {
          showBanner(`🧼 Barril ${code} HIGIENIZADO e pronto para uso!`, 'success');
          setKegSessionActions((prev) => [
            {
              code,
              action: 'Higienização (Lavado)',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...prev.slice(0, 19),
          ]);
        } else {
          showBanner(data.error || `Erro ao higienizar barril ${code}`, 'error');
        }
      } else if (kegSubMode === 'MAINTENANCE') {
        // Enviar para manutenção
        const res = await fetch('/api/kegs/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, action: 'LOOKUP' }),
        });
        const data = await res.json();
        if (res.ok && data.found && data.item?.id) {
          await fetch(`/api/kegs/${data.item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'MANUTENCAO', notes: 'Enviado para manutenção via Chão de Fábrica' }),
          });
          showBanner(`🛠️ Barril ${code} enviado para MANUTENÇÃO!`, 'success');
          setKegSessionActions((prev) => [
            {
              code,
              action: 'Enviado p/ Manutenção',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...prev.slice(0, 19),
          ]);
        } else {
          showBanner(data.error || `Barril ${code} não encontrado`, 'error');
        }
      } else if (kegSubMode === 'LOOKUP') {
        const res = await fetch('/api/kegs/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, action: 'LOOKUP' }),
        });
        const data = await res.json();
        if (res.ok && data.found) {
          setKegLookupResult(data.item);
          playFeedback('success');
        } else {
          setKegLookupResult(null);
          showBanner(`Barril ou equipamento ${code} não encontrado no sistema`, 'error');
        }
      }
    } catch {
      showBanner(`Falha de comunicação no barril ${code}`, 'error');
    }
  };

  const handleCreateNewKeg = async () => {
    const code = newKegCode.trim().toUpperCase();
    if (!code) {
      showBanner('Informe o código do barril para cadastrar', 'error');
      return;
    }
    setIsRegisteringKeg(true);
    try {
      const res = await fetch('/api/kegs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          capacity: newKegCapacity,
          kegType: 'INOX_EURO',
          notes: 'Cadastrado no chão de fábrica',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showBanner(`🎉 Barril ${code} (${newKegCapacity}L) CADASTRADO com sucesso!`, 'success');
        setKegSessionActions((prev) => [
          {
            code,
            action: `Cadastro Novo (${newKegCapacity}L)`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev.slice(0, 19),
        ]);
        setNewKegCode('');
      } else {
        showBanner(data.error || `Não foi possível cadastrar o barril ${code}`, 'error');
      }
    } catch {
      showBanner(`Falha de rede ao cadastrar barril`, 'error');
    } finally {
      setIsRegisteringKeg(false);
    }
  };

  // -------------------------------------------------------------
  // 3. MÓDULO DE TANQUES & ADEGA
  // -------------------------------------------------------------
  const [selectedTankForDetails, setSelectedTankForDetails] = useState<any | null>(null);
  const [measurementGravityInput, setMeasurementGravityInput] = useState<string>('1.020');
  const [measurementUnit, setMeasurementUnit] = useState<'SG' | 'BRIX'>('SG');
  const [measurementTemp, setMeasurementTemp] = useState<string>('18.0');
  const [measurementPh, setMeasurementPh] = useState<string>('');
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false);

  const activeTanksList = useMemo(() => {
    return tanks.map((tank) => {
      // Procurar lote ativo vinculado ao tanque
      const activeBatch = batches.find(
        (b) => b.tankId === tank.id && b.status !== 'FINALIZADO' && b.status !== 'CANCELADO'
      );
      return { ...tank, activeBatch };
    });
  }, [tanks, batches]);

  // Salvar medição no lote do tanque
  const handleSaveTankMeasurement = async () => {
    if (!selectedTankForDetails?.activeBatch?.id) {
      showBanner('Este tanque não possui lote ativo para registrar medições', 'error');
      return;
    }
    const batch = selectedTankForDetails.activeBatch;
    setIsSavingMeasurement(true);

    try {
      let finalSg = 1.020;
      let rawBrix = 0;

      if (measurementUnit === 'BRIX') {
        const pBrix = parseFloat(measurementGravityInput.replace(',', '.'));
        if (!isNaN(pBrix) && pBrix > 0) {
          rawBrix = pBrix;
          // Se tiver OG da receita/lote, corrige a refração com álcool
          const baseOg = batch.measuredOg || batch.recipe?.og || 1.050;
          const corrected = correctRefractometerBrix(baseOg, pBrix);
          finalSg = corrected.fgSg;
        }
      } else {
        const parsed = parseBreweryGravity(measurementGravityInput);
        if (parsed) finalSg = parsed;
      }

      const tempC = parseFloat(measurementTemp.replace(',', '.')) || 18;
      const phVal = measurementPh ? parseFloat(measurementPh.replace(',', '.')) : undefined;

      // Calcular atenuação e ABV estimado
      const og = batch.measuredOg || batch.recipe?.og || 1.050;
      const abv = calculateAbv(og, finalSg);
      const attenuation = Math.round(((og - finalSg) / (og - 1.0)) * 100);

      // Carregar logs anteriores
      let logs: any[] = [];
      try {
        if (batch.fermentationLogsJson) logs = JSON.parse(batch.fermentationLogsJson);
      } catch {}

      const newLog = {
        id: `log_${Date.now()}`,
        date: getLocalDateString(),
        gravity: Math.round(finalSg * 1000) / 1000,
        tempCelsius: tempC,
        ph: phVal,
        inputUnit: measurementUnit,
        rawInputBrix: rawBrix > 0 ? rawBrix : undefined,
        abv: abv > 0 ? abv : undefined,
        attenuation: attenuation > 0 ? attenuation : undefined,
      };

      const updatedLogs = [...logs, newLog];

      const res = await fetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fermentationLogsJson: JSON.stringify(updatedLogs),
          measuredFg: finalSg,
          measuredAbv: abv > 0 ? abv : undefined,
          tempFermentation: tempC,
        }),
      });

      if (res.ok) {
        showBanner(`📈 Medição gravada: ${finalSg.toFixed(3)} SG @ ${tempC}°C (ABV: ${abv.toFixed(1)}%)`, 'success');
        await loadInitialData();
        // Atualizar estado local do tanque selecionado
        setSelectedTankForDetails((prev: any) => ({
          ...prev,
          activeBatch: {
            ...prev.activeBatch,
            fermentationLogsJson: JSON.stringify(updatedLogs),
            measuredFg: finalSg,
            measuredAbv: abv,
          },
        }));
      } else {
        showBanner('Erro ao salvar medição no servidor', 'error');
      }
    } catch {
      showBanner('Erro ao processar medição', 'error');
    } finally {
      setIsSavingMeasurement(false);
    }
  };

  // Alternar checkbox de tarefa de adega
  const handleToggleTankTask = async (taskIndex: number) => {
    if (!selectedTankForDetails?.activeBatch?.id) return;
    const batch = selectedTankForDetails.activeBatch;

    let tasks: any[] = [];
    try {
      if (batch.tankTasksJson) tasks = JSON.parse(batch.tankTasksJson);
    } catch {}

    if (!tasks[taskIndex]) return;
    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    tasks[taskIndex].completedAt = tasks[taskIndex].completed ? new Date().toISOString() : null;

    try {
      playFeedback('click');
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tankTasksJson: JSON.stringify(tasks),
        }),
      });
      if (res.ok) {
        showBanner(
          tasks[taskIndex].completed
            ? `✔️ Tarefa "${tasks[taskIndex].title}" concluída!`
            : `Tarefa "${tasks[taskIndex].title}" reaberta`,
          'info'
        );
        await loadInitialData();
        setSelectedTankForDetails((prev: any) => ({
          ...prev,
          activeBatch: { ...prev.activeBatch, tankTasksJson: JSON.stringify(tasks) },
        }));
      }
    } catch {
      showBanner('Erro ao atualizar tarefa', 'error');
    }
  };

  // -------------------------------------------------------------
  // 4. MÓDULO DE BRASSAGEM DO DIA
  // -------------------------------------------------------------
  const [selectedBrewBatch, setSelectedBrewBatch] = useState<any | null>(null);
  const [brewOgInput, setBrewOgInput] = useState<string>('1.050');
  const [brewVolumeInput, setBrewVolumeInput] = useState<string>('500');
  const [brewTempMashInput, setBrewTempMashInput] = useState<string>('66');
  const [isSavingBrew, setIsSavingBrew] = useState<boolean>(false);

  // Cronômetro simples do chão de fábrica para fervura / whirlpool
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const activeBrewBatches = useMemo(
    () => batches.filter((b) => b.status === 'BRASSAGEM' || b.status === 'PLANEJADO'),
    [batches]
  );

  const handleSaveBrewData = async () => {
    if (!selectedBrewBatch?.id) {
      showBanner('Selecione uma brassagem para registrar os dados', 'error');
      return;
    }
    setIsSavingBrew(true);
    try {
      const parsedOg = parseBreweryGravity(brewOgInput) || 1.050;
      const parsedVol = parseFloat(brewVolumeInput.replace(',', '.')) || 0;
      const parsedTemp = parseFloat(brewTempMashInput.replace(',', '.')) || 66;

      const res = await fetch(`/api/batches/${selectedBrewBatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measuredOg: parsedOg,
          volumeProducedLiters: parsedVol > 0 ? parsedVol : undefined,
          tempMash: parsedTemp,
          status: 'FERMENTANDO',
          fermentationStartDate: new Date(),
        }),
      });

      if (res.ok) {
        showBanner(`🔥 Dados da brassagem gravados! Lote transferido para FERMENTAÇÃO.`, 'success');
        await loadInitialData();
        setSelectedBrewBatch(null);
      } else {
        showBanner('Erro ao salvar dados da brassagem', 'error');
      }
    } catch {
      showBanner('Falha de rede ao salvar brassagem', 'error');
    } finally {
      setIsSavingBrew(false);
    }
  };

  // -------------------------------------------------------------
  // 5. CALCULADORA CERVEJEIRA TOUCH
  // -------------------------------------------------------------
  const [calcTab, setCalcTab] = useState<'REFRACTOMETER' | 'HYDROMETER' | 'BRIX_SG' | 'ABV'>('REFRACTOMETER');
  const [calcOgSg, setCalcOgSg] = useState<string>('1.054');
  const [calcCurrentBrix, setCalcCurrentBrix] = useState<string>('6.5');

  // Correção por temperatura do densímetro
  const [calcHydroSg, setCalcHydroSg] = useState<string>('1.050');
  const [calcHydroTemp, setCalcHydroTemp] = useState<string>('28');
  const [calcCalibTemp, setCalcCalibTemp] = useState<string>('20');

  // Conversão direta Brix / SG
  const [calcRawBrix, setCalcRawBrix] = useState<string>('13.0');

  // ABV direto
  const [calcAbvOg, setCalcAbvOg] = useState<string>('1.054');
  const [calcAbvFg, setCalcAbvFg] = useState<string>('1.012');

  // Cálculos reativos
  const refractometerResults = useMemo(() => {
    const og = parseBreweryGravity(calcOgSg) || 1.050;
    const brix = parseFloat(calcCurrentBrix.replace(',', '.')) || 0;
    if (brix <= 0) return null;

    const res = correctRefractometerBrix(og, brix);
    const calories = calculateCalories(og, res.fgSg);
    const apparentBrix = Math.max(0, Math.round(sgToBrix(res.fgSg) * 10) / 10);
    return { ...res, calories, apparentBrix };
  }, [calcOgSg, calcCurrentBrix]);

  const hydrometerResults = useMemo(() => {
    const rawSg = parseBreweryGravity(calcHydroSg) || 1.050;
    const sampleT = parseFloat(calcHydroTemp.replace(',', '.')) || 20;
    const calibT = parseFloat(calcCalibTemp.replace(',', '.')) || 20;
    const correctedSg = correctHydrometerTemp(rawSg, sampleT, calibT);
    return {
      rawSg,
      sampleT,
      correctedSg: Math.round(correctedSg * 1000) / 1000,
      diffPoints: Math.round((correctedSg - rawSg) * 10000) / 10,
    };
  }, [calcHydroSg, calcHydroTemp, calcCalibTemp]);

  const brixToSgResult = useMemo(() => {
    const brix = parseFloat(calcRawBrix.replace(',', '.')) || 0;
    const sg = brixToSg(brix);
    return {
      sg: Math.round(sg * 1000) / 1000,
      plato: brix,
    };
  }, [calcRawBrix]);

  const abvDirectResult = useMemo(() => {
    const og = parseBreweryGravity(calcAbvOg) || 1.050;
    const fg = parseBreweryGravity(calcAbvFg) || 1.010;
    const abv = calculateAbv(og, fg);
    const attenuation = og > 1 ? Math.round(((og - fg) / (og - 1.0)) * 100) : 0;
    return { abv, attenuation };
  }, [calcAbvOg, calcAbvFg]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 select-none">
      {/* ------------------------------------------------------------- */}
      {/* CABEÇALHO COMPACTO DO CHÃO DE FÁBRICA */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-1 text-slate-400 hover:text-white active:scale-95 transition-transform rounded-xl hover:bg-slate-800"
            title="Voltar ao Sistema Completo"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="font-black text-base tracking-wide text-white flex items-center gap-1.5">
                PintTech <span className="text-amber-400">Fábrica</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {sessionUser?.name ? `Operador: ${sessionUser.name}` : 'Modo Tablet / Chão de Fábrica'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadInitialData()}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl active:scale-90 transition-all border border-slate-700"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* BANNER DE FEEDBACK SONORO / VISUAL */}
      {banner && (
        <div
          className={`sticky top-[57px] z-50 px-4 py-3 text-center font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
            banner.type === 'success'
              ? 'bg-emerald-600 text-white border-b-2 border-emerald-400'
              : banner.type === 'error'
              ? 'bg-rose-600 text-white border-b-2 border-rose-400'
              : 'bg-amber-600 text-slate-950 border-b-2 border-amber-300'
          }`}
        >
          {banner.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          {banner.type === 'error' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONTEÚDO PRINCIPAL: 5 MÓDULOS */}
      {/* ------------------------------------------------------------- */}
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* ========================================================= */}
        {/* 1. MÓDULO ENVASE */}
        {/* ========================================================= */}
        {activeTab === 'ENVASE' && (
          <div className="space-y-4">
            {/* Escolha do Tanque / Lote de Origem */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-white">Linha de Envase</h2>
                    <p className="text-xs text-slate-400">De onde está saindo o chopp?</p>
                  </div>
                </div>

                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setEnvaseSourceType('BATCH')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      envaseSourceType === 'BATCH' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
                    }`}
                  >
                    Por Lote / TQ
                  </button>
                  <button
                    onClick={() => setEnvaseSourceType('QUICK')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      envaseSourceType === 'QUICK' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
                    }`}
                  >
                    Avulso
                  </button>
                </div>
              </div>

              {envaseSourceType === 'BATCH' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Selecione o Lote / Tanque Ativo:
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none"
                  >
                    <option value="">-- Escolha o Tanque / Chopp --</option>
                    {batches
                      .filter((b) => b.status !== 'FINALIZADO' && b.status !== 'CANCELADO')
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.tank?.name ? `[${b.tank.name}] ` : ''}
                          {b.recipe?.name || 'Cerveja'} (Lote #{b.batchNumber})
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Nome da Cerveja / Chopp:</label>
                  <input
                    type="text"
                    value={quickBeerName}
                    onChange={(e) => setQuickBeerName(e.target.value)}
                    placeholder="Ex: IPA Galaxy, Pilsen Especial..."
                    className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none"
                  />
                </div>
              )}

              {/* Botão de Barril Parcial / Volume específico */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsPartialFill(!isPartialFill)}
                  className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
                    isPartialFill
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  {isPartialFill ? 'Volume Parcial Ativado' : 'Barril Cheio Padrão'}
                </button>

                {isPartialFill && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-bold">Litros:</span>
                    <input
                      type="number"
                      value={customLiters}
                      onChange={(e) => setCustomLiters(e.target.value)}
                      className="w-16 bg-slate-800 border border-amber-500 rounded-xl px-2 py-1.5 text-sm font-black text-center text-amber-400 outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Scanner da Câmera para Bipar Barris */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-400" />
                Bipar Barril para Envasar
              </h3>
              <p className="text-xs text-slate-400">
                Aponte a câmera para o código do barril. Ao bipar, ele é envasado instantaneamente.
              </p>

              <BarcodeScanner
                onScan={handleScanForEnvase}
                isProcessing={isProcessingEnvase}
                title="Câmera do Envase"
                defaultCollapsed={false}
              />
            </div>

            {/* Lista dos Envasados nesta sessão */}
            {envaseSessionLogs.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                    Envasados nesta Sessão ({envaseSessionLogs.length})
                  </h3>
                  <button
                    onClick={() => setEnvaseSessionLogs([])}
                    className="text-[11px] text-slate-500 hover:text-slate-300"
                  >
                    Limpar lista
                  </button>
                </div>

                <div className="divide-y divide-slate-800 max-h-56 overflow-y-auto pr-1">
                  {envaseSessionLogs.map((log, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                          ✓
                        </div>
                        <div>
                          <div className="font-black text-sm text-white">{log.code}</div>
                          <div className="text-xs text-slate-400">
                            {log.beerName} ({log.liters}L)
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. MÓDULO BARRIS */}
        {/* ========================================================= */}
        {activeTab === 'BARRIS' && (
          <div className="space-y-4">
            {/* Seletor de Ação Rápida */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setKegSubMode('WASH')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${
                  kegSubMode === 'WASH'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-2xl">🧼</div>
                <span className="font-extrabold text-xs text-center">Higienizar / Lavar</span>
              </button>

              <button
                onClick={() => setKegSubMode('REGISTER')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${
                  kegSubMode === 'REGISTER'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-2xl">➕</div>
                <span className="font-extrabold text-xs text-center">Cadastrar Novo</span>
              </button>

              <button
                onClick={() => setKegSubMode('LOOKUP')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${
                  kegSubMode === 'LOOKUP'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-2xl">🔍</div>
                <span className="font-extrabold text-xs text-center">Consultar Barril</span>
              </button>

              <button
                onClick={() => setKegSubMode('MAINTENANCE')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${
                  kegSubMode === 'MAINTENANCE'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-2xl">🛠️</div>
                <span className="font-extrabold text-xs text-center">Manutenção</span>
              </button>
            </div>

            {/* SE MODO: CADASTRAR NOVO */}
            {kegSubMode === 'REGISTER' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                <h3 className="font-extrabold text-sm text-amber-400 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Cadastrar Novo Barril no Acervo
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Código do Barril (Bipe ou digite):
                  </label>
                  <input
                    type="text"
                    value={newKegCode}
                    onChange={(e) => setNewKegCode(e.target.value.toUpperCase())}
                    placeholder="Ex: BAR-5001"
                    className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-4 py-3.5 text-base font-black text-white outline-none tracking-wider font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Capacidade:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[20, 30, 50].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setNewKegCapacity(cap)}
                        className={`py-3.5 rounded-2xl font-black text-base border-2 transition-all active:scale-95 ${
                          newKegCapacity === cap
                            ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg scale-105'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {cap}L
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateNewKeg}
                  disabled={isRegisteringKeg || !newKegCode.trim()}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Confirmar Cadastro
                </button>
              </div>
            )}

            {/* CÂMERA DO BARRIL */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-400" />
                {kegSubMode === 'WASH' && 'Bipar Barril para HIGIENIZAR'}
                {kegSubMode === 'REGISTER' && 'Bipar Código para Preencher'}
                {kegSubMode === 'MAINTENANCE' && 'Bipar Barril com DEFEITO'}
                {kegSubMode === 'LOOKUP' && 'Bipar Barril para CONSULTAR'}
              </h3>

              <BarcodeScanner
                onScan={handleScanForBarris}
                title="Leitor de Barris"
                defaultCollapsed={false}
              />
            </div>

            {/* RESULTADO DA CONSULTA DE BARRIL */}
            {kegSubMode === 'LOOKUP' && kegLookupResult && (
              <div className="bg-slate-900 border-2 border-blue-500/50 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                      Barril Encontrado
                    </span>
                    <h3 className="font-black text-xl text-white font-mono mt-1">{kegLookupResult.code}</h3>
                  </div>
                  <span className="text-sm font-black px-3 py-1 rounded-xl bg-slate-800 text-slate-200">
                    {kegLookupResult.capacity} Litros
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                  <div className="bg-slate-800/60 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Status:</span>
                    <span className="font-bold text-amber-400">{kegLookupResult.status}</span>
                  </div>
                  <div className="bg-slate-800/60 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Chopp Atual:</span>
                    <span className="font-bold text-white">
                      {kegLookupResult.currentBeerName || 'Vazio / Nenhum'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* HISTÓRICO DE AÇÕES DE BARRIS */}
            {kegSessionActions.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  Ações Recentes de Barris
                </h3>
                <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
                  {kegSessionActions.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-white font-mono">{item.code}</span>
                        <span className="text-slate-400 block text-[11px]">{item.action}</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px]">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. MÓDULO TANQUES & ADEGA */}
        {/* ========================================================= */}
        {activeTab === 'TANQUES' && (
          <div className="space-y-4">
            {!selectedTankForDetails ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                    <Cylinder className="w-5 h-5 text-amber-400" />
                    Tanques & Adega
                  </h2>
                  <span className="text-xs font-bold text-slate-400">
                    Toque no tanque para ver tarefas e medir
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTanksList.map((tank) => {
                    const isOccupied = Boolean(tank.activeBatch);
                    const beerName = tank.activeBatch?.recipe?.name;
                    const batchNumber = tank.activeBatch?.batchNumber;
                    const status = tank.activeBatch?.status || tank.status;

                    return (
                      <button
                        key={tank.id}
                        onClick={() => setSelectedTankForDetails(tank)}
                        className={`p-5 rounded-3xl border-2 text-left transition-all active:scale-95 shadow-lg space-y-3 ${
                          isOccupied
                            ? 'bg-slate-900 border-amber-500/40 hover:border-amber-400'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-base text-white">{tank.name}</span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              isOccupied
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        {isOccupied ? (
                          <div className="space-y-1">
                            <div className="font-black text-sm text-amber-300">{beerName}</div>
                            <div className="text-xs text-slate-400">Lote #{batchNumber}</div>
                            {tank.activeBatch?.tempFermentation && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-300 pt-1">
                                <Thermometer className="w-3.5 h-3.5 text-blue-400" />
                                {tank.activeBatch.tempFermentation}°C
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 py-1">Tanque Livre / Disponível</div>
                        )}

                        <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between pt-1 border-t border-slate-800">
                          <span>{tank.capacityLiters}L</span>
                          <span className="flex items-center gap-1">
                            Abrir <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* DETALHES DO TANQUE SELECIONADO: TAREFAS & MEDIÇÃO */
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedTankForDetails(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar para lista de tanques
                </button>

                {/* Card de Resumo do Tanque */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-lg text-white">{selectedTankForDetails.name}</h3>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-400">
                      {selectedTankForDetails.activeBatch?.status || selectedTankForDetails.status}
                    </span>
                  </div>

                  {selectedTankForDetails.activeBatch ? (
                    <div className="text-sm">
                      <div className="font-extrabold text-amber-300">
                        {selectedTankForDetails.activeBatch.recipe?.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        Lote #{selectedTankForDetails.activeBatch.batchNumber} • Início:{' '}
                        {formatDateShort(selectedTankForDetails.activeBatch.brewDate)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Nenhum lote ativo fermentando neste tanque.</p>
                  )}
                </div>

                {/* FORMULÁRIO DE MEDIÇÃO DIÁRIA */}
                {selectedTankForDetails.activeBatch && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-400" />
                        Registrar Medição do Dia
                      </h4>
                      <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                        <button
                          type="button"
                          onClick={() => setMeasurementUnit('SG')}
                          className={`px-2 py-1 text-[11px] font-bold rounded ${
                            measurementUnit === 'SG' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                          }`}
                        >
                          SG
                        </button>
                        <button
                          type="button"
                          onClick={() => setMeasurementUnit('BRIX')}
                          className={`px-2 py-1 text-[11px] font-bold rounded ${
                            measurementUnit === 'BRIX' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                          }`}
                        >
                          Brix
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          {measurementUnit === 'SG' ? 'Densidade (SG):' : 'Leitura Refratômetro (°Bx):'}
                        </label>
                        <input
                          type="text"
                          value={measurementGravityInput}
                          onChange={(e) => setMeasurementGravityInput(e.target.value)}
                          placeholder={measurementUnit === 'SG' ? '1.020' : '7.5'}
                          className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-sm font-black text-white text-center outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Temperatura (°C):
                        </label>
                        <input
                          type="text"
                          value={measurementTemp}
                          onChange={(e) => setMeasurementTemp(e.target.value)}
                          placeholder="18.5"
                          className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-sm font-black text-white text-center outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">pH (Opcional):</label>
                      <input
                        type="text"
                        value={measurementPh}
                        onChange={(e) => setMeasurementPh(e.target.value)}
                        placeholder="Ex: 4.4"
                        className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-2.5 text-sm font-bold text-white text-center outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveTankMeasurement}
                      disabled={isSavingMeasurement}
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Salvar Medição de Hoje
                    </button>
                  </div>
                )}

                {/* TAREFAS DE ADEGA DO LOTE */}
                {selectedTankForDetails.activeBatch && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                      Tarefas de Adega para este Lote
                    </h4>

                    {(() => {
                      let tasks: any[] = [];
                      try {
                        if (selectedTankForDetails.activeBatch.tankTasksJson) {
                          tasks = JSON.parse(selectedTankForDetails.activeBatch.tankTasksJson);
                        }
                      } catch {}

                      if (tasks.length === 0) {
                        return (
                          <p className="text-xs text-slate-500 italic py-2">
                            Nenhuma tarefa específica agendada para este lote.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {tasks.map((task, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleToggleTankTask(idx)}
                              className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-95 ${
                                task.completed
                                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-800 border-slate-700 text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {task.completed ? (
                                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                )}
                                <div>
                                  <div
                                    className={`font-bold text-sm ${
                                      task.completed ? 'line-through text-slate-400' : 'text-white'
                                    }`}
                                  >
                                    {task.title}
                                  </div>
                                  {task.dueDate && (
                                    <div className="text-[11px] text-slate-400">
                                      Data: {formatDateShort(task.dueDate)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                  task.completed
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {task.completed ? 'Feito' : 'Pendente'}
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. MÓDULO BRASSAGEM DO DIA */}
        {/* ========================================================= */}
        {activeTab === 'BRASSAGEM' && (
          <div className="space-y-4">
            {/* Cronômetro Rápido da Fábrica */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Cronômetro de Panela / Fervura
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(0);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Zerar
                </button>
              </div>

              <div className="flex items-center justify-center py-2">
                <span className="font-black text-5xl font-mono text-white tracking-widest">
                  {formatTimer(timerSeconds)}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`flex-1 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                    isTimerRunning
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isTimerRunning ? 'Pausar' : 'Iniciar Contagem'}
                </button>
              </div>
            </div>

            {/* Brassagens Ativas */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
              <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                Registrar Brassagem do Dia
              </h2>

              {activeBrewBatches.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Nenhuma brassagem marcada como &apos;BRASSAGEM&apos; neste momento.
                </p>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-300">
                    Selecione a Brassagem em Andamento:
                  </label>
                  <select
                    value={selectedBrewBatch?.id || ''}
                    onChange={(e) => {
                      const found = activeBrewBatches.find((b) => b.id === e.target.value);
                      setSelectedBrewBatch(found || null);
                      if (found?.recipe?.og) setBrewOgInput(String(found.recipe.og));
                      if (found?.volumePlannedLiters) setBrewVolumeInput(String(found.volumePlannedLiters));
                    }}
                    className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none"
                  >
                    <option value="">-- Escolha o Lote --</option>
                    {activeBrewBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.recipe?.name} (Lote #{b.batchNumber})
                      </option>
                    ))}
                  </select>

                  {selectedBrewBatch && (
                    <div className="pt-2 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            OG Medida Pós-Fervura:
                          </label>
                          <input
                            type="text"
                            value={brewOgInput}
                            onChange={(e) => setBrewOgInput(e.target.value)}
                            placeholder="1.054"
                            className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-sm font-black text-white text-center outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Volume no Tanque (L):
                          </label>
                          <input
                            type="text"
                            value={brewVolumeInput}
                            onChange={(e) => setBrewVolumeInput(e.target.value)}
                            placeholder="520"
                            className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-sm font-black text-white text-center outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Temperatura de Mostura (°C):
                        </label>
                        <input
                          type="text"
                          value={brewTempMashInput}
                          onChange={(e) => setBrewTempMashInput(e.target.value)}
                          placeholder="66"
                          className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-2.5 text-sm font-bold text-white text-center outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveBrewData}
                        disabled={isSavingBrew}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                      >
                        <Check className="w-5 h-5" />
                        Finalizar Brassagem & Ir p/ Fermentação
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. MÓDULO CALCULADORA CERVEJEIRA TOUCH */}
        {/* ========================================================= */}
        {activeTab === 'CALCULADORA' && (
          <div className="space-y-4">
            {/* Abas da Calculadora */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setCalcTab('REFRACTOMETER')}
                className={`py-3 px-2 rounded-2xl font-bold text-xs transition-all active:scale-95 border ${
                  calcTab === 'REFRACTOMETER'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Refratômetro
              </button>

              <button
                type="button"
                onClick={() => setCalcTab('HYDROMETER')}
                className={`py-3 px-2 rounded-2xl font-bold text-xs transition-all active:scale-95 border ${
                  calcTab === 'HYDROMETER'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Densímetro / Temp
              </button>

              <button
                type="button"
                onClick={() => setCalcTab('BRIX_SG')}
                className={`py-3 px-2 rounded-2xl font-bold text-xs transition-all active:scale-95 border ${
                  calcTab === 'BRIX_SG'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Brix ↔ SG
              </button>

              <button
                type="button"
                onClick={() => setCalcTab('ABV')}
                className={`py-3 px-2 rounded-2xl font-bold text-xs transition-all active:scale-95 border ${
                  calcTab === 'ABV'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Cálculo de ABV
              </button>
            </div>

            {/* ABA 1: REFRATÔMETRO NA FERMENTAÇÃO */}
            {calcTab === 'REFRACTOMETER' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  Correção de Refratômetro na Fermentação
                </h3>
                <p className="text-xs text-slate-400">
                  O álcool altera a refração da luz. Esta ferramenta calcula a densidade e teor alcoólico reais.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">OG Inicial (SG):</label>
                    <input
                      type="text"
                      value={calcOgSg}
                      onChange={(e) => setCalcOgSg(e.target.value)}
                      placeholder="1.054"
                      className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-base font-black text-white text-center outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Brix Lido no Refratômetro:
                    </label>
                    <input
                      type="text"
                      value={calcCurrentBrix}
                      onChange={(e) => setCalcCurrentBrix(e.target.value)}
                      placeholder="6.5"
                      className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-base font-black text-amber-400 text-center outline-none"
                    />
                  </div>
                </div>

                {refractometerResults && (
                  <div className="pt-2 grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl text-center">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">FG Real Corrigida</span>
                      <span className="font-black text-2xl text-emerald-400 font-mono">
                        {refractometerResults.fgSg.toFixed(3)}
                      </span>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl text-center">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Teor Alcoólico</span>
                      <span className="font-black text-2xl text-amber-400 font-mono">
                        {refractometerResults.abv.toFixed(1)}% ABV
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ABA 2: DENSÍMETRO POR TEMPERATURA */}
            {calcTab === 'HYDROMETER' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-blue-400" />
                  Correção de Densímetro por Temperatura
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">Leitura SG:</label>
                    <input
                      type="text"
                      value={calcHydroSg}
                      onChange={(e) => setCalcHydroSg(e.target.value)}
                      placeholder="1.050"
                      className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-2 py-3 text-sm font-black text-white text-center outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">Temp Amostra (°C):</label>
                    <input
                      type="text"
                      value={calcHydroTemp}
                      onChange={(e) => setCalcHydroTemp(e.target.value)}
                      placeholder="28"
                      className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-2 py-3 text-sm font-black text-amber-400 text-center outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">Calibragem (°C):</label>
                    <input
                      type="text"
                      value={calcCalibTemp}
                      onChange={(e) => setCalcCalibTemp(e.target.value)}
                      placeholder="20"
                      className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-2 py-3 text-sm font-bold text-white text-center outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Densidade Corrigida a {calcCalibTemp}°C
                  </span>
                  <span className="font-black text-3xl text-emerald-400 font-mono">
                    {hydrometerResults.correctedSg.toFixed(3)} SG
                  </span>
                  <div className="text-xs text-slate-400">
                    Ajuste térmico:{' '}
                    {hydrometerResults.diffPoints > 0
                      ? `+${hydrometerResults.diffPoints}`
                      : hydrometerResults.diffPoints}{' '}
                    pontos de densidade
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: BRIX PARA SG */}
            {calcTab === 'BRIX_SG' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  Conversor Rápido Brix ↔ Densidade (SG)
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Valor em Graus Brix (°Bx) / Plato:
                  </label>
                  <input
                    type="text"
                    value={calcRawBrix}
                    onChange={(e) => setCalcRawBrix(e.target.value)}
                    placeholder="13.0"
                    className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-4 py-3.5 text-xl font-black text-amber-400 text-center outline-none"
                  />
                </div>

                <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Gravidade Específica (SG)</span>
                  <span className="font-black text-3xl text-emerald-400 font-mono">
                    {brixToSgResult.sg.toFixed(3)}
                  </span>
                </div>
              </div>
            )}

            {/* ABA 4: ABV DIRETO */}
            {calcTab === 'ABV' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Beer className="w-4 h-4 text-amber-400" />
                  Cálculo Direto de Teor Alcoólico (ABV)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">OG (Densidade Inicial):</label>
                    <input
                      type="text"
                      value={calcAbvOg}
                      onChange={(e) => setCalcAbvOg(e.target.value)}
                      placeholder="1.054"
                      className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-base font-black text-white text-center outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">FG (Densidade Final):</label>
                    <input
                      type="text"
                      value={calcAbvFg}
                      onChange={(e) => setCalcAbvFg(e.target.value)}
                      placeholder="1.012"
                      className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-base font-black text-white text-center outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Teor Alcoólico Estimado</span>
                  <span className="font-black text-4xl text-amber-400 font-mono">
                    {abvDirectResult.abv.toFixed(2)}%
                  </span>
                  <div className="text-xs text-slate-400">
                    Atenuação Aparente: <strong className="text-white">{abvDirectResult.attenuation}%</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* BARRA INFERIOR DE NAVEGAÇÃO TOUCH GIGANTE (FINGER-FRIENDLY) */}
      {/* ------------------------------------------------------------- */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab('ENVASE')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'ENVASE' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-2 rounded-2xl transition-all ${
              activeTab === 'ENVASE' ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg' : ''
            }`}
          >
            <Package className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">Envases</span>
        </button>

        <button
          onClick={() => setActiveTab('BARRIS')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'BARRIS' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-2 rounded-2xl transition-all ${
              activeTab === 'BARRIS' ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg' : ''
            }`}
          >
            <Cylinder className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">Barris</span>
        </button>

        <button
          onClick={() => setActiveTab('TANQUES')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'TANQUES' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-2 rounded-2xl transition-all ${
              activeTab === 'TANQUES' ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg' : ''
            }`}
          >
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">Tanques</span>
        </button>

        <button
          onClick={() => setActiveTab('BRASSAGEM')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'BRASSAGEM' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-2 rounded-2xl transition-all ${
              activeTab === 'BRASSAGEM' ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg' : ''
            }`}
          >
            <Flame className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">Brassagem</span>
        </button>

        <button
          onClick={() => setActiveTab('CALCULADORA')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'CALCULADORA' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-2 rounded-2xl transition-all ${
              activeTab === 'CALCULADORA' ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg' : ''
            }`}
          >
            <Calculator className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">Calculadora</span>
        </button>
      </nav>
    </div>
  );
}
