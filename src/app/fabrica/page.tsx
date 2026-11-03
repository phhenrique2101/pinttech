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
  Droplets,
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
  FileText,
  Info,
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
  Calendar,
  Wind,
  Target,
  AlertCircle,
  Bell,
  Edit2,
  Trash2,
  History,
  Percent,
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

type FabricaTab = 'ENVASE' | 'BARRIS' | 'TANQUES' | 'BRASSAGEM' | 'TAREFAS' | 'CALCULADORA';

export default function FabricaChaoDeFabricaPage() {
  const [activeTab, setActiveTab] = useState<FabricaTab>('ENVASE');
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [mapaProducts, setMapaProducts] = useState<any[]>([]);
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Status feedback banner
  const [banner, setBanner] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // -------------------------------------------------------------
  // CARREGAR DADOS ESSENCIAIS (BATCHES, TANKS, RECIPES, USER, MAPA)
  // -------------------------------------------------------------
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [batchesRes, tanksRes, recipesRes, userRes, mapaRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/tanks'),
        fetch('/api/recipes'),
        fetch('/api/auth/me'),
        fetch('/api/mapa-products'),
      ]);

      if (batchesRes.ok) {
        const data = await batchesRes.json();
        setBatches(Array.isArray(data) ? data : []);
      }
      if (tanksRes.ok) {
        const data = await tanksRes.json();
        setTanks(Array.isArray(data) ? data : []);
      }
      if (recipesRes.ok) {
        const data = await recipesRes.json();
        setRecipes(Array.isArray(data) ? data : []);
      }
      if (userRes.ok) {
        const data = await userRes.json();
        setSessionUser(data?.user || null);
      }
      if (mapaRes && mapaRes.ok) {
        const data = await mapaRes.json();
        setMapaProducts(Array.isArray(data) ? data : []);
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

  // Auto-selecionar o primeiro lote em tanque
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
    if (!code || isProcessingEnvase) return;

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
  const [kegSubMode, setKegSubMode] = useState<'WASH' | 'RETURN' | 'REGISTER' | 'MAINTENANCE' | 'LOOKUP'>('WASH');
  const [kegReturnCondition, setKegReturnCondition] = useState<'VAZIO_SUJO' | 'PARCIALMENTE_CHEIO' | 'CHEIO_RETORNADO'>('VAZIO_SUJO');
  const [kegReturnLiters, setKegReturnLiters] = useState<string>('20');
  const [kegReturnBillingMode, setKegReturnBillingMode] = useState<'FULL' | 'PARTIAL'>('FULL');
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
      if (kegSubMode === 'RETURN') {
        const payload: any = {
          code,
          action: 'RETURN',
          returnCondition: kegReturnCondition,
          billingMode: kegReturnBillingMode,
          returnVolumeLiters:
            kegReturnCondition === 'PARCIALMENTE_CHEIO' ? parseFloat(kegReturnLiters) || 20 : undefined,
        };

        const res = await fetch('/api/kegs/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          const billingTag = kegReturnCondition !== 'VAZIO_SUJO'
            ? (kegReturnBillingMode === 'FULL' ? ' • Cobrar 100%' : ' • Cobrar Parcial')
            : '';
          const detail =
            kegReturnCondition === 'PARCIALMENTE_CHEIO'
              ? `Retorno c/ sobra (${kegReturnLiters}L)${billingTag}`
              : kegReturnCondition === 'CHEIO_RETORNADO'
              ? `Retorno Cheio${billingTag}`
              : 'Retorno Vazio/Sujo';
          showBanner(data.message || `🔄 Barril ${code} retornado com sucesso!`, 'success');
          setKegSessionActions((prev) => [
            {
              code,
              action: detail,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...prev.slice(0, 29),
          ]);
        } else {
          showBanner(data.error || `Erro ao registrar retorno do barril ${code}`, 'error');
        }
      } else if (kegSubMode === 'WASH') {
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
  // 3. MÓDULO DE TANQUES & ADEGA (ALERTAS DE PURGA E CO2, OG, META FG E TAREFAS)
  // -------------------------------------------------------------
  const [selectedTankForDetails, setSelectedTankForDetails] = useState<any | null>(null);
  const [measurementGravityInput, setMeasurementGravityInput] = useState<string>('1.020');
  const [measurementUnit, setMeasurementUnit] = useState<'SG' | 'BRIX'>('SG');
  const [measurementTemp, setMeasurementTemp] = useState<string>('18.0');
  const [measurementPh, setMeasurementPh] = useState<string>('');
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false);

  // Unidade de medição com persistência em localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pinttech_fabrica_tank_unit');
      if (saved === 'SG' || saved === 'BRIX') {
        setMeasurementUnit(saved);
        if (saved === 'BRIX' && measurementGravityInput === '1.020') {
          const b = sgToBrix(1.020);
          setMeasurementGravityInput((Math.round(b * 10) / 10).toFixed(1));
        }
      }
    } catch {}
  }, []);

  const handleMeasurementUnitChange = (newUnit: 'SG' | 'BRIX') => {
    if (newUnit === measurementUnit) return;
    if (newUnit === 'BRIX') {
      const parsed = parseBreweryGravity(measurementGravityInput);
      if (parsed && parsed >= 0.990) {
        const brix = sgToBrix(parsed);
        setMeasurementGravityInput((Math.round(brix * 10) / 10).toFixed(1));
      }
    } else {
      const num = parseFloat(measurementGravityInput.replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        const sg = brixToSg(num);
        setMeasurementGravityInput((Math.round(sg * 1000) / 1000).toFixed(3));
      }
    }
    setMeasurementUnit(newUnit);
    try {
      localStorage.setItem('pinttech_fabrica_tank_unit', newUnit);
    } catch {}
  };

  const formatGravityPrimary = (sgVal: number | null | undefined, unit: 'SG' | 'BRIX' = measurementUnit) => {
    if (!sgVal || isNaN(sgVal) || sgVal <= 0) return '—';
    if (unit === 'BRIX') {
      const brix = Math.round(sgToBrix(sgVal) * 10) / 10;
      return `${brix.toFixed(1)}°Bx`;
    }
    return sgVal.toFixed(3);
  };

  const formatGravitySecondary = (sgVal: number | null | undefined, unit: 'SG' | 'BRIX' = measurementUnit) => {
    if (!sgVal || isNaN(sgVal) || sgVal <= 0) return null;
    if (unit === 'BRIX') {
      return `${sgVal.toFixed(3)} SG`;
    }
    const brix = Math.round(sgToBrix(sgVal) * 10) / 10;
    return `${brix.toFixed(1)}°Bx`;
  };

  const formatGravityDisplay = (sgVal: number | null | undefined, unit: 'SG' | 'BRIX' = measurementUnit) => {
    return formatGravityPrimary(sgVal, unit);
  };

  const getBatchOg = (batch: any): number | null => {
    if (!batch) return null;
    return batch.measuredOg || batch.recipe?.og || null;
  };

  const getBatchTargetFg = (batch: any): number | null => {
    if (!batch) return null;
    if (batch.customRecipeDataJson) {
      try {
        const parsed = JSON.parse(batch.customRecipeDataJson);
        if (parsed.targetFg) return parsed.targetFg;
      } catch {}
    }
    return batch.recipe?.fg || null;
  };

  const getBatchCurrentGravity = (batch: any): number | null => {
    if (!batch) return null;
    let grav = batch.measuredFg || null;
    if (batch.fermentationLogsJson) {
      try {
        const logs = JSON.parse(batch.fermentationLogsJson);
        if (Array.isArray(logs) && logs.length > 0) {
          const last = logs[logs.length - 1];
          if (last.gravity) grav = last.gravity;
        }
      } catch {}
    }
    return grav;
  };

  const getBatchCalculatedAbv = (batch: any): number | null => {
    if (!batch) return null;
    const og = getBatchOg(batch);
    const cur = getBatchCurrentGravity(batch);
    if (og && cur && og > cur && og > 1.0) {
      return Math.round(calculateAbv(og, cur) * 10) / 10;
    }
    return batch.measuredAbv || batch.recipe?.abv || null;
  };

  // Estados para Edição de Metas (OG Inicial & Objetivo FG)
  const [isEditingTargetsOpen, setIsEditingTargetsOpen] = useState(false);
  const [editOgInput, setEditOgInput] = useState('');
  const [editTargetFgInput, setEditTargetFgInput] = useState('');
  const [editTargetsUnit, setEditTargetsUnit] = useState<'SG' | 'BRIX'>('SG');
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  const openEditTargetsModal = (batch: any) => {
    const og = getBatchOg(batch);
    const targetFg = getBatchTargetFg(batch);
    const unit = measurementUnit;
    setEditTargetsUnit(unit);
    if (unit === 'BRIX') {
      setEditOgInput(og ? (Math.round(sgToBrix(og) * 10) / 10).toFixed(1) : '');
      setEditTargetFgInput(targetFg ? (Math.round(sgToBrix(targetFg) * 10) / 10).toFixed(1) : '');
    } else {
      setEditOgInput(og ? og.toFixed(3) : '');
      setEditTargetFgInput(targetFg ? targetFg.toFixed(3) : '');
    }
    setIsEditingTargetsOpen(true);
  };

  const handleEditTargetsUnitChange = (newUnit: 'SG' | 'BRIX') => {
    if (newUnit === editTargetsUnit) return;
    if (newUnit === 'BRIX') {
      const parsedOg = parseBreweryGravity(editOgInput);
      if (parsedOg && parsedOg >= 0.990) {
        setEditOgInput((Math.round(sgToBrix(parsedOg) * 10) / 10).toFixed(1));
      }
      const parsedFg = parseBreweryGravity(editTargetFgInput);
      if (parsedFg && parsedFg >= 0.990) {
        setEditTargetFgInput((Math.round(sgToBrix(parsedFg) * 10) / 10).toFixed(1));
      }
    } else {
      const numOg = parseFloat(editOgInput.replace(',', '.'));
      if (!isNaN(numOg) && numOg > 0) {
        setEditOgInput((Math.round(brixToSg(numOg) * 1000) / 1000).toFixed(3));
      }
      const numFg = parseFloat(editTargetFgInput.replace(',', '.'));
      if (!isNaN(numFg) && numFg > 0) {
        setEditTargetFgInput((Math.round(brixToSg(numFg) * 1000) / 1000).toFixed(3));
      }
    }
    setEditTargetsUnit(newUnit);
  };

  const handleSaveTargets = async () => {
    if (!selectedTankForDetails?.activeBatch?.id) return;
    const batch = selectedTankForDetails.activeBatch;
    setIsSavingTargets(true);

    let finalOgSg: number | null = null;
    let finalFgSg: number | null = null;

    if (editTargetsUnit === 'BRIX') {
      const numOg = parseFloat(editOgInput.replace(',', '.'));
      if (!isNaN(numOg) && numOg > 0) finalOgSg = brixToSg(numOg);

      const numFg = parseFloat(editTargetFgInput.replace(',', '.'));
      if (!isNaN(numFg) && numFg > 0) finalFgSg = brixToSg(numFg);
    } else {
      finalOgSg = parseBreweryGravity(editOgInput);
      finalFgSg = parseBreweryGravity(editTargetFgInput);
    }

    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measuredOg: finalOgSg,
          targetFg: finalFgSg,
        }),
      });

      if (res.ok) {
        showBanner('✅ Metas (OG Inicial e Objetivo FG) atualizadas com sucesso!', 'success');
        setIsEditingTargetsOpen(false);
        await loadInitialData();
        setSelectedTankForDetails((prev: any) => {
          if (!prev) return null;
          let customObj: any = {};
          if (prev.activeBatch?.customRecipeDataJson) {
            try { customObj = JSON.parse(prev.activeBatch.customRecipeDataJson); } catch {}
          }
          customObj.targetFg = finalFgSg;
          return {
            ...prev,
            activeBatch: {
              ...prev.activeBatch,
              measuredOg: finalOgSg,
              customRecipeDataJson: JSON.stringify(customObj),
              recipe: prev.activeBatch?.recipe ? { ...prev.activeBatch.recipe, fg: finalFgSg } : prev.activeBatch?.recipe,
            },
          };
        });
      } else {
        showBanner('Erro ao salvar metas no servidor', 'error');
      }
    } catch {
      showBanner('Falha de conexão ao salvar metas', 'error');
    } finally {
      setIsSavingTargets(false);
    }
  };

  // Estados para Mudança de Status do Tanque / Lote
  const [statusSelectTank, setStatusSelectTank] = useState<any | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleChangeTankStatus = async (tank: any, newStatus: string) => {
    setIsUpdatingStatus(true);
    playFeedback('click');
    const isBatchStatus = ['BRASSAGEM', 'FERMENTANDO', 'MATURANDO', 'PRONTO_ENVASE', 'ENVASADO', 'FINALIZADO'].includes(newStatus);
    const activeBatch = tank.activeBatch || batches.find((b) => b.tankId === tank.id && b.status !== 'FINALIZADO' && b.status !== 'CANCELADO');

    try {
      if (activeBatch && isBatchStatus) {
        await fetch(`/api/batches/${activeBatch.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        showBanner(`✅ Status do lote alterado para ${newStatus}`, 'success');
      } else {
        await fetch(`/api/tanks/${tank.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        showBanner(`✅ Status do tanque alterado para ${newStatus}`, 'success');
      }
      setStatusSelectTank(null);
      await loadInitialData();
      if (selectedTankForDetails?.id === tank.id) {
        setSelectedTankForDetails((prev: any) => {
          if (!prev) return null;
          return {
            ...prev,
            status: isBatchStatus ? prev.status : newStatus,
            activeBatch: prev.activeBatch ? { ...prev.activeBatch, status: isBatchStatus ? newStatus : prev.activeBatch.status } : null,
          };
        });
      }
    } catch {
      showBanner('Erro ao alterar status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Live preview da medição diária (cálculo de ABV e Atenuação instantâneo ao digitar)
  const liveMeasurementPreview = useMemo(() => {
    if (!selectedTankForDetails?.activeBatch) return null;
    const og = getBatchOg(selectedTankForDetails.activeBatch);
    if (!og || og <= 1.0) return null;

    let finalSg: number | null = null;
    if (measurementUnit === 'BRIX') {
      const pBrix = parseFloat(measurementGravityInput.replace(',', '.'));
      if (!isNaN(pBrix) && pBrix > 0) {
        const corr = correctRefractometerBrix(og, pBrix);
        finalSg = corr.fgSg;
      }
    } else {
      finalSg = parseBreweryGravity(measurementGravityInput);
    }

    if (finalSg && og > finalSg) {
      const abv = calculateAbv(og, finalSg);
      const att = Math.round(((og - finalSg) / (og - 1.0)) * 100);
      return {
        abv: Math.round(abv * 10) / 10,
        att,
        sg: finalSg,
        brix: Math.round(sgToBrix(finalSg) * 10) / 10,
      };
    }
    return null;
  }, [selectedTankForDetails, measurementGravityInput, measurementUnit]);

  // Excluir medição diária em caso de digitação incorreta
  const handleDeleteMeasurementLog = async (logIndex: number) => {
    if (!selectedTankForDetails?.activeBatch?.id) return;
    const batch = selectedTankForDetails.activeBatch;
    let logs: any[] = [];
    try {
      if (batch.fermentationLogsJson) logs = JSON.parse(batch.fermentationLogsJson);
    } catch {}

    if (!logs[logIndex]) return;
    if (!confirm('Deseja realmente remover esta medição?')) return;

    const updatedLogs = logs.filter((_, idx) => idx !== logIndex);
    const lastLog = updatedLogs[updatedLogs.length - 1];
    const newFg = lastLog ? lastLog.gravity : null;
    const og = getBatchOg(batch);
    const newAbv = og && newFg && og > newFg ? Math.round(calculateAbv(og, newFg) * 10) / 10 : null;

    try {
      await fetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fermentationLogsJson: JSON.stringify(updatedLogs),
          measuredFg: newFg,
          measuredAbv: newAbv,
        }),
      });
      showBanner('Medição removida com sucesso', 'info');
      setSelectedTankForDetails((prev: any) => ({
        ...prev,
        activeBatch: {
          ...prev.activeBatch,
          fermentationLogsJson: JSON.stringify(updatedLogs),
          measuredFg: newFg,
          measuredAbv: newAbv,
        },
      }));
      await loadInitialData();
    } catch {
      showBanner('Erro ao remover medição', 'error');
    }
  };

  // Estados para Adicionar Nova Tarefa de Adega
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(getLocalDateString());
  const [isSavingNewTask, setIsSavingNewTask] = useState(false);

  // Estado para Edição de Data de Realização de Tarefa
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [editCompletionDate, setEditCompletionDate] = useState<string>(getLocalDateString());

  // Utilitários para ALERTAS de Purga e Bater CO2 armazenados no campo notes do Tanque
  const hasPurgaAlert = (tank: any) => Boolean(tank.notes?.includes('[ALERTA_PURGA]'));
  const hasCo2Alert = (tank: any) => Boolean(tank.notes?.includes('[ALERTA_CO2]'));

  const handleToggleTankAlert = async (tank: any, flag: 'PURGA' | 'CO2', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentNotes = tank.notes || '';
    const token = flag === 'PURGA' ? '[ALERTA_PURGA]' : '[ALERTA_CO2]';
    const isSet = currentNotes.includes(token);
    const newNotes = isSet ? currentNotes.replace(token, '').trim() : `${currentNotes} ${token}`.trim();

    playFeedback(isSet ? 'click' : 'error');

    // Atualização otimista imediata na UI
    setTanks((prev) => prev.map((t) => (t.id === tank.id ? { ...t, notes: newNotes } : t)));
    if (selectedTankForDetails?.id === tank.id) {
      setSelectedTankForDetails((prev: any) => (prev ? { ...prev, notes: newNotes } : null));
    }

    try {
      await fetch(`/api/tanks/${tank.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      });
      showBanner(
        flag === 'PURGA'
          ? isSet
            ? `✅ Alerta de Purga removido do Tanque ${tank.name}`
            : `⚠️ ALERTA: Tanque ${tank.name} sinalizado para FAZER PURGA!`
          : isSet
          ? `✅ Alerta de CO2 removido do Tanque ${tank.name}`
          : `⚠️ ALERTA: Tanque ${tank.name} sinalizado para BATER CO2!`,
        isSet ? 'info' : 'error'
      );
    } catch {
      showBanner('Erro ao salvar alteração no tanque', 'error');
    }
  };

  const activeTanksList = useMemo(() => {
    return tanks.map((tank) => {
      const activeBatch = batches.find(
        (b) => b.tankId === tank.id && b.status !== 'FINALIZADO' && b.status !== 'CANCELADO'
      );

      const og = getBatchOg(activeBatch);
      const targetFg = getBatchTargetFg(activeBatch);
      const currentGravity = getBatchCurrentGravity(activeBatch);

      let lastLogTemp: number | null = null;
      try {
        if (activeBatch?.fermentationLogsJson) {
          const logs = JSON.parse(activeBatch.fermentationLogsJson);
          if (Array.isArray(logs) && logs.length > 0) {
            const last = logs[logs.length - 1];
            if (last.tempCelsius !== undefined) lastLogTemp = last.tempCelsius;
          }
        }
      } catch {}

      const currentAbv = getBatchCalculatedAbv(activeBatch);

      let progressPercent = 0;
      let pointsRemaining = 0;
      if (og && targetFg && currentGravity && og > targetFg) {
        const totalDrop = og - targetFg;
        const currentDrop = og - currentGravity;
        progressPercent = Math.min(100, Math.max(0, Math.round((currentDrop / totalDrop) * 100)));
        pointsRemaining = Math.max(0, Math.round((currentGravity - targetFg) * 1000));
      }

      const targetAbv = og && targetFg && og > targetFg ? Math.round(calculateAbv(og, targetFg) * 10) / 10 : null;

      return {
        ...tank,
        activeBatch,
        metrics: {
          og,
          targetFg,
          currentGravity,
          currentAbv,
          targetAbv,
          progressPercent,
          pointsRemaining,
          lastLogTemp,
        },
      };
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

      const og = batch.measuredOg || batch.recipe?.og || 1.050;
      const abv = calculateAbv(og, finalSg);
      const attenuation = Math.round(((og - finalSg) / (og - 1.0)) * 100);

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

  // Concluir ou reabrir tarefa de adega
  const handleToggleTankTask = async (taskIndex: number) => {
    if (!selectedTankForDetails?.activeBatch?.id) return;
    const batch = selectedTankForDetails.activeBatch;

    let tasks: any[] = [];
    try {
      if (batch.tankTasksJson) tasks = JSON.parse(batch.tankTasksJson);
    } catch {}

    if (!tasks[taskIndex]) return;
    const willBeCompleted = !tasks[taskIndex].completed;
    tasks[taskIndex].completed = willBeCompleted;
    tasks[taskIndex].completedAt = willBeCompleted ? getLocalDateString() : null;

    try {
      playFeedback('click');
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankTasksJson: JSON.stringify(tasks) }),
      });
      if (res.ok) {
        showBanner(
          willBeCompleted
            ? `✔️ Tarefa "${tasks[taskIndex].title}" marcada como feita hoje!`
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

  // Salvar data retroativa de realização da tarefa
  const handleSaveTaskCompletionDate = async () => {
    if (editingTaskIndex === null || !selectedTankForDetails?.activeBatch?.id) return;
    const batch = selectedTankForDetails.activeBatch;

    let tasks: any[] = [];
    try {
      if (batch.tankTasksJson) tasks = JSON.parse(batch.tankTasksJson);
    } catch {}

    if (!tasks[editingTaskIndex]) return;
    tasks[editingTaskIndex].completed = true;
    tasks[editingTaskIndex].completedAt = editCompletionDate;

    try {
      playFeedback('click');
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankTasksJson: JSON.stringify(tasks) }),
      });
      if (res.ok) {
        showBanner(`📅 Data de realização atualizada para: ${formatDateShort(editCompletionDate)}`, 'success');
        await loadInitialData();
        setSelectedTankForDetails((prev: any) => ({
          ...prev,
          activeBatch: { ...prev.activeBatch, tankTasksJson: JSON.stringify(tasks) },
        }));
        setEditingTaskIndex(null);
      }
    } catch {
      showBanner('Erro ao salvar data da tarefa', 'error');
    }
  };

  // Adicionar Nova Tarefa de Adega no Tanque
  const handleAddNewTask = async () => {
    if (!newTaskTitle.trim() || !selectedTankForDetails?.activeBatch?.id) {
      showBanner('Informe o título da tarefa', 'error');
      return;
    }
    const batch = selectedTankForDetails.activeBatch;
    setIsSavingNewTask(true);

    try {
      let tasks: any[] = [];
      try {
        if (batch.tankTasksJson) tasks = JSON.parse(batch.tankTasksJson);
      } catch {}

      const newTask = {
        id: `task_${Date.now()}`,
        title: newTaskTitle.trim(),
        dueDate: newTaskDueDate || getLocalDateString(),
        completed: false,
      };

      const updatedTasks = [...tasks, newTask];

      const res = await fetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankTasksJson: JSON.stringify(updatedTasks) }),
      });

      if (res.ok) {
        showBanner(`✨ Tarefa "${newTask.title}" adicionada com sucesso!`, 'success');
        setNewTaskTitle('');
        setIsAddTaskModalOpen(false);
        await loadInitialData();
        setSelectedTankForDetails((prev: any) => ({
          ...prev,
          activeBatch: { ...prev.activeBatch, tankTasksJson: JSON.stringify(updatedTasks) },
        }));
      } else {
        showBanner('Erro ao cadastrar tarefa', 'error');
      }
    } catch {
      showBanner('Falha de rede ao salvar tarefa', 'error');
    } finally {
      setIsSavingNewTask(false);
    }
  };

  // -------------------------------------------------------------
  // 4. MÓDULO DE BRASSAGEM (ESCOLHA DE RECEITA, MEDIÇÕES DE PH, OG, ETC)
  // -------------------------------------------------------------
  const [brewMode, setBrewMode] = useState<'ACTIVE' | 'NEW_RECIPE'>('ACTIVE');
  const [selectedBrewBatch, setSelectedBrewBatch] = useState<any | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [showAllRecipes, setShowAllRecipes] = useState<boolean>(false);

  // Receita em Branco
  const [blankRecipeName, setBlankRecipeName] = useState<string>('');
  const [blankRecipeStyle, setBlankRecipeStyle] = useState<string>('American IPA');

  const [brewBatchNumber, setBrewBatchNumber] = useState<string>('');
  const [brewTargetTankId, setBrewTargetTankId] = useState<string>('');
  const [brewOgInput, setBrewOgInput] = useState<string>('1.054');
  const [brewOgUnit, setBrewOgUnit] = useState<'SG' | 'BRIX'>('SG');

  // Recupera preferência de unidade de OG salva no dispositivo
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pinttech_brew_og_unit');
      if (saved === 'SG' || saved === 'BRIX') {
        setBrewOgUnit(saved);
        if (saved === 'BRIX' && brewOgInput === '1.054') {
          const b = sgToBrix(1.054);
          setBrewOgInput((Math.round(b * 10) / 10).toFixed(1));
        }
      }
    } catch {}
  }, []);

  const handleBrewOgUnitChange = (newUnit: 'SG' | 'BRIX') => {
    if (newUnit === brewOgUnit) return;
    if (newUnit === 'BRIX') {
      const parsedOg = parseBreweryGravity(brewOgInput);
      if (parsedOg && parsedOg >= 0.990) {
        setBrewOgInput((Math.round(sgToBrix(parsedOg) * 10) / 10).toFixed(1));
      }
    } else {
      const numBrix = parseFloat(brewOgInput.replace(',', '.'));
      if (!isNaN(numBrix) && numBrix > 0) {
        setBrewOgInput((Math.round(brixToSg(numBrix) * 1000) / 1000).toFixed(3));
      }
    }
    setBrewOgUnit(newUnit);
    try {
      localStorage.setItem('pinttech_brew_og_unit', newUnit);
    } catch {}
  };

  const brewOgConvertedPreview = useMemo(() => {
    if (!brewOgInput || !brewOgInput.trim()) return null;
    if (brewOgUnit === 'BRIX') {
      const numBrix = parseFloat(brewOgInput.replace(',', '.'));
      if (!isNaN(numBrix) && numBrix > 0) {
        const sg = Math.round(brixToSg(numBrix) * 1000) / 1000;
        return {
          otherUnit: 'SG',
          convertedText: `${sg.toFixed(3)} SG`,
          sgValue: sg,
        };
      }
    } else {
      const parsedOg = parseBreweryGravity(brewOgInput);
      if (parsedOg && parsedOg >= 0.990) {
        const brix = Math.round(sgToBrix(parsedOg) * 10) / 10;
        return {
          otherUnit: '°Bx',
          convertedText: `${brix.toFixed(1)} °Bx`,
          sgValue: parsedOg,
        };
      }
    }
    return null;
  }, [brewOgUnit, brewOgInput]);

  interface PhReadingItem {
    ph: string;
    notes: string;
  }

  const [brewPhMashList, setBrewPhMashList] = useState<PhReadingItem[]>([
    { ph: '5.3', notes: '' },
  ]);
  const [brewPhBoilList, setBrewPhBoilList] = useState<PhReadingItem[]>([
    { ph: '5.1', notes: '' },
  ]);
  const [brewVolumeInput, setBrewVolumeInput] = useState<string>('500');
  const [brewNotesInput, setBrewNotesInput] = useState<string>('');
  const [isSavingBrew, setIsSavingBrew] = useState<boolean>(false);

  // Estados para Registro & Rótulo MAPA na Brassagem
  const [brewMapaRegistration, setBrewMapaRegistration] = useState<string>('');
  const [brewCommercialDenomination, setBrewCommercialDenomination] = useState<string>('');
  const [brewMapaProductId, setBrewMapaProductId] = useState<string | null>(null);
  const [saveMapaToRecipe, setSaveMapaToRecipe] = useState<boolean>(true);
  const [isSavingQuickMapa, setIsSavingQuickMapa] = useState<boolean>(false);

  // Extrator inteligente de anotações do BeerXML
  const extractXmlNotes = (rec: any): string | null => {
    if (!rec) return null;
    if (rec.recipeDataJson) {
      try {
        const data = typeof rec.recipeDataJson === 'string' ? JSON.parse(rec.recipeDataJson) : rec.recipeDataJson;
        if (data?.notes && typeof data.notes === 'string' && data.notes.trim()) {
          return data.notes.trim();
        }
        if (data?.tasteNotes && typeof data.tasteNotes === 'string' && data.tasteNotes.trim()) {
          return data.tasteNotes.trim();
        }
      } catch {}
    }
    if (rec.xmlContent && typeof rec.xmlContent === 'string') {
      const notesMatch = rec.xmlContent.match(/<NOTES>([\s\S]*?)<\/NOTES>/i);
      if (notesMatch && notesMatch[1] && notesMatch[1].trim()) {
        return notesMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      }
      const tasteMatch = rec.xmlContent.match(/<TASTE_NOTES>([\s\S]*?)<\/TASTE_NOTES>/i);
      if (tasteMatch && tasteMatch[1] && tasteMatch[1].trim()) {
        return tasteMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      }
    }
    if (rec.description && typeof rec.description === 'string') {
      const desc = rec.description.trim();
      if (desc && !desc.startsWith('Importada via BeerXML') && !desc.startsWith('Receita criada na Fábrica')) {
        return desc;
      }
    }
    return null;
  };

  const activeBrewBatches = useMemo(
    () => batches.filter((b) => b.status === 'BRASSAGEM' || b.status === 'PLANEJADO'),
    [batches]
  );

  // Filtra receitas que NÃO foram brassadas (XMLs disponíveis sem lote de produção gerado)
  const unbrewedRecipes = useMemo(
    () => recipes.filter((r) => (r._count?.batches ?? r.batches?.length ?? 0) === 0),
    [recipes]
  );

  const displayedRecipes = useMemo(
    () => (showAllRecipes ? recipes : unbrewedRecipes),
    [recipes, unbrewedRecipes, showAllRecipes]
  );

  const selectedRecipeObj = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId) || null,
    [recipes, selectedRecipeId]
  );

  const handleSelectRecipeForBrew = (recId: string) => {
    setSelectedRecipeId(recId);
    if (recId === '__BLANK__') {
      setBrewOgInput(brewOgUnit === 'BRIX' ? '12.4' : '1.050');
      setBrewVolumeInput('500');
      setBrewPhMashList([{ ph: '5.3', notes: '' }]);
      setBrewPhBoilList([{ ph: '5.1', notes: '' }]);
      setBlankRecipeName('');
      setBlankRecipeStyle('American IPA');
      setBrewMapaRegistration('');
      setBrewCommercialDenomination('Cerveja Especial');
      setBrewMapaProductId(null);
      const year = new Date().getFullYear().toString().slice(-2);
      setBrewBatchNumber(`LOTE-${year}${String(batches.length + 1).padStart(2, '0')}`);
      return;
    }
    const rec = recipes.find((r) => r.id === recId);
    if (rec) {
      if (rec.og) {
        if (brewOgUnit === 'BRIX') {
          setBrewOgInput((Math.round(sgToBrix(rec.og) * 10) / 10).toFixed(1));
        } else {
          setBrewOgInput(String(rec.og));
        }
      }
      if (rec.targetPhMash) setBrewPhMashList([{ ph: String(rec.targetPhMash), notes: 'Alvo' }]);
      else setBrewPhMashList([{ ph: '5.3', notes: '' }]);
      setBrewPhBoilList([{ ph: '5.1', notes: '' }]);
      if (rec.batchYieldLiters) setBrewVolumeInput(String(rec.batchYieldLiters));
      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = rec.name ? rec.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() : 'REC';
      setBrewBatchNumber(`${prefix || 'LOT'}-${year}${String(batches.length + 1).padStart(2, '0')}`);

      // Preenchimento e correspondência inteligente de MAPA
      const reg = (rec.mapaRegistration || rec.mapaProduct?.mapaRegistration || '').trim();
      const denom = (rec.commercialDenomination || rec.mapaProduct?.commercialDenomination || `Cerveja Puro Malte Tipo ${rec.style || 'Ale'}`).trim();
      const prodId = rec.mapaProductId || rec.mapaProduct?.id || null;

      let matchedProd = null;
      if (prodId) {
        matchedProd = mapaProducts.find((p) => p.id === prodId);
      } else if (reg) {
        matchedProd = mapaProducts.find((p) => p.mapaRegistration.trim().toLowerCase() === reg.toLowerCase());
      } else if (rec.name) {
        // Tenta encontrar pelo nome da receita no catálogo MAPA
        const recNameClean = rec.name.trim().toLowerCase();
        matchedProd = mapaProducts.find((p) => p.name.trim().toLowerCase() === recNameClean || recNameClean.includes(p.name.trim().toLowerCase()));
      }

      if (matchedProd) {
        setBrewMapaRegistration(matchedProd.mapaRegistration || reg);
        setBrewCommercialDenomination(matchedProd.commercialDenomination || denom);
        setBrewMapaProductId(matchedProd.id);
      } else {
        setBrewMapaRegistration(reg);
        setBrewCommercialDenomination(denom);
        setBrewMapaProductId(prodId);
      }
    }
  };

  const handleQuickSaveMapaProduct = async () => {
    if (!brewMapaRegistration.trim()) {
      showBanner('Informe o número de registro MAPA para cadastrar', 'error');
      return;
    }
    setIsSavingQuickMapa(true);
    try {
      const prodName = selectedRecipeObj?.name || blankRecipeName || 'Nova Cerveja';
      const prodStyle = selectedRecipeObj?.style || blankRecipeStyle || 'Cerveja Especial';
      const res = await fetch('/api/mapa-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prodName,
          mapaRegistration: brewMapaRegistration.trim(),
          commercialDenomination: brewCommercialDenomination.trim() || `Cerveja Puro Malte Tipo ${prodStyle}`,
          style: prodStyle,
          status: 'ATIVO',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showBanner(`✅ Rótulo ${prodName} cadastrado no catálogo MAPA!`, 'success');
        setMapaProducts((prev) => [...prev.filter((p) => p.id !== data.id), data]);
        setBrewMapaProductId(data.id);
      } else {
        showBanner(data.error || 'Erro ao salvar no catálogo MAPA', 'error');
      }
    } catch {
      showBanner('Erro de conexão ao salvar MAPA', 'error');
    } finally {
      setIsSavingQuickMapa(false);
    }
  };

  const handleSaveBreweryData = async (moveToFermentation: boolean = false) => {
    setIsSavingBrew(true);
    try {
      let parsedOg: number = 1.050;
      if (brewOgUnit === 'BRIX') {
        const numBrix = parseFloat(brewOgInput.replace(',', '.'));
        if (!isNaN(numBrix) && numBrix > 0) {
          parsedOg = Math.round(brixToSg(numBrix) * 1000) / 1000;
        } else {
          parsedOg = parseBreweryGravity(brewOgInput) || 1.050;
        }
      } else {
        parsedOg = parseBreweryGravity(brewOgInput) || 1.050;
      }

      const parsedVol = parseFloat(brewVolumeInput.replace(',', '.')) || 0;

      const validPhMashList = brewPhMashList.filter((item) => item.ph.trim() !== '');
      const validPhBoilList = brewPhBoilList.filter((item) => item.ph.trim() !== '');

      const parsedPhMash = validPhMashList.length > 0 ? parseFloat(validPhMashList[0].ph.replace(',', '.')) : undefined;
      const parsedPhBoil = validPhBoilList.length > 0 ? parseFloat(validPhBoilList[0].ph.replace(',', '.')) : undefined;

      if (brewMode === 'ACTIVE') {
        if (!selectedBrewBatch?.id) {
          showBanner('Selecione uma brassagem em andamento', 'error');
          return;
        }

        let existingCustom: any = {};
        if (selectedBrewBatch.customRecipeDataJson) {
          try {
            existingCustom = typeof selectedBrewBatch.customRecipeDataJson === 'string'
              ? JSON.parse(selectedBrewBatch.customRecipeDataJson)
              : selectedBrewBatch.customRecipeDataJson;
          } catch {}
        }
        const updatedCustom = {
          ...existingCustom,
          mashPhReadings: validPhMashList,
          boilPhReadings: validPhBoilList,
          ogUnit: brewOgUnit,
          originalOgInput: brewOgInput,
        };

        const res = await fetch(`/api/batches/${selectedBrewBatch.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            measuredOg: parsedOg,
            volumeProducedLiters: parsedVol > 0 ? parsedVol : undefined,
            phMash: parsedPhMash,
            phBoil: parsedPhBoil,
            customRecipeDataJson: JSON.stringify(updatedCustom),
            status: moveToFermentation ? 'FERMENTANDO' : selectedBrewBatch.status,
            fermentationStartDate: moveToFermentation ? new Date() : undefined,
            notes: brewNotesInput ? brewNotesInput.trim() : undefined,
            mapaRegistration: brewMapaRegistration.trim() || undefined,
            commercialDenomination: brewCommercialDenomination.trim() || undefined,
          }),
        });

        // Opcional: Atualiza o registro MAPA permanente da receita vinculada
        if (saveMapaToRecipe && selectedBrewBatch.recipeId && brewMapaRegistration.trim()) {
          fetch(`/api/recipes/${selectedBrewBatch.recipeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mapaRegistration: brewMapaRegistration.trim(),
              commercialDenomination: brewCommercialDenomination.trim() || null,
              mapaProductId: brewMapaProductId || null,
            }),
          }).catch(() => {});
        }

        if (res.ok) {
          showBanner(
            moveToFermentation
              ? `🔥 Brassagem concluída! Chopp transferido para FERMENTAÇÃO.`
              : `✅ Medições da brassagem salvas com sucesso!`,
            'success'
          );
          await loadInitialData();
          if (moveToFermentation) setSelectedBrewBatch(null);
        } else {
          showBanner('Erro ao salvar dados da brassagem', 'error');
        }
      } else {
        if (!selectedRecipeId) {
          showBanner('Selecione uma receita do catálogo ou escolha Receita em Branco', 'error');
          return;
        }

        let actualRecipeId = selectedRecipeId;

        // Se for receita em branco, cria a receita primeiro
        if (selectedRecipeId === '__BLANK__') {
          if (!blankRecipeName.trim()) {
            showBanner('Informe o nome da cerveja para a receita em branco', 'error');
            return;
          }

          const recRes = await fetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: blankRecipeName.trim(),
              style: blankRecipeStyle.trim() || 'Cerveja Especial',
              og: parsedOg,
              batchYieldLiters: parsedVol > 0 ? parsedVol : 500,
              targetPhMash: parsedPhMash || 5.3,
              mapaRegistration: brewMapaRegistration.trim() || null,
              commercialDenomination: brewCommercialDenomination.trim() || null,
              mapaProductId: brewMapaProductId || null,
              description: 'Receita em branco criada no Chão de Fábrica. Aguardando importação do arquivo BeerXML correspondente.',
            }),
          });

          if (!recRes.ok) {
            const errData = await recRes.json();
            showBanner(errData.error || 'Erro ao cadastrar receita em branco', 'error');
            return;
          }

          const createdRec = await recRes.json();
          actualRecipeId = createdRec.id;
        }

        if (!brewBatchNumber.trim()) {
          showBanner('Informe o número do lote (Ex: IPA-2601)', 'error');
          return;
        }

        const customData = {
          mashPhReadings: validPhMashList,
          boilPhReadings: validPhBoilList,
          createdAsBlankRecipe: selectedRecipeId === '__BLANK__',
          ogUnit: brewOgUnit,
          originalOgInput: brewOgInput,
        };

        const res = await fetch('/api/batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipeId: actualRecipeId,
            batchNumber: brewBatchNumber.trim().toUpperCase(),
            tankId: brewTargetTankId || undefined,
            volumePlannedLiters: parsedVol > 0 ? parsedVol : (selectedRecipeObj?.batchYieldLiters || 500),
            volumeProducedLiters: parsedVol > 0 ? parsedVol : undefined,
            measuredOg: parsedOg,
            phMash: parsedPhMash,
            phBoil: parsedPhBoil,
            customRecipeDataJson: JSON.stringify(customData),
            status: moveToFermentation ? 'FERMENTANDO' : 'BRASSAGEM',
            notes: brewNotesInput ? brewNotesInput.trim() : undefined,
            mapaRegistration: brewMapaRegistration.trim() || undefined,
            commercialDenomination: brewCommercialDenomination.trim() || undefined,
          }),
        });

        // Atualiza a receita permanente com o MAPA selecionado
        if (saveMapaToRecipe && actualRecipeId && brewMapaRegistration.trim() && selectedRecipeId !== '__BLANK__') {
          fetch(`/api/recipes/${actualRecipeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mapaRegistration: brewMapaRegistration.trim(),
              commercialDenomination: brewCommercialDenomination.trim() || null,
              mapaProductId: brewMapaProductId || null,
            }),
          }).catch(() => {});
        }

        const data = await res.json();
        if (res.ok) {
          showBanner(
            moveToFermentation
              ? `🔥 Nova brassagem criada e enviada para FERMENTAÇÃO!`
              : `🍺 Nova brassagem iniciada com sucesso (Lote #${brewBatchNumber})!`,
            'success'
          );
          await loadInitialData();
          setBrewMode('ACTIVE');
          setSelectedRecipeId('');
          setBrewBatchNumber('');
          setBlankRecipeName('');
        } else {
          showBanner(data.error || 'Erro ao iniciar brassagem da receita', 'error');
        }
      }
    } catch {
      showBanner('Falha de rede ao processar brassagem', 'error');
    } finally {
      setIsSavingBrew(false);
    }
  };

  // -------------------------------------------------------------
  // 5. MÓDULO TAREFAS DA FÁBRICA & ADEGA
  // -------------------------------------------------------------
  const QUICK_TASK_PRESETS = [
    { label: '🌿 Dry Hopping', type: 'DRY_HOPPING', defaultTitle: 'Dry Hopping', unit: 'KG', defaultAmount: 2.0 },
    { label: '🪣 Purga Levedura', type: 'PURGE', defaultTitle: 'Purga de Levedura / Sedimento', unit: 'L' },
    { label: '❄️ Cold Crash (0°C)', type: 'COLD_CRASH', defaultTitle: 'Baixar Temperatura para Cold Crash (0°C)' },
    { label: '🧪 Medição Densidade', type: 'MEASUREMENT', defaultTitle: 'Medição Diária de Densidade & pH' },
    { label: '💨 Carbonatação', type: 'OTHER', defaultTitle: 'Subir Pressão / Carbonatação no Tanque' },
    { label: '🧼 Limpeza CIP', type: 'OTHER', defaultTitle: 'Higienização CIP de Linhas / Válvulas' },
  ];

  const fabricaTasks = useMemo(() => {
    const list: Array<{
      id: string;
      batchId: string;
      batchNumber: string;
      recipeName: string;
      recipeStyle?: string;
      tankName: string;
      tankId?: string;
      targetType?: 'FABRICA' | 'TANK';
      title: string;
      type: string;
      dueDate: string;
      completed: boolean;
      completedAt?: string;
      amount?: number;
      unit?: string;
      notes?: string;
      urgency: 'LATE' | 'TODAY' | 'FUTURE' | 'COMPLETED';
      daysDiff: number;
    }> = [];

    const todayStr = getLocalDateString();
    const today = new Date(todayStr + 'T00:00:00');

    batches.forEach((b) => {
      if (!b.tankTasksJson) return;
      try {
        const parsed = typeof b.tankTasksJson === 'string' ? JSON.parse(b.tankTasksJson) : b.tankTasksJson;
        if (Array.isArray(parsed)) {
          parsed.forEach((t: any) => {
            if (!t || !t.id || !t.title) return;

            const dueDateStr = t.dueDate || todayStr;
            let urgency: 'LATE' | 'TODAY' | 'FUTURE' | 'COMPLETED' = 'FUTURE';

            const taskDate = new Date(dueDateStr + 'T00:00:00');
            const diffTime = taskDate.getTime() - today.getTime();
            const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (t.completed) {
              urgency = 'COMPLETED';
            } else if (dueDateStr < todayStr) {
              urgency = 'LATE';
            } else if (dueDateStr === todayStr) {
              urgency = 'TODAY';
            } else {
              urgency = 'FUTURE';
            }

            const isFabrica = t.targetType === 'FABRICA' || t.tankName === 'Fábrica';
            const tankName = isFabrica
              ? 'Fábrica'
              : t.tankName || b.tank?.name || tanks.find((tk) => tk.id === (t.tankId || b.tankId))?.name || 'Tanque';

            const recipeName = isFabrica
              ? 'Rotina da Fábrica'
              : t.recipeName || b.recipe?.name || 'Cerveja';

            list.push({
              id: t.id,
              batchId: b.id,
              batchNumber: isFabrica ? '' : (b.batchNumber || 'S/N'),
              recipeName,
              recipeStyle: isFabrica ? '' : (b.recipe?.style || ''),
              tankName,
              tankId: t.tankId || b.tankId,
              targetType: isFabrica ? 'FABRICA' : 'TANK',
              title: t.title,
              type: t.type || 'OTHER',
              dueDate: dueDateStr,
              completed: !!t.completed,
              completedAt: t.completedAt,
              amount: t.amount,
              unit: t.unit,
              notes: t.notes,
              urgency,
              daysDiff,
            });
          });
        }
      } catch {}
    });

    return list;
  }, [batches, tanks]);

  const lateTasksCount = useMemo(() => fabricaTasks.filter((t) => t.urgency === 'LATE').length, [fabricaTasks]);
  const todayTasksCount = useMemo(() => fabricaTasks.filter((t) => t.urgency === 'TODAY').length, [fabricaTasks]);
  const pendingTasksCount = useMemo(() => fabricaTasks.filter((t) => !t.completed).length, [fabricaTasks]);

  const [fabricaTaskFilter, setFabricaTaskFilter] = useState<'PENDING' | 'TODAY' | 'LATE' | 'ALL' | 'COMPLETED'>('PENDING');
  const [fabricaTaskSearch, setFabricaTaskSearch] = useState<string>('');

  const filteredFabricaTasks = useMemo(() => {
    return fabricaTasks.filter((t) => {
      if (fabricaTaskFilter === 'TODAY' && t.urgency !== 'TODAY') return false;
      if (fabricaTaskFilter === 'LATE' && t.urgency !== 'LATE') return false;
      if (fabricaTaskFilter === 'PENDING' && t.completed) return false;
      if (fabricaTaskFilter === 'COMPLETED' && !t.completed) return false;

      if (fabricaTaskSearch.trim()) {
        const q = fabricaTaskSearch.trim().toLowerCase();
        const matches =
          t.title.toLowerCase().includes(q) ||
          t.tankName.toLowerCase().includes(q) ||
          t.batchNumber.toLowerCase().includes(q) ||
          t.recipeName.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          t.type.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      const priority: Record<string, number> = { LATE: 1, TODAY: 2, FUTURE: 3, COMPLETED: 4 };
      const pA = priority[a.urgency] || 99;
      const pB = priority[b.urgency] || 99;
      if (pA !== pB) return pA - pB;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [fabricaTasks, fabricaTaskFilter, fabricaTaskSearch]);

  const taskDestinations = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      targetType: 'FABRICA' | 'TANK';
      tankId?: string;
      tankName: string;
      batchId?: string;
      recipeName?: string;
      batchNumber?: string;
    }> = [];

    // 1. Fábrica Geral (Rotinas Operacionais)
    list.push({
      id: 'FABRICA',
      label: 'Fábrica (Rotina da Fábrica)',
      targetType: 'FABRICA',
      tankName: 'Fábrica',
      recipeName: 'Rotina da Fábrica',
    });

    // 2. Apenas os Tanques da Cervejaria
    tanks.forEach((tank) => {
      const activeBatch = batches.find(
        (b) => b.tankId === tank.id && !['FINALIZADO', 'CANCELADO'].includes(b.status)
      );

      if (activeBatch) {
        list.push({
          id: `tank_${tank.id}`,
          label: `${tank.name}${activeBatch.recipe?.name ? ` - ${activeBatch.recipe.name}` : ''}`,
          targetType: 'TANK',
          tankId: tank.id,
          tankName: tank.name,
          batchId: activeBatch.id,
          recipeName: activeBatch.recipe?.name || 'Cerveja',
          batchNumber: activeBatch.batchNumber || 'S/N',
        });
      } else {
        list.push({
          id: `tank_${tank.id}`,
          label: `${tank.name} (Livre)`,
          targetType: 'TANK',
          tankId: tank.id,
          tankName: tank.name,
        });
      }
    });

    return list;
  }, [tanks, batches]);

  // Estados do Modal de Tarefa
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskItem, setEditingTaskItem] = useState<any | null>(null);
  const [taskFormDestination, setTaskFormDestination] = useState<string>('FABRICA');
  const [taskFormTitle, setTaskFormTitle] = useState<string>('');
  const [taskFormType, setTaskFormType] = useState<string>('DRY_HOPPING');
  const [taskFormDueDate, setTaskFormDueDate] = useState<string>(getLocalDateString());
  const [taskFormAmount, setTaskFormAmount] = useState<string>('');
  const [taskFormUnit, setTaskFormUnit] = useState<string>('KG');
  const [taskFormNotes, setTaskFormNotes] = useState<string>('');
  const [isSavingTask, setIsSavingTask] = useState(false);

  const handleToggleFabricaTask = async (taskItem: any) => {
    const targetBatch = batches.find((b) => b.id === taskItem.batchId);
    if (!targetBatch) return;

    let currentTasks: any[] = [];
    try {
      currentTasks = targetBatch.tankTasksJson
        ? typeof targetBatch.tankTasksJson === 'string'
          ? JSON.parse(targetBatch.tankTasksJson)
          : targetBatch.tankTasksJson
        : [];
    } catch {}

    const newCompleted = !taskItem.completed;
    const updatedTasks = currentTasks.map((t: any) =>
      t.id === taskItem.id
        ? {
            ...t,
            completed: newCompleted,
            completedAt: newCompleted ? new Date().toISOString() : undefined,
          }
        : t
    );

    const updatedJson = JSON.stringify(updatedTasks);

    // Atualização otimista
    setBatches((prev) =>
      prev.map((b) => (b.id === targetBatch.id ? { ...b, tankTasksJson: updatedJson } : b))
    );

    if (newCompleted) {
      playFeedback('success');
      showBanner(`✅ Tarefa "${taskItem.title}" concluída com sucesso!`, 'success');
    } else {
      showBanner(`🔄 Tarefa "${taskItem.title}" reaberta.`, 'info');
    }

    try {
      await fetch(`/api/batches/${targetBatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankTasksJson: updatedJson }),
      });
    } catch {
      showBanner('Erro ao sincronizar tarefa com o servidor', 'error');
    }
  };

  const handleOpenCreateTask = (preset?: any) => {
    setEditingTaskItem(null);
    if (preset?.defaultTitle?.includes('CIP') || preset?.defaultTitle?.includes('Limpeza')) {
      setTaskFormDestination('FABRICA');
    } else {
      const firstOccupied = taskDestinations.find((d) => d.targetType === 'TANK' && d.batchId);
      setTaskFormDestination(firstOccupied?.id || taskDestinations[1]?.id || 'FABRICA');
    }
    setTaskFormTitle(preset?.defaultTitle || '');
    setTaskFormType(preset?.type || 'DRY_HOPPING');
    setTaskFormDueDate(getLocalDateString());
    setTaskFormAmount(preset?.defaultAmount ? String(preset.defaultAmount) : '');
    setTaskFormUnit(preset?.unit || 'KG');
    setTaskFormNotes('');
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (taskItem: any) => {
    setEditingTaskItem(taskItem);
    if (taskItem.targetType === 'FABRICA' || taskItem.tankName === 'Fábrica') {
      setTaskFormDestination('FABRICA');
    } else if (taskItem.tankId) {
      setTaskFormDestination(`tank_${taskItem.tankId}`);
    } else {
      setTaskFormDestination('FABRICA');
    }
    setTaskFormTitle(taskItem.title);
    setTaskFormType(taskItem.type || 'OTHER');
    setTaskFormDueDate(taskItem.dueDate || getLocalDateString());
    setTaskFormAmount(taskItem.amount ? String(taskItem.amount) : '');
    setTaskFormUnit(taskItem.unit || 'KG');
    setTaskFormNotes(taskItem.notes || '');
    setIsTaskModalOpen(true);
  };

  const handleSetQuickDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setTaskFormDueDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSaveTask = async () => {
    if (!taskFormTitle.trim()) {
      showBanner('Informe o título da tarefa', 'error');
      return;
    }

    const selectedDest = taskDestinations.find((d) => d.id === taskFormDestination) || taskDestinations[0];
    if (!selectedDest) {
      showBanner('Selecione o tanque ou fábrica de destino', 'error');
      return;
    }

    setIsSavingTask(true);
    try {
      let targetBatch = selectedDest.batchId ? batches.find((b) => b.id === selectedDest.batchId) : null;
      if (!targetBatch) {
        targetBatch = batches.find((b) => !['FINALIZADO', 'CANCELADO'].includes(b.status)) || batches[0];
      }

      if (!targetBatch) {
        showBanner('Nenhum lote disponível para salvar a tarefa', 'error');
        return;
      }

      let currentTasks: any[] = [];
      try {
        currentTasks = targetBatch.tankTasksJson
          ? typeof targetBatch.tankTasksJson === 'string'
            ? JSON.parse(targetBatch.tankTasksJson)
            : targetBatch.tankTasksJson
          : [];
      } catch {}

      const isFabrica = selectedDest.targetType === 'FABRICA';
      const tankName = isFabrica ? 'Fábrica' : selectedDest.tankName;
      const recipeName = isFabrica ? 'Rotina da Fábrica' : selectedDest.recipeName;

      let updatedTasks: any[];

      if (editingTaskItem) {
        if (editingTaskItem.batchId !== targetBatch.id) {
          const oldBatch = batches.find((b) => b.id === editingTaskItem.batchId);
          if (oldBatch) {
            let oldTasks: any[] = [];
            try {
              oldTasks = oldBatch.tankTasksJson
                ? typeof oldBatch.tankTasksJson === 'string'
                  ? JSON.parse(oldBatch.tankTasksJson)
                  : oldBatch.tankTasksJson
                : [];
            } catch {}
            const filteredOld = oldTasks.filter((t) => t.id !== editingTaskItem.id);
            fetch(`/api/batches/${oldBatch.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tankTasksJson: JSON.stringify(filteredOld) }),
            }).catch(() => {});
            setBatches((prev) =>
              prev.map((b) => (b.id === oldBatch.id ? { ...b, tankTasksJson: JSON.stringify(filteredOld) } : b))
            );
          }
        }

        const taskObj = {
          id: editingTaskItem.id,
          title: taskFormTitle.trim(),
          type: taskFormType,
          dueDate: taskFormDueDate,
          completed: editingTaskItem.completed,
          completedAt: editingTaskItem.completedAt,
          amount: taskFormAmount ? parseFloat(taskFormAmount) : undefined,
          unit: taskFormUnit,
          notes: taskFormNotes.trim() || undefined,
          targetType: selectedDest.targetType,
          tankId: selectedDest.tankId,
          tankName,
          recipeName,
        };

        if (editingTaskItem.batchId === targetBatch.id) {
          updatedTasks = currentTasks.map((t: any) => (t.id === editingTaskItem.id ? taskObj : t));
        } else {
          updatedTasks = [...currentTasks, taskObj];
        }
      } else {
        const newTask = {
          id: `task-${Date.now()}`,
          title: taskFormTitle.trim(),
          type: taskFormType,
          dueDate: taskFormDueDate,
          completed: false,
          amount: taskFormAmount ? parseFloat(taskFormAmount) : undefined,
          unit: taskFormUnit,
          notes: taskFormNotes.trim() || undefined,
          targetType: selectedDest.targetType,
          tankId: selectedDest.tankId,
          tankName,
          recipeName,
        };
        updatedTasks = [...currentTasks, newTask];
      }

      const updatedJson = JSON.stringify(updatedTasks);

      // Otimista
      setBatches((prev) =>
        prev.map((b) => (b.id === targetBatch.id ? { ...b, tankTasksJson: updatedJson } : b))
      );

      const res = await fetch(`/api/batches/${targetBatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankTasksJson: updatedJson }),
      });

      if (res.ok) {
        playFeedback('success');
        showBanner(
          editingTaskItem ? '✅ Tarefa atualizada com sucesso!' : '📋 Nova tarefa criada com sucesso!',
          'success'
        );
        setIsTaskModalOpen(false);
      } else {
        showBanner('Erro ao salvar tarefa no banco de dados', 'error');
      }
    } catch {
      showBanner('Falha de rede ao salvar tarefa', 'error');
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskItem: any) => {
    if (!window.confirm(`Deseja realmente excluir a tarefa "${taskItem.title}"?`)) return;

    const targetBatch = batches.find((b) => b.id === taskItem.batchId);
    if (!targetBatch) return;

    let currentTasks: any[] = [];
    try {
      currentTasks = targetBatch.tankTasksJson
        ? typeof targetBatch.tankTasksJson === 'string'
          ? JSON.parse(targetBatch.tankTasksJson)
          : targetBatch.tankTasksJson
        : [];
    } catch {}

    const updatedTasks = currentTasks.filter((t: any) => t.id !== taskItem.id);
    const updatedJson = JSON.stringify(updatedTasks);

    setBatches((prev) =>
      prev.map((b) => (b.id === targetBatch.id ? { ...b, tankTasksJson: updatedJson } : b))
    );

    showBanner('🗑️ Tarefa excluída.', 'info');

    try {
      await fetch(`/api/batches/${targetBatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankTasksJson: updatedJson }),
      });
    } catch {
      showBanner('Erro ao sincronizar exclusão com o servidor', 'error');
    }
  };

  // -------------------------------------------------------------
  // 6. CALCULADORA CERVEJEIRA TOUCH
  // -------------------------------------------------------------
  const [calcTab, setCalcTab] = useState<'REFRACTOMETER' | 'HYDROMETER' | 'BRIX_SG' | 'ABV'>('REFRACTOMETER');
  const [calcOgSg, setCalcOgSg] = useState<string>('1.054');
  const [calcCurrentBrix, setCalcCurrentBrix] = useState<string>('6.5');
  const [calcHydroSg, setCalcHydroSg] = useState<string>('1.050');
  const [calcHydroTemp, setCalcHydroTemp] = useState<string>('28');
  const [calcCalibTemp, setCalcCalibTemp] = useState<string>('20');
  const [calcRawBrix, setCalcRawBrix] = useState<string>('13.0');
  const [calcAbvOg, setCalcAbvOg] = useState<string>('1.054');
  const [calcAbvFg, setCalcAbvFg] = useState<string>('1.012');

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
    return { sg: Math.round(sg * 1000) / 1000, plato: brix };
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
      {/* CABEÇALHO DE ALTO CONTRASTE DO CHÃO DE FÁBRICA */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b-2 border-slate-700 px-4 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-1 text-slate-300 hover:text-white active:scale-95 transition-transform rounded-xl hover:bg-slate-800 border border-slate-700"
            title="Voltar ao Sistema Completo"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse" />
              <h1 className="font-black text-lg tracking-wide text-white flex items-center gap-1.5">
                PintTech <span className="text-amber-400">Fábrica</span>
              </h1>
            </div>
            <p className="text-xs text-slate-300 font-bold">
              {sessionUser?.name ? `Operador: ${sessionUser.name}` : 'Painel de Produção & Chão de Fábrica'}
            </p>
          </div>
        </div>

        <button
          onClick={() => loadInitialData()}
          className="p-2.5 bg-slate-700 hover:bg-slate-650 text-white rounded-xl active:scale-90 transition-all border-2 border-slate-500 shadow-md"
          title="Atualizar dados"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </header>

      {/* BANNER DE FEEDBACK SONORO / VISUAL */}
      {banner && (
        <div
          className={`sticky top-[61px] z-50 px-4 py-3.5 text-center font-black text-sm shadow-2xl transition-all flex items-center justify-center gap-2.5 ${
            banner.type === 'success'
              ? 'bg-emerald-600 text-white border-b-4 border-emerald-400'
              : banner.type === 'error'
              ? 'bg-rose-600 text-white border-b-4 border-rose-400'
              : 'bg-amber-500 text-slate-950 border-b-4 border-amber-300'
          }`}
        >
          {banner.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          {banner.type === 'error' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONTEÚDO PRINCIPAL: 5 MÓDULOS DE ALTA VISIBILIDADE */}
      {/* ------------------------------------------------------------- */}
      <main className="max-w-3xl mx-auto p-4 space-y-5">
        {/* ========================================================= */}
        {/* 1. MÓDULO ENVASE */}
        {/* ========================================================= */}
        {activeTab === 'ENVASE' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-black text-lg text-white">Linha de Envase</h2>
                    <p className="text-xs text-slate-300 font-bold">Selecione o chopp que está sendo envasado</p>
                  </div>
                </div>

                <div className="flex bg-slate-700 p-1.5 rounded-xl border-2 border-slate-500 shadow-inner">
                  <button
                    onClick={() => setEnvaseSourceType('BATCH')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                      envaseSourceType === 'BATCH'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-200 hover:text-white'
                    }`}
                  >
                    Por Lote / TQ
                  </button>
                  <button
                    onClick={() => setEnvaseSourceType('QUICK')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                      envaseSourceType === 'QUICK'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-200 hover:text-white'
                    }`}
                  >
                    Avulso
                  </button>
                </div>
              </div>

              {envaseSourceType === 'BATCH' ? (
                <div>
                  <label className="block text-xs font-black text-slate-100 mb-1.5 uppercase tracking-wide">
                    Tanque / Lote em Linha:
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base font-bold text-white outline-none shadow-inner"
                  >
                    <option value="">-- Selecione o Chopp / Tanque --</option>
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
                  <label className="block text-xs font-black text-slate-100 mb-1.5 uppercase tracking-wide">
                    Nome da Cerveja / Chopp:
                  </label>
                  <input
                    type="text"
                    value={quickBeerName}
                    onChange={(e) => setQuickBeerName(e.target.value)}
                    placeholder="Ex: IPA Galaxy, Pilsen Extra..."
                    className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base font-bold text-white outline-none shadow-inner placeholder:text-slate-300"
                  />
                </div>
              )}

              <div className="pt-2 border-t-2 border-slate-700 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsPartialFill(!isPartialFill)}
                  className={`flex items-center gap-2 text-xs font-black px-3.5 py-2.5 rounded-xl border-2 transition-all ${
                    isPartialFill
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                      : 'bg-slate-700 hover:bg-slate-650 text-white border-2 border-slate-500 shadow'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  {isPartialFill ? 'Volume Parcial Ativado' : 'Barril Cheio Padrão'}
                </button>

                {isPartialFill && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-300 font-black">Litros:</span>
                    <input
                      type="number"
                      value={customLiters}
                      onChange={(e) => setCustomLiters(e.target.value)}
                      className="w-20 bg-slate-700 border-2 border-amber-400 rounded-xl px-2 py-1.5 text-base font-black text-center text-amber-300 outline-none shadow-inner"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-3">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                Bipar Barril para Envasar
              </h3>
              <p className="text-xs text-slate-300">
                Aponte a câmera para o código do barril. Ao bipar, ele é envasado instantaneamente com confirmação sonora.
              </p>

              <BarcodeScanner
                onScan={handleScanForEnvase}
                isProcessing={isProcessingEnvase}
                title="Câmera do Envase"
                defaultCollapsed={false}
              />
            </div>

            {envaseSessionLogs.length > 0 && (
              <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xs uppercase tracking-wider text-amber-400">
                    Envasados nesta Sessão ({envaseSessionLogs.length})
                  </h3>
                  <button
                    onClick={() => setEnvaseSessionLogs([])}
                    className="text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Limpar lista
                  </button>
                </div>

                <div className="divide-y-2 divide-slate-800 max-h-56 overflow-y-auto pr-1">
                  {envaseSessionLogs.map((log, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm shadow">
                          ✓
                        </div>
                        <div>
                          <div className="font-black text-base text-white font-mono">{log.code}</div>
                          <div className="text-xs font-bold text-slate-300">
                            {log.beerName} ({log.liters}L)
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">{log.time}</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                onClick={() => setKegSubMode('RETURN')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-md ${
                  kegSubMode === 'RETURN'
                    ? 'bg-amber-600 border-amber-400 text-white font-black ring-2 ring-amber-300/40'
                    : 'bg-slate-900 border-slate-700 text-slate-300 font-bold hover:border-slate-600'
                }`}
              >
                <div className="text-2xl">🔄</div>
                <span className="text-sm text-center">Retorno de Barril</span>
              </button>

              <button
                onClick={() => setKegSubMode('WASH')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-md ${
                  kegSubMode === 'WASH'
                    ? 'bg-emerald-600 border-emerald-400 text-white font-black ring-2 ring-emerald-300/40'
                    : 'bg-slate-900 border-slate-700 text-slate-300 font-bold hover:border-slate-600'
                }`}
              >
                <div className="text-2xl">🧼</div>
                <span className="text-sm text-center">Higienizar / Lavar</span>
              </button>

              <button
                onClick={() => setKegSubMode('REGISTER')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-md ${
                  kegSubMode === 'REGISTER'
                    ? 'bg-amber-500 border-amber-300 text-slate-950 font-black ring-2 ring-amber-300/40'
                    : 'bg-slate-900 border-slate-700 text-slate-300 font-bold hover:border-slate-600'
                }`}
              >
                <div className="text-2xl">➕</div>
                <span className="text-sm text-center">Cadastrar Novo</span>
              </button>

              <button
                onClick={() => setKegSubMode('LOOKUP')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-md ${
                  kegSubMode === 'LOOKUP'
                    ? 'bg-blue-600 border-blue-400 text-white font-black ring-2 ring-blue-300/40'
                    : 'bg-slate-900 border-slate-700 text-slate-300 font-bold hover:border-slate-600'
                }`}
              >
                <div className="text-2xl">🔍</div>
                <span className="text-sm text-center">Consultar Barril</span>
              </button>

              <button
                onClick={() => setKegSubMode('MAINTENANCE')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-md col-span-2 sm:col-span-1 lg:col-span-1 ${
                  kegSubMode === 'MAINTENANCE'
                    ? 'bg-rose-600 border-rose-400 text-white font-black ring-2 ring-rose-300/40'
                    : 'bg-slate-900 border-slate-700 text-slate-300 font-bold hover:border-slate-600'
                }`}
              >
                <div className="text-2xl">🛠️</div>
                <span className="text-sm text-center">Manutenção</span>
              </button>
            </div>

            {kegSubMode === 'RETURN' && (
              <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="font-black text-base text-amber-400 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-amber-400" />
                    Recebimento de Retorno de Barril (Pátio)
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    Defina a condição e bipe os barris recebidos
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-200 mb-2 uppercase tracking-wide">
                    Condição do Barril no Retorno:
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setKegReturnCondition('VAZIO_SUJO')}
                      className={`py-3 px-2 rounded-2xl font-black text-xs sm:text-sm border-2 transition-all active:scale-95 shadow ${
                        kegReturnCondition === 'VAZIO_SUJO'
                          ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md scale-102'
                          : 'bg-slate-800 hover:bg-slate-750 border-slate-600 text-slate-200'
                      }`}
                    >
                      <span className="block text-xl mb-0.5">🪣</span>
                      Vazio / Sujo (Padrão)
                    </button>

                    <button
                      type="button"
                      onClick={() => setKegReturnCondition('PARCIALMENTE_CHEIO')}
                      className={`py-3 px-2 rounded-2xl font-black text-xs sm:text-sm border-2 transition-all active:scale-95 shadow ${
                        kegReturnCondition === 'PARCIALMENTE_CHEIO'
                          ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md scale-102'
                          : 'bg-slate-800 hover:bg-slate-750 border-slate-600 text-slate-200'
                      }`}
                    >
                      <span className="block text-xl mb-0.5">🍺</span>
                      Com Sobra (Parcial)
                    </button>

                    <button
                      type="button"
                      onClick={() => setKegReturnCondition('CHEIO_RETORNADO')}
                      className={`py-3 px-2 rounded-2xl font-black text-xs sm:text-sm border-2 transition-all active:scale-95 shadow ${
                        kegReturnCondition === 'CHEIO_RETORNADO'
                          ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md scale-102'
                          : 'bg-slate-800 hover:bg-slate-750 border-slate-600 text-slate-200'
                      }`}
                    >
                      <span className="block text-xl mb-0.5">📦</span>
                      Cheio (Não Aberto)
                    </button>
                  </div>
                </div>

                {kegReturnCondition === 'PARCIALMENTE_CHEIO' && (
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <div>
                        <label className="text-xs font-black text-slate-200 uppercase tracking-wide block">
                          Sobra de Chopp no Barril:
                        </label>
                        <span className="text-[11px] text-slate-400">Volume restante estimado</span>
                      </div>
                      <div className="flex items-center gap-2 w-32">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          step="1"
                          value={kegReturnLiters}
                          onChange={(e) => setKegReturnLiters(e.target.value)}
                          className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-xl px-3 py-2 text-center text-lg font-black text-white font-mono outline-none"
                        />
                        <span className="text-sm font-black text-amber-400">L</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 block">
                        💳 Cobrança no Pedido do Cliente:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setKegReturnBillingMode('FULL')}
                          className={`p-3 rounded-2xl text-left border-2 transition-all active:scale-95 ${
                            kegReturnBillingMode === 'FULL'
                              ? 'bg-amber-500/20 border-amber-400 text-white shadow-md ring-2 ring-amber-400/30'
                              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className="font-black text-xs sm:text-sm text-amber-300 block mb-0.5">
                            🧾 Cobrar Barril Inteiro (100%)
                          </span>
                          <span className="text-[11px] text-slate-400 block leading-tight">
                            Mantém o valor integral no pedido (padrão em eventos/festas onde foi aberto).
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setKegReturnBillingMode('PARTIAL')}
                          className={`p-3 rounded-2xl text-left border-2 transition-all active:scale-95 ${
                            kegReturnBillingMode === 'PARTIAL'
                              ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md ring-2 ring-emerald-400/30'
                              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className="font-black text-xs sm:text-sm text-emerald-400 block mb-0.5">
                            💰 Cobrar Consumo Parcial
                          </span>
                          <span className="text-[11px] text-slate-400 block leading-tight">
                            Calcula os litros consumidos e desconta a sobra no total do pedido.
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {kegReturnCondition === 'CHEIO_RETORNADO' && (
                  <div className="pt-3 border-t border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 block">
                      💳 Cobrança no Pedido do Cliente:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setKegReturnBillingMode('PARTIAL')}
                        className={`p-3 rounded-2xl text-left border-2 transition-all active:scale-95 ${
                          kegReturnBillingMode === 'PARTIAL'
                            ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md ring-2 ring-emerald-400/30'
                            : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="font-black text-xs sm:text-sm text-emerald-400 block mb-0.5">
                          💰 Não Cobrar / Descontar 100%
                        </span>
                        <span className="text-[11px] text-slate-400 block leading-tight">
                          O barril não foi consumido, estornando o valor integral no pedido.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setKegReturnBillingMode('FULL')}
                        className={`p-3 rounded-2xl text-left border-2 transition-all active:scale-95 ${
                          kegReturnBillingMode === 'FULL'
                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-md ring-2 ring-amber-400/30'
                            : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="font-black text-xs sm:text-sm text-amber-300 block mb-0.5">
                          🧾 Cobrar Barril Inteiro
                        </span>
                        <span className="text-[11px] text-slate-400 block leading-tight">
                          Mantém a cobrança no pedido mesmo com o barril lacrado.
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {kegSubMode === 'REGISTER' && (
              <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-4">
                <h3 className="font-black text-base text-amber-400 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Cadastrar Novo Barril no Acervo
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase">
                    Código do Barril (Bipe ou digite):
                  </label>
                  <input
                    type="text"
                    value={newKegCode}
                    onChange={(e) => setNewKegCode(e.target.value.toUpperCase())}
                    placeholder="Ex: BAR-5001"
                    className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-lg font-black text-white outline-none tracking-wider font-mono shadow-inner placeholder:text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-100 mb-2 uppercase">Capacidade:</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[20, 30, 50].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setNewKegCapacity(cap)}
                        className={`py-3.5 rounded-2xl font-black text-lg border-2 transition-all active:scale-95 shadow ${
                          newKegCapacity === cap
                            ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-lg scale-105'
                            : 'bg-slate-700 hover:bg-slate-650 border-slate-500 text-white'
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
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Confirmar Cadastro
                </button>
              </div>
            )}

            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-3">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                {kegSubMode === 'RETURN' && 'Bipar Barril para RETORNO / RECOLHA'}
                {kegSubMode === 'WASH' && 'Bipar Barril para HIGIENIZAR'}
                {kegSubMode === 'REGISTER' && 'Bipar Código para Preencher'}
                {kegSubMode === 'MAINTENANCE' && 'Bipar Barril com DEFEITO'}
                {kegSubMode === 'LOOKUP' && 'Bipar Barril para CONSULTAR'}
              </h3>

              <BarcodeScanner onScan={handleScanForBarris} title="Leitor de Barris" defaultCollapsed={false} />
            </div>

            {kegSubMode === 'LOOKUP' && kegLookupResult && (
              <div className="bg-slate-900 border-2 border-blue-500 rounded-3xl p-5 shadow-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-blue-500 text-white shadow">
                      Barril Encontrado
                    </span>
                    <h3 className="font-black text-2xl text-white font-mono mt-1">{kegLookupResult.code}</h3>
                  </div>
                  <span className="text-base font-black px-4 py-1.5 rounded-xl bg-slate-700 text-amber-300 border-2 border-slate-500 shadow-md">
                    {kegLookupResult.capacity} Litros
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs pt-2 border-t-2 border-slate-700">
                  <div className="bg-slate-700 p-3.5 rounded-xl border-2 border-slate-500 shadow-md">
                    <span className="text-slate-200 block text-xs font-black uppercase">Status:</span>
                    <span className="font-black text-base text-amber-300">{kegLookupResult.status}</span>
                  </div>
                  <div className="bg-slate-700 p-3.5 rounded-xl border-2 border-slate-500 shadow-md">
                    <span className="text-slate-200 block text-xs font-black uppercase">Chopp Atual:</span>
                    <span className="font-black text-base text-white">
                      {kegLookupResult.currentBeerName || 'Vazio / Nenhum'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {kegSessionActions.length > 0 && (
              <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" /> Histórico Desta Sessão de Barris ({kegSessionActions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setKegSessionActions([])}
                    className="text-xs font-bold text-slate-400 hover:text-rose-400 transition"
                  >
                    Limpar
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {kegSessionActions.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-black font-mono text-amber-300 text-base">{log.code}</span>
                        <span className="text-xs font-bold text-slate-200 px-2.5 py-0.5 rounded-lg bg-slate-700 border border-slate-600">
                          {log.action}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. MÓDULO TANQUES & ADEGA (ALERTAS VISUAIS DE PURGA E CO2) */}
        {/* ========================================================= */}
        {activeTab === 'TANQUES' && (
          <div className="space-y-4">
            {!selectedTankForDetails ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-lg text-white flex items-center gap-2">
                    <Cylinder className="w-5 h-5 text-amber-400" />
                    Tanques & Adega
                  </h2>
                  <span className="text-xs font-bold text-slate-300">Toque no card para ver detalhes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {activeTanksList.map((tank) => {
                    const isOccupied = Boolean(tank.activeBatch);
                    const beerName = tank.activeBatch?.recipe?.name;
                    const batchNumber = tank.activeBatch?.batchNumber;
                    const status = tank.activeBatch?.status || tank.status;
                    const m = tank.metrics;
                    const purgaAlert = hasPurgaAlert(tank);
                    const co2Alert = hasCo2Alert(tank);

                    return (
                      <div
                        key={tank.id}
                        onClick={() => setSelectedTankForDetails(tank)}
                        className={`p-5 rounded-3xl border-2 text-left transition-all active:scale-95 shadow-xl space-y-3 cursor-pointer ${
                          purgaAlert || co2Alert
                            ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-500/30'
                            : isOccupied
                            ? 'bg-slate-900 border-amber-500/60 hover:border-amber-400'
                            : 'bg-slate-900/80 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {/* ALERTAS PISCANTES DE OPERAÇÃO: FAZER PURGA OU BATER CO2 */}
                        {(purgaAlert || co2Alert) && (
                          <div className="flex flex-wrap gap-2 pb-1">
                            {purgaAlert && (
                              <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md">
                                <AlertCircle className="w-4 h-4 text-slate-950" />
                                ⚠️ ALERTA: FAZER PURGA
                              </span>
                            )}
                            {co2Alert && (
                              <span className="px-3 py-1 rounded-xl bg-sky-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md">
                                <AlertCircle className="w-4 h-4 text-white" />
                                ⚠️ ALERTA: BATER CO2
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xl text-white">{tank.name}</span>
                            <span className="text-xs font-bold text-slate-300">({tank.capacityLiters}L)</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusSelectTank(tank);
                            }}
                            className={`text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${
                              isOccupied ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-700 text-white border-2 border-slate-500 font-bold'
                            }`}
                            title="Clique para mudar o status do tanque / lote"
                          >
                            <span>{status}</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                          </button>
                        </div>

                        {/* BOTÕES DE TOQUE PARA SINALIZAR / ALERTAR PURGA E CO2 */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={(e) => handleToggleTankAlert(tank, 'PURGA', e)}
                            className={`py-2 px-2 rounded-xl text-xs font-black border-2 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md ${
                              purgaAlert
                                ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/40'
                                : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-500'
                            }`}
                          >
                            <Wind className="w-4 h-4" />
                            {purgaAlert ? '⚠️ FAZER PURGA' : 'Sinalizar Purga'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleToggleTankAlert(tank, 'CO2', e)}
                            className={`py-2 px-2 rounded-xl text-xs font-black border-2 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md ${
                              co2Alert
                                ? 'bg-sky-600 text-white border-sky-400 ring-2 ring-sky-500/40'
                                : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-500'
                            }`}
                          >
                            <Droplet className="w-4 h-4" />
                            {co2Alert ? '⚠️ BATER CO2' : 'Sinalizar CO2'}
                          </button>
                        </div>

                        {isOccupied ? (
                          <div className="space-y-2 pt-2 border-t-2 border-slate-700">
                            <div className="flex items-center justify-between">
                              <div className="font-black text-base text-amber-300 truncate max-w-[210px]">
                                {beerName}
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-300">#{batchNumber}</span>
                            </div>

                            {/* PAINEL DE DENSIDADES E METAS COM ALTO CONTRASTE */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-700/90 p-3 rounded-2xl border-2 border-slate-500 text-center shadow-md">
                              <div>
                                <span className="block text-xs uppercase font-black text-slate-100 tracking-wider">OG Inicial</span>
                                <span className="text-base font-black text-white font-mono block mt-0.5">
                                  {m.og ? formatGravityPrimary(m.og) : '—'}
                                </span>
                                {m.og && (
                                  <span className="inline-block text-[11px] font-bold text-white bg-slate-600 px-2 py-0.5 rounded border border-slate-400 font-mono mt-1 shadow-sm">
                                    {formatGravitySecondary(m.og)}
                                  </span>
                                )}
                              </div>
                              <div className="border-x-2 border-slate-500 px-1">
                                <span className="block text-xs uppercase font-black text-amber-300 tracking-wider">Meta FG</span>
                                <span className="text-base font-black text-amber-400 font-mono block mt-0.5">
                                  {m.targetFg ? formatGravityPrimary(m.targetFg) : '—'}
                                </span>
                                {m.targetFg && (
                                  <span className="inline-block text-[11px] font-bold text-amber-200 bg-amber-500/30 px-2 py-0.5 rounded border border-amber-400/50 font-mono mt-1 shadow-sm">
                                    {formatGravitySecondary(m.targetFg)}
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="block text-xs uppercase font-black text-emerald-300 tracking-wider">ABV Atual</span>
                                <span className="text-base font-black text-emerald-400 font-mono block mt-0.5">
                                  {m.currentAbv ? `${m.currentAbv}%` : '—'}
                                </span>
                                {m.targetAbv && (
                                  <span className="inline-block text-[11px] font-bold text-white bg-slate-600 px-2 py-0.5 rounded border border-slate-400 mt-1 shadow-sm">
                                    Alvo: {m.targetAbv}%
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* BARRA DE PROGRESSO VISUAL DA FERMENTAÇÃO */}
                            {m.targetFg && m.og && (
                              <div className="space-y-1.5 pt-0.5">
                                <div className="flex justify-between items-center text-xs font-bold text-white">
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-slate-200">Atual:</span>
                                    <span className="font-mono font-black text-white text-sm">
                                      {m.currentGravity ? formatGravityPrimary(m.currentGravity) : '—'}
                                    </span>
                                    {m.currentGravity && (
                                      <span className="text-[11px] text-white bg-slate-700 px-2 py-0.5 rounded border border-slate-500 font-mono">
                                        {formatGravitySecondary(m.currentGravity)}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-amber-400 font-black text-xs">
                                    {m.pointsRemaining > 0
                                      ? `Faltam ${m.pointsRemaining} pts p/ FG`
                                      : 'Meta FG Atingida 🎉'}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden border-2 border-slate-500">
                                  <div
                                    className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${m.progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs font-black text-slate-300 py-1">Tanque Livre / Disponível</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* DETALHES DO TANQUE SELECIONADO: ALERTAS, TAREFAS E MEDIÇÕES */
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedTankForDetails(null)}
                  className="flex items-center gap-2 text-sm font-black text-amber-400 hover:text-amber-300"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar para lista de tanques
                </button>

                {/* Resumo do Tanque */}
                <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-2xl text-white">{selectedTankForDetails.name}</h3>
                      <p className="text-xs font-bold text-slate-300">
                        Capacidade: {selectedTankForDetails.capacityLiters}L
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatusSelectTank(selectedTankForDetails)}
                      className="text-xs font-black px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                      title="Clique para mudar o status"
                    >
                      <span>{selectedTankForDetails.activeBatch?.status || selectedTankForDetails.status}</span>
                      <ChevronDown className="w-4 h-4 opacity-75" />
                    </button>
                  </div>

                  {/* SINALIZADORES DE ALERTA NO DETALHE */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t-2 border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleToggleTankAlert(selectedTankForDetails, 'PURGA')}
                      className={`py-3 rounded-2xl text-xs font-black border-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                        hasPurgaAlert(selectedTankForDetails)
                          ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/50'
                          : 'bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-500'
                      }`}
                    >
                      <Wind className="w-5 h-5" />
                      {hasPurgaAlert(selectedTankForDetails) ? '⚠️ ALERTA: FAZER PURGA ATIVO' : 'Sinalizar Alerta de Purga'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleTankAlert(selectedTankForDetails, 'CO2')}
                      className={`py-3 rounded-2xl text-xs font-black border-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                        hasCo2Alert(selectedTankForDetails)
                          ? 'bg-sky-600 text-white border-sky-400 ring-2 ring-sky-500/50'
                          : 'bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-500'
                      }`}
                    >
                      <Droplet className="w-5 h-5" />
                      {hasCo2Alert(selectedTankForDetails) ? '⚠️ ALERTA: BATER CO2 ATIVO' : 'Sinalizar Alerta de CO2'}
                    </button>
                  </div>

                  {selectedTankForDetails.activeBatch && (() => {
                    const batch = selectedTankForDetails.activeBatch;
                    const og = getBatchOg(batch);
                    const targetFg = getBatchTargetFg(batch);
                    const curGrav = getBatchCurrentGravity(batch);
                    const curAbv = getBatchCalculatedAbv(batch);
                    const targetAbv = og && targetFg && og > targetFg ? Math.round(calculateAbv(og, targetFg) * 10) / 10 : null;
                    const att = og && curGrav && og > curGrav ? Math.round(((og - curGrav) / (og - 1.0)) * 100) : null;

                    return (
                      <div className="space-y-3 pt-2 border-t-2 border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                            <Target className="w-4 h-4" /> Parâmetros & Metas do Lote
                          </span>
                          <button
                            type="button"
                            onClick={() => openEditTargetsModal(batch)}
                            className="flex items-center gap-1.5 text-xs font-black text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-xl border border-amber-400 active:scale-95 transition-all shadow-sm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Editar OG / Meta FG
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="bg-slate-700/90 p-3.5 rounded-2xl border-2 border-slate-500 shadow-md">
                            <span className="text-xs text-slate-100 uppercase font-black tracking-wider block mb-1">OG Inicial</span>
                            <span className="text-xl font-black text-white font-mono block">
                              {formatGravityPrimary(og)}
                            </span>
                            {og && (
                              <span className="inline-block text-xs font-bold text-white bg-slate-600 px-2.5 py-0.5 rounded-lg font-mono mt-1.5 border border-slate-400 shadow-sm">
                                {formatGravitySecondary(og)}
                              </span>
                            )}
                          </div>

                          <div className="bg-slate-700/90 p-3.5 rounded-2xl border-2 border-amber-400 shadow-md">
                            <span className="text-xs text-amber-300 uppercase font-black tracking-wider block mb-1">Objetivo (Meta FG)</span>
                            <span className="text-xl font-black text-amber-300 font-mono block">
                              {formatGravityPrimary(targetFg)}
                            </span>
                            {targetFg && (
                              <span className="inline-block text-xs font-bold text-amber-200 bg-amber-500/30 px-2.5 py-0.5 rounded-lg font-mono mt-1.5 border border-amber-400/60 shadow-sm">
                                {formatGravitySecondary(targetFg)}
                              </span>
                            )}
                          </div>

                          <div className="bg-slate-700/90 p-3.5 rounded-2xl border-2 border-slate-500 shadow-md">
                            <span className="text-xs text-slate-100 uppercase font-black tracking-wider block mb-1">Densidade Atual</span>
                            <span className="text-xl font-black text-white font-mono block">
                              {curGrav ? formatGravityPrimary(curGrav) : 'Sem medição'}
                            </span>
                            {curGrav && (
                              <span className="inline-block text-xs font-bold text-white bg-slate-600 px-2.5 py-0.5 rounded-lg font-mono mt-1.5 border border-slate-400 shadow-sm">
                                {formatGravitySecondary(curGrav)}
                              </span>
                            )}
                          </div>

                          <div className="bg-slate-700/90 p-3.5 rounded-2xl border-2 border-emerald-400 shadow-md">
                            <span className="text-xs text-emerald-300 uppercase font-black tracking-wider block mb-1">Teor Alcoólico</span>
                            <span className="text-xl font-black text-emerald-400 font-mono block">
                              {curAbv ? `${curAbv}% ABV` : '—'}
                            </span>
                            {targetAbv && (
                              <span className="inline-block text-xs font-bold text-emerald-200 bg-emerald-600/40 px-2.5 py-0.5 rounded-lg font-mono mt-1.5 border border-emerald-400/60 shadow-sm">
                                Meta: {targetAbv}%
                              </span>
                            )}
                          </div>
                        </div>

                        {att !== null && (
                          <div className="bg-slate-700/90 p-3.5 rounded-2xl border-2 border-slate-500 flex items-center justify-between text-sm shadow-md">
                            <span className="text-white font-black flex items-center gap-2">
                              <Activity className="w-4 h-4 text-amber-400" /> Atenuação Atual:
                            </span>
                            <span className="font-mono font-black text-base text-amber-300 bg-slate-600 px-3.5 py-1 rounded-xl border border-slate-400 shadow-sm">{att}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* FORMULÁRIO DE MEDIÇÃO DIÁRIA */}
                {selectedTankForDetails.activeBatch && (
                  <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-base text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-amber-400" />
                        Registrar Medição do Dia
                      </h4>
                      <div className="flex bg-slate-700 p-1.5 rounded-xl border-2 border-slate-500 shadow-inner">
                        <button
                          type="button"
                          onClick={() => handleMeasurementUnitChange('SG')}
                          className={`px-3.5 py-1 text-xs font-black rounded-lg transition-all ${
                            measurementUnit === 'SG' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-200 hover:text-white'
                          }`}
                        >
                          SG
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMeasurementUnitChange('BRIX')}
                          className={`px-3.5 py-1 text-xs font-black rounded-lg transition-all ${
                            measurementUnit === 'BRIX' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-200 hover:text-white'
                          }`}
                        >
                          Brix
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-100 mb-1.5">
                          {measurementUnit === 'SG' ? 'Densidade (SG):' : 'Leitura Refratômetro (°Bx):'}
                        </label>
                        <input
                          type="text"
                          value={measurementGravityInput}
                          onChange={(e) => setMeasurementGravityInput(e.target.value)}
                          placeholder={measurementUnit === 'SG' ? '1.020' : '7.5'}
                          className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-3 py-3 text-xl font-black text-white text-center outline-none shadow-inner placeholder:text-slate-300 placeholder:font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-100 mb-1.5">
                          Temperatura (°C):
                        </label>
                        <input
                          type="text"
                          value={measurementTemp}
                          onChange={(e) => setMeasurementTemp(e.target.value)}
                          placeholder="18.5"
                          className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-3 py-3 text-xl font-black text-white text-center outline-none shadow-inner placeholder:text-slate-300 placeholder:font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-100 mb-1.5">pH (Opcional):</label>
                      <input
                        type="text"
                        value={measurementPh}
                        onChange={(e) => setMeasurementPh(e.target.value)}
                        placeholder="Ex: 4.4"
                        className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-3 py-2.5 text-base font-black text-white text-center outline-none shadow-inner placeholder:text-slate-300 placeholder:font-bold"
                      />
                    </div>

                    {/* PRÉVIA EM TEMPO REAL DO TEOR ALCOÓLICO (ABV) COM ALTO CONTRASTE */}
                    {liveMeasurementPreview && (
                      <div className="bg-slate-700/95 border-2 border-amber-400 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl animate-in fade-in">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center flex-shrink-0 shadow">
                            <Activity className="w-5 h-5 text-amber-300" />
                          </div>
                          <div>
                            <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
                              Cálculo em Tempo Real
                            </span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              <span className="text-2xl font-black text-white font-mono">
                                {liveMeasurementPreview.abv}% <span className="text-sm font-black text-amber-300">ABV</span>
                              </span>
                              <span className="text-xs font-black text-slate-100">
                                • {liveMeasurementPreview.att}% atenuação
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-200 uppercase font-black block mb-1">Equivalência</span>
                          <span className="text-xs font-mono font-black text-white bg-slate-600 px-3 py-1.5 rounded-xl border border-slate-400 inline-block shadow-md">
                            {liveMeasurementPreview.sg.toFixed(3)} SG = {liveMeasurementPreview.brix.toFixed(1)}°Bx
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveTankMeasurement}
                      disabled={isSavingMeasurement}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Salvar Medição de Hoje
                    </button>
                  </div>
                )}

                {/* HISTÓRICO DE MEDIÇÕES DO LOTE COM ALTO CONTRASTE */}
                {selectedTankForDetails.activeBatch && (() => {
                  let logs: any[] = [];
                  try {
                    if (selectedTankForDetails.activeBatch.fermentationLogsJson) {
                      logs = JSON.parse(selectedTankForDetails.activeBatch.fermentationLogsJson);
                    }
                  } catch {}

                  if (!Array.isArray(logs) || logs.length === 0) return null;

                  const og = getBatchOg(selectedTankForDetails.activeBatch);

                  return (
                    <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-base text-white flex items-center gap-2">
                          <History className="w-5 h-5 text-amber-400" />
                          Histórico de Medições do Lote ({logs.length})
                        </h4>
                        <span className="text-xs font-bold text-slate-300">
                          Última: {logs[logs.length - 1]?.date ? formatDateShort(logs[logs.length - 1].date) : 'Hoje'}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {logs.slice().reverse().map((log: any, rIdx: number) => {
                          const origIndex = logs.length - 1 - rIdx;
                          const logSg = log.gravity;
                          const logAbv = log.abv ?? (og && logSg && og > logSg ? Math.round(calculateAbv(og, logSg) * 10) / 10 : null);
                          const secVal = formatGravitySecondary(logSg);

                          return (
                            <div
                              key={log.id || origIndex}
                              className="bg-slate-700/90 border-2 border-slate-500 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-white text-base">
                                    {formatDateShort(log.date)}
                                  </span>
                                  {log.tempCelsius !== undefined && (
                                    <span className="font-black text-amber-200 bg-amber-500/30 px-2.5 py-0.5 rounded-lg border border-amber-400 text-xs shadow-sm">
                                      {log.tempCelsius}°C
                                    </span>
                                  )}
                                  {log.ph !== undefined && log.ph !== null && (
                                    <span className="font-black text-white bg-slate-600 px-2.5 py-0.5 rounded-lg border border-slate-400 text-xs shadow-sm">
                                      pH {log.ph}
                                    </span>
                                  )}
                                </div>
                                <div className="text-white font-mono text-sm flex items-center gap-2">
                                  <span className="font-black text-base">{logSg ? formatGravityPrimary(logSg) : '—'}</span>
                                  {secVal && (
                                    <span className="text-xs font-black text-white bg-slate-600 px-2.5 py-0.5 rounded-lg border border-slate-400 shadow-sm">
                                      {secVal}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {logAbv !== null && logAbv !== undefined && (
                                  <div className="text-right bg-slate-600 px-3.5 py-1.5 rounded-xl border-2 border-slate-400 shadow-sm">
                                    <span className="text-xs text-slate-200 uppercase font-black block">ABV</span>
                                    <span className="text-lg font-black text-amber-300 font-mono">
                                      {logAbv}%
                                    </span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMeasurementLog(origIndex)}
                                  className="p-2.5 text-slate-300 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-colors border border-slate-500 hover:border-red-400"
                                  title="Remover esta medição"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* TAREFAS DE ADEGA + BOTÃO DE NOVA TAREFA */}
                {selectedTankForDetails.activeBatch && (
                  <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-base text-white flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-amber-400" />
                        Tarefas de Adega para este Lote
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsAddTaskModalOpen(!isAddTaskModalOpen)}
                        className="flex items-center gap-1.5 text-xs font-black text-amber-400 bg-amber-500/20 px-3.5 py-2 rounded-xl border border-amber-500/40 active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Nova Tarefa
                      </button>
                    </div>

                    {/* MODAL / FORMULÁRIO DE ADICIONAR TAREFA NO APP */}
                    {isAddTaskModalOpen && (
                      <div className="bg-slate-700 border-2 border-amber-400 rounded-2xl p-5 space-y-3.5 shadow-xl animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-white flex items-center gap-2">
                            <Plus className="w-4 h-4 text-amber-400" /> Criar Nova Tarefa
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAddTaskModalOpen(false)}
                            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-600"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Atalhos rápidos */}
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            'Dry Hopping',
                            'Purga de Levedura',
                            'Cold Crash (0°C)',
                            'Clarificação',
                            'Bater CO2 / Pressurizar',
                            'Medição de Densidade',
                          ].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => setNewTaskTitle(chip)}
                              className="px-3 py-1.5 text-xs font-black bg-slate-600 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl border border-slate-400 shadow-sm active:scale-95 transition-all"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>

                        <div>
                          <label className="block text-xs font-black text-white mb-1">
                            Título da Tarefa:
                          </label>
                          <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Ex: Fazer Dry Hopping de 2kg de Citra"
                            className="w-full bg-slate-600 border-2 border-slate-400 focus:border-amber-400 rounded-xl px-3.5 py-3 text-sm font-black text-white outline-none shadow-inner placeholder:text-slate-300"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-white mb-1">
                            Data Prevista:
                          </label>
                          <input
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className="w-full bg-slate-600 border-2 border-slate-400 focus:border-amber-400 rounded-xl px-3.5 py-3 text-sm font-black text-white outline-none shadow-inner"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleAddNewTask}
                          disabled={isSavingNewTask || !newTaskTitle.trim()}
                          className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-5 h-5" />
                          Salvar Tarefa no Lote
                        </button>
                      </div>
                    )}

                    {/* MODAL / INPUT PARA EDITAR DATA DE REALIZAÇÃO RETROATIVA */}
                    {editingTaskIndex !== null && (
                      <div className="bg-slate-700 border-2 border-emerald-400 rounded-2xl p-5 space-y-3.5 shadow-xl animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-white">
                            ✏️ Alterar Data de Realização
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingTaskIndex(null)}
                            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-600"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-100 font-medium">
                          Se você já havia feito este trabalho e esqueceu de anotar no dia, selecione a data real abaixo:
                        </p>
                        <input
                          type="date"
                          value={editCompletionDate}
                          onChange={(e) => setEditCompletionDate(e.target.value)}
                          className="w-full bg-slate-600 border-2 border-slate-400 focus:border-emerald-400 rounded-xl px-3.5 py-3 text-sm font-black text-white outline-none shadow-inner"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveTaskCompletionDate}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all shadow-md"
                          >
                            Confirmar Data
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskIndex(null)}
                            className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold text-xs rounded-xl border border-slate-400"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* LISTA DAS TAREFAS */}
                    {(() => {
                      let tasks: any[] = [];
                      try {
                        if (selectedTankForDetails.activeBatch.tankTasksJson) {
                          tasks = JSON.parse(selectedTankForDetails.activeBatch.tankTasksJson);
                        }
                      } catch {}

                      if (tasks.length === 0) {
                        return (
                          <p className="text-xs font-bold text-slate-300 italic py-2">
                            Nenhuma tarefa cadastrada. Toque em &quot;Nova Tarefa&quot; acima para adicionar.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-2.5">
                          {tasks.map((task, idx) => (
                            <div
                              key={idx}
                              className={`w-full p-4 rounded-2xl border-2 flex flex-col gap-2.5 transition-all shadow-md ${
                                task.completed
                                  ? 'bg-slate-700/90 border-emerald-500 text-white'
                                  : 'bg-slate-700 border-slate-500 text-white hover:border-amber-400'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTankTask(idx)}
                                  className="flex items-center gap-3 text-left flex-1"
                                >
                                  {task.completed ? (
                                    <CheckSquare className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                                  ) : (
                                    <Square className="w-6 h-6 text-slate-300 flex-shrink-0" />
                                  )}
                                  <div>
                                    <div
                                      className={`font-black text-base ${
                                        task.completed ? 'text-emerald-200 line-through' : 'text-white'
                                      }`}
                                    >
                                      {task.title}
                                    </div>
                                    <div className="text-xs font-bold text-slate-200 mt-0.5">
                                      Previsto: {formatDateShort(task.dueDate)}
                                    </div>
                                  </div>
                                </button>

                                <span
                                  className={`text-xs font-black uppercase px-3 py-1 rounded-lg shadow-sm ${
                                    task.completed
                                      ? 'bg-emerald-500 text-slate-950 font-black'
                                      : 'bg-amber-500 text-slate-950 font-black'
                                  }`}
                                >
                                  {task.completed ? 'Feito' : 'Pendente'}
                                </span>
                              </div>

                              {task.completed && (
                                <div className="flex items-center justify-between pt-2.5 border-t border-slate-500 text-xs text-slate-200">
                                  <span>
                                    Realizado em:{' '}
                                    <strong className="text-emerald-300 font-mono font-bold text-sm">
                                      {formatDateShort(task.completedAt || task.dueDate)}
                                    </strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTaskIndex(idx);
                                      setEditCompletionDate(task.completedAt || getLocalDateString());
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-black text-amber-300 hover:text-white bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded-xl border border-slate-400 shadow-sm transition-all"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                    Mudar Data
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* MODAL: EDITAR OG INICIAL E OBJETIVO FG */}
            {isEditingTargetsOpen && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-lg text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-400" />
                      Editar OG & Meta FG
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingTargetsOpen(false)}
                      className="p-1 rounded-xl text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300">
                    Ajuste as metas físico-químicas deste lote. O sistema recalcula automaticamente a atenuação e a estimativa de ABV.
                  </p>

                  {/* SELETOR DE UNIDADE NO MODAL COM ALTO CONTRASTE */}
                  <div className="flex items-center justify-between bg-slate-700 p-3 rounded-2xl border-2 border-slate-500 shadow-md">
                    <span className="text-xs font-black text-white">Unidade para edição:</span>
                    <div className="flex bg-slate-600 p-1 rounded-xl border border-slate-400 shadow-inner">
                      <button
                        type="button"
                        onClick={() => handleEditTargetsUnitChange('SG')}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                          editTargetsUnit === 'SG' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-200 hover:text-white'
                        }`}
                      >
                        SG (1.xxx)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditTargetsUnitChange('BRIX')}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                          editTargetsUnit === 'BRIX' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-200 hover:text-white'
                        }`}
                      >
                        Brix (°Bx)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-black text-white mb-1.5">
                        OG Inicial {editTargetsUnit === 'SG' ? '(ex: 1.050)' : '(ex: 12.4 °Bx)'}:
                      </label>
                      <input
                        type="text"
                        value={editOgInput}
                        onChange={(e) => setEditOgInput(e.target.value)}
                        placeholder={editTargetsUnit === 'SG' ? '1.050' : '12.4'}
                        className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-3 py-3 text-xl font-black text-white text-center outline-none shadow-inner placeholder:text-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-amber-300 mb-1.5">
                        Objetivo FG (Meta da Receita) {editTargetsUnit === 'SG' ? '(ex: 1.010)' : '(ex: 2.6 °Bx)'}:
                      </label>
                      <input
                        type="text"
                        value={editTargetFgInput}
                        onChange={(e) => setEditTargetFgInput(e.target.value)}
                        placeholder={editTargetsUnit === 'SG' ? '1.010' : '2.6'}
                        className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-3 py-3 text-xl font-black text-amber-300 text-center outline-none shadow-inner placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* PREVIEW DO TEOR ALCOÓLICO ESPERADO COM ALTO CONTRASTE */}
                  {(() => {
                    let ogNum = editTargetsUnit === 'BRIX'
                      ? (parseFloat(editOgInput.replace(',', '.')) ? brixToSg(parseFloat(editOgInput.replace(',', '.'))) : null)
                      : parseBreweryGravity(editOgInput);
                    let fgNum = editTargetsUnit === 'BRIX'
                      ? (parseFloat(editTargetFgInput.replace(',', '.')) ? brixToSg(parseFloat(editTargetFgInput.replace(',', '.'))) : null)
                      : parseBreweryGravity(editTargetFgInput);

                    if (ogNum && fgNum && ogNum > fgNum && ogNum > 1.0) {
                      const expAbv = Math.round(calculateAbv(ogNum, fgNum) * 10) / 10;
                      const expAtt = Math.round(((ogNum - fgNum) / (ogNum - 1.0)) * 100);
                      return (
                        <div className="bg-slate-700 border-2 border-amber-400 rounded-2xl p-4 text-center space-y-1 shadow-md">
                          <span className="text-xs font-black text-amber-300 block uppercase tracking-wider">
                            Previsão com estas metas:
                          </span>
                          <span className="text-sm font-black text-white">
                            ABV Alvo: <strong className="text-amber-300 text-lg font-mono">{expAbv}%</strong> | Atenuação Alvo: <strong className="text-white text-lg font-mono">{expAtt}%</strong>
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingTargetsOpen(false)}
                      className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-black text-sm rounded-2xl border-2 border-slate-500 transition-all shadow"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTargets}
                      disabled={isSavingTargets}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Salvar Metas
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: MUDAR STATUS DO TANQUE / LOTE */}
            {statusSelectTank && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-lg text-white flex items-center gap-2">
                        <Cylinder className="w-5 h-5 text-amber-400" />
                        Alterar Status: {statusSelectTank.name}
                      </h3>
                      <p className="text-xs text-slate-200">
                        Status atual:{' '}
                        <strong className="text-amber-400 uppercase font-black">
                          {statusSelectTank.activeBatch?.status || statusSelectTank.status}
                        </strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatusSelectTank(null)}
                      className="p-1 rounded-xl text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                    <span className="text-xs font-black uppercase text-amber-300 tracking-wider block pt-1">
                      {statusSelectTank.activeBatch ? 'Etapas de Produção / Lote no Tanque:' : 'Status Operacional do Tanque:'}
                    </span>

                    {[
                      { key: 'FERMENTANDO', label: 'Fermentando', badgeClass: 'bg-amber-500 text-slate-950 font-black', desc: 'Fermentação ativa no tanque com controle de temperatura' },
                      { key: 'MATURANDO', label: 'Maturando', badgeClass: 'bg-indigo-600 text-white font-black', desc: 'Cold crash, descanso diacetil ou maturação a frio' },
                      { key: 'PRONTO_ENVASE', label: 'Pronto p/ Envase', badgeClass: 'bg-emerald-600 text-white font-black', desc: 'Cerveja finalizada, carbonatada e pronta para barril/lata' },
                      { key: 'BRASSAGEM', label: 'Brassagem', badgeClass: 'bg-amber-600 text-white font-black', desc: 'Lote recém brassado / transferindo para tanque' },
                      { key: 'ENVASADO', label: 'Envasado', badgeClass: 'bg-slate-700 text-white font-black border border-slate-500', desc: 'Lote já envasado em barris / garrafas' },
                      { key: 'HIGIENIZANDO', label: 'Higienizando / CIP', badgeClass: 'bg-sky-600 text-white font-black', desc: 'Tanque em processo de lavagem ou sanitização' },
                      { key: 'MANUTENCAO', label: 'Manutenção', badgeClass: 'bg-rose-600 text-white font-black', desc: 'Válvula, vedação ou camisa em manutenção' },
                      { key: 'LIVRE', label: 'Livre / Disponível', badgeClass: 'bg-slate-700 text-slate-100 font-black border border-slate-500', desc: 'Tanque limpo e vazio pronto para nova brassagem' },
                      ...(statusSelectTank.activeBatch ? [
                        { key: 'FINALIZADO', label: 'Finalizado (Liberar Tanque)', badgeClass: 'bg-slate-700 text-slate-100 font-black border border-slate-500', desc: 'Conclui este lote e libera o tanque como LIVRE' },
                      ] : []),
                    ].map((st) => {
                      const isCurrent = (statusSelectTank.activeBatch?.status || statusSelectTank.status) === st.key;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleChangeTankStatus(statusSelectTank, st.key)}
                          className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 active:scale-98 shadow-md ${
                            isCurrent
                              ? 'bg-slate-700 border-amber-400 ring-2 ring-amber-400/50 shadow-xl'
                              : 'bg-slate-700 hover:bg-slate-650 border-slate-500 hover:border-slate-400'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-3 py-1 rounded-lg shadow-sm ${st.badgeClass}`}>
                                {st.label}
                              </span>
                              {isCurrent && (
                                <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-400">✓ Atual</span>
                              )}
                            </div>
                            <span className="text-xs text-slate-200 font-bold block mt-1.5">{st.desc}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300" />
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setStatusSelectTank(null)}
                    className="w-full py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-black text-sm rounded-2xl border-2 border-slate-500 transition-all shadow-md"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. MÓDULO BRASSAGEM (ESCOLHA DE RECEITA & MEDIÇÕES DE PH, OG, ETC) */}
        {/* ========================================================= */}
        {activeTab === 'BRASSAGEM' && (
          <div className="space-y-4">
            {/* SELEÇÃO: EM ANDAMENTO VS INICIAR DE RECEITA DO SISTEMA */}
            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  Brassagem do Dia
                </h2>

                <div className="flex bg-slate-800 p-1.5 rounded-xl border-2 border-slate-600 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setBrewMode('ACTIVE')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                      brewMode === 'ACTIVE' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Em Andamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrewMode('NEW_RECIPE')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                      brewMode === 'NEW_RECIPE' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    + De Receita
                  </button>
                </div>
              </div>

              {brewMode === 'ACTIVE' ? (
                activeBrewBatches.length === 0 ? (
                  <div className="text-center py-6 space-y-3 bg-slate-800/60 rounded-2xl border border-slate-700 p-4">
                    <p className="text-sm font-bold text-slate-200">
                      Nenhuma brassagem marcada como &apos;BRASSAGEM&apos; ativa.
                    </p>
                    <button
                      type="button"
                      onClick={() => setBrewMode('NEW_RECIPE')}
                      className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-md transition-all active:scale-95"
                    >
                      Iniciar Brassagem a partir de Receita
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-black text-white mb-1.5 uppercase tracking-wider">
                        Selecione a Brassagem Ativa:
                      </label>
                      <select
                        value={selectedBrewBatch?.id || ''}
                        onChange={(e) => {
                          const found = activeBrewBatches.find((b) => b.id === e.target.value);
                          setSelectedBrewBatch(found || null);
                          if (found) {
                            if (found.measuredOg) {
                              if (brewOgUnit === 'BRIX') {
                                setBrewOgInput((Math.round(sgToBrix(found.measuredOg) * 10) / 10).toFixed(1));
                              } else {
                                setBrewOgInput(String(found.measuredOg));
                              }
                            } else if (found.recipe?.og) {
                              if (brewOgUnit === 'BRIX') {
                                setBrewOgInput((Math.round(sgToBrix(found.recipe.og) * 10) / 10).toFixed(1));
                              } else {
                                setBrewOgInput(String(found.recipe.og));
                              }
                            }
                            if (found.volumePlannedLiters) setBrewVolumeInput(String(found.volumePlannedLiters));

                            let mashReadings: PhReadingItem[] = [];
                            let boilReadings: PhReadingItem[] = [];
                            if (found.customRecipeDataJson) {
                              try {
                                const custom = typeof found.customRecipeDataJson === 'string'
                                  ? JSON.parse(found.customRecipeDataJson)
                                  : found.customRecipeDataJson;
                                if (Array.isArray(custom?.mashPhReadings) && custom.mashPhReadings.length > 0) {
                                  mashReadings = custom.mashPhReadings.map((item: any) =>
                                    typeof item === 'object' && item !== null
                                      ? { ph: String(item.ph || ''), notes: String(item.notes || '') }
                                      : { ph: String(item), notes: '' }
                                  );
                                }
                                if (Array.isArray(custom?.boilPhReadings) && custom.boilPhReadings.length > 0) {
                                  boilReadings = custom.boilPhReadings.map((item: any) =>
                                    typeof item === 'object' && item !== null
                                      ? { ph: String(item.ph || ''), notes: String(item.notes || '') }
                                      : { ph: String(item), notes: '' }
                                  );
                                }
                              } catch {}
                            }

                            if (mashReadings.length > 0) setBrewPhMashList(mashReadings);
                            else if (found.phMash) setBrewPhMashList([{ ph: String(found.phMash), notes: '' }]);
                            else if (found.recipe?.targetPhMash) setBrewPhMashList([{ ph: String(found.recipe.targetPhMash), notes: 'Alvo' }]);
                            else setBrewPhMashList([{ ph: '5.3', notes: '' }]);

                            if (boilReadings.length > 0) setBrewPhBoilList(boilReadings);
                            else if (found.phBoil) setBrewPhBoilList([{ ph: String(found.phBoil), notes: '' }]);
                            else setBrewPhBoilList([{ ph: '5.1', notes: '' }]);

                            if (found.notes) setBrewNotesInput(found.notes);

                            // Preenche MAPA do lote ativo
                            const reg = (found.mapaRegistration || found.recipe?.mapaRegistration || found.recipe?.mapaProduct?.mapaRegistration || '').trim();
                            const denom = (found.commercialDenomination || found.recipe?.commercialDenomination || '').trim();
                            const prodId = found.recipe?.mapaProductId || found.recipe?.mapaProduct?.id || null;
                            setBrewMapaRegistration(reg);
                            setBrewCommercialDenomination(denom);
                            setBrewMapaProductId(prodId);
                          }
                        }}
                        className="w-full bg-slate-800 border-2 border-slate-500 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base font-bold text-white outline-none shadow-inner"
                      >
                        <option value="">-- Escolha o Lote --</option>
                        {activeBrewBatches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.recipe?.name} (Lote #{b.batchNumber})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Exibe o Card da Receita com Anotações do XML também para a brassagem ativa */}
                    {selectedBrewBatch?.recipe && (
                      <div className="bg-slate-800 border-2 border-amber-500/60 p-4 rounded-2xl space-y-3 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                          <div className="font-black text-lg text-amber-300 leading-snug">
                            {selectedBrewBatch.recipe.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="bg-amber-950/70 text-amber-300 border border-amber-600/50 px-2.5 py-0.5 rounded-lg text-xs font-black">
                              {selectedBrewBatch.recipe.style}
                            </span>
                            <span className="bg-emerald-950/70 text-emerald-300 border border-emerald-600/50 px-2.5 py-0.5 rounded-lg text-xs font-black">
                              {selectedBrewBatch.volumePlannedLiters || selectedBrewBatch.recipe.batchYieldLiters || 500}L
                            </span>
                            <span className="bg-sky-950/70 text-sky-300 border border-sky-600/50 px-2.5 py-0.5 rounded-lg text-xs font-mono font-black">
                              Lote #{selectedBrewBatch.batchNumber}
                            </span>
                            {(selectedBrewBatch.mapaRegistration || selectedBrewBatch.recipe?.mapaRegistration || selectedBrewBatch.recipe?.mapaProduct?.mapaRegistration) && (
                              <span className="bg-indigo-950/70 text-indigo-300 border border-indigo-600/50 px-2.5 py-0.5 rounded-lg text-xs font-mono font-black flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                                MAPA: {selectedBrewBatch.mapaRegistration || selectedBrewBatch.recipe?.mapaRegistration || selectedBrewBatch.recipe?.mapaProduct?.mapaRegistration}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Métricas Alvo em Tiles de Alto Contraste */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div className="bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-center shadow-inner">
                            <div className="text-[10px] uppercase font-bold text-slate-400">OG Alvo</div>
                            <div className="text-emerald-400 font-mono font-black text-base">
                              {selectedBrewBatch.recipe.og || '—'}
                            </div>
                          </div>
                          <div className="bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-center shadow-inner">
                            <div className="text-[10px] uppercase font-bold text-slate-400">FG Alvo</div>
                            <div className="text-sky-400 font-mono font-black text-base">
                              {selectedBrewBatch.recipe.fg || '—'}
                            </div>
                          </div>
                          <div className="bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-center shadow-inner">
                            <div className="text-[10px] uppercase font-bold text-slate-400">pH Alvo</div>
                            <div className="text-amber-400 font-mono font-black text-base">
                              {selectedBrewBatch.recipe.targetPhMash || '5.3'}
                            </div>
                          </div>
                        </div>

                        {/* Anotações do BeerXML */}
                        {(() => {
                          const notes = extractXmlNotes(selectedBrewBatch.recipe);
                          if (!notes) return null;
                          return (
                            <div className="mt-3 pt-3 border-t-2 border-slate-700/80 space-y-1.5">
                              <div className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-amber-400" />
                                Anotações da Receita (BeerXML):
                              </div>
                              <div className="bg-slate-900 border border-slate-600 rounded-xl p-3 text-slate-100 text-xs font-medium leading-relaxed whitespace-pre-wrap shadow-inner max-h-48 overflow-y-auto">
                                {notes}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* SELETOR DE REGISTRO MAPA PARA O LOTE ATIVO */}
                    {selectedBrewBatch && (
                      <div className="bg-slate-800 border-2 border-amber-500/60 p-4 rounded-2xl space-y-3 shadow-xl">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-black text-amber-300 uppercase tracking-wide">
                            <ShieldCheck className="w-5 h-5 text-amber-400" />
                            <span>Registro MAPA & Rótulo (Lote #{selectedBrewBatch.batchNumber})</span>
                          </div>
                          {brewMapaRegistration ? (
                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> MAPA Vinculado
                            </span>
                          ) : (
                            <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Sem MAPA no Lote
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-black text-white mb-1.5 uppercase tracking-wide">
                            Selecione do Catálogo MAPA:
                          </label>
                          <select
                            value={brewMapaProductId || (brewMapaRegistration ? '__MANUAL__' : '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__MANUAL__') {
                                setBrewMapaProductId(null);
                              } else if (val) {
                                setBrewMapaProductId(val);
                                const matched = mapaProducts.find((p) => p.id === val);
                                if (matched) {
                                  setBrewMapaRegistration(matched.mapaRegistration || '');
                                  if (matched.commercialDenomination) {
                                    setBrewCommercialDenomination(matched.commercialDenomination);
                                  }
                                }
                              } else {
                                setBrewMapaProductId(null);
                                setBrewMapaRegistration('');
                                setBrewCommercialDenomination('');
                              }
                            }}
                            className="w-full bg-slate-900 border-2 border-slate-600 focus:border-amber-400 rounded-xl px-3.5 py-3 text-sm font-bold text-white outline-none shadow-inner"
                          >
                            <option value="">-- Escolha um Registro MAPA Cadastrado ({mapaProducts.length} disponíveis) --</option>
                            {mapaProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} — Reg: {p.mapaRegistration} {p.style ? `(${p.style})` : ''}
                              </option>
                            ))}
                            <option value="__MANUAL__">✍️ Digitar Nº de Registro Manualmente</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wide">
                              Nº de Registro MAPA:
                            </label>
                            <input
                              type="text"
                              value={brewMapaRegistration}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBrewMapaRegistration(val);
                                const match = mapaProducts.find(
                                  (p) => p.mapaRegistration.trim().toLowerCase() === val.trim().toLowerCase()
                                );
                                setBrewMapaProductId(match ? match.id : null);
                              }}
                              placeholder="Ex: SP 001234-5.000001"
                              className="w-full bg-slate-900 border-2 border-slate-600 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-amber-300 outline-none shadow-inner placeholder:text-slate-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wide">
                              Denominação Legal / Comercial:
                            </label>
                            <input
                              type="text"
                              value={brewCommercialDenomination}
                              onChange={(e) => setBrewCommercialDenomination(e.target.value)}
                              placeholder="Ex: Cerveja Clara Puro Malte"
                              className="w-full bg-slate-900 border-2 border-slate-600 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none shadow-inner placeholder:text-slate-500"
                            />
                          </div>
                        </div>

                        {selectedBrewBatch.recipe && brewMapaRegistration && (
                          <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 text-xs">
                            <span className="text-slate-300">
                              Vincular também este MAPA à receita original ({selectedBrewBatch.recipe.name}):
                            </span>
                            <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-amber-400">
                              <input
                                type="checkbox"
                                checked={saveMapaToRecipe}
                                onChange={(e) => setSaveMapaToRecipe(e.target.checked)}
                                className="w-4 h-4 accent-amber-500 rounded"
                              />
                              <span>Vincular</span>
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-black text-white uppercase tracking-wider">
                        Escolha uma Receita do Catálogo:
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAllRecipes(!showAllRecipes)}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
                      >
                        {showAllRecipes ? 'Ver apenas não brassadas' : `Mostrar todas (${recipes.length})`}
                      </button>
                    </div>

                    <select
                      value={selectedRecipeId}
                      onChange={(e) => handleSelectRecipeForBrew(e.target.value)}
                      className="w-full bg-slate-800 border-2 border-slate-500 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base font-bold text-white outline-none shadow-inner"
                    >
                      <option value="">-- Selecionar Receita do Catálogo --</option>
                      <option value="__BLANK__">➕ Receita em Branco (Sem XML - adicionar depois)</option>
                      {displayedRecipes.length > 0 ? (
                        <optgroup label={showAllRecipes ? "Todas as Receitas" : "Receitas Disponíveis (XMLs não brassados)"}>
                          {displayedRecipes.map((r) => {
                            const reg = r.mapaRegistration || r.mapaProduct?.mapaRegistration;
                            return (
                              <option key={r.id} value={r.id}>
                                {r.name} — {r.style} (OG: {r.og || '1.050'}) {reg ? `[MAPA: ${reg}]` : '[Sem MAPA]'}
                              </option>
                            );
                          })}
                        </optgroup>
                      ) : (
                        <option disabled value="">
                          Nenhuma receita sem lote brassado. Clique em &apos;Mostrar todas&apos; ou use &apos;Receita em Branco&apos;.
                        </option>
                      )}
                    </select>
                  </div>

                  {/* FORMULÁRIO DE RECEITA EM BRANCO (CASO O CERVEJEIRO NÃO TENHA O XML AINDA) */}
                  {selectedRecipeId === '__BLANK__' && (
                    <div className="bg-slate-800 border-2 border-dashed border-amber-500/70 p-4 rounded-2xl space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="font-black text-base text-amber-400 flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-amber-400" />
                          Receita em Branco (Sem XML no Sistema)
                        </div>
                        <span className="text-[10px] uppercase font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                          Novo Lote
                        </span>
                      </div>
                      <p className="text-xs text-slate-200">
                        Você está iniciando uma brassagem sem XML no sistema. Você poderá importar e vincular o arquivo XML da receita posteriormente na tela de Produção.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-black text-white mb-1 uppercase tracking-wide">
                            Nome da Cerveja / Receita: *
                          </label>
                          <input
                            type="text"
                            value={blankRecipeName}
                            onChange={(e) => {
                              setBlankRecipeName(e.target.value);
                              if (!brewBatchNumber || brewBatchNumber.startsWith('LOTE-') || brewBatchNumber.startsWith('REC-')) {
                                const year = new Date().getFullYear().toString().slice(-2);
                                const prefix = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'LOT';
                                setBrewBatchNumber(`${prefix}-${year}${String(batches.length + 1).padStart(2, '0')}`);
                              }
                            }}
                            placeholder="Ex: IPA Tropical, Pilsen..."
                            className="w-full bg-slate-900 border-2 border-slate-500 focus:border-amber-400 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-white mb-1 uppercase tracking-wide">
                            Estilo da Cerveja:
                          </label>
                          <input
                            type="text"
                            value={blankRecipeStyle}
                            onChange={(e) => setBlankRecipeStyle(e.target.value)}
                            placeholder="Ex: American IPA, Pilsen, Stout..."
                            className="w-full bg-slate-900 border-2 border-slate-500 focus:border-amber-400 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none shadow-inner placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CARD DE DETALHES DA RECEITA COM ALTO CONTRASTE & ANOTAÇÕES DO XML */}
                  {selectedRecipeObj && (
                    <div className="bg-slate-800 border-2 border-amber-500/60 p-4 rounded-2xl space-y-3 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                        <div className="font-black text-lg text-amber-300 leading-snug">
                          {selectedRecipeObj.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-amber-950/70 text-amber-300 border border-amber-600/50 px-2.5 py-0.5 rounded-lg text-xs font-black">
                            {selectedRecipeObj.style}
                          </span>
                          <span className="bg-emerald-950/70 text-emerald-300 border border-emerald-600/50 px-2.5 py-0.5 rounded-lg text-xs font-black">
                            {selectedRecipeObj.batchYieldLiters || 500}L
                          </span>
                          {(selectedRecipeObj.mapaRegistration || selectedRecipeObj.mapaProduct?.mapaRegistration) ? (
                            <span className="bg-indigo-950/70 text-indigo-300 border border-indigo-600/50 px-2.5 py-0.5 rounded-lg text-xs font-mono font-black flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                              MAPA: {selectedRecipeObj.mapaRegistration || selectedRecipeObj.mapaProduct?.mapaRegistration}
                            </span>
                          ) : (
                            <span className="bg-amber-950/60 text-amber-300 border border-amber-600/40 px-2.5 py-0.5 rounded-lg text-xs font-black flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              Sem MAPA vinculado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Métricas Alvo em Tiles de Alto Contraste */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-center shadow-inner">
                          <div className="text-[10px] uppercase font-bold text-slate-400">OG Alvo</div>
                          <div className="text-emerald-400 font-mono font-black text-base">
                            {selectedRecipeObj.og || '—'}
                          </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-center shadow-inner">
                          <div className="text-[10px] uppercase font-bold text-slate-400">FG Alvo</div>
                          <div className="text-sky-400 font-mono font-black text-base">
                            {selectedRecipeObj.fg || '—'}
                          </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-center shadow-inner">
                          <div className="text-[10px] uppercase font-bold text-slate-400">pH Alvo</div>
                          <div className="text-amber-400 font-mono font-black text-base">
                            {selectedRecipeObj.targetPhMash || '5.3'}
                          </div>
                        </div>
                      </div>

                      {/* Anotações do BeerXML */}
                      {(() => {
                        const notes = extractXmlNotes(selectedRecipeObj);
                        if (!notes) return null;
                        return (
                          <div className="mt-3 pt-3 border-t-2 border-slate-700/80 space-y-1.5">
                            <div className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-amber-400" />
                              Anotações da Receita (BeerXML):
                            </div>
                            <div className="bg-slate-900 border border-slate-600 rounded-xl p-3 text-slate-100 text-xs font-medium leading-relaxed whitespace-pre-wrap shadow-inner max-h-48 overflow-y-auto">
                              {notes}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* SELETOR DE REGISTRO MAPA & RÓTULO DA CERVEJA */}
                  {(selectedRecipeObj || selectedRecipeId === '__BLANK__') && (
                    <div className="bg-slate-800 border-2 border-amber-500/60 p-4 rounded-2xl space-y-3 shadow-xl">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-black text-amber-300 uppercase tracking-wide">
                          <ShieldCheck className="w-5 h-5 text-amber-400" />
                          <span>Registro MAPA & Rótulo Regulatório</span>
                        </div>
                        {brewMapaRegistration ? (
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> MAPA Selecionado
                          </span>
                        ) : (
                          <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Selecione o Registro MAPA
                          </span>
                        )}
                      </div>

                      {/* Dropdown do Catálogo MAPA */}
                      <div>
                        <label className="block text-xs font-black text-white mb-1.5 uppercase tracking-wide">
                          Selecione o Rótulo no Catálogo MAPA:
                        </label>
                        <select
                          value={brewMapaProductId || (brewMapaRegistration ? '__MANUAL__' : '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__MANUAL__') {
                              setBrewMapaProductId(null);
                            } else if (val) {
                              setBrewMapaProductId(val);
                              const matched = mapaProducts.find((p) => p.id === val);
                              if (matched) {
                                setBrewMapaRegistration(matched.mapaRegistration || '');
                                if (matched.commercialDenomination) {
                                  setBrewCommercialDenomination(matched.commercialDenomination);
                                }
                              }
                            } else {
                              setBrewMapaProductId(null);
                              setBrewMapaRegistration('');
                              setBrewCommercialDenomination('');
                            }
                          }}
                          className="w-full bg-slate-900 border-2 border-slate-600 focus:border-amber-400 rounded-xl px-3.5 py-3 text-sm font-bold text-white outline-none shadow-inner"
                        >
                          <option value="">-- Escolha um Registro MAPA Cadastrado ({mapaProducts.length} disponíveis) --</option>
                          {mapaProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — Reg: {p.mapaRegistration} {p.style ? `(${p.style})` : ''}
                            </option>
                          ))}
                          <option value="__MANUAL__">✍️ Digitar Nº de Registro Manualmente</option>
                        </select>
                      </div>

                      {/* Campos Editáveis de Registro e Denominação */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wide">
                            Nº de Registro MAPA:
                          </label>
                          <input
                            type="text"
                            value={brewMapaRegistration}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBrewMapaRegistration(val);
                              const match = mapaProducts.find(
                                (p) => p.mapaRegistration.trim().toLowerCase() === val.trim().toLowerCase()
                              );
                              setBrewMapaProductId(match ? match.id : null);
                            }}
                            placeholder="Ex: SP 001234-5.000001"
                            className="w-full bg-slate-900 border-2 border-slate-600 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-amber-300 outline-none shadow-inner placeholder:text-slate-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wide">
                            Denominação Legal / Comercial:
                          </label>
                          <input
                            type="text"
                            value={brewCommercialDenomination}
                            onChange={(e) => setBrewCommercialDenomination(e.target.value)}
                            placeholder="Ex: Cerveja Clara Puro Malte"
                            className="w-full bg-slate-900 border-2 border-slate-600 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none shadow-inner placeholder:text-slate-500"
                          />
                        </div>
                      </div>

                      {/* Botão para cadastrar no catálogo se for novo */}
                      {brewMapaRegistration.trim().length > 3 &&
                        !mapaProducts.some(
                          (p) => p.mapaRegistration.trim().toLowerCase() === brewMapaRegistration.trim().toLowerCase()
                        ) && (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                            <span className="text-amber-200">
                              Este número MAPA ainda não está no catálogo da cervejaria.
                            </span>
                            <button
                              type="button"
                              onClick={handleQuickSaveMapaProduct}
                              disabled={isSavingQuickMapa}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {isSavingQuickMapa ? 'Salvando...' : 'Salvar no Catálogo MAPA'}
                            </button>
                          </div>
                        )}

                      {/* Vincular permanentemente à receita */}
                      {selectedRecipeObj && brewMapaRegistration && (
                        <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 text-xs">
                          <span className="text-slate-300">
                            Vincular este registro MAPA permanentemente na receita:
                          </span>
                          <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-amber-400">
                            <input
                              type="checkbox"
                              checked={saveMapaToRecipe}
                              onChange={(e) => setSaveMapaToRecipe(e.target.checked)}
                              className="w-4 h-4 accent-amber-500 rounded"
                            />
                            <span>Vincular à Receita</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-white mb-1 uppercase tracking-wider">
                        Número do Lote:
                      </label>
                      <input
                        type="text"
                        value={brewBatchNumber}
                        onChange={(e) => setBrewBatchNumber(e.target.value.toUpperCase())}
                        placeholder="Ex: IPA-2601"
                        className="w-full bg-slate-800 border-2 border-slate-500 focus:border-amber-400 rounded-2xl px-3 py-3 text-base font-black text-white text-center font-mono outline-none shadow-inner placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-white mb-1 uppercase tracking-wider">
                        Tanque Destino:
                      </label>
                      <select
                        value={brewTargetTankId}
                        onChange={(e) => setBrewTargetTankId(e.target.value)}
                        className="w-full bg-slate-800 border-2 border-slate-500 focus:border-amber-400 rounded-2xl px-3 py-3 text-sm font-bold text-white outline-none shadow-inner"
                      >
                        <option value="">Sem tanque (Panela)</option>
                        {tanks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* FORMULÁRIO DE MEDIÇÕES DA BRASSAGEM COM ALTA LEGIBILIDADE & MÚLTIPLAS MEDIÇÕES DE PH */}
              {(selectedBrewBatch || (brewMode === 'NEW_RECIPE' && selectedRecipeId)) && (
                <div className="pt-4 border-t-2 border-slate-700/80 space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    🔬 Medições & Parâmetros da Brassagem
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                          OG Medida {brewOgUnit === 'BRIX' ? '(°Brix)' : '(Pós-Fervura)'}:
                        </label>
                        <div className="flex bg-slate-200 p-0.5 rounded-xl border border-slate-300 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleBrewOgUnitChange('SG')}
                            className={`px-2.5 py-0.5 text-xs font-black rounded-lg transition-all ${
                              brewOgUnit === 'SG'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            SG
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBrewOgUnitChange('BRIX')}
                            className={`px-2.5 py-0.5 text-xs font-black rounded-lg transition-all ${
                              brewOgUnit === 'BRIX'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            °Brix
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={brewOgInput}
                        onChange={(e) => setBrewOgInput(e.target.value)}
                        placeholder={brewOgUnit === 'BRIX' ? '12.4' : '1.054'}
                        className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 rounded-2xl px-3 py-3 text-2xl font-black text-slate-900 text-center font-mono outline-none shadow-sm placeholder:text-slate-400"
                      />
                      {brewOgConvertedPreview && (
                        <div className="mt-1.5 flex items-center justify-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold shadow-2xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Conversão automática:</span>
                          <strong className="font-mono text-sm text-amber-950">{brewOgConvertedPreview.convertedText}</strong>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wide">
                        Volume no Fermentador (L):
                      </label>
                      <input
                        type="text"
                        value={brewVolumeInput}
                        onChange={(e) => setBrewVolumeInput(e.target.value)}
                        placeholder="520"
                        className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 rounded-2xl px-3 py-3 text-2xl font-black text-slate-900 text-center font-mono outline-none shadow-sm placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* BLOCO DE MEDIÇÕES DE PH (MOSTURA & FERVURA COM CAMPO DE OBSERVAÇÃO E BOTÃO +) */}
                  <div className="space-y-3 pt-1">
                    {/* pH Mostura com + e Obs */}
                    <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Droplets className="w-4 h-4 text-amber-500" />
                          pH da Mostura:
                        </label>
                        <button
                          type="button"
                          onClick={() => setBrewPhMashList([...brewPhMashList, { ph: '', notes: '' }])}
                          className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all active:scale-95 shadow-sm border border-amber-400"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar Medição
                        </button>
                      </div>

                      <div className="space-y-2">
                        {brewPhMashList.map((item, idx) => (
                          <div key={`mash-${idx}`} className="flex items-center gap-2">
                            <div className="w-28 sm:w-32 flex-shrink-0">
                              <input
                                type="text"
                                value={item.ph}
                                onChange={(e) => {
                                  const updated = [...brewPhMashList];
                                  updated[idx] = { ...updated[idx], ph: e.target.value };
                                  setBrewPhMashList(updated);
                                }}
                                placeholder={idx === 0 ? '5.3 (Inicial)' : `pH #${idx + 1}`}
                                className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 rounded-xl px-3 py-2.5 text-base font-black text-slate-900 text-center outline-none shadow-sm placeholder:text-slate-400"
                              />
                            </div>

                            <div className="flex-1">
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) => {
                                  const updated = [...brewPhMashList];
                                  updated[idx] = { ...updated[idx], notes: e.target.value };
                                  setBrewPhMashList(updated);
                                }}
                                placeholder="Obs: ex. 15 min, lavagem, correção..."
                                className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none shadow-sm placeholder:text-slate-400"
                              />
                            </div>

                            {brewPhMashList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setBrewPhMashList(brewPhMashList.filter((_, i) => i !== idx))}
                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex-shrink-0"
                                title="Remover medição"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* pH Fervura com + e Obs */}
                    <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-500" />
                          pH da Fervura:
                        </label>
                        <button
                          type="button"
                          onClick={() => setBrewPhBoilList([...brewPhBoilList, { ph: '', notes: '' }])}
                          className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all active:scale-95 shadow-sm border border-amber-400"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar Medição
                        </button>
                      </div>

                      <div className="space-y-2">
                        {brewPhBoilList.map((item, idx) => (
                          <div key={`boil-${idx}`} className="flex items-center gap-2">
                            <div className="w-28 sm:w-32 flex-shrink-0">
                              <input
                                type="text"
                                value={item.ph}
                                onChange={(e) => {
                                  const updated = [...brewPhBoilList];
                                  updated[idx] = { ...updated[idx], ph: e.target.value };
                                  setBrewPhBoilList(updated);
                                }}
                                placeholder={idx === 0 ? '5.1 (Inicial)' : `pH #${idx + 1}`}
                                className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 rounded-xl px-3 py-2.5 text-base font-black text-slate-900 text-center outline-none shadow-sm placeholder:text-slate-400"
                              />
                            </div>

                            <div className="flex-1">
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) => {
                                  const updated = [...brewPhBoilList];
                                  updated[idx] = { ...updated[idx], notes: e.target.value };
                                  setBrewPhBoilList(updated);
                                }}
                                placeholder="Obs: ex. pré-fervura, whirlpool..."
                                className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none shadow-sm placeholder:text-slate-400"
                              />
                            </div>

                            {brewPhBoilList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setBrewPhBoilList(brewPhBoilList.filter((_, i) => i !== idx))}
                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex-shrink-0"
                                title="Remover medição"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wider">
                      Anotações da Brassagem:
                    </label>
                    <input
                      type="text"
                      value={brewNotesInput}
                      onChange={(e) => setBrewNotesInput(e.target.value)}
                      placeholder="Ex: Whirlpool a 80°C, mosto límpido, dry hopping planejado..."
                      className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 outline-none shadow-sm placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveBreweryData(false)}
                      disabled={isSavingBrew}
                      className="flex-1 py-4 bg-white hover:bg-slate-50 text-slate-800 font-black text-sm rounded-2xl border-2 border-slate-300 transition-all active:scale-95 shadow-sm"
                    >
                      Salvar Medições
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveBreweryData(true)}
                      disabled={isSavingBrew}
                      className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-amber-400"
                    >
                      <Check className="w-5 h-5" />
                      Enviar para Fermentador
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. MÓDULO TAREFAS DA FÁBRICA & ADEGA TOUCH */}
        {/* ========================================================= */}
        {activeTab === 'TAREFAS' && (
          <div className="space-y-4">
            {/* CABEÇALHO COM TÍTULO E BOTÃO DE CRIAR */}
            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <CheckSquare className="w-6 h-6 text-amber-400" />
                  Tarefas da Fábrica & Adega
                </h2>
                <p className="text-xs font-bold text-slate-300 mt-0.5">
                  Controle de adições, purgas, cold crash, medições e rotinas dos tanques
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCreateTask()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm px-5 py-3.5 rounded-2xl shadow-lg border border-amber-300 active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                Nova Tarefa
              </button>
            </div>

            {/* ATALHOS RÁPIDOS DE PRESETS */}
            <div className="bg-slate-900/80 border-2 border-slate-800 rounded-2xl p-3 shadow-md">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2 px-1">
                Atalhos Rápidos de Ação:
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_TASK_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleOpenCreateTask(preset)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-black text-amber-300 active:scale-95 transition-all shadow-sm"
                  >
                    <span>{preset.label}</span>
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* BARRA DE FILTROS E BUSCA */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFabricaTaskFilter('PENDING')}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border-2 active:scale-95 shadow ${
                    fabricaTaskFilter === 'PENDING'
                      ? 'bg-amber-500 border-amber-300 text-slate-950'
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:text-white'
                  }`}
                >
                  Pendentes ({pendingTasksCount})
                </button>

                <button
                  type="button"
                  onClick={() => setFabricaTaskFilter('TODAY')}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border-2 active:scale-95 shadow ${
                    fabricaTaskFilter === 'TODAY'
                      ? 'bg-amber-400 border-amber-200 text-slate-950'
                      : todayTasksCount > 0
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:text-white'
                  }`}
                >
                  ⚡ Hoje ({todayTasksCount})
                </button>

                <button
                  type="button"
                  onClick={() => setFabricaTaskFilter('LATE')}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border-2 active:scale-95 shadow ${
                    fabricaTaskFilter === 'LATE'
                      ? 'bg-red-500 border-red-300 text-white'
                      : lateTasksCount > 0
                      ? 'bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30'
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:text-white'
                  }`}
                >
                  🚨 Atrasadas ({lateTasksCount})
                </button>

                <button
                  type="button"
                  onClick={() => setFabricaTaskFilter('ALL')}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border-2 active:scale-95 shadow ${
                    fabricaTaskFilter === 'ALL'
                      ? 'bg-amber-500 border-amber-300 text-slate-950'
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:text-white'
                  }`}
                >
                  Todas ({fabricaTasks.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFabricaTaskFilter('COMPLETED')}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border-2 active:scale-95 shadow ${
                    fabricaTaskFilter === 'COMPLETED'
                      ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:text-white'
                  }`}
                >
                  Concluídas ({fabricaTasks.length - pendingTasksCount})
                </button>
              </div>

              {/* CAMPO DE BUSCA */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fabricaTaskSearch}
                  onChange={(e) => setFabricaTaskSearch(e.target.value)}
                  placeholder="Filtrar por tarefa, cerveja, tanque, anotação..."
                  className="w-full bg-slate-900 border-2 border-slate-700 focus:border-amber-400 rounded-2xl pl-11 pr-10 py-3 text-sm font-bold text-white placeholder:text-slate-400 outline-none shadow-inner"
                />
                {fabricaTaskSearch && (
                  <button
                    type="button"
                    onClick={() => setFabricaTaskSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* LISTAGEM DE TAREFAS */}
            {filteredFabricaTasks.length === 0 ? (
              <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-3xl p-10 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-base font-black text-white">Nenhuma tarefa encontrada</h3>
                <p className="text-xs text-slate-300 font-bold max-w-sm mx-auto">
                  {fabricaTaskSearch
                    ? 'Nenhuma tarefa corresponde aos termos pesquisados.'
                    : fabricaTaskFilter === 'PENDING'
                    ? 'Tudo em dia na fábrica! Nenhuma tarefa pendente no momento.'
                    : 'Não há tarefas cadastradas nesta categoria.'}
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenCreateTask()}
                  className="inline-flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-4 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Criar Nova Tarefa
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredFabricaTasks.map((t) => {
                  const isLate = t.urgency === 'LATE';
                  const isToday = t.urgency === 'TODAY';
                  const isDone = t.completed;

                  return (
                    <div
                      key={t.id}
                      className={`relative rounded-3xl p-4 transition-all shadow-lg border-2 flex flex-col justify-between gap-3 ${
                        isDone
                          ? 'bg-slate-900/60 border-slate-800 opacity-70'
                          : isLate
                          ? 'bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900 border-red-500/80 shadow-red-950/30'
                          : isToday
                          ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-400 shadow-amber-950/30'
                          : 'bg-slate-900 border-slate-700'
                      }`}
                    >
                      {/* TOPO: BOTÃO CHECK GIGANTE + TÍTULO E STATUS */}
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleFabricaTask(t)}
                          aria-label={isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
                          className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all active:scale-90 shadow-md ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-300 text-slate-950 scale-100'
                              : 'bg-slate-800 border-slate-600 hover:border-amber-400 text-slate-400 hover:text-amber-400'
                          }`}
                        >
                          <Check className={`w-6 h-6 stroke-[3] ${isDone ? 'opacity-100' : 'opacity-20'}`} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            {isDone ? (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Concluída
                              </span>
                            ) : isLate ? (
                              <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> Atrasada ({Math.abs(t.daysDiff)}d)
                              </span>
                            ) : isToday ? (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Hoje
                              </span>
                            ) : (
                              <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> em {t.daysDiff}d
                              </span>
                            )}

                            {t.amount !== undefined && (
                              <span className="bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {t.amount} {t.unit || ''}
                              </span>
                            )}
                          </div>

                          <h4
                            className={`font-black text-sm leading-snug break-words ${
                              isDone ? 'line-through text-slate-400' : 'text-white'
                            }`}
                          >
                            {t.title}
                          </h4>
                        </div>
                      </div>

                      {/* CORPO: TANQUE & LOTE DE CERVEJA OU FÁBRICA */}
                      <div className="bg-slate-800/80 rounded-2xl p-2.5 space-y-1.5 border border-slate-700/60 text-xs">
                        <div className="flex items-center justify-between text-slate-200 font-bold">
                          <span className="flex items-center gap-1.5 truncate">
                            {t.targetType === 'FABRICA' ? (
                              <span className="text-sm leading-none">🏭</span>
                            ) : (
                              <Cylinder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            )}
                            <strong className="text-white">{t.tankName}</strong>
                          </span>
                          {t.targetType !== 'FABRICA' && t.batchNumber && (
                            <span className="text-[11px] font-mono text-slate-400">
                              Lote #{t.batchNumber}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-black truncate">
                          {t.targetType === 'FABRICA' ? (
                            <span className="text-slate-300 font-bold">Rotina Operacional da Fábrica</span>
                          ) : (
                            <>
                              <Beer className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <span className="truncate">{t.recipeName}</span>
                              {t.recipeStyle && (
                                <span className="text-slate-400 font-normal">({t.recipeStyle})</span>
                              )}
                            </>
                          )}
                        </div>

                        {t.notes && (
                          <div className="text-[11px] font-medium text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-700/50 break-words italic">
                            &ldquo;{t.notes}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* RODAPÉ DO CARD: DATA DE VENCIMENTO E AÇÕES TOUCH */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                        <span className="text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {t.dueDate}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTask(t)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 border border-slate-600 active:scale-95 transition-all"
                            title="Editar tarefa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-200 hover:text-red-400 border border-slate-600 hover:border-red-500/50 active:scale-95 transition-all"
                            title="Excluir tarefa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. MÓDULO CALCULADORA CERVEJEIRA TOUCH */}
        {/* ========================================================= */}
        {activeTab === 'CALCULADORA' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setCalcTab('REFRACTOMETER')}
                className={`py-3.5 px-2 rounded-2xl font-black text-xs transition-all active:scale-95 border-2 shadow ${
                  calcTab === 'REFRACTOMETER'
                    ? 'bg-amber-500 border-amber-300 text-slate-950 scale-105'
                    : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                Refratômetro
              </button>

              <button
                type="button"
                onClick={() => setCalcTab('HYDROMETER')}
                className={`py-3.5 px-2 rounded-2xl font-black text-xs transition-all active:scale-95 border-2 shadow ${
                  calcTab === 'HYDROMETER'
                    ? 'bg-amber-500 border-amber-300 text-slate-950 scale-105'
                    : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                Densímetro / Temp
              </button>

              <button
                type="button"
                onClick={() => setCalcTab('BRIX_SG')}
                className={`py-3.5 px-2 rounded-2xl font-black text-xs transition-all active:scale-95 border-2 shadow ${
                  calcTab === 'BRIX_SG'
                    ? 'bg-amber-500 border-amber-300 text-slate-950 scale-105'
                    : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                Brix ↔ SG
              </button>

              <button
                type="button"
                onClick={() => setCalcTab('ABV')}
                className={`py-3.5 px-2 rounded-2xl font-black text-xs transition-all active:scale-95 border-2 shadow ${
                  calcTab === 'ABV'
                    ? 'bg-amber-500 border-amber-300 text-slate-950 scale-105'
                    : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                Cálculo de ABV
              </button>
            </div>

            {calcTab === 'REFRACTOMETER' && (
              <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-4">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-400" />
                  Correção de Refratômetro na Fermentação
                </h3>
                <p className="text-xs font-bold text-slate-300">
                  O álcool altera a refração da luz. Esta ferramenta calcula a densidade e teor alcoólico reais.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-100 mb-1">OG Inicial (SG):</label>
                    <input
                      type="text"
                      value={calcOgSg}
                      onChange={(e) => setCalcOgSg(e.target.value)}
                      placeholder="1.054"
                      className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-3 py-3.5 text-xl font-black text-white text-center outline-none shadow-inner placeholder:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-300 mb-1">
                      Brix Lido no Refratômetro:
                    </label>
                    <input
                      type="text"
                      value={calcCurrentBrix}
                      onChange={(e) => setCalcCurrentBrix(e.target.value)}
                      placeholder="6.5"
                      className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-3 py-3.5 text-xl font-black text-amber-300 text-center outline-none shadow-inner placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {refractometerResults && (
                  <div className="pt-2 grid grid-cols-2 gap-3">
                    <div className="bg-slate-700 border-2 border-slate-500 p-4 rounded-2xl text-center shadow-md">
                      <span className="text-xs font-black uppercase text-slate-200 block mb-1">FG Real Corrigida</span>
                      <span className="font-black text-3xl text-emerald-400 font-mono">
                        {refractometerResults.fgSg.toFixed(3)}
                      </span>
                    </div>

                    <div className="bg-slate-700 border-2 border-amber-400 p-4 rounded-2xl text-center shadow-md">
                      <span className="text-xs font-black uppercase text-amber-300 block mb-1">Teor Alcoólico</span>
                      <span className="font-black text-3xl text-amber-300 font-mono">
                        {refractometerResults.abv.toFixed(1)}% ABV
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {calcTab === 'HYDROMETER' && (
              <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-4">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-blue-400" />
                  Correção de Densímetro por Temperatura
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-black text-slate-100 mb-1">Leitura SG:</label>
                    <input
                      type="text"
                      value={calcHydroSg}
                      onChange={(e) => setCalcHydroSg(e.target.value)}
                      placeholder="1.050"
                      className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-2 py-3 text-lg font-black text-white text-center outline-none shadow-inner placeholder:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-100 mb-1">Temp Amostra (°C):</label>
                    <input
                      type="text"
                      value={calcHydroTemp}
                      onChange={(e) => setCalcHydroTemp(e.target.value)}
                      placeholder="28"
                      className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-2 py-3 text-lg font-black text-amber-300 text-center outline-none shadow-inner placeholder:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-100 mb-1">Calibragem (°C):</label>
                    <input
                      type="text"
                      value={calcCalibTemp}
                      onChange={(e) => setCalcCalibTemp(e.target.value)}
                      placeholder="20"
                      className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-2 py-3 text-lg font-black text-white text-center outline-none shadow-inner placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="bg-slate-700 border-2 border-slate-500 p-4 rounded-2xl text-center space-y-1 shadow-md">
                  <span className="text-xs font-black uppercase text-slate-200 block">
                    Densidade Corrigida a {calcCalibTemp}°C
                  </span>
                  <span className="font-black text-3xl text-emerald-400 font-mono">
                    {hydrometerResults.correctedSg.toFixed(3)} SG
                  </span>
                  <div className="text-xs font-bold text-slate-200">
                    Ajuste térmico:{' '}
                    {hydrometerResults.diffPoints > 0
                      ? `+${hydrometerResults.diffPoints}`
                      : hydrometerResults.diffPoints}{' '}
                    pontos de densidade
                  </div>
                </div>
              </div>
            )}

            {calcTab === 'BRIX_SG' && (
              <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-4">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-400" />
                  Conversor Rápido Brix ↔ Densidade (SG)
                </h3>

                <div>
                  <label className="block text-xs font-black text-slate-100 mb-1.5 uppercase">
                    Valor em Graus Brix (°Bx) / Plato:
                  </label>
                  <input
                    type="text"
                    value={calcRawBrix}
                    onChange={(e) => setCalcRawBrix(e.target.value)}
                    placeholder="13.0"
                    className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-2xl font-black text-amber-300 text-center outline-none shadow-inner placeholder:text-slate-300"
                  />
                </div>

                <div className="bg-slate-700 border-2 border-slate-500 p-4 rounded-2xl text-center shadow-md">
                  <span className="text-xs font-black uppercase text-slate-200 block mb-1">Gravidade Específica (SG)</span>
                  <span className="font-black text-4xl text-emerald-400 font-mono">
                    {brixToSgResult.sg.toFixed(3)}
                  </span>
                </div>
              </div>
            )}

            {calcTab === 'ABV' && (
              <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-4">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Beer className="w-5 h-5 text-amber-400" />
                  Cálculo Direto de Teor Alcoólico (ABV)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-100 mb-1">OG (Densidade Inicial):</label>
                    <input
                      type="text"
                      value={calcAbvOg}
                      onChange={(e) => setCalcAbvOg(e.target.value)}
                      placeholder="1.054"
                      className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-3 py-3 text-lg font-black text-white text-center outline-none shadow-inner placeholder:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-100 mb-1">FG (Densidade Final):</label>
                    <input
                      type="text"
                      value={calcAbvFg}
                      onChange={(e) => setCalcAbvFg(e.target.value)}
                      placeholder="1.012"
                      className="w-full bg-slate-700 border-2 border-slate-400 focus:border-amber-400 rounded-2xl px-3 py-3 text-lg font-black text-white text-center outline-none shadow-inner placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="bg-slate-700 border-2 border-amber-400 p-4 rounded-2xl text-center space-y-1 shadow-md">
                  <span className="text-xs font-black uppercase text-amber-300 block">Teor Alcoólico Estimado</span>
                  <span className="font-black text-4xl text-amber-300 font-mono">
                    {abvDirectResult.abv.toFixed(2)}%
                  </span>
                  <div className="text-xs font-bold text-slate-200">
                    Atenuação Aparente: <strong className="text-white font-mono">{abvDirectResult.attenuation}%</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* BARRA INFERIOR DE NAVEGAÇÃO TOUCH GIGANTE (FINGER-FRIENDLY) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t-2 border-slate-700 px-2 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab('ENVASE')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'ENVASE' ? 'text-amber-400 font-black' : 'text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`p-2 rounded-2xl transition-all ${
              activeTab === 'ENVASE' ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg' : ''
            }`}
          >
            <Package className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold tracking-tight">Envases</span>
        </button>

        <button
          onClick={() => setActiveTab('BARRIS')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'BARRIS' ? 'text-amber-400 font-black' : 'text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`p-2 rounded-2xl transition-all ${
              activeTab === 'BARRIS' ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg' : ''
            }`}
          >
            <Cylinder className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold tracking-tight">Barris</span>
        </button>

        <button
          onClick={() => setActiveTab('TANQUES')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'TANQUES' ? 'text-amber-400 font-black' : 'text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`p-2 rounded-2xl transition-all ${
              activeTab === 'TANQUES' ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg' : ''
            }`}
          >
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold tracking-tight">Tanques</span>
        </button>

        <button
          onClick={() => setActiveTab('BRASSAGEM')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'BRASSAGEM' ? 'text-amber-400 font-black' : 'text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`p-2 rounded-2xl transition-all ${
              activeTab === 'BRASSAGEM' ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg' : ''
            }`}
          >
            <Flame className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold tracking-tight">Brassagem</span>
        </button>

        <button
          onClick={() => setActiveTab('TAREFAS')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 relative ${
            activeTab === 'TAREFAS' ? 'text-amber-400 font-black' : 'text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`p-2 rounded-2xl transition-all relative ${
              activeTab === 'TAREFAS' ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg' : ''
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            {(lateTasksCount > 0 || todayTasksCount > 0) && (
              <span
                className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white rounded-full flex items-center justify-center border-2 border-slate-900 shadow ${
                  lateTasksCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                }`}
              >
                {lateTasksCount > 0 ? lateTasksCount : todayTasksCount}
              </span>
            )}
          </div>
          <span className="text-xs font-bold tracking-tight">Tarefas</span>
        </button>

        <button
          onClick={() => setActiveTab('CALCULADORA')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'CALCULADORA' ? 'text-amber-400 font-black' : 'text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`p-2 rounded-2xl transition-all ${
              activeTab === 'CALCULADORA' ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg' : ''
            }`}
          >
            <Calculator className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold tracking-tight">Calculadora</span>
        </button>
      </nav>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE TAREFA */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-auto">
            {/* TOPO DO MODAL */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-base font-black text-white flex items-center gap-2">
                {editingTaskItem ? (
                  <>
                    <Edit2 className="w-5 h-5 text-amber-400" /> Editar Tarefa
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-amber-400" /> Nova Tarefa de Fábrica
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRESETS RÁPIDOS SE FOR NOVA TAREFA */}
            {!editingTaskItem && (
              <div>
                <span className="text-[11px] font-black uppercase text-slate-400 block mb-1.5">
                  Preencher com modelo rápido:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TASK_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setTaskFormTitle(preset.defaultTitle);
                        setTaskFormType(preset.type);
                        if (preset.defaultAmount) setTaskFormAmount(String(preset.defaultAmount));
                        if (preset.unit) setTaskFormUnit(preset.unit);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-400 text-[11px] font-black text-slate-200 hover:text-amber-300 active:scale-95 transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* FORMULÁRIO */}
            <div className="space-y-3">
              {/* SELEÇÃO DO TANQUE OU FÁBRICA */}
              <div>
                <label className="block text-xs font-black text-slate-200 mb-1">
                  Tanque ou Fábrica: *
                </label>
                <select
                  value={taskFormDestination}
                  onChange={(e) => setTaskFormDestination(e.target.value)}
                  className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3 text-sm font-black text-white outline-none shadow-inner"
                >
                  <option value="FABRICA" className="bg-slate-900 text-amber-300 font-bold">
                    🏭 Fábrica (Rotina da Fábrica)
                  </option>
                  {taskDestinations
                    .filter((d) => d.targetType === 'TANK')
                    .map((d) => (
                      <option key={d.id} value={d.id} className="bg-slate-900 text-white font-bold">
                        🏺 {d.label}
                      </option>
                    ))}
                </select>
              </div>

              {/* TÍTULO DA TAREFA */}
              <div>
                <label className="block text-xs font-black text-slate-200 mb-1">
                  Título / Ação: *
                </label>
                <input
                  type="text"
                  value={taskFormTitle}
                  onChange={(e) => setTaskFormTitle(e.target.value)}
                  placeholder="Ex: Dry Hopping Citra + Mosaic"
                  className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3.5 py-3 text-sm font-black text-white outline-none shadow-inner placeholder:text-slate-400"
                />
              </div>

              {/* TIPO DE TAREFA */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-black text-slate-200 mb-1">Tipo:</label>
                  <select
                    value={taskFormType}
                    onChange={(e) => setTaskFormType(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-2.5 text-xs font-black text-white outline-none shadow-inner"
                  >
                    <option value="DRY_HOPPING" className="bg-slate-900">🌿 Dry Hopping</option>
                    <option value="PURGE" className="bg-slate-900">🪣 Purga de Levedura</option>
                    <option value="COLD_CRASH" className="bg-slate-900">❄️ Cold Crash</option>
                    <option value="MEASUREMENT" className="bg-slate-900">🧪 Medição / Coleta</option>
                    <option value="CLARIFIER" className="bg-slate-900">✨ Clarificante / Gelatina</option>
                    <option value="ANTIOXIDANT" className="bg-slate-900">🛡️ Antioxidante</option>
                    <option value="OTHER" className="bg-slate-900">📋 Outro Procedimento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-200 mb-1">
                    Data Programada:
                  </label>
                  <input
                    type="date"
                    value={taskFormDueDate}
                    onChange={(e) => setTaskFormDueDate(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-2.5 text-xs font-black text-white outline-none shadow-inner"
                  />
                </div>
              </div>

              {/* ATALHOS RÁPIDOS DE DATA */}
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Atalhos de data:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate(0)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-bold text-amber-300"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate(1)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-bold text-slate-200"
                  >
                    Amanhã
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate(2)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-bold text-slate-200"
                  >
                    +2 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate(5)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-bold text-slate-200"
                  >
                    +5 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate(7)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-bold text-slate-200"
                  >
                    +7 dias
                  </button>
                </div>
              </div>

              {/* QUANTIDADE E UNIDADE */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-black text-slate-200 mb-1">
                    Quantidade (Opcional):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={taskFormAmount}
                    onChange={(e) => setTaskFormAmount(e.target.value)}
                    placeholder="Ex: 2.5"
                    className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-2.5 text-sm font-black text-white outline-none shadow-inner placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-200 mb-1">Unidade:</label>
                  <select
                    value={taskFormUnit}
                    onChange={(e) => setTaskFormUnit(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-2.5 text-xs font-black text-white outline-none shadow-inner"
                  >
                    <option value="KG" className="bg-slate-900">Quilos (KG)</option>
                    <option value="G" className="bg-slate-900">Gramas (G)</option>
                    <option value="L" className="bg-slate-900">Litros (L)</option>
                    <option value="ML" className="bg-slate-900">Mililitros (ML)</option>
                    <option value="UN" className="bg-slate-900">Unidades (UN)</option>
                  </select>
                </div>
              </div>

              {/* OBSERVAÇÕES */}
              <div>
                <label className="block text-xs font-black text-slate-200 mb-1">
                  Observações / Instruções Operacionais:
                </label>
                <textarea
                  rows={2}
                  value={taskFormNotes}
                  onChange={(e) => setTaskFormNotes(e.target.value)}
                  placeholder="Ex: Purgar lúpulo após 48h, manter pressão em 0.5 bar..."
                  className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl p-3 text-xs font-bold text-white outline-none shadow-inner placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition-all"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveTask}
                disabled={isSavingTask}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg border border-amber-300 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSavingTask ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    {editingTaskItem ? 'Salvar Alterações' : 'Salvar Tarefa'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
