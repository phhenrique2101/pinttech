'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  Users,
  Cylinder,
  Wrench,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  Package,
  ArrowRight,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  TrendingUp,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportJsonToExcel } from '@/lib/exportUtils';

type ReportType = 'ORDERS' | 'KEGS' | 'EQUIPMENT' | 'CLIENTS' | 'FINANCIAL' | 'STOCK';

interface ColumnDef {
  id: string;
  label: string;
  defaultSelected: boolean;
  getter: (item: any) => any;
}

export default function RelatoriosPage() {
  const [reportType, setReportType] = useState<ReportType>('ORDERS');
  const [loading, setLoading] = useState(false);

  // Raw data stores
  const [orders, setOrders] = useState<any[]>([]);
  const [kegs, setKegs] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [financial, setFinancial] = useState<any[]>([]);

  // Filter states
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [capacityFilter, setCapacityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Columns per report type
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ordRes, kegRes, eqRes, cliRes, finRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/kegs'),
        fetch('/api/equipment'),
        fetch('/api/clients'),
        fetch('/api/financial'),
      ]);

      const [ordData, kegData, eqData, cliData, finData] = await Promise.all([
        ordRes.json(),
        kegRes.json(),
        eqRes.json(),
        cliRes.json(),
        finRes.json(),
      ]);

      if (Array.isArray(ordData)) setOrders(ordData);
      if (Array.isArray(kegData)) setKegs(kDataFilter(kegData));
      if (Array.isArray(eqData)) setEquipment(eqData);
      if (Array.isArray(cliData)) setClients(cliData);
      if (Array.isArray(finData)) setFinancial(finData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const kDataFilter = (data: any[]) => data;

  useEffect(() => {
    loadAllData();
  }, []);

  // Columns definition for each report type
  const COLUMNS_MAP: Record<ReportType, ColumnDef[]> = {
    ORDERS: [
      { id: 'orderNumber', label: 'Nº do Pedido', defaultSelected: true, getter: (o) => `#${o.orderNumber}` },
      { id: 'createdAt', label: 'Data do Pedido', defaultSelected: true, getter: (o) => formatDate(o.createdAt) },
      { id: 'deliveryDate', label: 'Data de Entrega', defaultSelected: true, getter: (o) => o.deliveryDate ? formatDate(o.deliveryDate) : '—' },
      { id: 'clientName', label: 'Cliente', defaultSelected: true, getter: (o) => o.client?.tradeName || o.client?.name || '—' },
      { id: 'clientDoc', label: 'CNPJ / CPF', defaultSelected: false, getter: (o) => o.client?.document || '—' },
      { id: 'clientPhone', label: 'Telefone', defaultSelected: false, getter: (o) => o.client?.phone || '—' },
      { id: 'clientCity', label: 'Cidade', defaultSelected: true, getter: (o) => o.client?.city || '—' },
      { id: 'itemsSummary', label: 'Chopp & Barris Solicitados', defaultSelected: true, getter: (o) => (o.items || []).map((i: any) => `${i.quantity}x ${i.recipe?.name || i.description || 'Barril'} (${i.kegCapacity || 50}L)`).join(', ') },
      { id: 'totalLiters', label: 'Litros Totais', defaultSelected: true, getter: (o) => (o.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 1) * (it.kegCapacity || 50), 0) },
      { id: 'equipmentsSummary', label: 'Chopeiras em Comodato', defaultSelected: false, getter: (o) => (o.orderEquipments || []).map((oe: any) => oe.equipment?.name || oe.equipment?.code).join(', ') || 'Nenhum' },
      { id: 'subtotal', label: 'Subtotal (R$)', defaultSelected: false, getter: (o) => (o.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 1) * (it.unitPrice || 0), 0) },
      { id: 'discount', label: 'Desconto (R$)', defaultSelected: false, getter: (o) => o.discount || 0 },
      { id: 'deliveryFee', label: 'Frete (R$)', defaultSelected: false, getter: (o) => o.deliveryFee || 0 },
      { id: 'cautionDeposit', label: 'Caução Chopeira (R$)', defaultSelected: false, getter: (o) => o.cautionDeposit || 0 },
      { id: 'totalAmount', label: 'Valor Total (R$)', defaultSelected: true, getter: (o) => o.totalAmount },
      { id: 'paidAmount', label: 'Valor Já Recebido (R$)', defaultSelected: true, getter: (o) => o.paidAmount || 0 },
      { id: 'remainingAmount', label: 'Saldo Pendente (R$)', defaultSelected: true, getter: (o) => Math.max(0, o.totalAmount - (o.paidAmount || 0)) },
      { id: 'paymentMethod', label: 'Forma de Pagamento', defaultSelected: true, getter: (o) => o.paymentMethod || '—' },
      { id: 'status', label: 'Status do Pedido', defaultSelected: true, getter: (o) => o.status },
      { id: 'deliveryAddress', label: 'Endereço de Entrega', defaultSelected: false, getter: (o) => o.deliveryAddress || '—' },
      { id: 'notes', label: 'Observações', defaultSelected: false, getter: (o) => o.notes || '—' },
    ],
    KEGS: [
      { id: 'code', label: 'Código do Barril', defaultSelected: true, getter: (k) => k.code },
      { id: 'capacity', label: 'Capacidade Nominal (L)', defaultSelected: true, getter: (k) => `${k.capacity}L` },
      { id: 'currentVolumeLiters', label: 'Volume Real de Chopp (L)', defaultSelected: true, getter: (k) => k.currentVolumeLiters !== null && k.currentVolumeLiters !== undefined ? `${k.currentVolumeLiters}L` : (k.status === 'EM_ESTOQUE' || k.status === 'ENVASADO' || k.status === 'NO_CLIENTE' ? `${k.capacity}L` : '0L (Vazio)') },
      { id: 'kegType', label: 'Tipo de Válvula / Barril', defaultSelected: true, getter: (k) => k.kegType?.replace('_', ' ') || 'INOX EURO' },
      { id: 'status', label: 'Status Atual', defaultSelected: true, getter: (k) => k.status },
      { id: 'currentBeerName', label: 'Chopp Envasado', defaultSelected: true, getter: (k) => k.currentBeerName || '—' },
      { id: 'batchNumber', label: 'Lote de Produção', defaultSelected: true, getter: (k) => k.currentBatch?.batchNumber || '—' },
      { id: 'currentClient', label: 'Cliente Atual (Em Comodato)', defaultSelected: true, getter: (k) => k.currentClient?.tradeName || k.currentClient?.name || (k.status === 'EM_ESTOQUE' ? 'Na Câmara Fria' : 'Na Cervejaria') },
      { id: 'clientCity', label: 'Cidade do Cliente', defaultSelected: false, getter: (k) => k.currentClient?.city || '—' },
      { id: 'lastDeliveredAt', label: 'Data de Entrega ao Cliente', defaultSelected: true, getter: (k) => k.lastDeliveredAt ? formatDate(k.lastDeliveredAt) : '—' },
      { id: 'lastSanitizedAt', label: 'Última Higienização CIP', defaultSelected: false, getter: (k) => k.lastSanitizedAt ? formatDate(k.lastSanitizedAt) : '—' },
      { id: 'notes', label: 'Observações', defaultSelected: false, getter: (k) => k.notes || '—' },
    ],
    EQUIPMENT: [
      { id: 'code', label: 'Código do Equipamento', defaultSelected: true, getter: (e) => e.code },
      { id: 'name', label: 'Nome / Modelo', defaultSelected: true, getter: (e) => e.name },
      { id: 'type', label: 'Tipo de Equipamento', defaultSelected: true, getter: (e) => e.type?.replace('_', ' ') || 'CHOPEIRA ELETRICA' },
      { id: 'voltage', label: 'Voltagem', defaultSelected: true, getter: (e) => e.voltage || '—' },
      { id: 'serialNumber', label: 'Nº de Série', defaultSelected: false, getter: (e) => e.serialNumber || '—' },
      { id: 'status', label: 'Status Atual', defaultSelected: true, getter: (e) => e.status },
      { id: 'currentClient', label: 'Cliente em Posse', defaultSelected: true, getter: (e) => e.currentClient?.tradeName || e.currentClient?.name || (e.status === 'DISPONIVEL' ? 'Disponível na Fábrica' : '—') },
      { id: 'clientCity', label: 'Cidade do Cliente', defaultSelected: false, getter: (e) => e.currentClient?.city || '—' },
      { id: 'notes', label: 'Observações', defaultSelected: false, getter: (e) => e.notes || '—' },
    ],
    CLIENTS: [
      { id: 'name', label: 'Nome / Razão Social', defaultSelected: true, getter: (c) => c.name },
      { id: 'tradeName', label: 'Nome Fantasia', defaultSelected: true, getter: (c) => c.tradeName || c.name },
      { id: 'document', label: 'CNPJ / CPF', defaultSelected: true, getter: (c) => c.document || '—' },
      { id: 'phone', label: 'Telefone / WhatsApp', defaultSelected: true, getter: (c) => c.phone || '—' },
      { id: 'email', label: 'E-mail', defaultSelected: false, getter: (c) => c.email || '—' },
      { id: 'city', label: 'Cidade', defaultSelected: true, getter: (c) => c.city || '—' },
      { id: 'neighborhood', label: 'Bairro', defaultSelected: false, getter: (c) => c.neighborhood || '—' },
      { id: 'address', label: 'Endereço', defaultSelected: false, getter: (c) => `${c.address || ''} ${c.number || ''}`.trim() || '—' },
      { id: 'retainedKegsCount', label: 'Barris Atualmente Retidos', defaultSelected: true, getter: (c) => c.retainedKegsCount || (c.kegs || []).length || 0 },
      { id: 'retainedEquipmentCount', label: 'Chopeiras Retidas', defaultSelected: true, getter: (c) => (c.equipment || []).length || 0 },
      { id: 'ordersCount', label: 'Total de Pedidos Realizados', defaultSelected: true, getter: (c) => c._count?.orders || (c.orders || []).length || 0 },
      { id: 'creditLimit', label: 'Limite de Crédito (R$)', defaultSelected: false, getter: (c) => c.creditLimit || 'Sem limite' },
      { id: 'notes', label: 'Observações', defaultSelected: false, getter: (c) => c.notes || '—' },
    ],
    FINANCIAL: [
      { id: 'dueDate', label: 'Data de Vencimento', defaultSelected: true, getter: (f) => formatDate(f.dueDate) },
      { id: 'paidDate', label: 'Data de Pagamento', defaultSelected: true, getter: (f) => f.paidDate ? formatDate(f.paidDate) : '—' },
      { id: 'description', label: 'Descrição do Lançamento', defaultSelected: true, getter: (f) => f.description },
      { id: 'category', label: 'Categoria', defaultSelected: true, getter: (f) => f.category || 'Venda de Chopp' },
      { id: 'type', label: 'Tipo (Receita / Despesa)', defaultSelected: true, getter: (f) => f.type === 'INCOME' ? 'RECEITA' : 'DESPESA' },
      { id: 'amount', label: 'Valor (R$)', defaultSelected: true, getter: (f) => f.amount },
      { id: 'status', label: 'Status do Pagamento', defaultSelected: true, getter: (f) => f.status === 'PAID' ? 'PAGO / RECEBIDO' : 'PENDENTE' },
      { id: 'paymentMethod', label: 'Forma de Pagamento', defaultSelected: true, getter: (f) => f.paymentMethod || 'PIX' },
      { id: 'clientName', label: 'Cliente / Fornecedor', defaultSelected: true, getter: (f) => f.client?.name || f.client?.tradeName || '—' },
      { id: 'orderNumber', label: 'Nº do Pedido Relacionado', defaultSelected: false, getter: (f) => f.order?.orderNumber ? `#${f.order.orderNumber}` : '—' },
      { id: 'notes', label: 'Observações', defaultSelected: false, getter: (f) => f.notes || '—' },
    ],
    STOCK: [
      { id: 'beerName', label: 'Estilo / Cerveja', defaultSelected: true, getter: (s) => s.beerName },
      { id: 'style', label: 'Família / Estilo Cervejeiro', defaultSelected: true, getter: (s) => s.style },
      { id: 'totalRealLiters', label: 'Volume Real de Chopp (Litros)', defaultSelected: true, getter: (s) => s.totalRealLiters },
      { id: 'totalNominalCapacity', label: 'Capacidade Nominal Total (Litros)', defaultSelected: false, getter: (s) => s.totalNominalCapacity },
      { id: 'availableLiters', label: 'Saldo Livre para Venda (Litros Reais)', defaultSelected: true, getter: (s) => s.availableLiters },
      { id: 'reservedLiters', label: 'Reservado em Pedidos (Litros)', defaultSelected: true, getter: (s) => s.reservedLiters },
      { id: 'totalKegs', label: 'Total de Barris Cheios', defaultSelected: true, getter: (s) => s.kegsCount },
      { id: 'availableKegs', label: 'Barris Livres para Venda', defaultSelected: true, getter: (s) => s.availableKegsCount },
      { id: 'reservedKegs', label: 'Barris Reservados em Pedidos', defaultSelected: true, getter: (s) => s.reservedKegsCount },
      { id: 'salePricePerLiter', label: 'Preço Venda / Litro (R$)', defaultSelected: true, getter: (s) => s.salePricePerLiter },
      { id: 'costPerLiter', label: 'Custo Produção / Litro (R$)', defaultSelected: true, getter: (s) => s.costPerLiter },
      { id: 'totalPotentialSale', label: 'Valor Total em Venda (R$)', defaultSelected: true, getter: (s) => s.totalPotentialSale },
    ],
  };

  // Initialize selected columns when report type changes
  useEffect(() => {
    const defaultCols = (COLUMNS_MAP[reportType] || []).filter((c) => c.defaultSelected).map((c) => c.id);
    setSelectedColumns(defaultCols);
  }, [reportType]);

  // Date filtering helper
  const isDateInRange = (dateStr?: string | Date) => {
    if (!dateStr) return true;
    if (datePreset === 'ALL') return true;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (datePreset === 'TODAY') {
      return d >= startOfToday;
    }
    if (datePreset === 'LAST_7_DAYS') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= sevenDaysAgo;
    }
    if (datePreset === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return d >= startOfMonth;
    }
    if (datePreset === 'LAST_MONTH') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    }
    if (datePreset === 'THIS_YEAR') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return d >= startOfYear;
    }
    if (datePreset === 'CUSTOM') {
      if (customStartDate && d < new Date(customStartDate)) return false;
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59);
        if (d > end) return false;
      }
      return true;
    }
    return true;
  };

  // Build filtered dataset for current report type
  const getFilteredData = () => {
    if (reportType === 'ORDERS') {
      return orders.filter((o) => {
        if (!isDateInRange(o.createdAt || o.deliveryDate)) return false;
        if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
        if (clientFilter !== 'ALL' && o.clientId !== clientFilter) return false;
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const matches =
            o.orderNumber?.toLowerCase().includes(s) ||
            o.client?.name?.toLowerCase().includes(s) ||
            o.client?.tradeName?.toLowerCase().includes(s);
          if (!matches) return false;
        }
        return true;
      });
    }

    if (reportType === 'KEGS') {
      return kegs.filter((k) => {
        if (statusFilter !== 'ALL' && k.status !== statusFilter) return false;
        if (capacityFilter !== 'ALL' && String(k.capacity) !== capacityFilter) return false;
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const matches =
            k.code?.toLowerCase().includes(s) ||
            k.currentBeerName?.toLowerCase().includes(s) ||
            k.currentClient?.name?.toLowerCase().includes(s);
          if (!matches) return false;
        }
        return true;
      });
    }

    if (reportType === 'EQUIPMENT') {
      return equipment.filter((e) => {
        if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const matches =
            e.code?.toLowerCase().includes(s) ||
            e.name?.toLowerCase().includes(s) ||
            e.currentClient?.name?.toLowerCase().includes(s);
          if (!matches) return false;
        }
        return true;
      });
    }

    if (reportType === 'CLIENTS') {
      return clients.filter((c) => {
        if (statusFilter === 'WITH_RETAINED_KEGS' && (c.retainedKegsCount || (c.kegs || []).length) <= 0) return false;
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const matches =
            c.name?.toLowerCase().includes(s) ||
            c.tradeName?.toLowerCase().includes(s) ||
            c.city?.toLowerCase().includes(s) ||
            c.document?.toLowerCase().includes(s);
          if (!matches) return false;
        }
        return true;
      });
    }

    if (reportType === 'FINANCIAL') {
      return financial.filter((f) => {
        if (!isDateInRange(f.dueDate || f.createdAt)) return false;
        if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const matches =
            f.description?.toLowerCase().includes(s) ||
            f.category?.toLowerCase().includes(s) ||
            f.client?.name?.toLowerCase().includes(s);
          if (!matches) return false;
        }
        return true;
      });
    }

    if (reportType === 'STOCK') {
      // Group kegs by beer
      const stockMap: Record<string, any> = {};
      const packagedKegs = kegs.filter((k) => k.status === 'EM_ESTOQUE' || k.status === 'ENVASADO');

      packagedKegs.forEach((k) => {
        const beerName = k.currentBeerName || k.currentBatch?.recipe?.name || 'Chopp Não Identificado';
        const style = k.currentBatch?.recipe?.style || 'Estilo Artesanal';
        const costL = k.currentBatch?.costPerLiter || k.currentBatch?.recipe?.costPerLiter || 4.5;
        const saleL = k.currentBatch?.recipe?.salePricePerLiter || k.currentBatch?.recipe?.suggestedPricePerLiter || 20.0;
        const cap = k.capacity || 50;
        const actualLiters = k.currentVolumeLiters !== null && k.currentVolumeLiters !== undefined ? k.currentVolumeLiters : cap;

        if (!stockMap[beerName]) {
          stockMap[beerName] = {
            beerName,
            style,
            totalRealLiters: 0,
            totalNominalCapacity: 0,
            kegsCount: 0,
            reservedKegsCount: 0,
            reservedLiters: 0,
            availableLiters: 0,
            availableKegsCount: 0,
            costPerLiter: costL,
            salePricePerLiter: saleL,
            totalPotentialSale: 0,
          };
        }

        stockMap[beerName].totalRealLiters += actualLiters;
        stockMap[beerName].totalNominalCapacity += cap;
        stockMap[beerName].kegsCount += 1;
      });

      // Subtract active reservations
      Object.values(stockMap).forEach((b: any) => {
        let resL = 0;
        let resK = 0;
        orders.forEach((o) => {
          if (['ORCAMENTO', 'CONFIRMADO', 'EM_SEPARACAO'].includes(o.status)) {
            (o.items || []).forEach((it: any) => {
              const itName = it.recipe?.name || it.description?.replace(/Barril.*?-\s*/i, '').trim();
              if (itName && itName.toLowerCase() === b.beerName.toLowerCase()) {
                const qty = it.quantity || 1;
                const cap = it.kegCapacity || 50;
                resL += qty * cap;
                resK += qty;
              }
            });
          }
        });
        b.reservedLiters = resL;
        b.reservedKegsCount = resK;
        b.availableLiters = Math.max(0, b.totalRealLiters - resL);
        b.availableKegsCount = Math.max(0, b.kegsCount - resK);
        b.totalPotentialSale = b.totalRealLiters * b.salePricePerLiter;
      });

      return Object.values(stockMap).filter((b: any) => {
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          return b.beerName.toLowerCase().includes(s) || b.style.toLowerCase().includes(s);
        }
        return true;
      });
    }

    return [];
  };

  const filteredItems = getFilteredData();
  const currentColumns = COLUMNS_MAP[reportType] || [];
  const activeColumnDefs = currentColumns.filter((c) => selectedColumns.includes(c.id));

  // Toggle single column
  const toggleColumn = (colId: string) => {
    if (selectedColumns.includes(colId)) {
      if (selectedColumns.length === 1) {
        alert('Selecione pelo menos uma coluna para exportar.');
        return;
      }
      setSelectedColumns(selectedColumns.filter((id) => id !== colId));
    } else {
      setSelectedColumns([...selectedColumns, colId]);
    }
  };

  // Toggle all columns
  const toggleAllColumns = () => {
    if (selectedColumns.length === currentColumns.length) {
      setSelectedColumns(currentColumns.slice(0, 3).map((c) => c.id));
    } else {
      setSelectedColumns(currentColumns.map((c) => c.id));
    }
  };

  // Execute export to Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      alert('Nenhum dado encontrado para os filtros selecionados.');
      return;
    }

    if (activeColumnDefs.length === 0) {
      alert('Selecione pelo menos uma coluna.');
      return;
    }

    // Map rows to selected columns
    const exportRows = filteredItems.map((item) => {
      const row: Record<string, any> = {};
      activeColumnDefs.forEach((col) => {
        row[col.label] = col.getter(item);
      });
      return row;
    });

    const reportLabels: Record<ReportType, string> = {
      ORDERS: 'Pedidos_e_Vendas',
      KEGS: 'Relatorio_de_Barris',
      EQUIPMENT: 'Equipamentos_Chopeiras',
      CLIENTS: 'Clientes_e_Vasilhames',
      FINANCIAL: 'Financeiro_Fluxo_Caixa',
      STOCK: 'Estoque_Camara_Fria',
    };

    const dateTag = new Date().toISOString().slice(0, 10);
    const fileName = `Relatorio_${reportLabels[reportType]}_${dateTag}.xlsx`;

    exportJsonToExcel(exportRows, fileName, reportLabels[reportType]);
  };

  // Preview rows (first 5)
  const previewRows = filteredItems.slice(0, 5).map((item) => {
    const row: Record<string, any> = {};
    activeColumnDefs.forEach((col) => {
      row[col.label] = col.getter(item);
    });
    return row;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 rounded-3xl border border-amber-500/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
              Exportação Fácil
            </span>
            <span className="text-xs text-amber-300/80 font-medium">Planilhas Formatadas (.xlsx)</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-amber-400" />
            Central de Relatórios & Exportação em Excel
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Gere relatórios completos de vendas, comodato, barris, clientes e financeiro com filtros por período e seleção livre das colunas que você quer no Excel.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={filteredItems.length === 0}
          className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Download className="w-5 h-5" />
          <span>Baixar Excel ({filteredItems.length} registros)</span>
        </button>
      </div>

      {/* Destaque: Integração Power BI */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Integração Completa com Microsoft Power BI</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 uppercase">Nativo</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Conecte 100% do banco de dados (Vendas, Lotes de Produção, Barris, Estoque e Financeiro) via Direct PostgreSQL ou Web Feed.
            </p>
          </div>
        </div>

        <Link
          href="/relatorios/powerbi"
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition shadow-md flex-shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Acessar Central Power BI</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Step 1: Escolha o Tipo de Relatório */}
      <div>
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2 px-1">
          Selecione o Relatório que Deseja Gerar:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { type: 'ORDERS' as ReportType, label: 'Pedidos & Vendas', icon: ShoppingCart, count: orders.length, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
            { type: 'KEGS' as ReportType, label: 'Barris', icon: Cylinder, count: kegs.length, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
            { type: 'EQUIPMENT' as ReportType, label: 'Chopeiras & Comodato', icon: Wrench, count: equipment.length, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
            { type: 'CLIENTS' as ReportType, label: 'Clientes & Vasilhames', icon: Users, count: clients.length, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
            { type: 'STOCK' as ReportType, label: 'Estoque de Chopp', icon: Package, count: kegs.filter(k => k.status === 'EM_ESTOQUE' || k.status === 'ENVASADO').length, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { type: 'FINANCIAL' as ReportType, label: 'Financeiro & Caixa', icon: DollarSign, count: financial.length, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
          ].map((item) => {
            const isSelected = reportType === item.type;
            const Icon = item.icon;

            return (
              <button
                key={item.type}
                onClick={() => {
                  setReportType(item.type);
                  setStatusFilter('ALL');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? `${item.bg} ${item.border} ring-2 ring-amber-500/40 shadow-sm`
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${item.bg} ${item.color} border ${item.border}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-xs text-slate-900 leading-tight">{item.label}</h3>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">
                  {item.count} total
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Filtros Personalizados */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Filtros do Relatório
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
              ✓ {filteredItems.length} registros selecionados
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Período Preset (Para Pedidos e Financeiro) */}
          {(reportType === 'ORDERS' || reportType === 'FINANCIAL') && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Período:
              </label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as any)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="THIS_MONTH">Este Mês Atual</option>
                <option value="LAST_MONTH">Mês Passado</option>
                <option value="LAST_7_DAYS">Últimos 7 Dias</option>
                <option value="TODAY">Hoje</option>
                <option value="THIS_YEAR">Este Ano</option>
                <option value="CUSTOM">Data Personalizada...</option>
                <option value="ALL">Todo o Histórico</option>
              </select>
            </div>
          )}

          {/* Custom Date Range */}
          {datePreset === 'CUSTOM' && (reportType === 'ORDERS' || reportType === 'FINANCIAL') && (
            <>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Data Início:
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Data Fim:
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
            </>
          )}

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">Todos os Status</option>
              {reportType === 'ORDERS' && (
                <>
                  <option value="ENTREGUE">Entregues</option>
                  <option value="CONFIRMADO">Confirmados</option>
                  <option value="EM_SEPARACAO">Em Separação</option>
                  <option value="ORCAMENTO">Orçamentos</option>
                  <option value="CONCLUIDO">Concluídos</option>
                  <option value="CANCELADO">Cancelados</option>
                </>
              )}
              {reportType === 'KEGS' && (
                <>
                  <option value="EM_ESTOQUE">Na Câmara Fria (Cheios)</option>
                  <option value="NO_CLIENTE">No Cliente (Em Comodato)</option>
                  <option value="HIGIENIZADO">Higienizados (Prontos)</option>
                  <option value="VAZIO_SUJO">Vazios / Sujos</option>
                  <option value="MANUTENCAO">Em Manutenção</option>
                  <option value="INATIVO">Inativos</option>
                </>
              )}
              {reportType === 'EQUIPMENT' && (
                <>
                  <option value="DISPONIVEL">Disponíveis na Fábrica</option>
                  <option value="EM_USO_CLIENTE">Em Uso com Cliente</option>
                  <option value="EM_TRANSITO">Em Trânsito</option>
                  <option value="MANUTENCAO">Em Manutenção</option>
                </>
              )}
              {reportType === 'CLIENTS' && (
                <>
                  <option value="WITH_RETAINED_KEGS">Apenas Clientes com Barris Retidos</option>
                </>
              )}
              {reportType === 'FINANCIAL' && (
                <>
                  <option value="PAID">Pagos / Recebidos</option>
                  <option value="PENDING">Pendentes</option>
                </>
              )}
            </select>
          </div>

          {/* Litragem Filter for Barris */}
          {reportType === 'KEGS' && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Litragem:
              </label>
              <select
                value={capacityFilter}
                onChange={(e) => setCapacityFilter(e.target.value)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
              >
                <option value="ALL">Todas as Capacidades</option>
                <option value="50">50 Litros</option>
                <option value="30">30 Litros</option>
                <option value="20">20 Litros</option>
                <option value="15">15 Litros</option>
                <option value="10">10 Litros</option>
                <option value="5">5 Litros</option>
              </select>
            </div>
          )}

          {/* Search Term */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Buscar / Pesquisar:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Nome, código, cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Escolha Livre das Colunas para o Excel */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Colunas a Incluir no Arquivo Excel (.xlsx)
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Marque ou desmarque para gerar a planilha exatamente com os campos que você precisa.
            </p>
          </div>

          <button
            onClick={toggleAllColumns}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 self-start sm:self-auto"
          >
            {selectedColumns.length === currentColumns.length ? 'Desmarcar Todas' : 'Selecionar Todas as Colunas'}
          </button>
        </div>

        {/* Checkbox Chips Grid */}
        <div className="flex flex-wrap gap-2">
          {currentColumns.map((col) => {
            const isChecked = selectedColumns.includes(col.id);

            return (
              <button
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isChecked
                    ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {isChecked ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{col.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 4: Prévia em Tempo Real */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Pré-visualização do Relatório (Primeiras 5 Linhas)
            </h2>
            <span className="text-[11px] text-slate-400">
              O arquivo final conterá todos os {filteredItems.length} registros com as {activeColumnDefs.length} colunas selecionadas.
            </span>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Arquivo Excel</span>
          </button>
        </div>

        {previewRows.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-medium text-xs">
            Nenhum registro corresponde aos filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="p-2.5 pl-4">#</th>
                  {activeColumnDefs.map((col) => (
                    <th key={col.id} className="p-2.5 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {previewRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50">
                    <td className="p-2.5 pl-4 font-mono text-slate-400 text-[10px]">{rIdx + 1}</td>
                    {activeColumnDefs.map((col) => (
                      <td key={col.id} className="p-2.5 whitespace-nowrap">
                        {String(row[col.label] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
