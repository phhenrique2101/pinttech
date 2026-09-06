'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Upload,
  Search,
  Beer,
  Printer,
  Calendar,
  Layers,
  Flame,
  CheckCircle2,
  RefreshCw,
  Plus,
  FileText,
  Building2,
  Sliders,
  Sparkles,
  ArrowRight,
  Cylinder,
  Check,
  AlertTriangle,
  Clock,
  Eye,
  Trash2,
  X,
  Activity,
  Pencil,
  Edit3,
  Thermometer,
  Droplet,
  Boxes,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import BeerXmlImporterModal from '@/components/brew/BeerXmlImporterModal';
import MapaTraceabilitySheetModal from '@/components/brew/MapaTraceabilitySheetModal';
import LiveBatchManagerModal from '@/components/brew/LiveBatchManagerModal';
import EditRecipeModal from '@/components/brew/EditRecipeModal';
import { formatDate, formatDateShort, formatCurrency, getLocalDateString } from '@/lib/utils';

export default function ProducaoPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [brewery, setBrewery] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'PRODUCTION_TANKS' | 'HISTORY_MAPA' | 'RECIPES'>('PRODUCTION_TANKS');

  // Sub-aba ativa dentro de Produção & Tanques: TANKS ou TASKS
  const [productionSubTab, setProductionSubTab] = useState<'TANKS' | 'TASKS'>('TANKS');

  // View mode and sorting state for Unified Production & Tanks
  const [tankViewMode, setTankViewMode] = useState<'CARDS' | 'ROWS'>('CARDS');
  const [tankSortBy, setTankSortBy] = useState<'name' | 'status' | 'batch' | 'capacity' | 'occupation' | 'type'>('name');
  const [tankSortOrder, setTankSortOrder] = useState<'asc' | 'desc'>('asc');

  // View mode, sorting and filters for Tarefas da Adega
  const [taskViewMode, setTaskViewMode] = useState<'CARDS' | 'ROWS'>('ROWS');
  const [taskSortBy, setTaskSortBy] = useState<'dueDate' | 'urgency' | 'tank' | 'batch' | 'title' | 'type'>('dueDate');
  const [taskSortOrder, setTaskSortOrder] = useState<'asc' | 'desc'>('asc');
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'TODAY' | 'LATE' | 'PENDING' | 'COMPLETED'>('ALL');

  // Tank filter state
  const [tankStatusFilter, setTankStatusFilter] = useState<string>('ALL');

  // Modals
  const [importerModalOpen, setImporterModalOpen] = useState<boolean>(false);
  const [selectedBatchForSheet, setSelectedBatchForSheet] = useState<any | null>(null);
  const [selectedBatchForManager, setSelectedBatchForManager] = useState<any | null>(null);
  const [selectedRecipeForEdit, setSelectedRecipeForEdit] = useState<any | null>(null);

  // Modal de Tanque (Criar / Editar)
  const [tankModalOpen, setTankModalOpen] = useState<boolean>(false);
  const [editingTank, setEditingTank] = useState<any | null>(null);
  const [tankName, setTankName] = useState<string>('');
  const [tankCapacity, setTankCapacity] = useState<string>('1000');
  const [tankType, setTankType] = useState<string>('Fermentador Cônico');
  const [tankStatus, setTankStatus] = useState<string>('LIVRE');
  const [tankNotes, setTankNotes] = useState<string>('');
  const [savingTank, setSavingTank] = useState<boolean>(false);

  // Modal de Exclusão Unificado
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'BATCH' | 'RECIPE' | 'TANK';
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Status update modal / quick edit
  const [editingBatchStatus, setEditingBatchStatus] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [newMeasuredFg, setNewMeasuredFg] = useState<string>('');
  const [newMeasuredAbv, setNewMeasuredAbv] = useState<string>('');
  const [savingStatus, setSavingStatus] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchesRes, tanksRes, recipesRes, authRes, breweryRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/tanks'),
        fetch('/api/recipes'),
        fetch('/api/auth/me'),
        fetch('/api/brewery'),
      ]);

      const [batchesData, tanksData, recipesData, authData, breweryData] = await Promise.all([
        batchesRes.json(),
        tanksRes.json(),
        recipesRes.json(),
        authRes.json(),
        breweryRes.ok ? breweryRes.json() : null,
      ]);

      if (authRes.status === 401 || !authRes.ok) {
        window.location.href = '/login?redirect=/producao';
        return;
      }

      if (Array.isArray(batchesData)) setBatches(batchesData);
      if (Array.isArray(tanksData)) setTanks(tanksData);
      if (Array.isArray(recipesData)) setRecipes(recipesData);

      if (breweryData && !breweryData.error) {
        setBrewery(breweryData);
      } else if (authData?.user?.brewery) {
        setBrewery(authData.user.brewery);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de produção:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      let url = '';
      if (itemToDelete.type === 'BATCH') url = `/api/batches/${itemToDelete.id}`;
      else if (itemToDelete.type === 'RECIPE') url = `/api/recipes/${itemToDelete.id}`;
      else if (itemToDelete.type === 'TANK') url = `/api/tanks/${itemToDelete.id}`;

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir registro');
      setItemToDelete(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchData();
    try {
      const savedSubTab = localStorage.getItem('pinttech_production_subtab');
      if (savedSubTab === 'TANKS' || savedSubTab === 'TASKS') setProductionSubTab(savedSubTab);

      const savedMode = localStorage.getItem('pinttech_tank_view_mode') || localStorage.getItem('pinttech_batch_view_mode');
      if (savedMode === 'CARDS' || savedMode === 'ROWS') setTankViewMode(savedMode);

      const savedSort = localStorage.getItem('pinttech_tank_sort_by');
      if (savedSort && ['name', 'status', 'capacity', 'type', 'occupation', 'batch'].includes(savedSort)) {
        setTankSortBy(savedSort as any);
      }

      const savedOrder = localStorage.getItem('pinttech_tank_sort_order');
      if (savedOrder === 'asc' || savedOrder === 'desc') setTankSortOrder(savedOrder);

      const savedTaskMode = localStorage.getItem('pinttech_task_view_mode');
      if (savedTaskMode === 'CARDS' || savedTaskMode === 'ROWS') setTaskViewMode(savedTaskMode);

      const savedTaskSort = localStorage.getItem('pinttech_task_sort_by');
      if (savedTaskSort && ['dueDate', 'urgency', 'tank', 'batch', 'title', 'type'].includes(savedTaskSort)) {
        setTaskSortBy(savedTaskSort as any);
      }

      const savedTaskOrder = localStorage.getItem('pinttech_task_sort_order');
      if (savedTaskOrder === 'asc' || savedTaskOrder === 'desc') setTaskSortOrder(savedTaskOrder);
    } catch {
      // ignore
    }
  }, []);

  // Lotes Ativos nos Tanques
  const activeBatches = useMemo(() => {
    return batches.filter(
      (b) => b.status !== 'FINALIZADO' && b.status !== 'ENVASADO' && b.status !== 'CANCELADO'
    );
  }, [batches]);

  // Lotes sem tanque atribuído
  const unassignedBatches = useMemo(() => {
    return activeBatches.filter((b) => !b.tankId && !b.tank);
  }, [activeBatches]);

  // Busca do Lote Ativo correspondente a um Tanque
  const getTankActiveBatch = (t: any) => {
    return (
      activeBatches.find((b) => b.tankId === t.id || b.tank?.id === t.id) ||
      (t.batches || []).find((b: any) => b.status !== 'FINALIZADO' && b.status !== 'ENVASADO' && b.status !== 'CANCELADO') ||
      t.batches?.[0] ||
      null
    );
  };

  // Lotes Históricos / Arquivados
  const historicalBatches = useMemo(() => {
    return batches.filter(
      (b) => b.status === 'FINALIZADO' || b.status === 'ENVASADO'
    );
  }, [batches]);

  // Filtragem de busca
  const filterList = (list: any[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (item) =>
        item.batchNumber?.toLowerCase().includes(q) ||
        item.recipe?.name?.toLowerCase().includes(q) ||
        item.recipe?.style?.toLowerCase().includes(q) ||
        item.mapaRegistration?.toLowerCase().includes(q) ||
        item.tank?.name?.toLowerCase().includes(q)
    );
  };

  const getElapsedDays = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const diffTime = Date.now() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const filteredHistory = filterList(historicalBatches);
  const filteredRecipes = recipes.filter(
    (r) =>
      !search.trim() ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.style?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTanks = useMemo(() => {
    return tanks.filter((t) => {
      const activeBatch = getTankActiveBatch(t);
      const isOccupied = t.status === 'OCUPADO' || !!activeBatch;

      let matchesStatus = true;
      if (tankStatusFilter === 'OCUPADO') {
        matchesStatus = isOccupied;
      } else if (tankStatusFilter !== 'ALL') {
        matchesStatus = t.status === tankStatusFilter;
      }

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.type?.toLowerCase().includes(q) ||
        (activeBatch && (
          activeBatch.batchNumber?.toLowerCase().includes(q) ||
          activeBatch.recipe?.name?.toLowerCase().includes(q) ||
          activeBatch.recipe?.style?.toLowerCase().includes(q) ||
          activeBatch.mapaRegistration?.toLowerCase().includes(q) ||
          activeBatch.commercialDenomination?.toLowerCase().includes(q)
        ));

      return matchesStatus && matchesSearch;
    });
  }, [tanks, tankStatusFilter, search, activeBatches]);

  // Ordenação Unificada de Tanques & Lotes
  const sortedTanks = useMemo(() => {
    return [...filteredTanks].sort((a, b) => {
      let comp = 0;
      switch (tankSortBy) {
        case 'name':
          comp = (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'status':
          comp = (a.status || '').localeCompare(b.status || '');
          break;
        case 'capacity':
          comp = Number(a.capacityLiters || 0) - Number(b.capacityLiters || 0);
          break;
        case 'type':
          comp = (a.type || '').localeCompare(b.type || '');
          break;
        case 'occupation': {
          const batchA = getTankActiveBatch(a);
          const isOccA = a.status === 'OCUPADO' || !!batchA;
          const volA = isOccA && batchA ? (batchA.volumeProducedLiters || batchA.volumePlannedLiters || a.capacityLiters) : 0;
          const fillA = a.capacityLiters > 0 ? (volA / a.capacityLiters) : 0;

          const batchB = getTankActiveBatch(b);
          const isOccB = b.status === 'OCUPADO' || !!batchB;
          const volB = isOccB && batchB ? (batchB.volumeProducedLiters || batchB.volumePlannedLiters || b.capacityLiters) : 0;
          const fillB = b.capacityLiters > 0 ? (volB / b.capacityLiters) : 0;

          comp = fillA - fillB;
          break;
        }
        case 'batch': {
          const batchA = getTankActiveBatch(a);
          const batchB = getTankActiveBatch(b);
          const textA = batchA ? `${batchA.batchNumber || ''} ${batchA.recipe?.name || ''}` : '';
          const textB = batchB ? `${batchB.batchNumber || ''} ${batchB.recipe?.name || ''}` : '';
          if (!textA && textB) comp = 1;
          else if (textA && !textB) comp = -1;
          else comp = textA.localeCompare(textB, undefined, { sensitivity: 'base' });
          break;
        }
      }
      return tankSortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredTanks, tankSortBy, tankSortOrder, activeBatches]);

  const changeTankViewMode = (mode: 'CARDS' | 'ROWS') => {
    setTankViewMode(mode);
    try {
      localStorage.setItem('pinttech_tank_view_mode', mode);
    } catch {}
  };

  const handleTankSortChange = (field: 'name' | 'status' | 'capacity' | 'type' | 'occupation' | 'batch') => {
    let newOrder: 'asc' | 'desc' = 'asc';
    if (tankSortBy === field) {
      newOrder = tankSortOrder === 'asc' ? 'desc' : 'asc';
    }
    setTankSortBy(field);
    setTankSortOrder(newOrder);
    try {
      localStorage.setItem('pinttech_tank_sort_by', field);
      localStorage.setItem('pinttech_tank_sort_order', newOrder);
    } catch {}
  };

  const toggleTankSortOrder = () => {
    const newOrder = tankSortOrder === 'asc' ? 'desc' : 'asc';
    setTankSortOrder(newOrder);
    try {
      localStorage.setItem('pinttech_tank_sort_order', newOrder);
    } catch {}
  };

  const changeProductionSubTab = (tab: 'TANKS' | 'TASKS') => {
    setProductionSubTab(tab);
    try {
      localStorage.setItem('pinttech_production_subtab', tab);
    } catch {}
  };

  const changeTaskViewMode = (mode: 'CARDS' | 'ROWS') => {
    setTaskViewMode(mode);
    try {
      localStorage.setItem('pinttech_task_view_mode', mode);
    } catch {}
  };

  const handleTaskSortChange = (field: 'dueDate' | 'urgency' | 'tank' | 'batch' | 'title' | 'type') => {
    let newOrder: 'asc' | 'desc' = 'asc';
    if (taskSortBy === field) {
      newOrder = taskSortOrder === 'asc' ? 'desc' : 'asc';
    }
    setTaskSortBy(field);
    setTaskSortOrder(newOrder);
    try {
      localStorage.setItem('pinttech_task_sort_by', field);
      localStorage.setItem('pinttech_task_sort_order', newOrder);
    } catch {}
  };

  const toggleTaskSortOrder = () => {
    const newOrder = taskSortOrder === 'asc' ? 'desc' : 'asc';
    setTaskSortOrder(newOrder);
    try {
      localStorage.setItem('pinttech_task_sort_order', newOrder);
    } catch {}
  };

  // Mapeamento Completo de Todas as Tarefas da Adega & Lotes Ativos
  const allCellarTasks = useMemo(() => {
    const list: Array<{
      id: string;
      batchId: string;
      batchNumber: string;
      recipeName: string;
      recipeStyle?: string;
      tankName: string;
      tankId?: string;
      batch: any;
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

    activeBatches.forEach((b) => {
      if (!b.tankTasksJson) return;
      try {
        const parsed = JSON.parse(b.tankTasksJson);
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

            const tankName = b.tank?.name || (tanks.find((tk) => tk.id === b.tankId)?.name) || 'Sem tanque';

            list.push({
              id: t.id,
              batchId: b.id,
              batchNumber: b.batchNumber || 'S/N',
              recipeName: b.recipe?.name || 'Cerveja',
              recipeStyle: b.recipe?.style || '',
              tankName,
              tankId: b.tankId,
              batch: b,
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
      } catch (e) {
        // ignore parse error
      }
    });

    return list;
  }, [activeBatches, tanks]);

  const lateTasksCount = useMemo(() => {
    return allCellarTasks.filter((t) => t.urgency === 'LATE').length;
  }, [allCellarTasks]);

  const todayTasksCount = useMemo(() => {
    return allCellarTasks.filter((t) => t.urgency === 'TODAY').length;
  }, [allCellarTasks]);

  const pendingTasksCount = useMemo(() => {
    return allCellarTasks.filter((t) => !t.completed).length;
  }, [allCellarTasks]);

  // Filtro de Busca & Sub-filtro de Tarefas
  const filteredTasks = useMemo(() => {
    return allCellarTasks.filter((t) => {
      if (taskFilter === 'TODAY' && t.urgency !== 'TODAY') return false;
      if (taskFilter === 'LATE' && t.urgency !== 'LATE') return false;
      if (taskFilter === 'PENDING' && t.completed) return false;
      if (taskFilter === 'COMPLETED' && !t.completed) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
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
    });
  }, [allCellarTasks, taskFilter, search]);

  // Ordenação de Tarefas
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let comp = 0;
      switch (taskSortBy) {
        case 'dueDate':
          comp = (a.dueDate || '').localeCompare(b.dueDate || '');
          break;
        case 'urgency': {
          const priority: Record<string, number> = {
            LATE: 1,
            TODAY: 2,
            FUTURE: 3,
            COMPLETED: 4,
          };
          comp = (priority[a.urgency] || 99) - (priority[b.urgency] || 99);
          if (comp === 0) comp = (a.dueDate || '').localeCompare(b.dueDate || '');
          break;
        }
        case 'tank':
          comp = a.tankName.localeCompare(b.tankName, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'batch':
          comp = a.batchNumber.localeCompare(b.batchNumber, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'title':
          comp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
          break;
        case 'type':
          comp = a.type.localeCompare(b.type, undefined, { sensitivity: 'base' });
          break;
      }
      return taskSortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredTasks, taskSortBy, taskSortOrder]);

  // Concluir / Reabrir Tarefa Diretamente da Lista
  const handleToggleTask = async (taskItem: any) => {
    const targetBatch = batches.find((b) => b.id === taskItem.batchId);
    if (!targetBatch) return;

    let currentTasks: any[] = [];
    try {
      currentTasks = targetBatch.tankTasksJson ? JSON.parse(targetBatch.tankTasksJson) : [];
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

    // Atualização otimista local imediata
    setBatches((prevBatches) =>
      prevBatches.map((b) =>
        b.id === targetBatch.id
          ? { ...b, tankTasksJson: updatedJson }
          : b
      )
    );

    setSelectedBatchForManager((prev: any) =>
      prev && prev.id === targetBatch.id
        ? { ...prev, tankTasksJson: updatedJson }
        : prev
    );

    try {
      const res = await fetch(`/api/batches/${targetBatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankTasksJson: updatedJson }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro na resposta do servidor');
      }

      const savedBatch = await res.json();
      if (savedBatch && savedBatch.tankTasksJson) {
        setBatches((prevBatches) =>
          prevBatches.map((b) =>
            b.id === targetBatch.id
              ? { ...b, tankTasksJson: savedBatch.tankTasksJson }
              : b
          )
        );
      }
    } catch (err) {
      console.error('Erro ao salvar status da tarefa no servidor:', err);
      // Reverte em caso de falha de conexão buscando o estado real do banco
      await fetchData();
    }
  };

  const handleUpdateBatchStatus = async () => {
    if (!editingBatchStatus) return;
    setSavingStatus(true);
    try {
      const payload: any = { status: newStatus };
      if (newMeasuredFg) payload.measuredFg = parseFloat(newMeasuredFg);
      if (newMeasuredAbv) payload.measuredAbv = parseFloat(newMeasuredAbv);

      const res = await fetch(`/api/batches/${editingBatchStatus.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
        setEditingBatchStatus(null);
      } else {
        alert('Erro ao atualizar lote.');
      }
    } catch {
      alert('Erro ao atualizar lote.');
    } finally {
      setSavingStatus(false);
    }
  };

  const openBatchStatusModal = (batch: any) => {
    setEditingBatchStatus(batch);
    setNewStatus(batch.status || 'FERMENTANDO');
    setNewMeasuredFg(batch.measuredFg ? String(batch.measuredFg) : '');
    setNewMeasuredAbv(batch.measuredAbv ? String(batch.measuredAbv) : '');
  };

  // Funções de Gestão de Tanques
  const openNewTankModal = () => {
    setEditingTank(null);
    setTankName('');
    setTankCapacity('1000');
    setTankType('Fermentador Cônico');
    setTankStatus('LIVRE');
    setTankNotes('');
    setTankModalOpen(true);
  };

  const openEditTankModal = (t: any) => {
    setEditingTank(t);
    setTankName(t.name || '');
    setTankCapacity(String(t.capacityLiters || 1000));
    setTankType(t.type || 'Fermentador Cônico');
    setTankStatus(t.status || 'LIVRE');
    setTankNotes(t.notes || '');
    setTankModalOpen(true);
  };

  const handleSaveTank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTank(true);
    try {
      const payload = {
        name: tankName.trim(),
        capacityLiters: parseFloat(tankCapacity) || 1000,
        type: tankType,
        status: tankStatus,
        notes: tankNotes,
      };

      const url = editingTank ? `/api/tanks/${editingTank.id}` : '/api/tanks';
      const method = editingTank ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar tanque');

      setTankModalOpen(false);
      setEditingTank(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar tanque');
    } finally {
      setSavingTank(false);
    }
  };

  const handleLiberateTank = async (tank: any) => {
    if (!confirm(`Deseja desocupar e liberar o tanque ${tank.name}? O lote atual será desvinculado e o status passará para LIVRE.`)) return;
    try {
      const res = await fetch(`/api/tanks/${tank.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIVRE', batchId: '' }),
      });
      if (res.ok) fetchData();
      else alert('Erro ao desocupar tanque');
    } catch {
      alert('Erro ao desocupar tanque');
    }
  };

  const handleQuickTankStatus = async (tankId: string, status: string) => {
    try {
      const res = await fetch(`/api/tanks/${tankId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const totalTankCapacity = useMemo(() => {
    return tanks.reduce((acc, t) => acc + (t.capacityLiters || 0), 0);
  }, [tanks]);

  const occupiedTanksCount = useMemo(() => {
    return tanks.filter((t) => t.status === 'OCUPADO').length;
  }, [tanks]);

  const totalVolumeInProduction = useMemo(() => {
    return activeBatches.reduce(
      (acc, b) => acc + (b.volumeProducedLiters || b.volumePlannedLiters || 0),
      0
    );
  }, [activeBatches]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header Compacto & Moderno */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Produção & Tanques
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                MAPA
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Gestão de brassagem, adega, rastreabilidade e fichas do MAPA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setImporterModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xs transition active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Importar BeerXML & Novo Lote</span>
          </button>

          <button
            onClick={openNewTankModal}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-2xs transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Novo Tanque</span>
          </button>
        </div>
      </div>

      {/* Métricas Rápidas Operacionais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* 1. Lotes em Produção */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-amber-300/60 dark:hover:border-amber-500/40 transition">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
              Lotes em Produção
            </span>
            <strong className="text-2xl font-black text-slate-900 dark:text-white leading-tight block">
              {activeBatches.length}
            </strong>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
              {activeBatches.length === 1 ? '1 lote ativo' : `${activeBatches.length} lotes ativos`}
            </span>
          </div>
        </div>

        {/* 2. Tanques Ocupados */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-emerald-300/60 dark:hover:border-emerald-500/40 transition">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Cylinder className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
              Tanques Ocupados
            </span>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {occupiedTanksCount}
              </strong>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">/ {tanks.length}</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block truncate">
              {totalTankCapacity}L instalados
            </span>
          </div>
        </div>

        {/* 3. Tarefas da Adega (Substitui Dossiês MAPA - Clicável direto para a aba Tarefas) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('PRODUCTION_TANKS');
            changeProductionSubTab('TASKS');
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition text-left cursor-pointer group"
          title="Clique para abrir a central de Tarefas da Adega"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                Tarefas da Adega
              </span>
              {lateTasksCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <strong className="text-2xl font-black text-slate-900 dark:text-white leading-tight block">
              {pendingTasksCount}
            </strong>
            <span className={`text-[10px] font-bold block truncate ${
              lateTasksCount > 0
                ? 'text-rose-600 dark:text-rose-400 font-black'
                : todayTasksCount > 0
                ? 'text-amber-600 dark:text-amber-400 font-black'
                : 'text-slate-400 dark:text-slate-500'
            }`}>
              {lateTasksCount > 0
                ? `🚨 ${lateTasksCount} atrasada${lateTasksCount > 1 ? 's' : ''}`
                : todayTasksCount > 0
                ? `⚡ ${todayTasksCount} vence${todayTasksCount > 1 ? 'm' : ''} hoje`
                : '✓ Tudo em dia'}
            </span>
          </div>
        </button>

        {/* 4. Volume em Tanques (Líquido em Processo) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-purple-300/60 dark:hover:border-purple-500/40 transition">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Droplet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
              Volume em Adega
            </span>
            <strong className="text-2xl font-black text-slate-900 dark:text-white leading-tight block">
              {totalVolumeInProduction.toLocaleString('pt-BR')} L
            </strong>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block truncate">
              {totalTankCapacity > 0 ? `${Math.round((totalVolumeInProduction / totalTankCapacity) * 100)}% ocupado` : 'líquido em processo'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Navegação por Abas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex space-x-2 overflow-x-auto">
          {[
            { id: 'PRODUCTION_TANKS', label: 'Produção & Tanques', count: tanks.length, icon: Flame },
            { id: 'HISTORY_MAPA', label: 'Lotes Finalizados', count: historicalBatches.length, icon: ShieldCheck },
            { id: 'RECIPES', label: 'Catálogo de Receitas', count: recipes.length, icon: Beer },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${isActive ? 'bg-slate-950 text-amber-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por lote, tanque, cerveja ou MAPA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>
      </div>


      {/* ABA UNIFICADA: PRODUÇÃO & TANQUES */}
      {activeTab === 'PRODUCTION_TANKS' && (
        <div className="space-y-5">
          {/* Alerta de Lotes Ativos sem Tanque Atribuído (se houver) */}
          {unassignedBatches.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                      Atenção: {unassignedBatches.length} {unassignedBatches.length === 1 ? 'lote ativo cadastrado sem tanque atribuído' : 'lotes ativos cadastrados sem tanque atribuído'}
                    </h4>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/80">
                      Estes lotes foram lançados sem vínculo a um fermentador físico. Você pode gerenciar suas medições ou atribuir a um tanque:
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-xs font-mono font-bold shrink-0">
                  Sem Tanque
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-amber-200 dark:border-amber-500/20">
                {unassignedBatches.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-slate-900/90 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3.5 space-y-2 flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                          #{b.batchNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {b.status}
                        </span>
                      </div>
                      <strong className="text-slate-900 dark:text-white block text-sm mt-1 truncate">
                        {b.recipe?.name || 'Cerveja'}
                      </strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                        {b.recipe?.style || 'Standard'} • {b.volumeProducedLiters || b.volumePlannedLiters || 0}L
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setSelectedBatchForManager(b)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1"
                        title="Abrir Adega & Medições"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Adega</span>
                      </button>
                      <button
                        onClick={() => setSelectedBatchForSheet(b)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-200 dark:border-transparent"
                        title="Ficha Oficial MAPA"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">MAPA</span>
                      </button>
                      <button
                        onClick={() => openBatchStatusModal(b)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                        title="Atualizar Status"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-abas de Produção: Tanques e Tarefas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => changeProductionSubTab('TANKS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  productionSubTab === 'TANKS'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent'
                }`}
              >
                <Cylinder className="w-4 h-4" />
                <span>Tanques ({tanks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => changeProductionSubTab('TASKS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  productionSubTab === 'TASKS'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Tarefas ({pendingTasksCount})</span>
                {lateTasksCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white keep-white animate-pulse">
                    {lateTasksCount} atrasada{lateTasksCount > 1 ? 's' : ''}
                  </span>
                )}
                {todayTasksCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                    {todayTasksCount} hoje
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setImporterModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>+ Importar BeerXML</span>
              </button>
              <button
                onClick={openNewTankModal}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>+ Adicionar Tanque</span>
              </button>
            </div>
          </div>

          {/* SUB-ABA 1: TANQUES */}
          {productionSubTab === 'TANKS' && (
            <div className="space-y-5">

          {/* Barra de Ferramentas: Contagem, Ordenação e Alternador de Visualização (Grade / Linhas) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                Tanques & Lotes:
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                {sortedTanks.length} {sortedTanks.length === 1 ? 'tanque' : 'tanques'}
              </span>
              {(tankStatusFilter !== 'ALL' || search.trim()) && (
                <span className="text-[11px] text-slate-400">
                  (filtrado de {tanks.length})
                </span>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              {/* Classificação / Ordenação */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Ordenar:</span>
                </span>
                <select
                  value={tankSortBy}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setTankSortBy(val);
                    try { localStorage.setItem('pinttech_tank_sort_by', val); } catch {}
                  }}
                  className="bg-transparent text-xs text-amber-300 font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value="name" className="bg-slate-900 text-slate-200">Nome do Tanque</option>
                  <option value="status" className="bg-slate-900 text-slate-200">Status Operacional</option>
                  <option value="capacity" className="bg-slate-900 text-slate-200">Capacidade (Litros)</option>
                  <option value="type" className="bg-slate-900 text-slate-200">Tipo de Tanque</option>
                  <option value="occupation" className="bg-slate-900 text-slate-200">Ocupação (%)</option>
                  <option value="batch" className="bg-slate-900 text-slate-200">Lote / Cerveja</option>
                </select>

                <button
                  type="button"
                  onClick={toggleTankSortOrder}
                  className="p-1 rounded-md hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition"
                  title={tankSortOrder === 'asc' ? 'Ordem Crescente (clique para Decrescente)' : 'Ordem Decrescente (clique para Crescente)'}
                >
                  {tankSortOrder === 'asc' ? (
                    <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </button>
              </div>

              {/* Alternador Grade / Linhas */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => changeTankViewMode('CARDS')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                    tankViewMode === 'CARDS'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Visualizar como Grade / Cards"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => changeTankViewMode('ROWS')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                    tankViewMode === 'ROWS'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Visualizar como Linhas / Tabela"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Linhas</span>
                </button>
              </div>
            </div>
          </div>

          {sortedTanks.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl space-y-3 text-slate-400">
              <Cylinder className="w-12 h-12 mx-auto text-slate-500" />
              <h4 className="text-sm font-bold text-white">Nenhum tanque encontrado</h4>
              <p className="text-xs text-slate-500">Cadastre seus fermentadores e maturadores para gerenciar seus lotes de produção.</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={openNewTankModal}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Tanque</span>
                </button>
                <button
                  onClick={() => setImporterModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importar BeerXML</span>
                </button>
              </div>
            </div>
          ) : tankViewMode === 'ROWS' ? (
            /* VISUALIZAÇÃO EM LINHAS (TABELA UNIFICADA) */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
                    <tr>
                      <th
                        onClick={() => handleTankSortChange('name')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-400 transition"
                        title="Clique para ordenar por Nome do Tanque"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Tanque & Tipo</span>
                          {tankSortBy === 'name' ? (
                            tankSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTankSortChange('status')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-400 transition"
                        title="Clique para ordenar por Status"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Status</span>
                          {tankSortBy === 'status' ? (
                            tankSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTankSortChange('capacity')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-400 transition"
                        title="Clique para ordenar por Capacidade"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Capacidade</span>
                          {tankSortBy === 'capacity' ? (
                            tankSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTankSortChange('occupation')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-400 transition"
                        title="Clique para ordenar por Ocupação"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Ocupação</span>
                          {tankSortBy === 'occupation' ? (
                            tankSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTankSortChange('batch')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-400 transition"
                        title="Clique para ordenar por Lote / Cerveja"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Lote Contido / Cerveja</span>
                          {tankSortBy === 'batch' ? (
                            tankSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th className="p-3.5">OG / FG / ABV</th>
                      <th className="p-3.5">MAPA</th>
                      <th className="p-3.5 text-right">Ações Operacionais</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sortedTanks.map((tank) => {
                      const activeBatch = getTankActiveBatch(tank);
                      const isOccupied = tank.status === 'OCUPADO' || !!activeBatch;
                      const volumeInTank = activeBatch ? (activeBatch.volumeProducedLiters || activeBatch.volumePlannedLiters || tank.capacityLiters) : 0;
                      const fillPercent = tank.capacityLiters > 0 ? Math.min(100, Math.round((volumeInTank / tank.capacityLiters) * 100)) : 0;
                      const elapsedDays = activeBatch ? getElapsedDays(activeBatch.brewDate || activeBatch.createdAt) : null;

                      return (
                        <tr key={tank.id} className="hover:bg-slate-800/40 transition group">
                          {/* Tanque & Tipo */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  isOccupied
                                    ? 'bg-purple-400 animate-pulse'
                                    : tank.status === 'LIVRE'
                                    ? 'bg-emerald-400'
                                    : tank.status === 'HIGIENIZANDO'
                                    ? 'bg-blue-400'
                                    : 'bg-amber-400'
                                }`}
                              />
                              <div>
                                <strong className="text-white block text-xs group-hover:text-amber-300 transition">
                                  {tank.name}
                                </strong>
                                <span className="text-[11px] text-slate-400">
                                  {tank.type || 'Fermentador Cônico'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-3.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-block ${
                                isOccupied
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : tank.status === 'LIVRE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : tank.status === 'HIGIENIZANDO'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isOccupied ? (activeBatch?.status || 'OCUPADO') : tank.status}
                            </span>
                          </td>

                          {/* Capacidade */}
                          <td className="p-3.5 whitespace-nowrap font-mono font-bold text-xs text-slate-200">
                            {tank.capacityLiters}L
                          </td>

                          {/* Ocupação */}
                          <td className="p-3.5 whitespace-nowrap min-w-[130px]">
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 mb-1">
                              <span>{isOccupied ? `${fillPercent}%` : '0%'}</span>
                              <span className="text-slate-400">{isOccupied ? `${volumeInTank}L` : 'Vazio'}</span>
                            </div>
                            <div className="w-28 h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isOccupied ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-slate-700'
                                }`}
                                style={{ width: `${isOccupied ? fillPercent : 0}%` }}
                              />
                            </div>
                          </td>

                          {/* Lote Contido / Cerveja */}
                          <td className="p-3.5 min-w-[190px]">
                            {isOccupied && activeBatch ? (
                              <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    #{activeBatch.batchNumber}
                                  </span>
                                  {elapsedDays !== null && (
                                    <span className="text-[10px] text-amber-400 font-mono">
                                      ⏱️ Dia {elapsedDays}
                                    </span>
                                  )}
                                </div>
                                <strong className="text-white block text-xs truncate max-w-[200px]">
                                  {activeBatch.recipe?.name || activeBatch.commercialDenomination || 'Cerveja'}
                                </strong>
                                <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                                  {activeBatch.recipe?.style || 'Standard'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">
                                {tank.status === 'LIVRE' ? 'Tanque livre' : tank.status === 'HIGIENIZANDO' ? 'Em sanitização (CIP)' : 'Em manutenção'}
                              </span>
                            )}
                          </td>

                          {/* Parâmetros Vitais (OG / FG / ABV) */}
                          <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-slate-300">
                            {isOccupied && activeBatch ? (
                              <div>
                                <div>OG: {activeBatch.measuredOg || activeBatch.recipe?.og || '—'} / FG: {activeBatch.measuredFg || activeBatch.recipe?.fg || '—'}</div>
                                <div className="text-[10px] text-emerald-400 font-semibold">
                                  {activeBatch.measuredAbv || activeBatch.recipe?.abv || '—'}% ABV
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* MAPA */}
                          <td className="p-3.5 whitespace-nowrap text-xs">
                            {isOccupied && activeBatch ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold block truncate max-w-[140px] ${
                                  activeBatch.mapaRegistration
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                                title={activeBatch.mapaRegistration || 'Registro MAPA não informado'}
                              >
                                {activeBatch.mapaRegistration || 'Sem MAPA'}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="p-3.5 whitespace-nowrap text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {isOccupied && activeBatch ? (
                                <>
                                  <button
                                    onClick={() => setSelectedBatchForManager(activeBatch)}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1 transition shadow-xs"
                                    title="Adega & Medições"
                                  >
                                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="hidden lg:inline">Adega</span>
                                  </button>

                                  <button
                                    onClick={() => setSelectedBatchForSheet(activeBatch)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                    title="Ficha Oficial MAPA"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => openBatchStatusModal(activeBatch)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                    title="Alterar Fase / Status do Lote"
                                  >
                                    <Sliders className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleLiberateTank(tank)}
                                    className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1 transition border border-slate-700"
                                    title="Desocupar e Liberar Tanque"
                                  >
                                    <span className="hidden lg:inline">Liberar</span>
                                  </button>
                                </>
                              ) : (
                                <div className="inline-flex items-center gap-1 mr-1">
                                  <button
                                    onClick={() => handleQuickTankStatus(tank.id, 'LIVRE')}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'LIVRE' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    title="Marcar como Livre"
                                  >
                                    Livre
                                  </button>
                                  <button
                                    onClick={() => handleQuickTankStatus(tank.id, 'HIGIENIZANDO')}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'HIGIENIZANDO' ? 'bg-blue-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    title="Marcar como CIP / Higienizando"
                                  >
                                    CIP
                                  </button>
                                  <button
                                    onClick={() => handleQuickTankStatus(tank.id, 'MANUTENCAO')}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'MANUTENCAO' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    title="Marcar como Manutenção"
                                  >
                                    Manut.
                                  </button>
                                </div>
                              )}

                              <button
                                onClick={() => openEditTankModal(tank)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                title="Editar Tanque"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() =>
                                  setItemToDelete({
                                    type: 'TANK',
                                    id: tank.id,
                                    title: tank.name,
                                    subtitle: `${tank.capacityLiters}L • ${tank.type}`,
                                  })
                                }
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                                title="Excluir Tanque"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VISUALIZAÇÃO EM GRADE (CARDS UNIFICADOS DE PRODUÇÃO & TANQUES) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedTanks.map((tank) => {
                const activeBatch = getTankActiveBatch(tank);
                const isOccupied = tank.status === 'OCUPADO' || !!activeBatch;
                const volumeInTank = activeBatch ? (activeBatch.volumeProducedLiters || activeBatch.volumePlannedLiters || tank.capacityLiters) : 0;
                const fillPercent = tank.capacityLiters > 0 ? Math.min(100, Math.round((volumeInTank / tank.capacityLiters) * 100)) : 0;
                const elapsedDays = activeBatch ? getElapsedDays(activeBatch.brewDate || activeBatch.createdAt) : null;
                const ingredientsCount = activeBatch ? (activeBatch._count?.ingredients || activeBatch.ingredients?.length || 0) : 0;

                return (
                  <div
                    key={tank.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between hover:border-slate-700 transition relative overflow-hidden group"
                  >
                    <div className="space-y-3.5">
                      {/* Top Header do Tanque */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-white group-hover:text-amber-400 transition flex items-center gap-1.5">
                              <Cylinder className="w-4 h-4 text-amber-400" />
                              <span>{tank.name}</span>
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                isOccupied
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : tank.status === 'LIVRE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : tank.status === 'HIGIENIZANDO'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isOccupied ? (activeBatch?.status || 'OCUPADO') : tank.status}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            {tank.type || 'Fermentador Cônico'} • <strong>{tank.capacityLiters} Litros</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditTankModal(tank)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Editar Tanque"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setItemToDelete({
                                type: 'TANK',
                                id: tank.id,
                                title: tank.name,
                                subtitle: `${tank.capacityLiters}L • ${tank.type}`,
                              })
                            }
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                            title="Excluir Tanque"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Barra de Ocupação */}
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Ocupação do Tanque:</span>
                          <span className="font-mono text-white font-bold">{isOccupied ? `${fillPercent}% (${volumeInTank}L)` : '0% (Vazio)'}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isOccupied ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-slate-700'
                            }`}
                            style={{ width: `${isOccupied ? fillPercent : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Lote Contido no Tanque */}
                      {isOccupied && activeBatch ? (
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-amber-400 text-xs">
                                Lote #{activeBatch.batchNumber}
                              </span>
                              {elapsedDays !== null && (
                                <span className="text-[10px] text-amber-400 font-mono">
                                  ⏱️ Dia {elapsedDays}
                                </span>
                              )}
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {activeBatch.status}
                            </span>
                          </div>

                          <div>
                            <strong className="text-white block text-sm font-bold">
                              {activeBatch.recipe?.name || activeBatch.commercialDenomination || 'Cerveja'}
                            </strong>
                            <span className="text-slate-400 text-[11px] block mt-0.5">
                              {activeBatch.recipe?.style || 'Estilo não especificado'}
                            </span>
                          </div>

                          {/* MAPA & Rastreabilidade */}
                          <div className="flex items-center justify-between gap-2 text-[10px] pt-1">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold truncate max-w-[170px] ${
                                activeBatch.mapaRegistration
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                              title={activeBatch.mapaRegistration || 'Registro MAPA pendente'}
                            >
                              MAPA: {activeBatch.mapaRegistration || 'Pendente'}
                            </span>

                            {ingredientsCount > 0 && (
                              <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                {ingredientsCount} insumos
                              </span>
                            )}
                          </div>

                          {/* Parâmetros Vitais */}
                          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80 text-[10px] text-center font-mono">
                            <div className="bg-slate-900/80 p-1 rounded">
                              <span className="text-[9px] text-slate-500 block font-sans">OG</span>
                              <strong className="text-slate-200">{activeBatch.measuredOg || activeBatch.recipe?.og || '—'}</strong>
                            </div>
                            <div className="bg-slate-900/80 p-1 rounded">
                              <span className="text-[9px] text-slate-500 block font-sans">FG</span>
                              <strong className="text-slate-200">{activeBatch.measuredFg || activeBatch.recipe?.fg || '—'}</strong>
                            </div>
                            <div className="bg-slate-900/80 p-1 rounded">
                              <span className="text-[9px] text-slate-500 block font-sans">ABV</span>
                              <strong className="text-emerald-400">{activeBatch.measuredAbv || activeBatch.recipe?.abv || '—'}%</strong>
                            </div>
                            <div className="bg-slate-900/80 p-1 rounded">
                              <span className="text-[9px] text-slate-500 block font-sans">Volume</span>
                              <strong className="text-slate-200">{volumeInTank}L</strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 space-y-2">
                          <p>Tanque pronto para nova brassagem ou processo de CIP/sanitização.</p>
                          <button
                            onClick={() => setImporterModalOpen(true)}
                            className="text-amber-400 hover:text-amber-300 font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Lançar lote via BeerXML</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Rodapé e Ações Rápidas */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                      {isOccupied && activeBatch ? (
                        <>
                          <button
                            onClick={() => setSelectedBatchForManager(activeBatch)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5 transition text-xs shadow-xs"
                            title="Abrir Medições da Adega"
                          >
                            <Activity className="w-3.5 h-3.5 text-amber-400" />
                            <span>Medições & Adega</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedBatchForSheet(activeBatch)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                              title="Ficha Oficial MAPA"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openBatchStatusModal(activeBatch)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                              title="Alterar Status / Fase do Lote"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleLiberateTank(tank)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
                              title="Desocupar e Liberar Tanque"
                            >
                              Liberar
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">Alterar Status:</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleQuickTankStatus(tank.id, 'LIVRE')}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'LIVRE' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              Livre
                            </button>
                            <button
                              onClick={() => handleQuickTankStatus(tank.id, 'HIGIENIZANDO')}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'HIGIENIZANDO' ? 'bg-blue-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              CIP
                            </button>
                            <button
                              onClick={() => handleQuickTankStatus(tank.id, 'MANUTENCAO')}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${tank.status === 'MANUTENCAO' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              Manutenção
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: TAREFAS DA ADEGA */}
      {productionSubTab === 'TASKS' && (
        <div className="space-y-5">
          {/* Barra de Ferramentas das Tarefas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:px-4 flex flex-col gap-3 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Contagem & Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Tarefas da Adega:</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold border border-amber-300 dark:border-amber-500/30">
                  {sortedTasks.length} {sortedTasks.length === 1 ? 'tarefa' : 'tarefas'}
                </span>
                {search.trim() && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    (filtrando por &ldquo;{search}&rdquo;)
                  </span>
                )}
              </div>

              <div className="flex items-center flex-wrap gap-2.5">
                {/* Ordenação */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span className="hidden sm:inline">Ordenar:</span>
                  </span>
                  <select
                    value={taskSortBy}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setTaskSortBy(val);
                      try { localStorage.setItem('pinttech_task_sort_by', val); } catch {}
                    }}
                    className="bg-transparent text-xs text-amber-700 dark:text-amber-300 font-bold focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="dueDate" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">Data Prevista</option>
                    <option value="urgency" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">Urgência (Atrasada &gt; Hoje)</option>
                    <option value="tank" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">Nome do Tanque</option>
                    <option value="batch" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">Lote / Cerveja</option>
                    <option value="title" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">Título da Tarefa</option>
                    <option value="type" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">Tipo de Processo</option>
                  </select>

                  <button
                    type="button"
                    onClick={toggleTaskSortOrder}
                    className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition"
                    title={taskSortOrder === 'asc' ? 'Ordem Crescente (clique para Decrescente)' : 'Ordem Decrescente (clique para Crescente)'}
                  >
                    {taskSortOrder === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                  </button>
                </div>

                {/* Alternador Grade / Linhas */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => changeTaskViewMode('CARDS')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                      taskViewMode === 'CARDS'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Visualizar como Grade / Cards"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => changeTaskViewMode('ROWS')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                      taskViewMode === 'ROWS'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Visualizar em Linhas"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Linhas</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-filtros Rápidos de Tarefas */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setTaskFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  taskFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-black shadow-xs keep-dark keep-white'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Todas ({allCellarTasks.length})
              </button>

              <button
                type="button"
                onClick={() => setTaskFilter('TODAY')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  taskFilter === 'TODAY'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/50'
                    : 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 font-bold'
                }`}
              >
                <span>⚡ Vence Hoje</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  taskFilter === 'TODAY' ? 'bg-slate-950 text-amber-400' : 'bg-amber-200 dark:bg-amber-400 text-amber-950 dark:text-slate-950'
                }`}>
                  {todayTasksCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTaskFilter('LATE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  taskFilter === 'LATE'
                    ? 'bg-rose-600 text-white keep-white font-black shadow-xs ring-2 ring-rose-500/50'
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 font-bold'
                }`}
              >
                <span>🚨 Atrasadas</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  taskFilter === 'LATE' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white keep-white'
                }`}>
                  {lateTasksCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTaskFilter('PENDING')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  taskFilter === 'PENDING'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-black shadow-xs keep-dark keep-white'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Pendentes ({pendingTasksCount})
              </button>

              <button
                type="button"
                onClick={() => setTaskFilter('COMPLETED')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  taskFilter === 'COMPLETED'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-black shadow-xs keep-dark keep-white'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Concluídas ({allCellarTasks.length - pendingTasksCount})
              </button>
            </div>
          </div>

          {/* LISTA / TABELA DE TAREFAS */}
          {sortedTasks.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
              <Clock className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {allCellarTasks.length === 0
                  ? 'Nenhuma tarefa programada nos lotes ativos da adega'
                  : 'Nenhuma tarefa encontrada para os filtros selecionados'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {allCellarTasks.length === 0
                  ? 'Abra qualquer lote na aba Tanques para programar medições diárias, dosagens de dry hopping, antioxidantes ou purga.'
                  : 'Tente alterar os filtros rápidos acima ou a busca.'}
              </p>
              {allCellarTasks.length === 0 && (
                <button
                  type="button"
                  onClick={() => changeProductionSubTab('TANKS')}
                  className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Cylinder className="w-4 h-4" />
                  <span>Ver Tanques da Produção</span>
                </button>
              )}
            </div>
          ) : taskViewMode === 'ROWS' ? (
            /* VISUALIZAÇÃO EM LINHAS (TABELA DE TAREFAS) */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 w-12 text-center">Status</th>
                      <th
                        onClick={() => handleTaskSortChange('urgency')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-600 dark:hover:text-amber-400 transition whitespace-nowrap"
                        title="Clique para ordenar por Urgência / Prazo"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Prazo / Urgência</span>
                          {taskSortBy === 'urgency' ? (
                            taskSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600 dark:text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTaskSortChange('title')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-600 dark:hover:text-amber-400 transition"
                        title="Clique para ordenar por Tarefa"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Tarefa & Processo</span>
                          {taskSortBy === 'title' ? (
                            taskSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600 dark:text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTaskSortChange('tank')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-600 dark:hover:text-amber-400 transition whitespace-nowrap"
                        title="Clique para ordenar por Tanque"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Tanque</span>
                          {taskSortBy === 'tank' ? (
                            taskSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600 dark:text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTaskSortChange('batch')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-600 dark:hover:text-amber-400 transition whitespace-nowrap"
                        title="Clique para ordenar por Lote"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Lote / Cerveja</span>
                          {taskSortBy === 'batch' ? (
                            taskSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600 dark:text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th
                        onClick={() => handleTaskSortChange('dueDate')}
                        className="p-3.5 cursor-pointer select-none hover:text-amber-600 dark:hover:text-amber-400 transition whitespace-nowrap"
                        title="Clique para ordenar por Data Prevista"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Data Prevista</span>
                          {taskSortBy === 'dueDate' ? (
                            taskSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600 dark:text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                          )}
                        </div>
                      </th>

                      <th className="p-3.5 text-right whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {sortedTasks.map((t) => {
                      const isLate = t.urgency === 'LATE';
                      const isToday = t.urgency === 'TODAY';
                      const isCompleted = t.completed;

                      return (
                        <tr
                          key={`${t.batchId}-${t.id}`}
                          className={`transition-colors border-l-4 keep-hover ${
                            isCompleted
                              ? 'bg-slate-50/70 dark:bg-slate-900/40 border-l-slate-300 dark:border-l-slate-600 opacity-65 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                              : isLate
                              ? 'bg-rose-50/90 dark:bg-rose-950/30 border-l-rose-500 hover:bg-rose-100/80 dark:hover:bg-rose-950/50'
                              : isToday
                              ? 'bg-amber-50/90 dark:bg-amber-950/30 border-l-amber-500 hover:bg-amber-100/80 dark:hover:bg-amber-950/50'
                              : 'bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-transparent'
                          }`}
                        >
                          {/* Checkbox de Conclusão */}
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleTask(t)}
                              className={`w-6 h-6 mx-auto rounded-lg border flex items-center justify-center transition-all ${
                                isCompleted
                                  ? 'bg-emerald-500 border-emerald-500 text-white keep-white'
                                  : isLate
                                  ? 'bg-white dark:bg-rose-950/60 border-2 border-rose-500 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:border-rose-400'
                                  : isToday
                                  ? 'bg-white dark:bg-amber-950/60 border-2 border-amber-500 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:border-amber-300'
                                  : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-amber-500 text-transparent'
                              }`}
                              title={isCompleted ? 'Marcar como Pendente' : 'Marcar como Concluída'}
                            >
                              {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                            </button>
                          </td>

                          {/* Prazo / Urgência */}
                          <td className="p-3.5 whitespace-nowrap">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                                <Check className="w-3 h-3" />
                                <span>Concluída</span>
                              </span>
                            ) : isLate ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white keep-white shadow-xs animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Atrasada ({Math.abs(t.daysDiff)}d)</span>
                              </span>
                            ) : isToday ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-400/50">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Vence Hoje</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                <span>Em {t.daysDiff} dias</span>
                              </span>
                            )}
                          </td>

                          {/* Tarefa & Processo */}
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-xs font-bold ${
                                    isCompleted
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : isLate
                                      ? 'text-rose-950 dark:text-rose-100'
                                      : isToday
                                      ? 'text-amber-950 dark:text-amber-100'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {t.title}
                                </span>

                                {t.type === 'DRY_HOPPING' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                                    🌿 Dry Hopping
                                  </span>
                                )}
                                {t.type === 'ANTIOXIDANT' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30">
                                    🧪 Antioxidante
                                  </span>
                                )}
                                {t.type === 'COLD_CRASH' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
                                    ❄️ Cold Crash
                                  </span>
                                )}
                                {t.type === 'PURGE' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30">
                                    ⚗️ Purga
                                  </span>
                                )}
                                {t.type === 'MEASUREMENT' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
                                    📊 Medição
                                  </span>
                                )}
                                {t.amount && (
                                  <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
                                    ({t.amount} {t.unit || 'KG'})
                                  </span>
                                )}
                              </div>
                              {t.notes && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">
                                  {t.notes}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Tanque */}
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                              <Cylinder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>{t.tankName}</span>
                            </span>
                          </td>

                          {/* Lote / Cerveja */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <span className="font-mono text-amber-700 dark:text-amber-300 font-bold text-xs block">
                                #{t.batchNumber}
                              </span>
                              <span className="text-[11px] text-slate-600 dark:text-slate-400 block truncate max-w-[150px]">
                                {t.recipeName}
                              </span>
                            </div>
                          </td>

                          {/* Data Prevista */}
                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`text-xs font-bold ${
                              isLate ? 'text-rose-700 dark:text-rose-300 font-black' : isToday ? 'text-amber-700 dark:text-amber-300 font-black' : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {formatDate(t.dueDate)}
                            </span>
                            {t.completedAt && (
                              <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                                Feito em {formatDateShort(t.completedAt)}
                              </span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedBatchForManager(t.batch)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 border border-slate-200 hover:border-amber-300 dark:border-slate-700 text-xs font-bold transition inline-flex items-center gap-1"
                              title="Abrir Gestor do Lote na Adega"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span>Adega</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VISUALIZAÇÃO EM CARDS DE TAREFAS */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedTasks.map((t) => {
                const isLate = t.urgency === 'LATE';
                const isToday = t.urgency === 'TODAY';
                const isCompleted = t.completed;

                return (
                  <div
                    key={`${t.batchId}-${t.id}`}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isCompleted
                        ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'
                        : isLate
                        ? 'bg-rose-50/80 dark:bg-rose-950/20 border-2 border-rose-300 dark:border-rose-500 shadow-sm ring-1 ring-rose-300/50 dark:ring-rose-500/30'
                        : isToday
                        ? 'bg-amber-50/80 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-400 shadow-sm ring-1 ring-amber-300/50 dark:ring-amber-400/40'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Header do Card */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isCompleted ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                              ✓ Concluída
                            </span>
                          ) : isLate ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white keep-white shadow-xs animate-pulse">
                              🚨 Atrasada ({Math.abs(t.daysDiff)}d)
                            </span>
                          ) : isToday ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 shadow-xs">
                              ⚡ Vence Hoje
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              📅 Em {t.daysDiff}d
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-amber-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                            <Cylinder className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            {t.tankName}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleTask(t)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-500 text-white keep-white'
                              : isLate
                              ? 'bg-white dark:bg-rose-950/60 border-2 border-rose-500 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:border-rose-400'
                              : isToday
                              ? 'bg-white dark:bg-amber-950/60 border-2 border-amber-500 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:border-amber-300'
                              : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-amber-500 text-transparent'
                          }`}
                          title={isCompleted ? 'Marcar como Pendente' : 'Marcar como Concluída'}
                        >
                          {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>
                      </div>

                      {/* Título & Detalhes */}
                      <div>
                        <h4
                          className={`text-sm font-bold ${
                            isCompleted
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : isLate
                              ? 'text-rose-950 dark:text-rose-100'
                              : isToday
                              ? 'text-amber-950 dark:text-amber-100'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {t.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">#{t.batchNumber}</span>
                          <span>•</span>
                          <span className="truncate">{t.recipeName}</span>
                          {t.amount && (
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 ml-auto">
                              {t.amount} {t.unit || 'KG'}
                            </span>
                          )}
                        </div>
                        {t.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-950/50 p-2 rounded-lg mt-2 border border-slate-200 dark:border-slate-800/80">
                            {t.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer do Card */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span className={isLate ? 'text-rose-700 dark:text-rose-400 font-bold' : isToday ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                          {formatDate(t.dueDate)}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedBatchForManager(t.batch)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-amber-800 dark:text-amber-300 border border-slate-200 hover:border-amber-300 dark:border-transparent text-xs font-bold transition flex items-center gap-1"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Adega</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
        </div>
      )}

      {/* ABA 2: LOTES FINALIZADOS */}
      {activeTab === 'HISTORY_MAPA' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Lotes Finalizados</h3>
              <p className="text-xs text-slate-400">
                Lotes finalizados ou envasados com rastreabilidade arquivada para consulta fiscal e dossiês MAPA.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{filteredHistory.length} lotes</span>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Nenhum lote finalizado encontrado no histórico.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Nº Lote</th>
                    <th className="p-3">Cerveja & Estilo</th>
                    <th className="p-3">Data Brassagem</th>
                    <th className="p-3">Volume</th>
                    <th className="p-3">Registro MAPA</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Dossiê Oficial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredHistory.map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-amber-400">{batch.batchNumber}</td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{batch.recipe?.name}</span>
                        <span className="text-slate-400 text-[11px]">{batch.recipe?.style}</span>
                      </td>
                      <td className="p-3 text-slate-300">{formatDate(batch.brewDate)}</td>
                      <td className="p-3 font-mono">{batch.volumeProducedLiters || batch.volumePlannedLiters}L</td>
                      <td className="p-3 font-mono text-slate-400">{batch.mapaRegistration || '—'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {batch.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBatchForSheet(batch)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition"
                            title="Reimprimir Dossiê MAPA"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ficha MAPA</span>
                          </button>

                          <button
                            onClick={() => setSelectedBatchForManager(batch)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Editar Dados do Lote"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() =>
                              setItemToDelete({
                                type: 'BATCH',
                                id: batch.id,
                                title: `Lote ${batch.batchNumber}`,
                                subtitle: `${batch.recipe?.name || 'Cerveja'} • Data: ${formatDate(batch.brewDate)}`,
                              })
                            }
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                            title="Excluir Lote do Histórico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 4: CATÁLOGO DE RECEITAS (BEERXML) */}
      {activeTab === 'RECIPES' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Receitas BeerSmith Importadas</h3>
              <p className="text-xs text-slate-400">
                Fichas técnicas prontas. Você pode despachar novos lotes diretamente a partir destas receitas.
              </p>
            </div>
            <button
              onClick={() => setImporterModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Novo BeerXML</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        {recipe.style}
                      </span>
                      <h4 className="text-base font-black text-white">{recipe.name}</h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedRecipeForEdit(recipe)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                        title="Editar Receita"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          setItemToDelete({
                            type: 'RECIPE',
                            id: recipe.id,
                            title: recipe.name,
                            subtitle: `Estilo: ${recipe.style}`,
                          })
                        }
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                        title="Excluir Receita"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {recipe.description || 'Sem observações informadas.'}
                  </p>

                  <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-2 rounded-xl text-center text-xs font-mono mt-3">
                    <div>
                      <span className="text-[9px] text-slate-500 font-sans block">OG</span>
                      <span className="text-slate-200">{recipe.og?.toFixed(3) || '1.050'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-sans block">ABV</span>
                      <span className="text-slate-200">{recipe.abv?.toFixed(1) || '5.0'}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-sans block">IBU</span>
                      <span className="text-slate-200">{recipe.ibu || '25'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-sans block">EBC</span>
                      <span className="text-slate-200">{recipe.ebc || '10'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                    {recipe.mapaRegistration || 'Sem MAPA'}
                  </span>
                  <button
                    onClick={() => setImporterModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lançar Lote via XML</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO BEERXML & RASTREABILIDADE MAPA */}
      {importerModalOpen && (
        <BeerXmlImporterModal
          tanks={tanks}
          onClose={() => setImporterModalOpen(false)}
          onBatchCreated={(created) => {
            fetchData();
            setSelectedBatchForSheet(created);
          }}
        />
      )}

      {/* MODAL DE IMPRESSÃO DA FICHA OFICIAL MAPA */}
      {selectedBatchForSheet && (
        <MapaTraceabilitySheetModal
          batch={selectedBatchForSheet}
          brewery={brewery}
          onBreweryUpdated={(updated) => setBrewery(updated)}
          onClose={() => setSelectedBatchForSheet(null)}
        />
      )}

      {/* MODAL DE CONTROLE DE ADEGA, MEDIÇÕES & MULTI-MASH PH */}
      {selectedBatchForManager && (
        <LiveBatchManagerModal
          batch={selectedBatchForManager}
          tanks={tanks}
          onClose={() => setSelectedBatchForManager(null)}
          onSaved={() => {
            fetchData();
            setSelectedBatchForManager(null);
          }}
        />
      )}

      {/* MODAL DE EDIÇÃO DE RECEITA */}
      {selectedRecipeForEdit && (
        <EditRecipeModal
          recipe={selectedRecipeForEdit}
          onClose={() => setSelectedRecipeForEdit(null)}
          onSaved={() => {
            fetchData();
            setSelectedRecipeForEdit(null);
          }}
        />
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE TANQUE */}
      {tankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 space-y-5 text-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Cylinder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">{editingTank ? 'Editar Tanque' : 'Novo Tanque da Adega'}</h3>
                  <p className="text-[11px] text-slate-400">Fermentadores, maturadores e tanques de serviço</p>
                </div>
              </div>
              <button onClick={() => setTankModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTank} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nome / Identificação do Tanque *</label>
                <input
                  type="text"
                  required
                  value={tankName}
                  onChange={(e) => setTankName(e.target.value)}
                  placeholder="Ex: Fermentador 01, Maturador 02, BBT 01"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Capacidade (Litros) *</label>
                  <input
                    type="number"
                    required
                    min="50"
                    step="10"
                    value={tankCapacity}
                    onChange={(e) => setTankCapacity(e.target.value)}
                    placeholder="1000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold font-mono focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tipo de Tanque</label>
                  <select
                    value={tankType}
                    onChange={(e) => setTankType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                  >
                    <option value="Fermentador Cônico">Fermentador Cônico</option>
                    <option value="Maturador Horizontal">Maturador Horizontal</option>
                    <option value="BBT (Bright Beer Tank)">BBT (Bright Beer Tank)</option>
                    <option value="Isotérmico">Isotérmico</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Status Operacional</label>
                <select
                  value={tankStatus}
                  onChange={(e) => setTankStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  <option value="LIVRE">🟢 LIVRE (Pronto para brassagem)</option>
                  <option value="OCUPADO">🟣 OCUPADO (Com cerveja)</option>
                  <option value="HIGIENIZANDO">🔵 HIGIENIZANDO / CIP</option>
                  <option value="MANUTENCAO">🟡 EM MANUTENÇÃO</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Observações do Tanque</label>
                <textarea
                  rows={2}
                  value={tankNotes}
                  onChange={(e) => setTankNotes(e.target.value)}
                  placeholder="Ex: Válvula de amostragem trocada recentemente..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-medium focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTankModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTank}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition disabled:opacity-50 flex items-center gap-1.5 shadow"
                >
                  {savingTank ? 'Salvando...' : editingTank ? 'Salvar Alterações' : 'Cadastrar Tanque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO PARA ATUALIZAR STATUS DO LOTE */}
      {editingBatchStatus && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm">Atualizar Status do Lote {editingBatchStatus.batchNumber}</h4>
              <button onClick={() => setEditingBatchStatus(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Status de Produção:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  <option value="BRASSAGEM">🔥 BRASSAGEM</option>
                  <option value="FERMENTANDO">🟢 FERMENTANDO</option>
                  <option value="MATURANDO">❄️ MATURANDO</option>
                  <option value="PRONTO_ENVASE">✨ PRONTO PARA ENVASE</option>
                  <option value="ENVASADO">🛢️ ENVASADO (Liberar Tanque)</option>
                  <option value="FINALIZADO">✅ FINALIZADO</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">FG Medida (Densidade Final):</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="1.010"
                    value={newMeasuredFg}
                    onChange={(e) => setNewMeasuredFg(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">ABV Real (% Álcool):</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="5.2"
                    value={newMeasuredAbv}
                    onChange={(e) => setNewMeasuredAbv(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingBatchStatus(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateBatchStatus}
                disabled={savingStatus}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
              >
                {savingStatus ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO UNIFICADO */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 text-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Confirmar Exclusão</h3>
                <p className="text-xs text-rose-300">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">
                Você está prestes a excluir o seguinte{' '}
                <strong className="text-white font-bold">
                  {itemToDelete.type === 'BATCH' ? 'Lote de Produção' : itemToDelete.type === 'RECIPE' ? 'Receita' : 'Tanque'}
                </strong>:
              </div>
              <div className="text-sm font-bold text-amber-300 font-mono">{itemToDelete.title}</div>
              {itemToDelete.subtitle && (
                <div className="text-[11px] text-slate-400">{itemToDelete.subtitle}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
