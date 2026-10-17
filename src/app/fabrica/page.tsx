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
  Edit2,
  Wind,
  CheckCircle,
  TrendingDown,
  Target,
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
  // 3. MÓDULO DE TANQUES & ADEGA (COM PURGA, CO2, OG, TARGET FG E TAREFAS)
  // -------------------------------------------------------------
  const [selectedTankForDetails, setSelectedTankForDetails] = useState<any | null>(null);
  const [measurementGravityInput, setMeasurementGravityInput] = useState<string>('1.020');
  const [measurementUnit, setMeasurementUnit] = useState<'SG' | 'BRIX'>('SG');
  const [measurementTemp, setMeasurementTemp] = useState<string>('18.0');
  const [measurementPh, setMeasurementPh] = useState<string>('');
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false);

  // Estados para Adicionar Nova Tarefa de Adega
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(getLocalDateString());
  const [isSavingNewTask, setIsSavingNewTask] = useState(false);

  // Estado para Edição de Data de Realização de Tarefa
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [editCompletionDate, setEditCompletionDate] = useState<string>(getLocalDateString());

  // Utilitários para Purga e CO2 armazenados no campo notes do Tanque
  const isTankPurged = (tank: any) => Boolean(tank.notes?.includes('[PURGA:OK]'));
  const isTankCo2 = (tank: any) => Boolean(tank.notes?.includes('[CO2:OK]'));

  const handleToggleTankFlag = async (tank: any, flag: 'PURGA' | 'CO2', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentNotes = tank.notes || '';
    const token = `[${flag}:OK]`;
    const isSet = currentNotes.includes(token);
    const newNotes = isSet ? currentNotes.replace(token, '').trim() : `${currentNotes} ${token}`.trim();

    playFeedback('click');

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
            ? `Tanque ${tank.name}: Purga desmarcada`
            : `💨 Tanque ${tank.name}: PURGA marcada com sucesso!`
          : isSet
          ? `Tanque ${tank.name}: CO2 desmarcado`
          : `🫧 Tanque ${tank.name}: Pressurização CO2 marcada com sucesso!`,
        'info'
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

      // Calcular dados de fermentação (OG, Meta FG, Densidade Atual, ABV e Atenuação)
      const og = activeBatch?.measuredOg || activeBatch?.recipe?.og || null;
      const targetFg = activeBatch?.recipe?.fg || null;

      let currentGravity = activeBatch?.measuredFg || null;
      let lastLogTemp: number | null = null;
      try {
        if (activeBatch?.fermentationLogsJson) {
          const logs = JSON.parse(activeBatch.fermentationLogsJson);
          if (Array.isArray(logs) && logs.length > 0) {
            const last = logs[logs.length - 1];
            if (last.gravity) currentGravity = last.gravity;
            if (last.tempCelsius !== undefined) lastLogTemp = last.tempCelsius;
          }
        }
      } catch {}

      // ABV em tempo real
      let currentAbv = activeBatch?.measuredAbv || null;
      if (og && currentGravity && og > currentGravity) {
        currentAbv = Math.round(calculateAbv(og, currentGravity) * 10) / 10;
      }

      // Progresso da atenuação em direção à FG Alvo
      let progressPercent = 0;
      let pointsRemaining = 0;
      if (og && targetFg && currentGravity && og > targetFg) {
        const totalDrop = og - targetFg;
        const currentDrop = og - currentGravity;
        progressPercent = Math.min(100, Math.max(0, Math.round((currentDrop / totalDrop) * 100)));
        pointsRemaining = Math.max(0, Math.round((currentGravity - targetFg) * 1000));
      }

      return {
        ...tank,
        activeBatch,
        metrics: {
          og,
          targetFg,
          currentGravity,
          currentAbv,
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

  // Medições detalhadas da brassagem
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

  // Quando escolhe uma receita para brassar, preenche os parâmetros padrão
  const handleSelectRecipeForBrew = (recId: string) => {
    setSelectedRecipeId(recId);
    const rec = recipes.find((r) => r.id === recId);
    if (rec) {
      if (rec.og) setBrewOgInput(String(rec.og));
      if (rec.targetPhMash) setBrewPhMashInput(String(rec.targetPhMash));
      if (rec.batchYieldLiters) setBrewVolumeInput(String(rec.batchYieldLiters));
      // Sugerir número de lote
      const year = new Date().getFullYear().toString().slice(-2);
      setBrewBatchNumber(`${rec.name.slice(0, 3).toUpperCase()}-${year}${String(batches.length + 1).padStart(2, '0')}`);
    }
  };

  // Salvar ou iniciar brassagem
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
        // Criar Nova Brassagem a partir da Receita Selecionada
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

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
              <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-400" />
                {kegSubMode === 'WASH' && 'Bipar Barril para HIGIENIZAR'}
                {kegSubMode === 'REGISTER' && 'Bipar Código para Preencher'}
                {kegSubMode === 'MAINTENANCE' && 'Bipar Barril com DEFEITO'}
                {kegSubMode === 'LOOKUP' && 'Bipar Barril para CONSULTAR'}
              </h3>

              <BarcodeScanner onScan={handleScanForBarris} title="Leitor de Barris" defaultCollapsed={false} />
            </div>

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
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. MÓDULO TANQUES & ADEGA (COM PURGA, CO2, OG, META FG E TAREFAS) */}
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
                  <span className="text-xs font-bold text-slate-400">Toque para ver lote e medir</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTanksList.map((tank) => {
                    const isOccupied = Boolean(tank.activeBatch);
                    const beerName = tank.activeBatch?.recipe?.name;
                    const batchNumber = tank.activeBatch?.batchNumber;
                    const status = tank.activeBatch?.status || tank.status;
                    const m = tank.metrics;
                    const purged = isTankPurged(tank);
                    const co2Set = isTankCo2(tank);

                    return (
                      <div
                        key={tank.id}
                        onClick={() => setSelectedTankForDetails(tank)}
                        className={`p-5 rounded-3xl border-2 text-left transition-all active:scale-95 shadow-lg space-y-3 cursor-pointer ${
                          isOccupied
                            ? 'bg-slate-900 border-amber-500/40 hover:border-amber-400'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-lg text-white">{tank.name}</span>
                            <span className="text-[11px] font-bold text-slate-400">({tank.capacityLiters}L)</span>
                          </div>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                              isOccupied
                                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        {/* CAIXAS DE SELEÇÃO: PURGA E CO2 DIRETO NA LISTA DE TANQUES */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleTankFlag(tank, 'PURGA', e)}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 transition-all ${
                              purged
                                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-sm'
                                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-300'
                            }`}
                          >
                            <Wind className="w-3.5 h-3.5" />
                            {purged ? '✓ Purgado' : 'Purga'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleToggleTankFlag(tank, 'CO2', e)}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 transition-all ${
                              co2Set
                                ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-400 shadow-sm'
                                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-300'
                            }`}
                          >
                            <Droplet className="w-3.5 h-3.5" />
                            {co2Set ? '✓ Com CO2' : 'CO2'}
                          </button>
                        </div>

                        {isOccupied ? (
                          <div className="space-y-2 pt-1 border-t border-slate-800/60">
                            <div className="flex items-center justify-between">
                              <div className="font-black text-sm text-amber-300 truncate max-w-[200px]">
                                {beerName}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400">#{batchNumber}</span>
                            </div>

                            {/* PAINEL DE DENSIDADES: OG INICIAL, OBJETIVO FG E TEOR ALCOÓLICO */}
                            <div className="grid grid-cols-3 gap-1.5 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 text-center">
                              <div>
                                <span className="block text-[9px] uppercase font-bold text-slate-400">OG Inicial</span>
                                <span className="text-xs font-black text-white font-mono">
                                  {m.og ? m.og.toFixed(3) : '—'}
                                </span>
                              </div>
                              <div className="border-x border-slate-800">
                                <span className="block text-[9px] uppercase font-bold text-amber-400">Meta FG</span>
                                <span className="text-xs font-black text-amber-400 font-mono">
                                  {m.targetFg ? m.targetFg.toFixed(3) : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[9px] uppercase font-bold text-emerald-400">ABV Atual</span>
                                <span className="text-xs font-black text-emerald-400 font-mono">
                                  {m.currentAbv ? `${m.currentAbv}%` : '—'}
                                </span>
                              </div>
                            </div>

                            {/* BARRA DE PROGRESSO DE ATENUAÇÃO ATÉ A META FG */}
                            {m.targetFg && m.og && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                  <span>
                                    {m.currentGravity ? `Atual: ${m.currentGravity.toFixed(3)} SG` : 'Sem medição'}
                                  </span>
                                  <span className="text-amber-400">
                                    {m.pointsRemaining > 0
                                      ? `Faltam ${m.pointsRemaining} pts p/ FG`
                                      : 'Meta Atingida! 🎉'}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-amber-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${m.progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 py-1">Tanque Livre / Disponível</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* DETALHES DO TANQUE SELECIONADO: TAREFAS, NOVA TAREFA, EDITAR DATA E MEDIÇÕES */
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedTankForDetails(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar para lista de tanques
                </button>

                {/* Resumo do Tanque */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-xl text-white">{selectedTankForDetails.name}</h3>
                      <p className="text-xs text-slate-400">Capacidade: {selectedTankForDetails.capacityLiters}L</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-500/20 text-amber-400">
                      {selectedTankForDetails.activeBatch?.status || selectedTankForDetails.status}
                    </span>
                  </div>

                  {/* Ações Rápidas de Purga e CO2 */}
                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleToggleTankFlag(selectedTankForDetails, 'PURGA')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border flex items-center justify-center gap-2 transition-all ${
                        isTankPurged(selectedTankForDetails)
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Wind className="w-4 h-4" />
                      {isTankPurged(selectedTankForDetails) ? 'Purga Realizada (OK)' : 'Marcar Purga'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleTankFlag(selectedTankForDetails, 'CO2')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border flex items-center justify-center gap-2 transition-all ${
                        isTankCo2(selectedTankForDetails)
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Droplet className="w-4 h-4" />
                      {isTankCo2(selectedTankForDetails) ? 'Pressurizado CO2 (OK)' : 'Marcar Pressurização CO2'}
                    </button>
                  </div>

                  {selectedTankForDetails.activeBatch && (
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                      <div className="bg-slate-800/60 p-3 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">OG Inicial</span>
                        <span className="text-sm font-black text-white font-mono">
                          {selectedTankForDetails.activeBatch.measuredOg?.toFixed(3) ||
                            selectedTankForDetails.activeBatch.recipe?.og?.toFixed(3) ||
                            '—'}
                        </span>
                      </div>
                      <div className="bg-slate-800/60 p-3 rounded-2xl">
                        <span className="text-[10px] text-amber-400 uppercase font-bold block">
                          Objetivo FG (Meta)
                        </span>
                        <span className="text-sm font-black text-amber-400 font-mono">
                          {selectedTankForDetails.activeBatch.recipe?.fg?.toFixed(3) || '—'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* FORMULÁRIO DE MEDIÇÃO DO DIA */}
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

                {/* TAREFAS DE ADEGA DO LOTE + BOTÃO DE ADICIONAR NOVA TAREFA */}
                {selectedTankForDetails.activeBatch && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                        Tarefas de Adega para este Lote
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsAddTaskModalOpen(!isAddTaskModalOpen)}
                        className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/30 active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Nova Tarefa
                      </button>
                    </div>

                    {/* MODAL / FORMULÁRIO DE ADICIONAR TAREFA NO APP */}
                    {isAddTaskModalOpen && (
                      <div className="bg-slate-800/90 border border-amber-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-300">➕ Criar Tarefa de Adega</span>
                          <button
                            type="button"
                            onClick={() => setIsAddTaskModalOpen(false)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Atalhos rápidos de título de tarefa */}
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            'Dry Hopping',
                            'Purga de Levedura',
                            'Cold Crash (0°C)',
                            'Clarificação / Gelatina',
                            'Pressurizar com CO2',
                            'Medição de Densidade',
                          ].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => setNewTaskTitle(chip)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-slate-900 text-slate-300 hover:text-amber-400 rounded-lg border border-slate-700 active:scale-95"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Título da Tarefa:
                          </label>
                          <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Ex: Fazer Dry Hopping de 2kg de Citra"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Data Prevista:
                          </label>
                          <input
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-amber-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleAddNewTask}
                          disabled={isSavingNewTask || !newTaskTitle.trim()}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Salvar Tarefa no Lote
                        </button>
                      </div>
                    )}

                    {/* MODAL / INPUT PARA EDITAR DATA DE REALIZAÇÃO RETROATIVA */}
                    {editingTaskIndex !== null && (
                      <div className="bg-slate-800 border-2 border-emerald-500/50 rounded-2xl p-4 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-300">
                            ✏️ Editar Data de Realização
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingTaskIndex(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Se você realizou esta tarefa em outro dia e esqueceu de anotar, escolha a data exata abaixo:
                        </p>
                        <input
                          type="date"
                          value={editCompletionDate}
                          onChange={(e) => setEditCompletionDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveTaskCompletionDate}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all"
                          >
                            Confirmar Data
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskIndex(null)}
                            className="px-3 py-2 bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
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
                          <p className="text-xs text-slate-500 italic py-2">
                            Nenhuma tarefa cadastrada. Toque em &quot;Nova Tarefa&quot; acima para adicionar.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {tasks.map((task, idx) => (
                            <div
                              key={idx}
                              className={`w-full p-3.5 rounded-2xl border flex flex-col gap-2 transition-all ${
                                task.completed
                                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-800 border-slate-700 text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTankTask(idx)}
                                  className="flex items-center gap-3 text-left flex-1"
                                >
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
                                    <div className="text-[11px] text-slate-400">
                                      Previsto: {formatDateShort(task.dueDate)}
                                    </div>
                                  </div>
                                </button>

                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    task.completed
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}
                                >
                                  {task.completed ? 'Feito' : 'Pendente'}
                                </span>
                              </div>

                              {/* DATA DE REALIZAÇÃO + BOTÃO DE EDITAR DATA */}
                              {task.completed && (
                                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                                  <span>
                                    Realizado em:{' '}
                                    <strong className="text-emerald-400">
                                      {formatDateShort(task.completedAt || task.dueDate)}
                                    </strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTaskIndex(idx);
                                      setEditCompletionDate(task.completedAt || getLocalDateString());
                                    }}
                                    className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700"
                                  >
                                    <Calendar className="w-3 h-3" />
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
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. MÓDULO BRASSAGEM (ESCOLHA DE RECEITA & MEDIÇÕES DE PH, OG, ETC) */}
        {/* ========================================================= */}
        {activeTab === 'BRASSAGEM' && (
          <div className="space-y-4">
            {/* Cronômetro Rápido da Panela */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Cronômetro de Fervura / Mostura
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

            {/* SELEÇÃO: EM ANDAMENTO VS INICIAR DE RECEITA DO SISTEMA */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  Brassagem do Dia
                </h2>

                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setBrewMode('ACTIVE')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      brewMode === 'ACTIVE' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
                    }`}
                  >
                    Em Andamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrewMode('NEW_RECIPE')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      brewMode === 'NEW_RECIPE' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
                    }`}
                  >
                    + De Receita
                  </button>
                </div>
              </div>

              {/* OPÇÃO 1: BRASSAGEM EM ANDAMENTO */}
              {brewMode === 'ACTIVE' ? (
                activeBrewBatches.length === 0 ? (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-xs text-slate-400">
                      Nenhuma brassagem marcada como &apos;BRASSAGEM&apos; ativa.
                    </p>
                    <button
                      type="button"
                      onClick={() => setBrewMode('NEW_RECIPE')}
                      className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
                    >
                      Iniciar Brassagem a partir de Receita
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
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
                      className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none"
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
                /* OPÇÃO 2: ESCOLHER RECEITA DISPONÍVEL NO SISTEMA */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Escolha uma Receita do Catálogo:
                    </label>
                    <select
                      value={selectedRecipeId}
                      onChange={(e) => handleSelectRecipeForBrew(e.target.value)}
                      className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none"
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
                    <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 text-xs space-y-1">
                      <div className="font-black text-amber-300">{selectedRecipeObj.name}</div>
                      <div className="text-slate-400">
                        Estilo: {selectedRecipeObj.style} • Rendimento:{' '}
                        {selectedRecipeObj.batchYieldLiters || 500}L
                      </div>
                      <div className="flex gap-4 pt-1 font-mono text-[11px] text-slate-300">
                        <span>OG Alvo: {selectedRecipeObj.og || '—'}</span>
                        <span>FG Alvo: {selectedRecipeObj.fg || '—'}</span>
                        <span>pH Mostura: {selectedRecipeObj.targetPhMash || '5.3'}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Número do Lote:
                      </label>
                      <input
                        type="text"
                        value={brewBatchNumber}
                        onChange={(e) => setBrewBatchNumber(e.target.value.toUpperCase())}
                        placeholder="Ex: IPA-2601"
                        className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-sm font-black text-white text-center font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Tanque Destino:
                      </label>
                      <select
                        value={brewTargetTankId}
                        onChange={(e) => setBrewTargetTankId(e.target.value)}
                        className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-xs font-bold text-white outline-none"
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

              {/* FORMULÁRIO DE MEDIÇÕES DA BRASSAGEM: OG, PH MOSTURA, PH FERVIURA, TEMP */}
              {(selectedBrewBatch || (brewMode === 'NEW_RECIPE' && selectedRecipeId)) && (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-400">
                    🔬 Medições & Parâmetros da Brassagem
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        OG Medida (Pós-Fervura):
                      </label>
                      <input
                        type="text"
                        value={brewOgInput}
                        onChange={(e) => setBrewOgInput(e.target.value)}
                        placeholder="1.054"
                        className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-base font-black text-white text-center font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Volume no Fermentador (L):
                      </label>
                      <input
                        type="text"
                        value={brewVolumeInput}
                        onChange={(e) => setBrewVolumeInput(e.target.value)}
                        placeholder="520"
                        className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-3 py-3 text-base font-black text-white text-center font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        pH da Mostura:
                      </label>
                      <input
                        type="text"
                        value={brewPhMashInput}
                        onChange={(e) => setBrewPhMashInput(e.target.value)}
                        placeholder="5.3"
                        className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-2 py-2.5 text-sm font-black text-white text-center outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        pH Fervura/Whirl:
                      </label>
                      <input
                        type="text"
                        value={brewPhBoilInput}
                        onChange={(e) => setBrewPhBoilInput(e.target.value)}
                        placeholder="5.1"
                        className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-2 py-2.5 text-sm font-black text-white text-center outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        Temp Mostura (°C):
                      </label>
                      <input
                        type="text"
                        value={brewTempMashInput}
                        onChange={(e) => setBrewTempMashInput(e.target.value)}
                        placeholder="66.5"
                        className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-2 py-2.5 text-sm font-black text-white text-center outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Anotações da Brassagem (Opcional):
                    </label>
                    <input
                      type="text"
                      value={brewNotesInput}
                      onChange={(e) => setBrewNotesInput(e.target.value)}
                      placeholder="Ex: Whirlpool a 80°C, 15 min de repouso..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveBreweryData(false)}
                      disabled={isSavingBrew}
                      className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl border border-slate-700 transition-all active:scale-95"
                    >
                      Salvar Medições
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveBreweryData(true)}
                      disabled={isSavingBrew}
                      className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
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
                      className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl px-2 py-3 text-sm font-black text-white text-center outline-none"
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

      {/* BARRA INFERIOR DE NAVEGAÇÃO TOUCH GIGANTE (FINGER-FRIENDLY) */}
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
