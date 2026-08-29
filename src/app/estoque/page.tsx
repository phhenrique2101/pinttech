'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  Beer,
  Cylinder,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  QrCode,
  Sparkles,
  Lock,
  CheckCircle2,
  X,
  Tag,
  Calendar,
  Info,
  Truck,
  Building2,
  Clock,
  ArrowDownRight,
  Edit3,
  Trash2,
  Eye,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import BarcodeModal from '@/components/kegs/BarcodeModal';

export default function EstoquePage() {
  const [activeTab, setActiveTab] = useState<'PACKAGED_BEER' | 'RAW_MATERIALS'>('PACKAGED_BEER');
  const [kegs, setKegs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedBeer, setExpandedBeer] = useState<string | null>(null);
  const [selectedKegForBarcode, setSelectedKegForBarcode] = useState<any>(null);
  const [selectedKegDetails, setSelectedKegDetails] = useState<any | null>(null);

  // Raw Materials (Insumos) State
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [inventorySearch, setInventorySearch] = useState('');

  // Modals for Insumos
  const [newItemModal, setNewItemModal] = useState(false);
  const [editItemModal, setEditItemModal] = useState<any | null>(null);
  const [movementModal, setMovementModal] = useState<any | null>(null);
  const [traceItemModal, setTraceItemModal] = useState<any | null>(null);
  const [suppliersModal, setSuppliersModal] = useState(false);
  const [newSupplierInline, setNewSupplierInline] = useState(false);

  // Form State for Insumo
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('MALTE');
  const [itemUnit, setItemUnit] = useState('KG');
  const [itemQty, setItemQty] = useState('0');
  const [itemMinQty, setItemMinQty] = useState('10');
  const [itemCost, setItemCost] = useState('0');
  const [itemSupplierId, setItemSupplierId] = useState('');
  const [itemSupplierLot, setItemSupplierLot] = useState('');
  const [itemExpDate, setItemExpDate] = useState('');
  const [itemHarvestYear, setItemHarvestYear] = useState('2025/2026');
  const [itemBrand, setItemBrand] = useState('');
  const [itemLocation, setItemLocation] = useState('');
  const [itemNotes, setItemNotes] = useState('');

  // Form State for Movement (Entrada de estoque)
  const [movQty, setMovQty] = useState('');
  const [movCost, setMovCost] = useState('');
  const [movLot, setMovLot] = useState('');
  const [movExpDate, setMovExpDate] = useState('');
  const [movSupplierId, setMovSupplierId] = useState('');
  const [movNotes, setMovNotes] = useState('');

  // Form State for Supplier
  const [supName, setSupName] = useState('');
  const [supTradeName, setSupTradeName] = useState('');
  const [supDocument, setSupDocument] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supCategory, setSupCategory] = useState('MALTES_E_GRAOS');
  const [supAddress, setSupAddress] = useState('');

  const loadKegInventory = async () => {
    setLoading(true);
    try {
      const [kRes, oRes] = await Promise.all([fetch('/api/kegs'), fetch('/api/orders')]);
      const [kData, oData] = await Promise.all([kRes.json(), oRes.json()]);

      if (Array.isArray(kData)) {
        setKegs(kData.filter((k: any) => k.status === 'ENVASADO' || k.status === 'EM_ESTOQUE'));
      }
      if (Array.isArray(oData)) {
        setOrders(oData);
      }
    } catch (e) {
      console.error('Error loading keg inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    setInventoryLoading(true);
    try {
      const [invRes, supRes] = await Promise.all([fetch('/api/inventory'), fetch('/api/suppliers')]);
      const [invData, supData] = await Promise.all([invRes.json(), supRes.json()]);

      if (Array.isArray(invData)) setInventoryItems(invData);
      if (Array.isArray(supData)) setSuppliers(supData);
    } catch (e) {
      console.error('Error loading inventory items:', e);
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    loadKegInventory();
    loadInventory();
  }, []);

  // Handle Save Insumo (Create / Edit)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: itemName,
        category: itemCategory,
        unit: itemUnit,
        currentQuantity: itemQty,
        minimumQuantity: itemMinQty,
        costPerUnit: itemCost,
        supplierId: itemSupplierId || null,
        supplierLot: itemSupplierLot,
        expirationDate: itemExpDate || null,
        harvestYear: itemHarvestYear,
        brand: itemBrand,
        location: itemLocation,
        notes: itemNotes,
      };

      const url = editItemModal ? `/api/inventory/${editItemModal.id}` : '/api/inventory';
      const method = editItemModal ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNewItemModal(false);
        setEditItemModal(null);
        resetItemForm();
        loadInventory();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar insumo');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao salvar insumo');
    }
  };

  // Handle Stock Movement (Dar entrada)
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModal) return;
    try {
      const res = await fetch(`/api/inventory/${movementModal.id}/movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ENTRADA',
          quantity: movQty,
          costPerUnit: movCost,
          supplierLot: movLot,
          expirationDate: movExpDate || null,
          supplierId: movSupplierId || null,
          notes: movNotes,
        }),
      });

      if (res.ok) {
        setMovementModal(null);
        setMovQty('');
        setMovCost('');
        setMovLot('');
        setMovExpDate('');
        setMovNotes('');
        loadInventory();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao registrar entrada de estoque');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Create Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supName,
          tradeName: supTradeName,
          document: supDocument,
          phone: supPhone,
          email: supEmail,
          category: supCategory,
          address: supAddress,
        }),
      });

      if (res.ok) {
        const createdSup = await res.json();
        setSuppliers([...suppliers, createdSup]);
        setItemSupplierId(createdSup.id);
        setNewSupplierInline(false);
        setSupName('');
        setSupTradeName('');
        setSupDocument('');
        setSupPhone('');
        setSupEmail('');
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao cadastrar fornecedor');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Delete Insumo
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o insumo "${name}"?`)) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadInventory();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao excluir insumo');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Edit Insumo Modal
  const openEditItemModal = (item: any) => {
    setEditItemModal(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemUnit(item.unit);
    setItemQty(String(item.currentQuantity));
    setItemMinQty(String(item.minimumQuantity));
    setItemCost(String(item.costPerUnit));
    setItemSupplierId(item.supplierId || '');
    setItemSupplierLot(item.supplierLot || '');
    setItemExpDate(item.expirationDate ? item.expirationDate.split('T')[0] : '');
    setItemHarvestYear(item.harvestYear || '');
    setItemBrand(item.brand || '');
    setItemLocation(item.location || '');
    setItemNotes(item.notes || '');
  };

  // Open Movement Modal
  const openMovementModal = (item: any) => {
    setMovementModal(item);
    setMovQty('');
    setMovCost(String(item.costPerUnit || ''));
    setMovLot(item.supplierLot || '');
    setMovExpDate(item.expirationDate ? item.expirationDate.split('T')[0] : '');
    setMovSupplierId(item.supplierId || '');
    setMovNotes('');
  };

  // Open Trace Modal (Reverse Traceability)
  const openTraceModal = async (item: any) => {
    try {
      const res = await fetch(`/api/inventory/${item.id}`);
      const data = await res.json();
      setTraceItemModal(data);
    } catch (e) {
      console.error(e);
      setTraceItemModal(item);
    }
  };

  const resetItemForm = () => {
    setItemName('');
    setItemCategory('MALTE');
    setItemUnit('KG');
    setItemQty('0');
    setItemMinQty('10');
    setItemCost('0');
    setItemSupplierId('');
    setItemSupplierLot('');
    setItemExpDate('');
    setItemHarvestYear('2025/2026');
    setItemBrand('');
    setItemLocation('');
    setItemNotes('');
  };

  // Group kegs by Beer Name and compute Reservations
  const groupedByBeer: {
    [key: string]: {
      beerName: string;
      style?: string;
      kegs: any[];
      totalRealLiters: number;
      totalNominalCapacity: number;
      count50L: number;
      count30L: number;
      count20L: number;
      count15L: number;
      count10L: number;
      count5L: number;
      costPerLiter: number;
      salePricePerLiter: number;
      reservedOrders: { orderNumber: string; clientName: string; quantity: number; kegCapacity: number; deliveryDate?: string }[];
      reservedLiters: number;
      reservedKegsCount: number;
      availableLiters: number;
      availableKegsCount: number;
    };
  } = {};

  kegs.forEach((keg) => {
    const beerName = keg.currentBeerName || keg.currentBatch?.recipe?.name || 'Chopp Não Identificado';
    const style = keg.currentBatch?.recipe?.style || 'Estilo Artesanal';
    const costL = keg.currentBatch?.costPerLiter || keg.currentBatch?.recipe?.costPerLiter || 4.5;
    const saleL = keg.currentBatch?.recipe?.salePricePerLiter || keg.currentBatch?.recipe?.suggestedPricePerLiter || 20.0;
    const cap = keg.capacity || 50;
    const actualLiters = keg.currentVolumeLiters !== null && keg.currentVolumeLiters !== undefined ? keg.currentVolumeLiters : cap;

    if (!groupedByBeer[beerName]) {
      groupedByBeer[beerName] = {
        beerName,
        style,
        kegs: [],
        totalRealLiters: 0,
        totalNominalCapacity: 0,
        count50L: 0,
        count30L: 0,
        count20L: 0,
        count15L: 0,
        count10L: 0,
        count5L: 0,
        costPerLiter: costL,
        salePricePerLiter: saleL,
        reservedOrders: [],
        reservedLiters: 0,
        reservedKegsCount: 0,
        availableLiters: 0,
        availableKegsCount: 0,
      };
    }

    groupedByBeer[beerName].kegs.push(keg);
    groupedByBeer[beerName].totalRealLiters += actualLiters;
    groupedByBeer[beerName].totalNominalCapacity += cap;
    if (cap === 50) groupedByBeer[beerName].count50L++;
    else if (cap === 30) groupedByBeer[beerName].count30L++;
    else if (cap === 20) groupedByBeer[beerName].count20L++;
    else if (cap === 15) groupedByBeer[beerName].count15L++;
    else if (cap === 10) groupedByBeer[beerName].count10L++;
    else if (cap === 5) groupedByBeer[beerName].count5L++;
  });

  // Calculate active reservations for each beer group
  Object.values(groupedByBeer).forEach((b) => {
    let reservedL = 0;
    let reservedK = 0;
    const resOrders: { orderNumber: string; clientName: string; quantity: number; kegCapacity: number; deliveryDate?: string }[] = [];

    orders.forEach((o) => {
      if (['ORCAMENTO', 'CONFIRMADO', 'EM_SEPARACAO'].includes(o.status)) {
        (o.items || []).forEach((it: any) => {
          const itRecipeName = it.recipe?.name || it.description?.replace(/Barril.*?-\s*/i, '').trim();
          const itMatches =
            (it.recipeId && b.kegs.some((k) => k.currentBatch?.recipeId === it.recipeId)) ||
            (itRecipeName && itRecipeName.toLowerCase() === b.beerName.toLowerCase()) ||
            (it.description && it.description.toLowerCase().includes(b.beerName.toLowerCase()));

          if (itMatches) {
            const cap = it.kegCapacity || 50;
            const qty = it.quantity || 1;
            reservedL += qty * cap;
            reservedK += qty;
            resOrders.push({
              orderNumber: o.orderNumber,
              clientName: o.client?.tradeName || o.client?.name || 'Cliente',
              quantity: qty,
              kegCapacity: cap,
              deliveryDate: o.deliveryDate,
            });
          }
        });
      }
    });

    b.reservedOrders = resOrders;
    b.reservedLiters = reservedL;
    b.reservedKegsCount = reservedK;
    b.availableLiters = Math.max(0, b.totalRealLiters - reservedL);
    b.availableKegsCount = Math.max(0, b.kegs.length - reservedK);
  });

  const beerList = Object.values(groupedByBeer).filter(
    (b) =>
      !search ||
      b.beerName.toLowerCase().includes(search.toLowerCase()) ||
      (b.style && b.style.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRealLiters = kegs.reduce((acc, k) => acc + (k.currentVolumeLiters !== null && k.currentVolumeLiters !== undefined ? k.currentVolumeLiters : (k.capacity || 50)), 0);
  const totalNominalCapacity = kegs.reduce((acc, k) => acc + (k.capacity || 50), 0);
  const totalReservedLiters = Object.values(groupedByBeer).reduce((acc, b) => acc + b.reservedLiters, 0);
  const totalAvailableLiters = Math.max(0, totalRealLiters - totalReservedLiters);
  const totalReservedKegs = Object.values(groupedByBeer).reduce((acc, b) => acc + b.reservedKegsCount, 0);
  const totalAvailableKegs = Math.max(0, kegs.length - totalReservedKegs);

  const totalCostValue = Object.values(groupedByBeer).reduce((acc, b) => acc + b.totalRealLiters * b.costPerLiter, 0);
  const totalSaleValue = Object.values(groupedByBeer).reduce((acc, b) => acc + b.totalRealLiters * b.salePricePerLiter, 0);

  // Insumos Filtering & Stats
  const filteredInventory = inventoryItems.filter((item) => {
    const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchSearch =
      !inventorySearch ||
      item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      (item.supplierLot && item.supplierLot.toLowerCase().includes(inventorySearch.toLowerCase())) ||
      (item.brand && item.brand.toLowerCase().includes(inventorySearch.toLowerCase())) ||
      (item.supplier?.name && item.supplier.name.toLowerCase().includes(inventorySearch.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const totalInventoryValue = inventoryItems.reduce((acc, it) => acc + (it.currentQuantity || 0) * (it.costPerUnit || 0), 0);
  const lowStockItems = inventoryItems.filter((it) => (it.currentQuantity || 0) <= (it.minimumQuantity || 0));

  const categoryLabels: { [key: string]: string } = {
    MALTE: '🌾 Maltes & Grãos',
    LUPULO: '🌿 Lúpulos',
    LEVEDURA: '🧬 Leveduras',
    ADJUNTO: '🍯 Adjuntos & Frutas',
    QUIMICO_LIMPEZA: '🧪 Químicos & CIP',
    EMBALAGEM: '📦 Embalagens & Tampas',
    OUTRO: '📦 Outros Insumos',
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            Gestão de Estoque & Insumos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de cervejas na câmara fria e rastreabilidade total de insumos, fornecedores e lotes
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-slate-200/80 rounded-xl">
          <button
            onClick={() => setActiveTab('PACKAGED_BEER')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'PACKAGED_BEER'
                ? 'bg-amber-500 text-white shadow-sm font-black'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Beer className="w-4 h-4" />
            <span>Cervejas em Barris ({kegs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('RAW_MATERIALS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'RAW_MATERIALS'
                ? 'bg-amber-500 text-white shadow-sm font-black'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Insumos & Matérias-Primas ({inventoryItems.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Cervejas Envasadas em Barris */}
      {activeTab === 'PACKAGED_BEER' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <Cylinder className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Chopp Real na Câmara
                </span>
                <span className="text-xl font-black text-slate-900">{totalRealLiters} Litros</span>
                <span className="text-[10px] text-slate-500 block">
                  {kegs.length} barris • {totalNominalCapacity}L capacidade
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center gap-3 bg-emerald-50/20">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                  Livre para Venda
                </span>
                <span className="text-xl font-black text-emerald-800">{totalAvailableLiters} Litros</span>
                <span className="text-[10px] text-emerald-600 font-bold block">
                  {totalAvailableKegs} barris disponíveis
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center gap-3 bg-amber-50/30">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                  Reservado em Pedidos
                </span>
                <span className="text-xl font-black text-amber-900">{totalReservedLiters} Litros</span>
                <span className="text-[10px] text-amber-700 font-bold block">
                  {totalReservedKegs} barris comprometidos
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Valor Total em Venda
                </span>
                <span className="text-xl font-black text-purple-900">{formatCurrency(totalSaleValue)}</span>
                <span className="text-[10px] text-slate-500 font-semibold block">
                  Custo: {formatCurrency(totalCostValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              placeholder="Buscar por cerveja ou estilo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-semibold bg-transparent focus:outline-none"
            />
          </div>

          {/* Beer Groups List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400">Carregando estoque de barris...</div>
            ) : beerList.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                <Beer className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-bold">Nenhum barril envasado ou em estoque no momento.</p>
                <p className="text-xs mt-1">Realize a brassagem e envase os barris na aba de Produção / Scanner.</p>
              </div>
            ) : (
              beerList.map((beer) => {
                const isExpanded = expandedBeer === beer.beerName;
                const hasReservations = beer.reservedKegsCount > 0;

                return (
                  <div
                    key={beer.beerName}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-amber-300"
                  >
                    <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0">
                          <Beer className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900">{beer.beerName}</h3>
                          <p className="text-xs text-purple-700 font-bold">{beer.style}</p>
                          <span className="text-[11px] text-slate-400 font-medium">
                            Custo: {formatCurrency(beer.costPerLiter)}/L • Venda: {formatCurrency(beer.salePricePerLiter)}/L
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {beer.count50L > 0 && (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 font-black text-xs">
                              {beer.count50L}x 50L
                            </span>
                          )}
                          {beer.count30L > 0 && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-900 rounded-lg border border-blue-200 font-black text-xs">
                              {beer.count30L}x 30L
                            </span>
                          )}
                          {beer.count20L > 0 && (
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-900 rounded-lg border border-purple-200 font-black text-xs">
                              {beer.count20L}x 20L
                            </span>
                          )}
                          {beer.count15L > 0 && (
                            <span className="px-2.5 py-1 bg-orange-50 text-orange-900 rounded-lg border border-orange-200 font-black text-xs">
                              {beer.count15L}x 15L
                            </span>
                          )}
                          {beer.count10L > 0 && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-black text-xs">
                              {beer.count10L}x 10L
                            </span>
                          )}
                          {beer.count5L > 0 && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-black text-xs">
                              {beer.count5L}x 5L
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ {beer.availableKegsCount} livres ({beer.availableLiters}L)
                          </span>
                          {hasReservations && (
                            <span className="text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-600" />
                              {beer.reservedKegsCount} reservados ({beer.reservedLiters}L)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Saldo Livre Real</span>
                          <span className="text-base font-black text-emerald-700">{beer.availableLiters} Litros</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Total de Chopp Real</span>
                          <span className="text-base font-black text-slate-900">{beer.totalRealLiters} Litros</span>
                        </div>

                        <button
                          onClick={() => setExpandedBeer(isExpanded ? null : beer.beerName)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                        >
                          <span>{isExpanded ? 'Ocultar' : `Ver ${beer.kegs.length} Barris`}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Barris Físicos na Câmara Fria ({beer.kegs.length}) — Clique para rastrear lote & insumos:
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                          {beer.kegs.map((keg: any, kIdx: number) => {
                            const isKegReserved = kIdx < beer.reservedKegsCount;
                            const matchedResOrder = isKegReserved ? beer.reservedOrders[kIdx % beer.reservedOrders.length] : null;
                            const realVolume = keg.currentVolumeLiters !== null && keg.currentVolumeLiters !== undefined ? keg.currentVolumeLiters : keg.capacity;
                            const batchNum = keg.currentBatch?.batchNumber || (keg.notes?.match(/Lote:?\s*([^\s|]+)/i)?.[1] || 'Lote Inicial');

                            return (
                              <div
                                key={keg.id}
                                onClick={() => setSelectedKegDetails({
                                  ...keg,
                                  beerName: beer.beerName,
                                  style: beer.style,
                                  salePricePerLiter: beer.salePricePerLiter,
                                  costPerLiter: beer.costPerLiter,
                                  isKegReserved,
                                  matchedResOrder,
                                  batchNum,
                                })}
                                className={`p-3.5 bg-white rounded-2xl border flex flex-col justify-between gap-2.5 shadow-xs transition-all cursor-pointer group hover:shadow-md hover:border-amber-400 active:scale-[0.99] ${
                                  isKegReserved ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                                }`}
                              >
                                <div className="space-y-2 min-w-0">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="font-mono font-black text-xs text-slate-900 group-hover:text-amber-700 transition-colors">
                                      {keg.code}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                                      {keg.capacity}L
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 bg-purple-50 text-purple-900 border border-purple-200/80 px-2 py-1 rounded-xl text-[11px] font-black">
                                    <Layers className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                                    <span className="truncate">Lote: #{batchNum}</span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg border w-full text-center bg-emerald-50 text-emerald-800 border-emerald-200">
                                      🍺 Chopp Real: {realVolume}L
                                    </span>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                  <span className="text-amber-700 font-bold group-hover:underline">
                                    Inspecionar Lote & Insumos →
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedKegForBarcode(keg);
                                    }}
                                    className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Ver QR Code / Etiqueta"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Insumos & Matérias-Primas */}
      {activeTab === 'RAW_MATERIALS' && (
        <div className="space-y-6">
          {/* KPI Cards Insumos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Itens em Estoque
                </span>
                <span className="text-xl font-black text-slate-900">{inventoryItems.length} Insumos</span>
                <span className="text-[10px] text-slate-500 block">Maltes, lúpulos e embalagens</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center gap-3 bg-emerald-50/20">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                  Valor Total em Estoque
                </span>
                <span className="text-xl font-black text-emerald-900">{formatCurrency(totalInventoryValue)}</span>
                <span className="text-[10px] text-emerald-600 font-bold block">Custo acumulado em matérias-primas</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border shadow-sm flex items-center gap-3 ${
              lowStockItems.length > 0 ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-200'
            }`}>
              <div className={`p-3 rounded-xl ${lowStockItems.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-50 text-slate-600'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">
                  Abaixo do Mínimo
                </span>
                <span className="text-xl font-black text-rose-900">{lowStockItems.length} Itens</span>
                <span className="text-[10px] text-rose-600 font-bold block">
                  {lowStockItems.length > 0 ? 'Necessita reposição!' : 'Estoque seguro'}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Fornecedores Parceiros
                </span>
                <span className="text-xl font-black text-blue-900">{suppliers.length} Ativos</span>
                <span className="text-[10px] text-slate-500 block">Rastreabilidade integrada</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar & Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-slate-400 ml-2" />
              <input
                type="text"
                placeholder="Buscar por nome, marca, lote de fornecedor ou fornecedor..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full text-xs font-semibold bg-transparent focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSuppliersModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Building2 className="w-4 h-4 text-slate-600" />
                <span>Fornecedores ({suppliers.length})</span>
              </button>

              <button
                onClick={() => {
                  resetItemForm();
                  setEditItemModal(null);
                  setNewItemModal(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Insumo</span>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todos ({inventoryItems.length})
            </button>
            {['MALTE', 'LUPULO', 'LEVEDURA', 'ADJUNTO', 'QUIMICO_LIMPEZA', 'EMBALAGEM', 'OUTRO'].map((cat) => {
              const count = inventoryItems.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{categoryLabels[cat] || cat}</span>
                  <span className="text-[10px] opacity-75 font-normal">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Inventory Items Grid */}
          {inventoryLoading ? (
            <div className="text-center py-12 text-slate-400">Carregando insumos do estoque...</div>
          ) : filteredInventory.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 space-y-3">
              <Package className="w-12 h-12 mx-auto text-slate-300" />
              <p className="font-bold">Nenhum insumo encontrado nesta categoria.</p>
              <button
                onClick={() => {
                  resetItemForm();
                  setNewItemModal(true);
                }}
                className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                + Cadastrar Primeiro Insumo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((item) => {
                const isLow = (item.currentQuantity || 0) <= (item.minimumQuantity || 0);
                const totalItemCost = (item.currentQuantity || 0) * (item.costPerUnit || 0);

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-md ${
                      isLow ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {categoryLabels[item.category] || item.category}
                          </span>
                          <h3 className="font-black text-slate-900 text-base mt-1 leading-tight">{item.name}</h3>
                          {item.brand && (
                            <span className="text-[11px] font-semibold text-slate-500 block">
                              Marca/Fabricante: {item.brand}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                          {item.unit}
                        </span>
                      </div>

                      {/* LOTES ATIVOS EM ESTOQUE (SEGREGAÇÃO MULTI-LOTE) */}
                      <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-purple-950 tracking-wider flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-purple-700" />
                            Lotes em Estoque ({(item.lots || []).filter((l: any) => (l.currentQuantity || 0) > 0).length}):
                          </span>
                          <button
                            type="button"
                            onClick={() => openMovementModal(item)}
                            className="text-[10px] text-purple-700 font-bold hover:underline"
                          >
                            + Novo Lote
                          </button>
                        </div>

                        {(!item.lots || item.lots.filter((l: any) => (l.currentQuantity || 0) > 0).length === 0) ? (
                          <div className="p-2 bg-white rounded-lg border border-purple-100 flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-purple-900">
                              Lote: {item.supplierLot || 'LOTE-001'}
                            </span>
                            <span className="font-bold text-slate-700">
                              {item.currentQuantity} {item.unit}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {item.lots.filter((l: any) => (l.currentQuantity || 0) > 0).map((lot: any, lIdx: number) => (
                              <div key={lot.id || lIdx} className="p-2 bg-white rounded-lg border border-purple-200/90 flex items-center justify-between gap-2 shadow-2xs">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-black text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded text-[11px]">
                                      {lot.lotNumber}
                                    </span>
                                    <span className="font-black text-slate-900 text-xs">
                                      {lot.currentQuantity} {item.unit}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                    {lot.expirationDate ? `Venc: ${formatDate(lot.expirationDate)}` : (lot.harvestYear ? `Safra ${lot.harvestYear}` : (lot.supplier?.name || lot.supplierName || ''))}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="text-[10px] font-bold text-slate-700 block">
                                    R$ {(lot.costPerUnit || item.costPerUnit || 0).toFixed(2)}/{item.unit}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {item.supplier && (
                          <div className="pt-1 border-t border-purple-100 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="flex items-center gap-1 font-semibold">
                              <Building2 className="w-3 h-3 text-blue-500" />
                              Fornecedor:
                            </span>
                            <span className="font-bold text-slate-800 truncate max-w-[150px]">{item.supplier.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Quantidades e Custos */}
                      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Saldo Total em Estoque:</span>
                          <span className={`text-2xl font-black ${isLow ? 'text-rose-700' : 'text-slate-900'}`}>
                            {item.currentQuantity}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold ml-1">{item.unit}</span>
                          {isLow && (
                            <span className="block text-[10px] font-black text-rose-600">
                              ⚠️ Abaixo do mín. ({item.minimumQuantity} {item.unit})
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-slate-800 block">
                            {formatCurrency(item.costPerUnit)}/{item.unit}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Total: {formatCurrency(totalItemCost)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => openMovementModal(item)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[11px] rounded-xl flex items-center gap-1 transition-all"
                        title="Adicionar quantidade com novo lote"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Entrada</span>
                      </button>

                      <button
                        onClick={() => openTraceModal(item)}
                        className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-[11px] rounded-xl flex items-center gap-1 transition-all"
                        title="Ver receitas, lotes e barris que utilizaram este insumo"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                        <span>Rastrear Lote</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                          title="Editar Insumo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Excluir Insumo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal: NOVO / EDITAR INSUMO NO ESTOQUE */}
      {(newItemModal || editItemModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">
                {editItemModal ? 'Editar Insumo & Rastreabilidade' : 'Cadastrar Novo Insumo no Estoque'}
              </h3>
              <button
                onClick={() => {
                  setNewItemModal(false);
                  setEditItemModal(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Insumo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Malte Pilsen Agrária, Lúpulo Citra T90, Levedura US-05"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="MALTE">🌾 Malte & Grãos</option>
                    <option value="LUPULO">🌿 Lúpulo</option>
                    <option value="LEVEDURA">🧬 Levedura</option>
                    <option value="ADJUNTO">🍯 Adjunto & Frutas</option>
                    <option value="QUIMICO_LIMPEZA">🧪 Químico & Limpeza CIP</option>
                    <option value="EMBALAGEM">📦 Embalagem / Tampa</option>
                    <option value="OUTRO">📦 Outro Insumo</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unidade de Medida</label>
                  <select
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="KG">Quilograma (KG)</option>
                    <option value="G">Gramas (G)</option>
                    <option value="L">Litros (L)</option>
                    <option value="ML">Mililitros (ML)</option>
                    <option value="PACOTE">Pacote / Unidade (PCT)</option>
                    <option value="UN">Unidade (UN)</option>
                  </select>
                </div>
              </div>

              {/* Rastreabilidade & Fornecedor */}
              <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  Rastreabilidade do Lote & Origem
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lote do Fornecedor / Insumo</label>
                    <input
                      type="text"
                      placeholder="Ex: AGR-2026-991 ou LOT-CIT-88"
                      value={itemSupplierLot}
                      onChange={(e) => setItemSupplierLot(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-mono font-bold text-purple-950"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data de Validade</label>
                    <input
                      type="date"
                      value={itemExpDate}
                      onChange={(e) => setItemExpDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Marca / Fabricante</label>
                    <input
                      type="text"
                      placeholder="Ex: Agrária, Weyermann, Fermentis"
                      value={itemBrand}
                      onChange={(e) => setItemBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Safra / Ano</label>
                    <input
                      type="text"
                      placeholder="Ex: 2025 / 2026"
                      value={itemHarvestYear}
                      onChange={(e) => setItemHarvestYear(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Fornecedor Vinculado</label>
                    <button
                      type="button"
                      onClick={() => setNewSupplierInline(!newSupplierInline)}
                      className="text-[10px] text-purple-700 hover:underline font-bold"
                    >
                      {newSupplierInline ? '← Selecionar da lista' : '+ Cadastrar Fornecedor'}
                    </button>
                  </div>

                  {!newSupplierInline ? (
                    <select
                      value={itemSupplierId}
                      onChange={(e) => setItemSupplierId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold"
                    >
                      <option value="">-- Sem fornecedor específico --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.tradeName ? `(${s.tradeName})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 bg-white border border-purple-300 rounded-xl space-y-2">
                      <input
                        type="text"
                        placeholder="Nome do Fornecedor (ex: Agrária Malte)"
                        value={supName}
                        onChange={(e) => setSupName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewSupplierInline(false)}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-[10px]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSupplier}
                          disabled={!supName.trim()}
                          className="px-3 py-1 bg-purple-600 text-white font-bold rounded-lg text-[10px]"
                        >
                          Salvar Fornecedor
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quantidade e Custos */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editItemModal ? 'Estoque Atual' : 'Qtd Inicial'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemMinQty}
                    onChange={(e) => setItemMinQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custo (R$/{itemUnit})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Local de Armazenamento</label>
                <input
                  type="text"
                  placeholder="Ex: Silo 1, Câmara Fria 02, Prateleira B"
                  value={itemLocation}
                  onChange={(e) => setItemLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setNewItemModal(false);
                    setEditItemModal(null);
                  }}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  {editItemModal ? 'Salvar Alterações' : 'Cadastrar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: ENTRADA DE ESTOQUE (NOVO LOTE OU REPOSIÇÃO) */}
      {movementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-lg text-slate-900">Entrada de Estoque • {movementModal.name}</h3>
                <p className="text-xs text-slate-500">
                  Cadastre um novo lote ou reponha um lote existente. Cada lote mantém seu saldo individual.
                </p>
              </div>
              <button onClick={() => setMovementModal(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Saldos atuais por lote */}
            {movementModal.lots && movementModal.lots.length > 0 && (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1 text-xs">
                <span className="text-[10px] font-black uppercase text-purple-950 block">Lotes Atualmente em Estoque:</span>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {movementModal.lots.map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-purple-200 text-[11px]">
                      <span className="font-mono font-bold text-purple-900">Lote #{l.lotNumber}</span>
                      <span className="font-black text-slate-900">{l.currentQuantity} {movementModal.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveMovement} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código / Lote do Fornecedor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: AGR-2026-992 ou LOTE-002"
                  value={movLot}
                  onChange={(e) => setMovLot(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-purple-50/50 border border-purple-300 rounded-xl font-mono font-black text-purple-950 text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Se o lote já existir, a quantidade será somada a ele; se for novo, um novo lote será criado.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantidade a Adicionar ({movementModal.unit}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 500"
                    value={movQty}
                    onChange={(e) => setMovQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-black text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custo Unitário (R$/{movementModal.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={String(movementModal.costPerUnit || '0.00')}
                    value={movCost}
                    onChange={(e) => setMovCost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Validade</label>
                  <input
                    type="date"
                    value={movExpDate}
                    onChange={(e) => setMovExpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fornecedor deste Lote</label>
                  <select
                    value={movSupplierId}
                    onChange={(e) => setMovSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="">-- Padrão do Insumo --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações da Entrada</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Compra NF-1234, recebimento conferido"
                  value={movNotes}
                  onChange={(e) => setMovNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMovementModal(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  Confirmar Entrada no Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: RASTREABILIDADE REVERSA DO INSUMO */}
      {traceItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">{traceItemModal.name}</h3>
                  <p className="text-xs text-purple-700 font-bold">Ficha de Rastreabilidade Reversa (Origem & Destinos)</p>
                </div>
              </div>
              <button onClick={() => setTraceItemModal(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Origem e Dados dos Lotes */}
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-purple-950 uppercase tracking-wider block">Lotes Físicos em Estoque:</span>
                <span className="font-black text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                  Saldo Total: {traceItemModal.currentQuantity} {traceItemModal.unit}
                </span>
              </div>

              {(!traceItemModal.lots || traceItemModal.lots.length === 0) ? (
                <div className="p-2.5 bg-white rounded-xl border border-purple-100 text-slate-500">
                  Lote padrão: {traceItemModal.supplierLot || 'N/A'} • {traceItemModal.currentQuantity} {traceItemModal.unit}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {traceItemModal.lots.map((lot: any) => (
                    <div key={lot.id} className="p-2.5 bg-white rounded-xl border border-purple-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded text-[11px]">
                          Lote #{lot.lotNumber}
                        </span>
                        <span className="font-black text-slate-900">
                          {lot.currentQuantity} {traceItemModal.unit}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>{lot.expirationDate ? `Validade: ${formatDate(lot.expirationDate)}` : 'Sem validade'}</span>
                        <span className="font-bold text-slate-700">R$ {(lot.costPerUnit || 0).toFixed(2)}/{traceItemModal.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Onde foi utilizado: Lotes de Brassagem */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <Beer className="w-4 h-4 text-amber-600" />
                Lotes de Brassagem que consumiram este insumo ({traceItemModal.batchIngredients?.length || 0}):
              </span>

              {(!traceItemModal.batchIngredients || traceItemModal.batchIngredients.length === 0) ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  Nenhum lote de produção consumiu este insumo ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {traceItemModal.batchIngredients.map((bi: any) => (
                    <div key={bi.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-purple-900">#{bi.batch?.batchNumber}</span>
                          <span className="font-bold text-slate-900">{bi.batch?.recipe?.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 rounded font-bold">{bi.batch?.status}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Consumido: <strong>{bi.quantityUsed} {bi.unit}</strong> (Lote: {bi.supplierLot || bi.inventoryLot?.lotNumber || 'N/A'}) na etapa {bi.stage || 'Mostura'} • {formatDate(bi.createdAt)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Barris Envasados:</span>
                        <span className="font-black text-slate-900">{bi.batch?.kegs?.length || 0} barris</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Receitas cadastradas que usam este insumo */}
            {traceItemModal.recipeIngredients && traceItemModal.recipeIngredients.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Receitas Cervejeiras que utilizam este insumo:
                </span>
                <div className="flex flex-wrap gap-2">
                  {traceItemModal.recipeIngredients.map((ri: any) => (
                    <span key={ri.id} className="px-2.5 py-1 bg-purple-50 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold">
                      🍺 {ri.recipe?.name} ({ri.amount} {ri.unit} na {ri.stage})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTraceItemModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: GESTÃO DE FORNECEDORES */}
      {suppliersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-lg text-slate-900">Fornecedores de Insumos ({suppliers.length})</h3>
              </div>
              <button onClick={() => setSuppliersModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Add Supplier Form */}
            <form onSubmit={handleSaveSupplier} className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3 text-xs">
              <span className="font-black text-blue-950 uppercase tracking-wider block">Cadastrar Novo Fornecedor:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Razão Social / Nome *"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold"
                />
                <input
                  type="text"
                  placeholder="Nome Fantasia"
                  value={supTradeName}
                  onChange={(e) => setSupTradeName(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl"
                />
                <input
                  type="text"
                  placeholder="CNPJ / CPF"
                  value={supDocument}
                  onChange={(e) => setSupDocument(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="Telefone / WhatsApp"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl"
                />
                <input
                  type="email"
                  placeholder="E-mail de Contato"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl"
                />
                <select
                  value={supCategory}
                  onChange={(e) => setSupCategory(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold"
                >
                  <option value="MALTES_E_GRAOS">Maltes & Grãos</option>
                  <option value="LUPULOS">Lúpulos</option>
                  <option value="LEVEDURAS">Leveduras</option>
                  <option value="QUIMICOS">Químicos & Limpeza</option>
                  <option value="EMBALAGENS">Embalagens & Barris</option>
                  <option value="GERAL">Insumos Geral</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!supName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm"
                >
                  + Adicionar Fornecedor
                </button>
              </div>
            </form>

            {/* Suppliers List */}
            <div className="space-y-2">
              {suppliers.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">Nenhum fornecedor cadastrado.</p>
              ) : (
                suppliers.map((s) => (
                  <div key={s.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-black text-slate-900">{s.name} {s.tradeName && `(${s.tradeName})`}</h4>
                      <span className="text-[11px] text-slate-500">
                        {s.document && `CNPJ: ${s.document} • `}
                        {s.phone && `Tel: ${s.phone} • `}
                        {s.email && `Email: ${s.email}`}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold text-[10px]">
                      {s.category || 'Geral'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSuppliersModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: DETALHES DO BARRIL & RASTREABILIDADE DO LOTE */}
      {selectedKegDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                  <Beer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                    <span>{selectedKegDetails.beerName}</span>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg">
                      {selectedKegDetails.code}
                    </span>
                  </h3>
                  <p className="text-xs text-purple-700 font-bold">{selectedKegDetails.style}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedKegDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Card 1: DADOS ESPECÍFICOS DO LOTE */}
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-700" />
                  Rastreabilidade do Lote de Produção
                </span>
                <span className="px-2.5 py-0.5 bg-purple-600 text-white font-black text-xs rounded-full">
                  #{selectedKegDetails.batchNum}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-purple-100">
                  <span className="text-[10px] text-slate-400 block font-bold">Número do Lote</span>
                  <span className="font-mono font-black text-purple-900 text-sm">
                    #{selectedKegDetails.batchNum}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-purple-100">
                  <span className="text-[10px] text-slate-400 block font-bold">Data de Envase / Produção</span>
                  <span className="font-bold text-slate-800">
                    {formatDate(selectedKegDetails.lastFilledAt || selectedKegDetails.currentBatch?.brewDate || selectedKegDetails.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: DADOS FÍSICOS DO BARRIL */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Cylinder className="w-4 h-4 text-slate-600" />
                Especificações do Barril no Estoque
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">Volume Real de Chopp</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {selectedKegDetails.currentVolumeLiters ?? selectedKegDetails.capacity} Litros
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">Disponibilidade</span>
                  {selectedKegDetails.isKegReserved && selectedKegDetails.matchedResOrder ? (
                    <span className="font-bold text-amber-800 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      Reservado (Ped #{selectedKegDetails.matchedResOrder.orderNumber})
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Livre na Câmara Fria
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const targetKeg = selectedKegDetails;
                  setSelectedKegDetails(null);
                  setSelectedKegForBarcode(targetKeg);
                }}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              >
                <QrCode className="w-4 h-4 text-amber-700" />
                <span>Imprimir Etiqueta / QR Code</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedKegDetails(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Modal */}
      {selectedKegForBarcode && (
        <BarcodeModal
          isOpen={!!selectedKegForBarcode}
          onClose={() => setSelectedKegForBarcode(null)}
          keg={selectedKegForBarcode}
        />
      )}
    </div>
  );
}
