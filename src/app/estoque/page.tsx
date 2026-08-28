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
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import BarcodeModal from '@/components/kegs/BarcodeModal';

export default function EstoquePage() {
  const [activeTab, setActiveTab] = useState<'PACKAGED_BEER' | 'RAW_MATERIALS'>('PACKAGED_BEER');
  const [kegs, setKegs] = useState<any[]>([]);
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
      const res = await fetch('/api/kegs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filter kegs that are packaged or in stock
          setKegs(data.filter((k: any) => k.status === 'ENVASADO' || k.status === 'EM_ESTOQUE'));
        }
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

  // Group kegs by Beer Name
  const groupedByBeer: { [key: string]: { beerName: string; style?: string; kegs: any[]; totalLiters: number; count50L: number; count30L: number; count20L: number; count10L: number; costPerLiter: number; salePricePerLiter: number } } = {};

  kegs.forEach((keg) => {
    const beerName = keg.currentBeerName || keg.currentBatch?.recipe?.name || 'Chopp Não Identificado';
    const style = keg.currentBatch?.recipe?.style || 'Estilo Artesanal';
    const costL = keg.currentBatch?.costPerLiter || keg.currentBatch?.recipe?.costPerLiter || 4.5;
    const saleL = keg.currentBatch?.recipe?.salePricePerLiter || keg.currentBatch?.recipe?.suggestedPricePerLiter || 20.0;
    const cap = keg.capacity || 50;

    if (!groupedByBeer[beerName]) {
      groupedByBeer[beerName] = {
        beerName,
        style,
        kegs: [],
        totalLiters: 0,
        count50L: 0,
        count30L: 0,
        count20L: 0,
        count10L: 0,
        costPerLiter: costL,
        salePricePerLiter: saleL,
      };
    }

    groupedByBeer[beerName].kegs.push(keg);
    groupedByBeer[beerName].totalLiters += cap;
    if (cap === 50) groupedByBeer[beerName].count50L++;
    else if (cap === 30) groupedByBeer[beerName].count30L++;
    else if (cap === 20) groupedByBeer[beerName].count20L++;
    else groupedByBeer[beerName].count10L++;
  });

  const beerList = Object.values(groupedByBeer).filter(
    (b) =>
      !search ||
      b.beerName.toLowerCase().includes(search.toLowerCase()) ||
      (b.style && b.style.toLowerCase().includes(search.toLowerCase()))
  );

  const totalVolumeLiters = kegs.reduce((acc, k) => acc + (k.capacity || 50), 0);
  const totalCostValue = Object.values(groupedByBeer).reduce(
    (acc, b) => acc + b.totalLiters * b.costPerLiter,
    0
  );
  const totalSaleValue = Object.values(groupedByBeer).reduce(
    (acc, b) => acc + b.totalLiters * b.salePricePerLiter,
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
            Cervejas envasadas prontas para venda nos barris e estoque de insumos cervejeiros
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
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Beer className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Volume em Estoque
                </span>
                <span className="text-xl font-black text-slate-900">{totalVolumeLiters} Litros</span>
                <span className="text-[10px] text-slate-500 block">Prontos para entrega</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <Cylinder className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Barris Cheios
                </span>
                <span className="text-xl font-black text-slate-900">{kegs.length} barris</span>
                <span className="text-[10px] text-slate-500 block">Em câmara fria / fábrica</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Custo Imobilizado
                </span>
                <span className="text-xl font-black text-rose-700">{formatCurrency(totalCostValue)}</span>
                <span className="text-[10px] text-slate-500 block">Custo de fabricação</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Potencial de Venda
                </span>
                <span className="text-xl font-black text-emerald-700">{formatCurrency(totalSaleValue)}</span>
                <span className="text-[10px] text-emerald-600 font-semibold block">
                  Lucro previsto: {formatCurrency(totalSaleValue - totalCostValue)}
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
                const totalBeerCost = beer.totalLiters * beer.costPerLiter;
                const totalBeerSale = beer.totalLiters * beer.salePricePerLiter;

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
                            Custo: {formatCurrency(beer.costPerLiter)}/L • Preço Venda: {formatCurrency(beer.salePricePerLiter)}/L
                          </span>
                        </div>
                      </div>

                      {/* Keg breakdown badges */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {beer.count50L > 0 && (
                          <span className="px-3 py-1.5 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 font-black">
                            {beer.count50L}x 50L ({beer.count50L * 50}L)
                          </span>
                        )}
                        {beer.count30L > 0 && (
                          <span className="px-3 py-1.5 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 font-black">
                            {beer.count30L}x 30L ({beer.count30L * 30}L)
                          </span>
                        )}
                        {beer.count20L > 0 && (
                          <span className="px-3 py-1.5 bg-purple-50 text-purple-900 rounded-xl border border-purple-200 font-black">
                            {beer.count20L}x 20L ({beer.count20L * 20}L)
                          </span>
                        )}
                        {beer.count10L > 0 && (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl font-black">
                            {beer.count10L}x 10L ({beer.count10L * 10}L)
                          </span>
                        )}
                      </div>

                      {/* Totals & Expand Button */}
                      <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-bold">Total Disponível</span>
                          <span className="text-lg font-black text-slate-900">{beer.totalLiters} Litros</span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-bold">Valor em Venda</span>
                          <span className="text-lg font-black text-emerald-700">{formatCurrency(totalBeerSale)}</span>
                        </div>

                        <button
                          onClick={() => setExpandedBeer(isExpanded ? null : beer.beerName)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                        >
                          <span>{isExpanded ? 'Ocultar Barris' : `Ver ${beer.kegs.length} Barris`}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Individual Kegs List */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Barris Individuais em Estoque ({beer.kegs.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {beer.kegs.map((keg: any) => (
                            <div
                              key={keg.id}
                              className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs"
                            >
                              <div>
                                <span className="font-mono font-black text-xs text-amber-800 block">
                                  {keg.code}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  {keg.capacity}L • {keg.status}
                                </span>
                                {keg.currentBatch && (
                                  <span className="text-[9px] text-purple-700 block font-bold">
                                    Lote: {keg.currentBatch.batchNumber}
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => setSelectedKegForBarcode(keg)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Ver Etiqueta / QR Code"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
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
