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

type FabricaTab = 'ENVASE' | 'BARRIS' | 'TANQUES' | 'BRASSAGEM' | 'CALCULADORA';

export default function FabricaChaoDeFabricaPage() {
  const [activeTab, setActiveTab] = useState<FabricaTab>('ENVASE');
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Status feedback banner
  const [banner, setBanner] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // -------------------------------------------------------------
  // CARREGAR DADOS ESSENCIAIS (BATCHES, TANKS, RECIPES, USER)
  // -------------------------------------------------------------
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [batchesRes, tanksRes, recipesRes, userRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/tanks'),
        fetch('/api/recipes'),
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
      if (recipesRes.ok) {
        const data = await recipesRes.json();
        setRecipes(Array.isArray(data) ? data : []);
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

  const formatGravityDisplay = (sgVal: number | null | undefined, unit: 'SG' | 'BRIX' = measurementUnit) => {
    if (!sgVal || isNaN(sgVal) || sgVal <= 0) return '—';
    const brix = Math.round(sgToBrix(sgVal) * 10) / 10;
    if (unit === 'BRIX') {
      return `${brix.toFixed(1)} °Bx (${sgVal.toFixed(3)})`;
    }
    return `${sgVal.toFixed(3)} (${brix.toFixed(1)} °Bx)`;
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

  const [brewBatchNumber, setBrewBatchNumber] = useState<string>('');
  const [brewTargetTankId, setBrewTargetTankId] = useState<string>('');
  const [brewOgInput, setBrewOgInput] = useState<string>('1.054');
  const [brewPhMashInput, setBrewPhMashInput] = useState<string>('5.3');
  const [brewPhBoilInput, setBrewPhBoilInput] = useState<string>('5.1');
  const [brewTempMashInput, setBrewTempMashInput] = useState<string>('66');
  const [brewVolumeInput, setBrewVolumeInput] = useState<string>('500');
  const [brewNotesInput, setBrewNotesInput] = useState<string>('');
  const [isSavingBrew, setIsSavingBrew] = useState<boolean>(false);

  // Cronômetro da panela
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

  const selectedRecipeObj = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId) || null,
    [recipes, selectedRecipeId]
  );

  const handleSelectRecipeForBrew = (recId: string) => {
    setSelectedRecipeId(recId);
    const rec = recipes.find((r) => r.id === recId);
    if (rec) {
      if (rec.og) setBrewOgInput(String(rec.og));
      if (rec.targetPhMash) setBrewPhMashInput(String(rec.targetPhMash));
      if (rec.batchYieldLiters) setBrewVolumeInput(String(rec.batchYieldLiters));
      const year = new Date().getFullYear().toString().slice(-2);
      setBrewBatchNumber(`${rec.name.slice(0, 3).toUpperCase()}-${year}${String(batches.length + 1).padStart(2, '0')}`);
    }
  };

  const handleSaveBreweryData = async (moveToFermentation: boolean = false) => {
    setIsSavingBrew(true);
    try {
      const parsedOg = parseBreweryGravity(brewOgInput) || 1.050;
      const parsedVol = parseFloat(brewVolumeInput.replace(',', '.')) || 0;
      const parsedTemp = parseFloat(brewTempMashInput.replace(',', '.')) || 66;
      const parsedPhMash = brewPhMashInput ? parseFloat(brewPhMashInput.replace(',', '.')) : undefined;
      const parsedPhBoil = brewPhBoilInput ? parseFloat(brewPhBoilInput.replace(',', '.')) : undefined;

      if (brewMode === 'ACTIVE') {
        if (!selectedBrewBatch?.id) {
          showBanner('Selecione uma brassagem em andamento', 'error');
          return;
        }

        const res = await fetch(`/api/batches/${selectedBrewBatch.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            measuredOg: parsedOg,
            volumeProducedLiters: parsedVol > 0 ? parsedVol : undefined,
            tempMash: parsedTemp,
            phMash: parsedPhMash,
            phBoil: parsedPhBoil,
            status: moveToFermentation ? 'FERMENTANDO' : selectedBrewBatch.status,
            fermentationStartDate: moveToFermentation ? new Date() : undefined,
            notes: brewNotesInput ? brewNotesInput.trim() : undefined,
          }),
        });

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
          showBanner('Selecione a receita desejada', 'error');
          return;
        }
        if (!brewBatchNumber.trim()) {
          showBanner('Informe o número do lote (Ex: IPA-2601)', 'error');
          return;
        }

        const res = await fetch('/api/batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipeId: selectedRecipeId,
            batchNumber: brewBatchNumber.trim().toUpperCase(),
            tankId: brewTargetTankId || undefined,
            volumePlannedLiters: parsedVol > 0 ? parsedVol : selectedRecipeObj?.batchYieldLiters || 500,
            volumeProducedLiters: parsedVol > 0 ? parsedVol : undefined,
            measuredOg: parsedOg,
            tempMash: parsedTemp,
            phMash: parsedPhMash,
            phBoil: parsedPhBoil,
            status: moveToFermentation ? 'FERMENTANDO' : 'BRASSAGEM',
            notes: brewNotesInput ? brewNotesInput.trim() : undefined,
          }),
        });

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
  // 5. CALCULADORA CERVEJEIRA TOUCH
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
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl active:scale-90 transition-all border-2 border-slate-600 shadow"
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

                <div className="flex bg-slate-800 p-1 rounded-xl border-2 border-slate-700">
                  <button
                    onClick={() => setEnvaseSourceType('BATCH')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                      envaseSourceType === 'BATCH'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Por Lote / TQ
                  </button>
                  <button
                    onClick={() => setEnvaseSourceType('QUICK')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                      envaseSourceType === 'QUICK'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Avulso
                  </button>
                </div>
              </div>

              {envaseSourceType === 'BATCH' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wide">
                    Tanque / Lote em Linha:
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base font-bold text-white outline-none shadow-inner"
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
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wide">
                    Nome da Cerveja / Chopp:
                  </label>
                  <input
                    type="text"
                    value={quickBeerName}
                    onChange={(e) => setQuickBeerName(e.target.value)}
                    placeholder="Ex: IPA Galaxy, Pilsen Extra..."
                    className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base font-bold text-white outline-none"
                  />
                </div>
              )}

              <div className="pt-2 border-t-2 border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsPartialFill(!isPartialFill)}
                  className={`flex items-center gap-2 text-xs font-black px-3.5 py-2.5 rounded-xl border-2 transition-all ${
                    isPartialFill
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                      : 'bg-slate-800 text-slate-300 border-slate-600'
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
                      className="w-20 bg-slate-800 border-2 border-amber-400 rounded-xl px-2 py-1.5 text-base font-black text-center text-amber-400 outline-none"
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
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setKegSubMode('WASH')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-md ${
                  kegSubMode === 'WASH'
                    ? 'bg-emerald-600 border-emerald-400 text-white font-black'
                    : 'bg-slate-900 border-slate-700 text-slate-300 font-bold'
                }`}
              >
                <div className="text-2xl">🧼</div>
                <span className="text-sm text-center">Higienizar / Lavar</span>
              </button>

              <button
                onClick={() => setKegSubMode('REGISTER')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-md ${
                  kegSubMode === 'REGISTER'
                    ? 'bg-amber-500 border-amber-300 text-slate-950 font-black'
                    : 'bg-slate-900 border-slate-700 text-slate-300 font-bold'
                }`}
              >
                <div className="text-2xl">➕</div>
                <span className="text-sm text-center">Cadastrar Novo</span>
              </button>

              <button
                onClick={() => setKegSubMode('LOOKUP')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-md ${
                  kegSubMode === 'LOOKUP'
                    ? 'bg-blue-600 border-blue-400 text-white font-black'
                    : 'bg-slate-900 border-slate-700 text-slate-300 font-bold'
                }`}
              >
                <div className="text-2xl">🔍</div>
                <span className="text-sm text-center">Consultar Barril</span>
              </button>

              <button
                onClick={() => setKegSubMode('MAINTENANCE')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-md ${
                  kegSubMode === 'MAINTENANCE'
                    ? 'bg-rose-600 border-rose-400 text-white font-black'
                    : 'bg-slate-900 border-slate-700 text-slate-300 font-bold'
                }`}
              >
                <div className="text-2xl">🛠️</div>
                <span className="text-sm text-center">Manutenção</span>
              </button>
            </div>

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
                    className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-lg font-black text-white outline-none tracking-wider font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-2 uppercase">Capacidade:</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[20, 30, 50].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setNewKegCapacity(cap)}
                        className={`py-3.5 rounded-2xl font-black text-lg border-2 transition-all active:scale-95 ${
                          newKegCapacity === cap
                            ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-lg scale-105'
                            : 'bg-slate-800 border-slate-600 text-slate-200'
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
                    <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-blue-500 text-white">
                      Barril Encontrado
                    </span>
                    <h3 className="font-black text-2xl text-white font-mono mt-1">{kegLookupResult.code}</h3>
                  </div>
                  <span className="text-base font-black px-4 py-1.5 rounded-xl bg-slate-800 text-amber-300 border border-slate-700">
                    {kegLookupResult.capacity} Litros
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs pt-2 border-t-2 border-slate-800">
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <span className="text-slate-300 block text-xs font-bold uppercase">Status:</span>
                    <span className="font-black text-base text-amber-400">{kegLookupResult.status}</span>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <span className="text-slate-300 block text-xs font-bold uppercase">Chopp Atual:</span>
                    <span className="font-black text-base text-white">
                      {kegLookupResult.currentBeerName || 'Vazio / Nenhum'}
                    </span>
                  </div>
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
                              <span className="px-3 py-1 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md">
                                <AlertCircle className="w-4 h-4 text-slate-950" />
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
                              isOccupied ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 border border-slate-700'
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
                            className={`py-2 px-2 rounded-xl text-xs font-black border-2 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow ${
                              purgaAlert
                                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-400/40'
                                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-600'
                            }`}
                          >
                            <Wind className="w-4 h-4" />
                            {purgaAlert ? '⚠️ FAZER PURGA' : 'Sinalizar Purga'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleToggleTankAlert(tank, 'CO2', e)}
                            className={`py-2 px-2 rounded-xl text-xs font-black border-2 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow ${
                              co2Alert
                                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md ring-2 ring-cyan-400/40'
                                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-600'
                            }`}
                          >
                            <Droplet className="w-4 h-4" />
                            {co2Alert ? '⚠️ BATER CO2' : 'Sinalizar CO2'}
                          </button>
                        </div>

                        {isOccupied ? (
                          <div className="space-y-2 pt-2 border-t-2 border-slate-800">
                            <div className="flex items-center justify-between">
                              <div className="font-black text-base text-amber-300 truncate max-w-[210px]">
                                {beerName}
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-300">#{batchNumber}</span>
                            </div>

                            {/* PAINEL DE DENSIDADES E METAS COM ALTO CONTRASTE */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-2xl border-2 border-slate-800 text-center">
                              <div>
                                <span className="block text-[11px] uppercase font-bold text-slate-300">OG Inicial</span>
                                <span className="text-sm font-black text-white font-mono">
                                  {m.og ? (measurementUnit === 'BRIX' ? `${(Math.round(sgToBrix(m.og) * 10) / 10).toFixed(1)}°Bx` : m.og.toFixed(3)) : '—'}
                                </span>
                              </div>
                              <div className="border-x-2 border-slate-800">
                                <span className="block text-[11px] uppercase font-bold text-amber-400">Meta FG</span>
                                <span className="text-sm font-black text-amber-400 font-mono">
                                  {m.targetFg ? (measurementUnit === 'BRIX' ? `${(Math.round(sgToBrix(m.targetFg) * 10) / 10).toFixed(1)}°Bx` : m.targetFg.toFixed(3)) : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] uppercase font-bold text-emerald-400">ABV Atual</span>
                                <span className="text-sm font-black text-emerald-400 font-mono">
                                  {m.currentAbv ? `${m.currentAbv}%` : '—'}
                                </span>
                                {m.targetAbv && (
                                  <span className="text-[10px] text-slate-400 block">Alvo: {m.targetAbv}%</span>
                                )}
                              </div>
                            </div>

                            {/* BARRA DE PROGRESSO VISUAL DA FERMENTAÇÃO */}
                            {m.targetFg && m.og && (
                              <div className="space-y-1 pt-0.5">
                                <div className="flex justify-between text-xs font-bold text-slate-200">
                                  <span>
                                    {m.currentGravity
                                      ? `Atual: ${m.currentGravity.toFixed(3)} SG (${(Math.round(sgToBrix(m.currentGravity) * 10) / 10).toFixed(1)} °Bx)`
                                      : 'Sem medição'}
                                  </span>
                                  <span className="text-amber-300 font-black">
                                    {m.pointsRemaining > 0
                                      ? `Faltam ${m.pointsRemaining} pts p/ FG`
                                      : 'Meta FG Atingida! 🎉'}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                                  <div
                                    className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${m.progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-slate-400 py-1">Tanque Livre / Disponível</div>
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
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t-2 border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleToggleTankAlert(selectedTankForDetails, 'PURGA')}
                      className={`py-3 rounded-2xl text-xs font-black border-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow ${
                        hasPurgaAlert(selectedTankForDetails)
                          ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/50'
                          : 'bg-slate-800 text-slate-200 border-slate-600'
                      }`}
                    >
                      <Wind className="w-5 h-5" />
                      {hasPurgaAlert(selectedTankForDetails) ? '⚠️ ALERTA: FAZER PURGA ATIVO' : 'Sinalizar Alerta de Purga'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleTankAlert(selectedTankForDetails, 'CO2')}
                      className={`py-3 rounded-2xl text-xs font-black border-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow ${
                        hasCo2Alert(selectedTankForDetails)
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300 ring-2 ring-cyan-400/50'
                          : 'bg-slate-800 text-slate-200 border-slate-600'
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
                      <div className="space-y-3 pt-2 border-t-2 border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                            <Target className="w-4 h-4" /> Parâmetros & Metas do Lote
                          </span>
                          <button
                            type="button"
                            onClick={() => openEditTargetsModal(batch)}
                            className="flex items-center gap-1.5 text-xs font-black text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 rounded-xl border border-amber-500/30 active:scale-95 transition-all shadow-sm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Editar OG / Meta FG
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                          <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700">
                            <span className="text-[11px] text-slate-300 uppercase font-bold block">OG Inicial</span>
                            <span className="text-sm font-black text-white font-mono">
                              {formatGravityDisplay(og)}
                            </span>
                          </div>

                          <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700">
                            <span className="text-[11px] text-amber-400 uppercase font-bold block">Objetivo (Meta FG)</span>
                            <span className="text-sm font-black text-amber-400 font-mono">
                              {formatGravityDisplay(targetFg)}
                            </span>
                          </div>

                          <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700">
                            <span className="text-[11px] text-cyan-400 uppercase font-bold block">Densidade Atual</span>
                            <span className="text-sm font-black text-cyan-300 font-mono">
                              {curGrav ? formatGravityDisplay(curGrav) : 'Sem medição'}
                            </span>
                          </div>

                          <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700">
                            <span className="text-[11px] text-emerald-400 uppercase font-bold block">Teor Alcoólico (ABV)</span>
                            <span className="text-base font-black text-emerald-400 font-mono">
                              {curAbv ? `${curAbv}%` : '—'}
                            </span>
                            {targetAbv && (
                              <span className="text-[10px] text-slate-400 block font-medium">Meta: {targetAbv}%</span>
                            )}
                          </div>
                        </div>

                        {att !== null && (
                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-bold flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-amber-400" /> Atenuação Atual:
                            </span>
                            <span className="font-mono font-black text-emerald-400">{att}%</span>
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
                      <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleMeasurementUnitChange('SG')}
                          className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                            measurementUnit === 'SG' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300'
                          }`}
                        >
                          SG
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMeasurementUnitChange('BRIX')}
                          className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                            measurementUnit === 'BRIX' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300'
                          }`}
                        >
                          Brix
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-200 mb-1">
                          {measurementUnit === 'SG' ? 'Densidade (SG):' : 'Leitura Refratômetro (°Bx):'}
                        </label>
                        <input
                          type="text"
                          value={measurementGravityInput}
                          onChange={(e) => setMeasurementGravityInput(e.target.value)}
                          placeholder={measurementUnit === 'SG' ? '1.020' : '7.5'}
                          className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3 text-base font-black text-white text-center outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-200 mb-1">
                          Temperatura (°C):
                        </label>
                        <input
                          type="text"
                          value={measurementTemp}
                          onChange={(e) => setMeasurementTemp(e.target.value)}
                          placeholder="18.5"
                          className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3 text-base font-black text-white text-center outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">pH (Opcional):</label>
                      <input
                        type="text"
                        value={measurementPh}
                        onChange={(e) => setMeasurementPh(e.target.value)}
                        placeholder="Ex: 4.4"
                        className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-2.5 text-sm font-bold text-white text-center outline-none"
                      />
                    </div>

                    {/* PRÉVIA EM TEMPO REAL DO TEOR ALCOÓLICO (ABV) */}
                    {liveMeasurementPreview && (
                      <div className="bg-emerald-950/40 border-2 border-emerald-500/60 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-lg animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-pulse" />
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                              Prévia em Tempo Real:
                            </span>
                            <span className="text-sm font-black text-white">
                              Teor Alcoólico:{' '}
                              <strong className="text-emerald-400 font-mono text-base">
                                {liveMeasurementPreview.abv}% ABV
                              </strong>
                              <span className="text-slate-300 font-normal ml-2">
                                | Atenuação: <strong className="text-white font-mono">{liveMeasurementPreview.att}%</strong>
                              </span>
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-xl border border-emerald-500/40">
                          {liveMeasurementPreview.sg.toFixed(3)} SG / {liveMeasurementPreview.brix.toFixed(1)} °Bx
                        </span>
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

                {/* HISTÓRICO DE MEDIÇÕES DO LOTE */}
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

                      <div className="space-y-2">
                        {logs.slice().reverse().map((log: any, rIdx: number) => {
                          const origIndex = logs.length - 1 - rIdx;
                          const logSg = log.gravity;
                          const logAbv = log.abv ?? (og && logSg && og > logSg ? Math.round(calculateAbv(og, logSg) * 10) / 10 : null);
                          const brixVal = log.rawInputBrix ? `${log.rawInputBrix.toFixed(1)} °Bx` : logSg ? `${(Math.round(sgToBrix(logSg) * 10) / 10).toFixed(1)} °Bx` : '—';

                          return (
                            <div
                              key={log.id || origIndex}
                              className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-300">
                                    {formatDateShort(log.date)}
                                  </span>
                                  {log.tempCelsius !== undefined && (
                                    <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                                      {log.tempCelsius}°C
                                    </span>
                                  )}
                                  {log.ph !== undefined && log.ph !== null && (
                                    <span className="font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                                      pH {log.ph}
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-300 font-mono text-[11px]">
                                  {logSg ? `${logSg.toFixed(3)} SG` : '—'} ({brixVal})
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {logAbv !== null && logAbv !== undefined && (
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">ABV</span>
                                    <span className="text-sm font-black text-emerald-400 font-mono">
                                      {logAbv}%
                                    </span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMeasurementLog(origIndex)}
                                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
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
                      <div className="bg-slate-800 border-2 border-amber-500/60 rounded-2xl p-4 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-amber-300">➕ Criar Nova Tarefa</span>
                          <button
                            type="button"
                            onClick={() => setIsAddTaskModalOpen(false)}
                            className="text-slate-400 hover:text-white"
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
                              className="px-2.5 py-1 text-xs font-bold bg-slate-900 text-slate-200 hover:text-amber-400 rounded-lg border border-slate-700 active:scale-95"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-200 mb-1">
                            Título da Tarefa:
                          </label>
                          <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Ex: Fazer Dry Hopping de 2kg de Citra"
                            className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-200 mb-1">
                            Data Prevista:
                          </label>
                          <input
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-400"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleAddNewTask}
                          disabled={isSavingNewTask || !newTaskTitle.trim()}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-5 h-5" />
                          Salvar Tarefa no Lote
                        </button>
                      </div>
                    )}

                    {/* MODAL / INPUT PARA EDITAR DATA DE REALIZAÇÃO RETROATIVA */}
                    {editingTaskIndex !== null && (
                      <div className="bg-slate-800 border-2 border-emerald-500 rounded-2xl p-4 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-emerald-300">
                            ✏️ Alterar Data de Realização
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingTaskIndex(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-300">
                          Se você já havia feito este trabalho e esqueceu de anotar no dia, selecione a data real abaixo:
                        </p>
                        <input
                          type="date"
                          value={editCompletionDate}
                          onChange={(e) => setEditCompletionDate(e.target.value)}
                          className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-500"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveTaskCompletionDate}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all shadow"
                          >
                            Confirmar Data
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskIndex(null)}
                            className="px-4 py-2.5 bg-slate-700 text-slate-200 font-bold text-xs rounded-xl"
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
                          <p className="text-xs font-bold text-slate-400 italic py-2">
                            Nenhuma tarefa cadastrada. Toque em &quot;Nova Tarefa&quot; acima para adicionar.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-2.5">
                          {tasks.map((task, idx) => (
                            <div
                              key={idx}
                              className={`w-full p-4 rounded-2xl border-2 flex flex-col gap-2 transition-all ${
                                task.completed
                                  ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                                  : 'bg-slate-800/90 border-slate-700 text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTankTask(idx)}
                                  className="flex items-center gap-3 text-left flex-1"
                                >
                                  {task.completed ? (
                                    <CheckSquare className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                                  ) : (
                                    <Square className="w-6 h-6 text-slate-400 flex-shrink-0" />
                                  )}
                                  <div>
                                    <div
                                      className={`font-black text-base ${
                                        task.completed ? 'line-through text-slate-400' : 'text-white'
                                      }`}
                                    >
                                      {task.title}
                                    </div>
                                    <div className="text-xs font-bold text-slate-300">
                                      Previsto: {formatDateShort(task.dueDate)}
                                    </div>
                                  </div>
                                </button>

                                <span
                                  className={`text-xs font-black uppercase px-2.5 py-1 rounded-md ${
                                    task.completed
                                      ? 'bg-emerald-500 text-slate-950 font-black'
                                      : 'bg-amber-500 text-slate-950 font-black'
                                  }`}
                                >
                                  {task.completed ? 'Feito' : 'Pendente'}
                                </span>
                              </div>

                              {task.completed && (
                                <div className="flex items-center justify-between pt-2 border-t border-slate-700 text-xs text-slate-300">
                                  <span>
                                    Realizado em:{' '}
                                    <strong className="text-emerald-400 font-mono">
                                      {formatDateShort(task.completedAt || task.dueDate)}
                                    </strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTaskIndex(idx);
                                      setEditCompletionDate(task.completedAt || getLocalDateString());
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-black text-amber-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-600"
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

                  {/* SELETOR DE UNIDADE NO MODAL */}
                  <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold text-slate-300">Unidade para edição:</span>
                    <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleEditTargetsUnitChange('SG')}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                          editTargetsUnit === 'SG' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300'
                        }`}
                      >
                        SG (1.xxx)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditTargetsUnitChange('BRIX')}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                          editTargetsUnit === 'BRIX' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300'
                        }`}
                      >
                        Brix (°Bx)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        OG Inicial {editTargetsUnit === 'SG' ? '(ex: 1.050)' : '(ex: 12.4 °Bx)'}:
                      </label>
                      <input
                        type="text"
                        value={editOgInput}
                        onChange={(e) => setEditOgInput(e.target.value)}
                        placeholder={editTargetsUnit === 'SG' ? '1.050' : '12.4'}
                        className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3 text-base font-black text-white text-center outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-amber-400 mb-1">
                        Objetivo FG (Meta da Receita) {editTargetsUnit === 'SG' ? '(ex: 1.010)' : '(ex: 2.6 °Bx)'}:
                      </label>
                      <input
                        type="text"
                        value={editTargetFgInput}
                        onChange={(e) => setEditTargetFgInput(e.target.value)}
                        placeholder={editTargetsUnit === 'SG' ? '1.010' : '2.6'}
                        className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3 text-base font-black text-amber-400 text-center outline-none"
                      />
                    </div>
                  </div>

                  {/* PREVIEW DO TEOR ALCOÓLICO ESPERADO */}
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
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-center space-y-1">
                          <span className="text-[11px] font-bold text-amber-400 block uppercase">
                            Previsão com estas metas:
                          </span>
                          <span className="text-sm font-black text-white">
                            ABV Alvo: <strong className="text-emerald-400 text-base font-mono">{expAbv}%</strong> | Atenuação Alvo: <strong className="text-white font-mono">{expAtt}%</strong>
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
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-sm rounded-2xl border border-slate-700 transition-all"
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
                <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-lg text-white flex items-center gap-2">
                        <Cylinder className="w-5 h-5 text-amber-400" />
                        Alterar Status: {statusSelectTank.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Status atual:{' '}
                        <strong className="text-amber-400 uppercase">
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
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block pt-1">
                      {statusSelectTank.activeBatch ? 'Etapas de Produção / Lote no Tanque:' : 'Status Operacional do Tanque:'}
                    </span>

                    {[
                      { key: 'FERMENTANDO', label: 'Fermentando', badgeColor: 'bg-amber-500 text-slate-950', desc: 'Fermentação ativa no tanque com controle de temperatura' },
                      { key: 'MATURANDO', label: 'Maturando', badgeColor: 'bg-purple-500 text-white', desc: 'Cold crash, descanso diacetil ou maturação a frio' },
                      { key: 'PRONTO_ENVASE', label: 'Pronto p/ Envase', badgeColor: 'bg-emerald-500 text-slate-950', desc: 'Cerveja finalizada, carbonatada e pronta para barril/lata' },
                      { key: 'BRASSAGEM', label: 'Brassagem', badgeColor: 'bg-orange-500 text-white', desc: 'Lote recém brassado / transferindo para tanque' },
                      { key: 'ENVASADO', label: 'Envasado', badgeColor: 'bg-blue-500 text-white', desc: 'Lote já envasado em barris / garrafas' },
                      { key: 'HIGIENIZANDO', label: 'Higienizando / CIP', badgeColor: 'bg-cyan-500 text-slate-950', desc: 'Tanque em processo de lavagem ou sanitização' },
                      { key: 'MANUTENCAO', label: 'Manutenção', badgeColor: 'bg-rose-500 text-white', desc: 'Válvula, vedação ou camisa em manutenção' },
                      { key: 'LIVRE', label: 'Livre / Disponível', badgeColor: 'bg-slate-700 text-slate-200', desc: 'Tanque limpo e vazio pronto para nova brassagem' },
                      ...(statusSelectTank.activeBatch ? [
                        { key: 'FINALIZADO', label: 'Finalizado (Liberar Tanque)', badgeColor: 'bg-slate-600 text-white', desc: 'Conclui este lote e libera o tanque como LIVRE' },
                      ] : []),
                    ].map((st) => {
                      const isCurrent = (statusSelectTank.activeBatch?.status || statusSelectTank.status) === st.key;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleChangeTankStatus(statusSelectTank, st.key)}
                          className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 active:scale-98 ${
                            isCurrent
                              ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30'
                              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${st.badgeColor}`}>
                                {st.label}
                              </span>
                              {isCurrent && (
                                <span className="text-[11px] font-bold text-amber-400">✓ Atual</span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 block mt-1">{st.desc}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setStatusSelectTank(null)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-sm rounded-2xl border border-slate-700 transition-all"
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
            {/* Cronômetro Rápido da Panela */}
            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Cronômetro de Fervura / Mostura
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(0);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-white"
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
                  className={`flex-1 py-3.5 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                    isTimerRunning
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isTimerRunning ? 'Pausar' : 'Iniciar Contagem'}
                </button>
              </div>
            </div>

            {/* SELEÇÃO: EM ANDAMENTO VS INICIAR DE RECEITA DO SISTEMA */}
            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  Brassagem do Dia
                </h2>

                <div className="flex bg-slate-800 p-1 rounded-xl border-2 border-slate-700">
                  <button
                    type="button"
                    onClick={() => setBrewMode('ACTIVE')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                      brewMode === 'ACTIVE' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300'
                    }`}
                  >
                    Em Andamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrewMode('NEW_RECIPE')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                      brewMode === 'NEW_RECIPE' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300'
                    }`}
                  >
                    + De Receita
                  </button>
                </div>
              </div>

              {brewMode === 'ACTIVE' ? (
                activeBrewBatches.length === 0 ? (
                  <div className="text-center py-5 space-y-2.5">
                    <p className="text-sm font-bold text-slate-300">
                      Nenhuma brassagem marcada como &apos;BRASSAGEM&apos; ativa.
                    </p>
                    <button
                      type="button"
                      onClick={() => setBrewMode('NEW_RECIPE')}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-md"
                    >
                      Iniciar Brassagem a partir de Receita
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase">
                      Selecione a Brassagem Ativa:
                    </label>
                    <select
                      value={selectedBrewBatch?.id || ''}
                      onChange={(e) => {
                        const found = activeBrewBatches.find((b) => b.id === e.target.value);
                        setSelectedBrewBatch(found || null);
                        if (found) {
                          if (found.measuredOg) setBrewOgInput(String(found.measuredOg));
                          else if (found.recipe?.og) setBrewOgInput(String(found.recipe.og));
                          if (found.volumePlannedLiters) setBrewVolumeInput(String(found.volumePlannedLiters));
                          if (found.phMash) setBrewPhMashInput(String(found.phMash));
                          if (found.phBoil) setBrewPhBoilInput(String(found.phBoil));
                          if (found.tempMash) setBrewTempMashInput(String(found.tempMash));
                        }
                      }}
                      className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base font-bold text-white outline-none"
                    >
                      <option value="">-- Escolha o Lote --</option>
                      {activeBrewBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.recipe?.name} (Lote #{b.batchNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                )
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase">
                      Escolha uma Receita do Catálogo:
                    </label>
                    <select
                      value={selectedRecipeId}
                      onChange={(e) => handleSelectRecipeForBrew(e.target.value)}
                      className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base font-bold text-white outline-none"
                    >
                      <option value="">-- Selecionar Receita --</option>
                      {recipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} — {r.style} (OG: {r.og || '1.050'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedRecipeObj && (
                    <div className="bg-slate-800 p-3.5 rounded-2xl border-2 border-slate-700 text-xs space-y-1.5">
                      <div className="font-black text-base text-amber-300">{selectedRecipeObj.name}</div>
                      <div className="text-slate-300 font-bold">
                        Estilo: {selectedRecipeObj.style} • Rendimento:{' '}
                        {selectedRecipeObj.batchYieldLiters || 500}L
                      </div>
                      <div className="flex gap-4 pt-1 font-mono text-xs text-white font-bold">
                        <span>OG Alvo: {selectedRecipeObj.og || '—'}</span>
                        <span>FG Alvo: {selectedRecipeObj.fg || '—'}</span>
                        <span>pH Mostura: {selectedRecipeObj.targetPhMash || '5.3'}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1 uppercase">
                        Número do Lote:
                      </label>
                      <input
                        type="text"
                        value={brewBatchNumber}
                        onChange={(e) => setBrewBatchNumber(e.target.value.toUpperCase())}
                        placeholder="Ex: IPA-2601"
                        className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3 text-base font-black text-white text-center font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1 uppercase">
                        Tanque Destino:
                      </label>
                      <select
                        value={brewTargetTankId}
                        onChange={(e) => setBrewTargetTankId(e.target.value)}
                        className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3 text-sm font-bold text-white outline-none"
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

              {/* FORMULÁRIO DE MEDIÇÕES DA BRASSAGEM COM ALTA LEGIBILIDADE */}
              {(selectedBrewBatch || (brewMode === 'NEW_RECIPE' && selectedRecipeId)) && (
                <div className="pt-3 border-t-2 border-slate-800 space-y-3.5">
                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-400">
                    🔬 Medições & Parâmetros da Brassagem
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        OG Medida (Pós-Fervura):
                      </label>
                      <input
                        type="text"
                        value={brewOgInput}
                        onChange={(e) => setBrewOgInput(e.target.value)}
                        placeholder="1.054"
                        className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3 text-lg font-black text-white text-center font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        Volume no Fermentador (L):
                      </label>
                      <input
                        type="text"
                        value={brewVolumeInput}
                        onChange={(e) => setBrewVolumeInput(e.target.value)}
                        placeholder="520"
                        className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3 text-lg font-black text-white text-center font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        pH Mostura:
                      </label>
                      <input
                        type="text"
                        value={brewPhMashInput}
                        onChange={(e) => setBrewPhMashInput(e.target.value)}
                        placeholder="5.3"
                        className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-2 py-2.5 text-base font-black text-white text-center outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        pH Fervura:
                      </label>
                      <input
                        type="text"
                        value={brewPhBoilInput}
                        onChange={(e) => setBrewPhBoilInput(e.target.value)}
                        placeholder="5.1"
                        className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-2 py-2.5 text-base font-black text-white text-center outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        Temp Mostura (°C):
                      </label>
                      <input
                        type="text"
                        value={brewTempMashInput}
                        onChange={(e) => setBrewTempMashInput(e.target.value)}
                        placeholder="66.5"
                        className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-2 py-2.5 text-base font-black text-white text-center outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Anotações da Brassagem:
                    </label>
                    <input
                      type="text"
                      value={brewNotesInput}
                      onChange={(e) => setBrewNotesInput(e.target.value)}
                      placeholder="Ex: Whirlpool a 80°C, mosto límpido..."
                      className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-2.5 text-sm text-white outline-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveBreweryData(false)}
                      disabled={isSavingBrew}
                      className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-sm rounded-2xl border-2 border-slate-600 transition-all active:scale-95 shadow"
                    >
                      Salvar Medições
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveBreweryData(true)}
                      disabled={isSavingBrew}
                      className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
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
        {/* 5. MÓDULO CALCULADORA CERVEJEIRA TOUCH */}
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
                    <label className="block text-xs font-bold text-slate-200 mb-1">OG Inicial (SG):</label>
                    <input
                      type="text"
                      value={calcOgSg}
                      onChange={(e) => setCalcOgSg(e.target.value)}
                      placeholder="1.054"
                      className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3.5 text-lg font-black text-white text-center outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Brix Lido no Refratômetro:
                    </label>
                    <input
                      type="text"
                      value={calcCurrentBrix}
                      onChange={(e) => setCalcCurrentBrix(e.target.value)}
                      placeholder="6.5"
                      className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3.5 text-lg font-black text-amber-400 text-center outline-none"
                    />
                  </div>
                </div>

                {refractometerResults && (
                  <div className="pt-2 grid grid-cols-2 gap-3">
                    <div className="bg-slate-800 border-2 border-slate-700 p-4 rounded-2xl text-center shadow">
                      <span className="text-xs font-black uppercase text-slate-300 block">FG Real Corrigida</span>
                      <span className="font-black text-3xl text-emerald-400 font-mono">
                        {refractometerResults.fgSg.toFixed(3)}
                      </span>
                    </div>

                    <div className="bg-slate-800 border-2 border-slate-700 p-4 rounded-2xl text-center shadow">
                      <span className="text-xs font-black uppercase text-slate-300 block">Teor Alcoólico</span>
                      <span className="font-black text-3xl text-amber-400 font-mono">
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
                    <label className="block text-xs font-bold text-slate-200 mb-1">Leitura SG:</label>
                    <input
                      type="text"
                      value={calcHydroSg}
                      onChange={(e) => setCalcHydroSg(e.target.value)}
                      placeholder="1.050"
                      className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-2 py-3 text-base font-black text-white text-center outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">Temp Amostra (°C):</label>
                    <input
                      type="text"
                      value={calcHydroTemp}
                      onChange={(e) => setCalcHydroTemp(e.target.value)}
                      placeholder="28"
                      className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-2 py-3 text-base font-black text-amber-400 text-center outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">Calibragem (°C):</label>
                    <input
                      type="text"
                      value={calcCalibTemp}
                      onChange={(e) => setCalcCalibTemp(e.target.value)}
                      placeholder="20"
                      className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-2 py-3 text-base font-black text-white text-center outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-800 border-2 border-slate-700 p-4 rounded-2xl text-center space-y-1 shadow">
                  <span className="text-xs font-black uppercase text-slate-300 block">
                    Densidade Corrigida a {calcCalibTemp}°C
                  </span>
                  <span className="font-black text-3xl text-emerald-400 font-mono">
                    {hydrometerResults.correctedSg.toFixed(3)} SG
                  </span>
                  <div className="text-xs font-bold text-slate-300">
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
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase">
                    Valor em Graus Brix (°Bx) / Plato:
                  </label>
                  <input
                    type="text"
                    value={calcRawBrix}
                    onChange={(e) => setCalcRawBrix(e.target.value)}
                    placeholder="13.0"
                    className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-2xl font-black text-amber-400 text-center outline-none"
                  />
                </div>

                <div className="bg-slate-800 border-2 border-slate-700 p-4 rounded-2xl text-center shadow">
                  <span className="text-xs font-black uppercase text-slate-300 block">Gravidade Específica (SG)</span>
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
                    <label className="block text-xs font-bold text-slate-200 mb-1">OG (Densidade Inicial):</label>
                    <input
                      type="text"
                      value={calcAbvOg}
                      onChange={(e) => setCalcAbvOg(e.target.value)}
                      placeholder="1.054"
                      className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3 text-base font-black text-white text-center outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">FG (Densidade Final):</label>
                    <input
                      type="text"
                      value={calcAbvFg}
                      onChange={(e) => setCalcAbvFg(e.target.value)}
                      placeholder="1.012"
                      className="w-full bg-slate-800 border-2 border-slate-600 focus:border-amber-400 rounded-2xl px-3 py-3 text-base font-black text-white text-center outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-800 border-2 border-slate-700 p-4 rounded-2xl text-center space-y-1 shadow">
                  <span className="text-xs font-black uppercase text-slate-300 block">Teor Alcoólico Estimado</span>
                  <span className="font-black text-4xl text-amber-400 font-mono">
                    {abvDirectResult.abv.toFixed(2)}%
                  </span>
                  <div className="text-xs font-bold text-slate-300">
                    Atenuação Aparente: <strong className="text-white">{abvDirectResult.attenuation}%</strong>
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
    </div>
  );
}
