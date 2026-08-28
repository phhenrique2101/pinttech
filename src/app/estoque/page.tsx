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

  // Raw Materials state
  const [items, setItems] = useState<any[]>([
    { id: '1', name: 'Malte Pilsen Agrária', category: 'MALTE', currentQuantity: 1250, minimumQuantity: 500, unit: 'KG', costPerUnit: 4.8 },
    { id: '2', name: 'Malte Munich Weyermann', category: 'MALTE', currentQuantity: 200, minimumQuantity: 100, unit: 'KG', costPerUnit: 12.5 },
    { id: '3', name: 'Lúpulo Citra T90 (Safra 2025)', category: 'LUPULO', currentQuantity: 18.5, minimumQuantity: 10, unit: 'KG', costPerUnit: 280.0 },
    { id: '4', name: 'Lúpulo Mosaic Pellet', category: 'LUPULO', currentQuantity: 12.0, minimumQuantity: 5, unit: 'KG', costPerUnit: 290.0 },
    { id: '5', name: 'Levedura SafAle US-05', category: 'LEVEDURA', currentQuantity: 15, minimumQuantity: 5, unit: 'PACOTE', costPerUnit: 45.0 },
    { id: '6', name: 'Ácido Peracético 15% (Sanitizante)', category: 'QUIMICO_LIMPEZA', currentQuantity: 40, minimumQuantity: 20, unit: 'L', costPerUnit: 18.0 },
    { id: '7', name: 'Soda Cáustica Escamas (Limpeza CIP)', category: 'QUIMICO_LIMPEZA', currentQuantity: 75, minimumQuantity: 50, unit: 'KG', costPerUnit: 14.0 },
  ]);

  const loadKegInventory = async () => {
    setLoading(true);
    try {
      const [kRes, oRes] = await Promise.all([fetch('/api/kegs'), fetch('/api/orders')]);
      const [kData, oData] = await Promise.all([kRes.json(), oRes.json()]);

      if (Array.isArray(kData)) {
        // Filter kegs that are packaged or in stock
        setKegs(kData.filter((k: any) => k.status === 'ENVASADO' || k.status === 'EM_ESTOQUE'));
      }
      if (Array.isArray(oData)) {
        setOrders(oData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKegInventory();
  }, []);

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

  const totalCostValue = Object.values(groupedByBeer).reduce(
    (acc, b) => acc + b.totalRealLiters * b.costPerLiter,
    0
  );
  const totalSaleValue = Object.values(groupedByBeer).reduce(
    (acc, b) => acc + b.totalRealLiters * b.salePricePerLiter,
    0
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            Gestão de Estoque
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cervejas envasadas prontas na câmara fria com controle de reservas em pedidos e estoque de insumos
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-slate-200/80 rounded-xl">
          <button
            onClick={() => setActiveTab('PACKAGED_BEER')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'PACKAGED_BEER'
                ? 'bg-amber-500 text-white shadow-sm'
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
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Insumos & Matéria-Prima</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Cervejas Envasadas em Barris */}
      {activeTab === 'PACKAGED_BEER' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Volume Total na Câmara */}
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

            {/* 2. Disponível para Venda Imediata */}
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

            {/* 3. Reservados em Pedidos */}
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

            {/* 4. Potencial de Venda */}
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
                const totalBeerSale = beer.totalRealLiters * beer.salePricePerLiter;
                const hasReservations = beer.reservedKegsCount > 0;

                return (
                  <div
                    key={beer.beerName}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-amber-300"
                  >
                    {/* Main Row */}
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

                      {/* Keg breakdown badges with Free / Reserved detail */}
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

                        {/* Status Balance Pill */}
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

                      {/* Totals & Expand Button */}
                      <div className="flex items-center justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Saldo Livre Real</span>
                          <span className="text-base font-black text-emerald-700">{beer.availableLiters} Litros</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Total de Chopp Real</span>
                          <span className="text-base font-black text-slate-900">{beer.totalRealLiters} Litros</span>
                          {beer.totalRealLiters !== beer.totalNominalCapacity && (
                            <span className="text-[9px] text-slate-400 block font-bold">
                              Capacidade: {beer.totalNominalCapacity}L
                            </span>
                          )}
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

                    {/* Active Reservations Details Card for this Beer */}
                    {hasReservations && (
                      <div className="px-5 py-2.5 bg-amber-50/80 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-amber-900 font-bold">
                          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Pedidos que reservaram esta cerveja:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {beer.reservedOrders.map((ro, roIdx) => (
                            <span
                              key={roIdx}
                              className="px-2.5 py-1 bg-white rounded-lg border border-amber-300 text-amber-950 font-semibold text-[11px] flex items-center gap-1.5 shadow-xs"
                            >
                              <strong className="font-bold text-slate-900">#{ro.orderNumber}</strong>
                              <span>({ro.clientName})</span>
                              <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-black text-[10px]">
                                {ro.quantity}x {ro.kegCapacity}L
                              </span>
                              {ro.deliveryDate && (
                                <span className="text-slate-400 font-normal text-[10px]">
                                  • {formatDate(ro.deliveryDate)}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expanded Individual Kegs List */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Barris Físicos na Câmara Fria ({beer.kegs.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                          {beer.kegs.map((keg: any, kIdx: number) => {
                            const isKegReserved = kIdx < beer.reservedKegsCount;
                            const matchedResOrder = isKegReserved ? beer.reservedOrders[kIdx % beer.reservedOrders.length] : null;
                            const realVolume = keg.currentVolumeLiters !== null && keg.currentVolumeLiters !== undefined ? keg.currentVolumeLiters : keg.capacity;
                            const isPartial = keg.currentVolumeLiters !== null && keg.currentVolumeLiters !== undefined && keg.currentVolumeLiters < keg.capacity;

                            return (
                              <div
                                key={keg.id}
                                className={`p-3 bg-white rounded-xl border flex items-start justify-between shadow-xs transition-all ${
                                  isKegReserved
                                    ? 'border-amber-300 bg-amber-50/40'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="space-y-1.5 min-w-0 flex-1 pr-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-black text-xs text-slate-900 block">
                                      {keg.code}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded" title="Capacidade total do barril">
                                      Capacidade: {keg.capacity}L
                                    </span>
                                  </div>

                                  {/* Real Chopp Volume Badge */}
                                  <div className="flex items-center gap-1">
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                                      isPartial
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}>
                                      🍺 Chopp Real: {realVolume}L {isPartial ? '(Parcial)' : ''}
                                    </span>
                                  </div>

                                  {/* Status indicator on keg */}
                                  {isKegReserved && matchedResOrder ? (
                                    <div className="text-[10px] text-amber-900 font-bold bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                      <Lock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                      <span className="truncate">
                                        Reservado: #{matchedResOrder.orderNumber} ({matchedResOrder.clientName})
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                      <span>Livre em Estoque</span>
                                    </div>
                                  )}

                                  {keg.currentBatch && (
                                    <span className="text-[9px] text-purple-700 block font-bold">
                                      Lote: {keg.currentBatch.batchNumber}
                                    </span>
                                  )}
                                </div>

                                <button
                                  onClick={() => setSelectedKegForBarcode(keg)}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex-shrink-0"
                                  title="Ver Etiqueta / QR Code"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {item.category}
                    </span>
                    <h3 className="font-black text-slate-900 text-base">{item.name}</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                    {item.unit}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-slate-900">{item.currentQuantity}</span>
                    <span className="text-xs text-slate-400 font-semibold ml-1">{item.unit}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    Custo: {formatCurrency(item.costPerUnit)}/{item.unit}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 mt-1">
                  Estoque Mínimo: {item.minimumQuantity} {item.unit}
                </p>
              </div>
            </div>
          ))}
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
