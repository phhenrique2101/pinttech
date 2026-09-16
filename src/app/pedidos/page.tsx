'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  Cylinder,
  Wrench,
  QrCode,
  Sparkles,
  Check,
  Building2,
  Edit3,
  CreditCard,
  Receipt,
  Trash2,
  X,
  FileText,
  Calendar,
  Layers,
  MapPin,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  Printer,
  Eye,
  ArrowRight,
  Share2,
  PackageCheck,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  AlertTriangle,
  Download,
  RefreshCw,
  List,
  LayoutGrid,
  CalendarDays,
  UserPlus,
} from 'lucide-react';
import { formatCurrency, formatDateShort, formatDate, ORDER_STATUS_MAP, EQUIPMENT_TYPE_MAP } from '@/lib/utils';
import { exportJsonToExcel } from '@/lib/exportUtils';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import QuickClientModal from '@/components/clients/QuickClientModal';
import OrderCalendarView from '@/components/orders/OrderCalendarView';

// Função para sanitizar e extrair apenas o nome puro do produto/cerveja (sem lotes, barris, prefixos R$ ou datas)
function cleanProductName(name: string): string {
  if (!name) return '';
  return name
    .replace(/^R\$\s*/gi, '')
    .replace(/\s*\(R\d+\)/gi, '')
    .replace(/\s*-\s*barril\s*\d+l?(\s*-\s*[\w\d]+)?/gi, '')
    .replace(/\s*-\s*lote\s*[\w\d]+/gi, '')
    .replace(/\s*-\s*[\d]{4,8}$/gi, '')
    .replace(/\s*\(\d+l\)/gi, '')
    .replace(/\s*-\s*\d+l$/gi, '')
    .trim();
}

// Componente de Busca Digitada de Cerveja / Chopp
// Prioriza e destaca Chopps ENVASADOS na câmara fria vs cervejas em produção/tanque
function RecipeSearchSelect({
  recipeId,
  recipes,
  kegs = [],
  orders = [],
  onSelectRecipe,
  resolvePrice,
  placeholder = '🔍 Selecione ou digite a cerveja...',
}: {
  recipeId: string;
  recipes: any[];
  kegs?: any[];
  orders?: any[];
  onSelectRecipe: (recipe: any, recommendedCapacity?: number) => void;
  resolvePrice?: (recipe: any, capacity: number) => number;
  placeholder?: string;
}) {
  // 1. Processamento memoizado de Chopps ENVASADOS e em PRODUÇÃO
  const { envasadosList, outrosList, allProducts } = useMemo(() => {
    const envasadosMap = new Map<string, {
      key: string;
      displayName: string;
      matchedRecipe: any;
      capacities: { capacity: number; available: number; total: number }[];
      totalAvailable: number;
      bestCapacity: number;
    }>();

    kegs
      .filter((k) => k.status === 'EM_ESTOQUE' || k.status === 'ENVASADO')
      .forEach((k) => {
        const rawName = k.currentBeerName || k.currentBatch?.recipe?.name || 'Chopp';
        const clean = cleanProductName(rawName);
        const key = clean.toLowerCase();

        if (!envasadosMap.has(key)) {
          let matched = recipes.find((r) => r.id === k.currentBatch?.recipeId);
          if (!matched) {
            matched = recipes.find((r) => {
              const rClean = cleanProductName(r.name).toLowerCase();
              return (
                rClean === key ||
                (key.length >= 4 && rClean.includes(key)) ||
                (rClean.length >= 4 && key.includes(rClean))
              );
            });
          }
          if (!matched) {
            matched = {
              id: `keg-beer-${key}`,
              name: clean,
              style: k.currentBatch?.recipe?.style || 'Chopp Artesanal',
              salePricePerLiter: 20,
            };
          }

          envasadosMap.set(key, {
            key,
            displayName: clean,
            matchedRecipe: matched,
            capacities: [],
            totalAvailable: 0,
            bestCapacity: 50,
          });
        }
      });

    const envasados: any[] = [];
    envasadosMap.forEach((val, key) => {
      const capsCounts: { [c: number]: number } = {};
      kegs
        .filter((k) => k.status === 'EM_ESTOQUE' || k.status === 'ENVASADO')
        .forEach((k) => {
          const kBeer = cleanProductName(k.currentBeerName || k.currentBatch?.recipe?.name || '').toLowerCase();
          if (kBeer === key || (key.length >= 4 && kBeer.includes(key)) || (kBeer.length >= 4 && key.includes(kBeer))) {
            const cap = k.capacity || 50;
            capsCounts[cap] = (capsCounts[cap] || 0) + 1;
          }
        });

      const capList: { capacity: number; available: number; total: number }[] = [];
      let totAvail = 0;

      [50, 30, 20, 15, 10, 5].forEach((cap) => {
        if (capsCounts[cap]) {
          let reserved = 0;
          orders.forEach((o) => {
            if (['ORCAMENTO', 'CONFIRMADO', 'EM_SEPARACAO'].includes(o.status)) {
              (o.items || []).forEach((it: any) => {
                const itClean = cleanProductName(it.recipe?.name || it.description || '').toLowerCase();
                if ((itClean === key || (key.length >= 4 && itClean.includes(key))) && (it.kegCapacity || 50) === cap) {
                  reserved += (it.quantity || 1);
                }
              });
            }
          });
          const avail = Math.max(0, capsCounts[cap] - reserved);
          capList.push({ capacity: cap, available: avail, total: capsCounts[cap] });
          totAvail += avail;
        }
      });

      capList.sort((a, b) => b.available - a.available);
      const bestCap = capList.length > 0 ? capList[0].capacity : 50;

      envasados.push({
        ...val,
        capacities: capList,
        totalAvailable: totAvail,
        bestCapacity: bestCap,
        isEnvasado: true,
      });
    });

    envasados.sort((a, b) => b.totalAvailable - a.totalAvailable);

    // 2. Outras receitas (não envasadas ou em produção nos tanques)
    const outrosMap = new Map<string, any>();
    recipes.forEach((r) => {
      const clean = cleanProductName(r.name);
      const key = clean.toLowerCase();
      if (!envasadosMap.has(key) && !outrosMap.has(key)) {
        outrosMap.set(key, {
          key,
          displayName: clean,
          matchedRecipe: r,
          capacities: [],
          totalAvailable: 0,
          bestCapacity: 50,
          isEnvasado: false,
        });
      }
    });

    const outros = Array.from(outrosMap.values());
    const all = [...envasados, ...outros];

    return { envasadosList: envasados, outrosList: outros, allProducts: all };
  }, [recipes, kegs, orders]);

  // 2. Nome do produto atualmente selecionado
  const selectedDisplayName = useMemo(() => {
    if (!recipeId) return '';
    const prod = allProducts.find(
      (p) => p.matchedRecipe?.id === recipeId || p.key === recipeId.toLowerCase()
    );
    if (prod) return prod.displayName;
    const found = recipes.find((r) => r.id === recipeId);
    if (found) return cleanProductName(found.name);
    if (recipeId.startsWith('keg-beer-')) {
      return recipeId.replace('keg-beer-', '');
    }
    return '';
  }, [allProducts, recipes, recipeId]);

  const [query, setQuery] = useState(selectedDisplayName);
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Sincroniza query apenas quando o item selecionado mudar externamente,
  // e NUNCA enquanto o usuário estiver digitando no campo!
  useEffect(() => {
    if (!isTyping) {
      setQuery(selectedDisplayName);
    }
  }, [selectedDisplayName, isTyping]);

  // Se o usuário abriu o dropdown mas o texto atual é exatamente o produto selecionado,
  // exibe todas as cervejas para permitir troca rápida em 1 clique!
  const effectiveFilter = isTyping && query.trim() !== '' && query.trim().toLowerCase() !== selectedDisplayName.toLowerCase()
    ? query.trim().toLowerCase()
    : '';

  const filteredEnvasados = useMemo(() => {
    if (!effectiveFilter) return envasadosList;
    return envasadosList.filter((p) => {
      return (
        p.displayName.toLowerCase().includes(effectiveFilter) ||
        (p.matchedRecipe?.style || '').toLowerCase().includes(effectiveFilter)
      );
    });
  }, [envasadosList, effectiveFilter]);

  const filteredOutros = useMemo(() => {
    if (!effectiveFilter) return outrosList;
    return outrosList.filter((p) => {
      return (
        p.displayName.toLowerCase().includes(effectiveFilter) ||
        (p.matchedRecipe?.style || '').toLowerCase().includes(effectiveFilter)
      );
    });
  }, [outrosList, effectiveFilter]);

  const hasExactMatch = useMemo(() => {
    if (!effectiveFilter) return true;
    return allProducts.some(
      (p) => p.displayName.toLowerCase() === effectiveFilter || p.key === effectiveFilter
    );
  }, [allProducts, effectiveFilter]);

  const handleSelect = (matchedRecipe: any, bestCap?: number) => {
    setIsTyping(false);
    setIsOpen(false);
    setQuery(cleanProductName(matchedRecipe.name));
    onSelectRecipe(matchedRecipe, bestCap);
  };

  const handleClear = () => {
    setIsTyping(true);
    setQuery('');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsTyping(false);
    setIsOpen(false);
    setQuery(selectedDisplayName);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setIsTyping(true);
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          onClick={() => {
            setIsOpen(true);
          }}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none pr-8 shadow-2xs transition-all"
        />
        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            title="Limpar seleção"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        )}
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={handleClose}
          />
          <div className="absolute left-0 top-full mt-1.5 w-[520px] sm:w-[620px] max-w-[calc(100vw-2.5rem)] bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 max-h-[420px] overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5">
            {/* Cabeçalho informativo do Dropdown */}
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 sticky top-0 z-20 backdrop-blur-xs">
              <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                <span>🍺</span>
                <span>Catálogo de Chopps ({filteredEnvasados.length + filteredOutros.length})</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                💡 Dica: clique no barril para selecionar tamanho direto
              </span>
            </div>

            {/* Opção para usar texto digitado como chopp avulso se não coincidir exatamente com receitas existentes */}
            {effectiveFilter && !hasExactMatch && (
              <button
                type="button"
                onClick={() => {
                  const customName = query.trim();
                  handleSelect(
                    {
                      id: `keg-beer-${customName.toLowerCase()}`,
                      name: customName,
                      style: 'Chopp Especial / Avulso',
                      salePricePerLiter: 20,
                    },
                    50
                  );
                }}
                className="w-full text-left p-3.5 bg-amber-50 hover:bg-amber-100/90 text-amber-950 transition-colors flex items-center justify-between cursor-pointer border-b border-amber-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0 text-amber-800">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-xs sm:text-sm block text-amber-950">
                      Usar &quot;{query.trim()}&quot;
                    </span>
                    <span className="text-xs text-amber-800 font-medium">
                      Adicionar este produto/chopp digitado como item avulso
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 flex-shrink-0 shadow-2xs">
                  Novo Chopp
                </span>
              </button>
            )}

            {filteredEnvasados.length === 0 && filteredOutros.length === 0 && (!effectiveFilter || hasExactMatch) ? (
              <div className="p-6 text-xs sm:text-sm text-slate-400 text-center font-medium">
                Nenhuma cerveja cadastrada ou encontrada
              </div>
            ) : (
              <>
                {/* Seção 1: Chopps Envasados em Estoque */}
                {filteredEnvasados.length > 0 && (
                  <div>
                    <div className="px-3.5 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100/60 text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center justify-between sticky top-[37px] z-10 border-b border-emerald-200/80 backdrop-blur-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Chopps Envasados na Câmara Fria ({filteredEnvasados.length})</span>
                      </span>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-black shadow-2xs">
                        Pronto p/ Entrega
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {filteredEnvasados.map((item) => {
                        const isSelected = recipeId === item.matchedRecipe.id;

                        return (
                          <div
                            key={item.key}
                            onClick={() => handleSelect(item.matchedRecipe, item.bestCapacity)}
                            className={`p-3.5 hover:bg-amber-50/60 transition-all cursor-pointer group ${
                              isSelected ? 'bg-amber-50/80' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-slate-900 text-xs sm:text-sm group-hover:text-amber-800 transition-colors">
                                    {item.displayName}
                                  </span>
                                  {item.matchedRecipe.style && (
                                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                      {item.matchedRecipe.style}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                                  <span>Preço base: <strong className="text-slate-800">{formatCurrency(item.matchedRecipe.salePricePerLiter || 20)}/L</strong></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>{item.totalAvailable} {item.totalAvailable === 1 ? 'barril livre' : 'barris livres'}</span>
                                </span>
                                {isSelected && (
                                  <span className="p-1 rounded-full bg-amber-500 text-white shadow-xs">
                                    <Check className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Barris / Capacidades disponíveis com seleção rápida em 1 clique */}
                            {item.capacities && item.capacities.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-0.5">
                                  Tamanhos:
                                </span>
                                {item.capacities.map((c: any) => {
                                  const kegPrice = resolvePrice
                                    ? resolvePrice(item.matchedRecipe, c.capacity)
                                    : (item.matchedRecipe.salePricePerLiter || 20) * c.capacity;

                                  return (
                                    <button
                                      key={c.capacity}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(item.matchedRecipe, c.capacity);
                                      }}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                                        c.available > 0
                                          ? 'bg-emerald-50/90 hover:bg-emerald-600 text-emerald-950 hover:text-white border-emerald-200 hover:border-emerald-600 active:scale-95'
                                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                      }`}
                                      title={c.available > 0 ? `Selecionar barril de ${c.capacity}L` : 'Sem estoque deste tamanho'}
                                      disabled={c.available <= 0}
                                    >
                                      <span className="font-extrabold">{c.capacity}L</span>
                                      <span className="opacity-40">•</span>
                                      <span className="text-[11px] font-semibold">{c.available} {c.available === 1 ? 'livre' : 'livres'}</span>
                                      <span className="opacity-40">•</span>
                                      <span className="font-black">{formatCurrency(kegPrice)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Seção 2: Outros Estilos / Em Produção nos Tanques */}
                {filteredOutros.length > 0 && (
                  <div>
                    <div className="px-3.5 py-2 bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between sticky top-[37px] z-10 border-b border-slate-200">
                      <span className="flex items-center gap-1.5">
                        <span>⏳</span>
                        <span>Em Produção nos Tanques / Sob Encomenda ({filteredOutros.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Sem barris envasados</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {filteredOutros.map((item) => {
                        const isSelected = recipeId === item.matchedRecipe.id;

                        return (
                          <div
                            key={item.key}
                            onClick={() => handleSelect(item.matchedRecipe, 50)}
                            className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group ${
                              isSelected ? 'bg-amber-50/80' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-amber-800 transition-colors">
                                    {item.displayName}
                                  </span>
                                  {item.matchedRecipe.style && (
                                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                      {item.matchedRecipe.style}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400 font-medium mt-0.5">
                                  0 barris envasados • Preço base: {formatCurrency(item.matchedRecipe.salePricePerLiter || 20)}/L
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {[50, 30].map((cap) => {
                                  const kegPrice = resolvePrice
                                    ? resolvePrice(item.matchedRecipe, cap)
                                    : (item.matchedRecipe.salePricePerLiter || 20) * cap;

                                  return (
                                    <button
                                      key={cap}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(item.matchedRecipe, cap);
                                      }}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                                    >
                                      {cap}L ({formatCurrency(kegPrice)})
                                    </button>
                                  );
                                })}
                                {isSelected && (
                                  <span className="p-1 rounded-full bg-amber-500 text-white shadow-xs ml-1">
                                    <Check className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Componente de Busca Digitada de Cliente
function ClientSearchSelect({
  clientId,
  clients,
  onSelectClient,
  onOpenQuickCreate,
  placeholder = '🔍 Digite o nome do cliente, bar, CNPJ ou cidade...',
}: {
  clientId: string;
  clients: any[];
  onSelectClient: (client: any) => void;
  onOpenQuickCreate?: (initialName: string) => void;
  placeholder?: string;
}) {
  const selectedClient = clients.find((c) => c.id === clientId);
  const [query, setQuery] = useState(selectedClient?.tradeName || selectedClient?.name || '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      setQuery(selectedClient.tradeName || selectedClient.name);
    } else {
      setQuery('');
    }
  }, [clientId, selectedClient]);

  const filtered = clients.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
      (c.document && c.document.includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:border-amber-500 focus:outline-none shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(true);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              if (selectedClient) setQuery(selectedClient.tradeName || selectedClient.name);
            }}
          />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-3 text-center space-y-2">
                <p className="text-xs text-slate-500 font-medium">
                  Nenhum cliente encontrado{query ? ` para "${query}"` : ''}
                </p>
                {onOpenQuickCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenQuickCreate(query);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Cadastrar {query ? `"${query}"` : 'novo cliente'} agora</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {filtered.slice(0, 20).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setQuery(c.tradeName || c.name);
                      setIsOpen(false);
                      onSelectClient(c);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-colors flex items-center justify-between ${
                      clientId === c.id ? 'bg-amber-50 font-bold text-amber-900' : 'text-slate-800'
                    }`}
                  >
                    <div>
                      <span className="font-extrabold block text-slate-900">{c.tradeName || c.name}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        {c.city ? `${c.city}/${c.state || ''}` : ''} {c.document ? `• CNPJ: ${c.document}` : ''}
                      </span>
                    </div>
                    {clientId === c.id && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                  </button>
                ))}
                {onOpenQuickCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenQuickCreate(query);
                    }}
                    className="w-full text-left px-3 py-2 text-xs bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-bold border-t border-slate-100 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                    <span>+ Cadastrar {query ? `"${query}"` : 'novo cliente'}...</span>
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [kegs, setKegs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE' | 'CALENDAR'>('TABLE');

  const changeViewMode = (mode: 'GRID' | 'TABLE' | 'CALENDAR') => {
    setViewMode(mode);
    try {
      localStorage.setItem('pinttech_orders_view_mode', mode);
    } catch {}
  };

  // Selected order modal for details / edit / payment
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderModalTab, setOrderModalTab] = useState<'DETAILS' | 'EDIT' | 'PAYMENT'>('DETAILS');
  const [newOrderTab, setNewOrderTab] = useState<'PRODUCTS' | 'EQUIPMENT' | 'DELIVERY'>('PRODUCTS');
  const [editOrderTab, setEditOrderTab] = useState<'PRODUCTS' | 'EQUIPMENT' | 'DELIVERY'>('PRODUCTS');
  const [savingOrder, setSavingOrder] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Price Tables State
  const [priceTables, setPriceTables] = useState<any[]>([]);

  // Edit Order Form State
  const [editClientId, setEditClientId] = useState('');
  const [editPriceTableId, setEditPriceTableId] = useState('');
  const [editDriverName, setEditDriverName] = useState('');
  const [editStatus, setEditStatus] = useState('CONFIRMADO');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editReturnDate, setEditReturnDate] = useState('');
  const [editActualReturnDate, setEditActualReturnDate] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<{ id?: string; recipeId: string; description?: string; quantity: number; unitPrice: number; totalPrice: number; kegCapacity?: number }[]>([]);
  const [editEquipments, setEditEquipments] = useState<string[]>([]);
  const [editDiscount, setEditDiscount] = useState('0');
  const [editDeliveryFee, setEditDeliveryFee] = useState('0');
  const [editCautionDeposit, setEditCautionDeposit] = useState('0');

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDoc, setPaymentDoc] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // New order modal state
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [newPriceTableId, setNewPriceTableId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [orderItems, setOrderItems] = useState<{ recipeId: string; quantity: number; unitPrice: number; kegCapacity?: number }[]>([]);
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedReturnDate, setEstimatedReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [cautionDeposit, setCautionDeposit] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');

  // Quick client modal state (cadastro rápido sem sair do pedido)
  const [quickClientModalOpen, setQuickClientModalOpen] = useState(false);
  const [quickClientInitialName, setQuickClientInitialName] = useState('');
  const [quickClientTarget, setQuickClientTarget] = useState<'NEW_ORDER' | 'EDIT_ORDER'>('NEW_ORDER');

  // Scan delivery modal
  const [scanModalOrder, setScanModalOrder] = useState<any>(null);
  const [scanFeedback, setScanFeedback] = useState<{ text: string; isNewItem?: boolean; type: 'success' | 'error' } | null>(null);
  const [scanning, setScanning] = useState(false);

  // Reservation Conflict Modal
  const [reservationConflictModal, setReservationConflictModal] = useState<{
    equipment: any;
    conflictOrder: any;
    targetMode: 'NEW' | 'EDIT';
  } | null>(null);

  // Keg Return / Recolha modal in order
  const [returnKegModal, setReturnKegModal] = useState<{
    keg: any;
    order: any;
    condition: 'VAZIO_SUJO' | 'PARCIALMENTE_CHEIO' | 'CHEIO_RETORNADO';
    returnVolumeLiters: string;
    billingMode: 'FULL' | 'PARTIAL';
  } | null>(null);
  const [processingReturn, setProcessingReturn] = useState(false);

  const handleConfirmKegReturn = async () => {
    if (!returnKegModal) return;
    setProcessingReturn(true);
    try {
      const res = await fetch('/api/kegs/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: returnKegModal.keg.code,
          action: 'RETURN',
          returnCondition: returnKegModal.condition,
          returnVolumeLiters: parseFloat(returnKegModal.returnVolumeLiters || '0'),
          billingMode: returnKegModal.billingMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar retorno do barril');
      alert(data.message || 'Retorno registrado com sucesso!');
      setReturnKegModal(null);
      loadData();
      if (selectedOrder) {
        const updatedRes = await fetch('/api/orders');
        const updatedOrders = await updatedRes.json();
        const found = (updatedOrders || []).find((o: any) => o.id === selectedOrder.id);
        if (found) setSelectedOrder(found);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar retorno');
    } finally {
      setProcessingReturn(false);
    }
  };

  const getStockAvailability = (recipeId: string, capacity: number, editingOrderId?: string) => {
    if (!recipeId) {
      return {
        available: 0,
        total: 0,
        matchingTotal: 0,
        reserved: 0,
        recipeName: 'Não selecionado',
        reservedOrders: [],
      };
    }

    const recipe = recipes.find((r) => r.id === recipeId) || {
      id: recipeId,
      name: recipeId?.startsWith('keg-beer-') ? recipeId.replace('keg-beer-', '') : 'Chopp',
    };

    const targetCleanName = cleanProductName(recipe.name).toLowerCase();

    // Find filled kegs in stock matching this recipe and capacity
    const matchingKegs = kegs.filter((k) => {
      if (k.status !== 'EM_ESTOQUE' && k.status !== 'ENVASADO') return false;
      if (k.capacity !== capacity) return false;

      // 1. Direct recipe ID match
      if (k.currentBatch?.recipeId && k.currentBatch.recipeId === recipeId) return true;

      // 2. Name matching with currentBeerName or currentBatch.recipe.name
      const kBeer = cleanProductName(k.currentBeerName || '').toLowerCase();
      const kBatch = cleanProductName(k.currentBatch?.recipe?.name || '').toLowerCase();

      for (const name of [kBeer, kBatch]) {
        if (!name) continue;
        if (targetCleanName && (name === targetCleanName || (name.length >= 4 && targetCleanName.includes(name)) || (targetCleanName.length >= 4 && name.includes(targetCleanName)))) {
          return true;
        }
      }

      return false;
    });

    // Calculate quantity already committed in active unfulfilled orders
    let reservedCount = 0;
    const reservedOrders: { orderNumber: string; clientName: string; quantity: number; deliveryDate?: string }[] = [];

    orders.forEach((o) => {
      if (o.id !== editingOrderId && ['ORCAMENTO', 'CONFIRMADO', 'EM_SEPARACAO'].includes(o.status)) {
        let qtyInOrder = 0;
        (o.items || []).forEach((it: any) => {
          const itCleanName = cleanProductName(it.recipe?.name || it.description || '').toLowerCase();
          const itMatches =
            it.recipeId === recipeId ||
            (targetCleanName && (itCleanName === targetCleanName || (itCleanName.length >= 4 && targetCleanName.includes(itCleanName))));

          let itemCap = it.kegCapacity || it.keg?.capacity;
          if (!itemCap && it.description) {
            const m = it.description.match(/(\d+)\s*L/i);
            if (m) itemCap = parseInt(m[1], 10);
          }
          if (!itemCap) itemCap = 50;

          if (itMatches && itemCap === capacity) {
            qtyInOrder += (it.quantity || 1);
          }
        });
        if (qtyInOrder > 0) {
          reservedCount += qtyInOrder;
          reservedOrders.push({
            orderNumber: o.orderNumber,
            clientName: o.client?.tradeName || o.client?.name || 'Cliente',
            quantity: qtyInOrder,
            deliveryDate: o.deliveryDate,
          });
        }
      }
    });

    const available = Math.max(0, matchingKegs.length - reservedCount);
    return {
      available,
      matchingTotal: matchingKegs.length,
      reserved: reservedCount,
      reservedOrders,
      recipeName: cleanProductName(recipe.name),
    };
  };

  const getEquipmentReservationConflict = (equipmentId: string, currentOrderId?: string) => {
    return orders.find(
      (o) =>
        o.id !== currentOrderId &&
        o.status !== 'CANCELADO' &&
        o.status !== 'CONCLUIDO' &&
        o.orderEquipments?.some((oe: any) => oe.equipmentId === equipmentId && !oe.returned)
    );
  };

  const handleToggleNewOrderEquipment = (eq: any) => {
    if (selectedEquipments.includes(eq.id)) {
      setSelectedEquipments(selectedEquipments.filter((id) => id !== eq.id));
      return;
    }
    const conflict = getEquipmentReservationConflict(eq.id);
    if (conflict) {
      setReservationConflictModal({
        equipment: eq,
        conflictOrder: conflict,
        targetMode: 'NEW',
      });
      return;
    }
    setSelectedEquipments([...selectedEquipments, eq.id]);
  };

  const handleToggleEditOrderEquipment = (eq: any) => {
    if (editEquipments.includes(eq.id)) {
      setEditEquipments(editEquipments.filter((id) => id !== eq.id));
      return;
    }
    const conflict = getEquipmentReservationConflict(eq.id, selectedOrder?.id);
    if (conflict) {
      setReservationConflictModal({
        equipment: eq,
        conflictOrder: conflict,
        targetMode: 'EDIT',
      });
      return;
    }
    setEditEquipments([...editEquipments, eq.id]);
  };

  const handleConfirmTransferReservation = () => {
    if (!reservationConflictModal) return;
    const { equipment: eq, conflictOrder, targetMode } = reservationConflictModal;

    if (targetMode === 'NEW') {
      setSelectedEquipments((prev) => (prev.includes(eq.id) ? prev : [...prev, eq.id]));
    } else {
      setEditEquipments((prev) => (prev.includes(eq.id) ? prev : [...prev, eq.id]));
    }

    // Release from local conflictOrder in orders state
    setOrders((prev) =>
      prev.map((o) =>
        o.id === conflictOrder.id
          ? {
              ...o,
              orderEquipments: (o.orderEquipments || []).filter(
                (oe: any) => oe.equipmentId !== eq.id
              ),
            }
          : o
      )
    );

    setReservationConflictModal(null);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [oRes, cRes, rRes, eRes, kRes, uRes, ptRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/clients'),
        fetch('/api/recipes'),
        fetch('/api/equipment'),
        fetch('/api/kegs'),
        fetch('/api/users'),
        fetch('/api/prices/tables'),
      ]);

      const [oData, cData, rData, eData, kData, uData, ptData] = await Promise.all([
        oRes.json(),
        cRes.json(),
        rRes.json(),
        eRes.json(),
        kRes.json(),
        uRes.json(),
        ptRes.json(),
      ]);

      if (Array.isArray(oData)) setOrders(oData);
      if (Array.isArray(cData)) {
        setClients(cData);
      }
      if (Array.isArray(rData)) {
        setRecipes(rData);
      }
      if (Array.isArray(eData)) setEquipment(eData);
      if (Array.isArray(kData)) setKegs(kData);
      if (Array.isArray(uData)) setUsers(uData);
      if (Array.isArray(ptData)) setPriceTables(ptData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    try {
      const savedMode = localStorage.getItem('pinttech_orders_view_mode');
      if (savedMode === 'GRID' || savedMode === 'TABLE' || savedMode === 'CALENDAR') {
        setViewMode(savedMode as any);
      }
    } catch {}
  }, []);

  // Helper para resolver o preço unitário do barril com base na tabela de preço selecionada
  const resolveBeerPrice = (recipe: any, capacity: number = 50, tableId?: string) => {
    if (!recipe) return 20 * capacity;
    const baseLiter = Number(recipe.salePricePerLiter || recipe.suggestedPricePerLiter || 20);
    const costLiter = Number(recipe.costPerLiter || 0);

    const targetTableId = tableId || priceTables.find((t) => t.isDefault)?.id;
    const table = priceTables.find((t) => t.id === targetTableId);

    if (!table) {
      return Math.round(baseLiter * capacity * 100) / 100;
    }

    let pricePerLiter = baseLiter;

    // 1. Tabela no modelo PREÇO DE CUSTO (AT_COST)
    if (table.type === 'AT_COST') {
      pricePerLiter = costLiter > 0 ? costLiter : baseLiter;
    }
    // 2. Custo + Margem %
    else if (table.type === 'COST_PLUS_PERCENT') {
      const margin = Number(table.adjustmentPercent || 0);
      pricePerLiter = (costLiter > 0 ? costLiter : baseLiter) * (1 + margin / 100);
    }
    // 3. Custo + Valor Fixo R$
    else if (table.type === 'COST_PLUS_FIXED') {
      const fixed = Number(table.fixedAddition || table.adjustmentPercent || 0);
      pricePerLiter = (costLiter > 0 ? costLiter : baseLiter) + fixed;
    }
    // 4. Desconto Geral (%) sobre preço base
    else if (table.type === 'DISCOUNT_PERCENT') {
      const disc = Number(table.adjustmentPercent || 0);
      pricePerLiter = baseLiter * (1 - disc / 100);
    }
    // 5. Acréscimo Geral (%) sobre preço base
    else if (table.type === 'MARKUP_PERCENT') {
      const markup = Number(table.adjustmentPercent || 0);
      pricePerLiter = baseLiter * (1 + markup / 100);
    }
    // 6. Padrão Base da Cervejaria
    else if (table.type === 'STANDARD') {
      pricePerLiter = baseLiter;
    }
    // 7. Tabela Personalizada / Customizada (CUSTOM)
    else {
      const item = (table.items || []).find((it: any) => it.recipeId === recipe.id);
      if (item && Number(item.pricePerLiter) > 0) {
        pricePerLiter = Number(item.pricePerLiter);
      } else {
        pricePerLiter = baseLiter;
      }
    }

    return Math.round(pricePerLiter * capacity * 100) / 100;
  };

  const handleNewPriceTableChange = (tableId: string) => {
    setNewPriceTableId(tableId);
    setOrderItems((prev) =>
      prev.map((it) => {
        const r = recipes.find((rec) => rec.id === it.recipeId);
        if (!r) return it;
        const cap = it.kegCapacity || 50;
        return {
          ...it,
          unitPrice: resolveBeerPrice(r, cap, tableId),
        };
      })
    );
  };

  const handleEditPriceTableChange = (tableId: string) => {
    setEditPriceTableId(tableId);
    setEditItems((prev) =>
      prev.map((it) => {
        const r = recipes.find((rec) => rec.id === it.recipeId);
        if (!r) return it;
        const cap = it.kegCapacity || 50;
        const uPrice = resolveBeerPrice(r, cap, tableId);
        return {
          ...it,
          unitPrice: uPrice,
          totalPrice: (it.quantity || 1) * uPrice,
        };
      })
    );
  };

  const handleClientSelectForNewOrder = (selectedId: string) => {
    setClientId(selectedId);
    const client = clients.find((c) => c.id === selectedId);
    if (client) {
      const fullAddr = [
        client.address ? `${client.address}${client.number ? `, ${client.number}` : ''}` : '',
        client.complement ? `(${client.complement})` : '',
        client.neighborhood,
        client.city ? `${client.city} - ${client.state || ''}` : '',
        client.zipCode ? `CEP: ${client.zipCode}` : '',
      ]
        .filter(Boolean)
        .join(', ');
      setDeliveryAddress(fullAddr);

      // Auto-selecionar a tabela de preço configurada no cliente
      const assignedTableId = client.priceTableId || priceTables.find((t) => t.isDefault)?.id || '';
      if (assignedTableId) {
        setNewPriceTableId(assignedTableId);
        setOrderItems((prev) =>
          prev.map((it) => {
            const r = recipes.find((rec) => rec.id === it.recipeId);
            if (!r) return it;
            const cap = it.kegCapacity || 50;
            return {
              ...it,
              unitPrice: resolveBeerPrice(r, cap, assignedTableId),
            };
          })
        );
      }
    }
  };

  const handleQuickClientSuccess = (newClient: any) => {
    // Adiciona o novo cliente à lista de clientes em memória
    setClients((prev) => {
      const exists = prev.some((c) => c.id === newClient.id);
      if (exists) return prev;
      return [newClient, ...prev];
    });

    const fullAddr = [
      newClient.address ? `${newClient.address}${newClient.number ? `, ${newClient.number}` : ''}` : '',
      newClient.complement ? `(${newClient.complement})` : '',
      newClient.neighborhood,
      newClient.city ? `${newClient.city} - ${newClient.state || ''}` : '',
      newClient.zipCode ? `CEP: ${newClient.zipCode}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    if (quickClientTarget === 'NEW_ORDER') {
      setClientId(newClient.id);
      if (fullAddr) setDeliveryAddress(fullAddr);
      if (newClient.priceTableId) {
        setNewPriceTableId(newClient.priceTableId);
      }
    } else {
      setEditClientId(newClient.id);
      if (fullAddr) setEditAddress(fullAddr);
      if (newClient.priceTableId) {
        setEditPriceTableId(newClient.priceTableId);
      }
    }
  };

  const openOrderDetails = (order: any, tab: 'DETAILS' | 'EDIT' | 'PAYMENT' = 'DETAILS') => {
    setSelectedOrder(order);
    setOrderModalTab(tab);
    setEditOrderTab('PRODUCTS');
    setCopiedAddress(false);
    setEditClientId(order.clientId || '');
    setEditPriceTableId(order.priceTableId || order.client?.priceTableId || priceTables.find((t) => t.isDefault)?.id || '');
    setEditDriverName(order.driverName || order.driverUser?.name || '');
    setEditStatus(order.status || 'CONFIRMADO');
    setEditDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : '');
    setEditReturnDate(order.estimatedReturnDate ? new Date(order.estimatedReturnDate).toISOString().split('T')[0] : '');
    setEditActualReturnDate(order.actualReturnDate ? new Date(order.actualReturnDate).toISOString().split('T')[0] : '');
    setEditAddress(order.deliveryAddress || '');
    setEditNotes(order.notes || '');
    setEditDiscount(String(order.discount || '0'));
    setEditDeliveryFee(String(order.deliveryFee || '0'));
    setEditCautionDeposit(String(order.cautionDeposit || '0'));

    if (order.items && order.items.length > 0) {
      setEditItems(
        order.items.map((it: any) => {
          let cap = it.kegCapacity || it.keg?.capacity;
          if (!cap && it.description) {
            const m = it.description.match(/(\d+)\s*L/i);
            if (m) cap = parseInt(m[1], 10);
          }
          if (!cap) cap = 50;

          return {
            id: it.id,
            recipeId: it.recipeId || (recipes[0]?.id || ''),
            description: it.description,
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || 0,
            totalPrice: it.totalPrice || (it.quantity * it.unitPrice),
            kegCapacity: cap,
          };
        })
      );
    } else {
      setEditItems([]);
    }

    if (order.orderEquipments) {
      setEditEquipments(order.orderEquipments.map((oe: any) => oe.equipmentId));
    } else {
      setEditEquipments([]);
    }

    // Reset payment amount to remaining amount
    const remaining = order.remainingAmount !== undefined ? order.remainingAmount : (order.totalAmount - (order.paidAmount || 0));
    setPaymentAmount(remaining > 0 ? String(remaining) : '');
  };

  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updated);
        }
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyAddressToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  const handleAddItemRow = () => {
    setOrderItems([
      ...orderItems,
      { recipeId: '', quantity: 1, unitPrice: 0, kegCapacity: 50 },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleAddEditItemRow = () => {
    setEditItems([
      ...editItems,
      {
        recipeId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        kegCapacity: 50,
      },
    ]);
  };

  const handleRemoveEditItemRow = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async (e?: React.FormEvent, forcedStatus: string = 'CONFIRMADO') => {
    if (e) e.preventDefault();

    if (!clientId) {
      alert('Por favor, selecione ou busque um cliente para o pedido.');
      return;
    }

    if (orderItems.some((it) => !it.recipeId)) {
      alert('Por favor, selecione ou digite a cerveja/chopp para cada item adicionado no pedido.');
      return;
    }

    // Collect informational stock notes
    const stockNotes: string[] = [];
    for (const it of orderItems) {
      if (!it.recipeId) continue;
      const stock = getStockAvailability(it.recipeId, it.kegCapacity || 50);
      if (stock.available <= 0) {
        stockNotes.push(`• ${stock.recipeName} (${it.kegCapacity || 50}L): 0 barris livres na câmara fria (${stock.matchingTotal} total, ${stock.reserved} reservados)`);
      } else if (it.quantity > stock.available) {
        stockNotes.push(`• ${stock.recipeName} (${it.kegCapacity || 50}L): solicitado ${it.quantity} un, mas há ${stock.available} livres (${stock.reserved} já reservados em outros pedidos)`);
      }
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          priceTableId: newPriceTableId || null,
          status: forcedStatus,
          driverName: driverName.trim() || null,
          items: orderItems,
          equipmentIds: selectedEquipments,
          deliveryDate,
          estimatedReturnDate,
          deliveryAddress,
          deliveryFee,
          cautionDeposit,
          discount,
          notes,
        }),
      });

      if (res.ok) {
        const createdOrder = await res.json();
        setNewModalOpen(false);
        loadData();

        if (forcedStatus === 'ORCAMENTO') {
          alert(
            `📝 Orçamento & Pré-Reserva #${createdOrder.orderNumber} registrado com sucesso!\n\nA data, chopp e chopeiras foram bloqueados preventivamente sem faturar a venda.`
          );
        } else if (stockNotes.length > 0) {
          alert(
            `✅ Pedido cadastrado com sucesso!\n\nℹ️ Observação de Estoque / Envase:\n${stockNotes.join('\n')}\n\nO pedido foi registrado para o planejamento de envase e produção.`
          );
        } else if (orderItems.length === 0) {
          alert(
            `✅ Pedido #${createdOrder.orderNumber} criado sem itens!\n\nVocê pode bipar os barris na entrega para adicioná-los automaticamente ao pedido.`
          );
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao criar pedido');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveOrderEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    if (editItems.some((it) => !it.recipeId)) {
      alert('Por favor, selecione ou digite a cerveja/chopp para cada item do pedido.');
      return;
    }

    // Collect informational stock notes for edit
    const stockNotes: string[] = [];
    for (const it of editItems) {
      if (!it.recipeId) continue;
      const cap = it.kegCapacity || 50;
      const stock = getStockAvailability(it.recipeId, cap, selectedOrder.id);
      if (stock.available <= 0) {
        stockNotes.push(`• ${stock.recipeName} (${cap}L): 0 barris livres na câmara fria (${stock.matchingTotal} total, ${stock.reserved} reservados)`);
      } else if (it.quantity > stock.available) {
        stockNotes.push(`• ${stock.recipeName} (${cap}L): solicitado ${it.quantity} un, mas há ${stock.available} livres (${stock.reserved} reservados)`);
      }
    }

    setSavingOrder(true);
    try {
      const computedSubtotal = editItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
      const disc = parseFloat(editDiscount) || 0;
      const fee = parseFloat(editDeliveryFee) || 0;
      const caut = parseFloat(editCautionDeposit) || 0;
      const finalTotal = Math.max(0, computedSubtotal + fee + caut - disc);

      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: editClientId,
          priceTableId: editPriceTableId || null,
          driverName: editDriverName.trim() || null,
          status: editStatus,
          deliveryDate: editDeliveryDate || null,
          estimatedReturnDate: editReturnDate || null,
          actualReturnDate: editActualReturnDate || null,
          deliveryAddress: editAddress,
          notes: editNotes,
          items: editItems,
          equipmentIds: editEquipments,
          subtotal: computedSubtotal,
          discount: disc,
          deliveryFee: fee,
          cautionDeposit: caut,
          totalAmount: finalTotal,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedOrder(updated);
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        setOrderModalTab('DETAILS');
        loadData();

        if (stockNotes.length > 0) {
          alert(
            `✅ Alterações salvas com sucesso!\n\nℹ️ Observação de Estoque / Envase:\n${stockNotes.join('\n')}\n\nO pedido foi atualizado normalmente.`
          );
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar pedido');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Informe um valor de recebimento válido');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentMethod,
          paymentDate,
          documentNumber: paymentDoc,
          notes: paymentNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedOrder(data.order);
        setPaymentAmount('');
        setPaymentDoc('');
        setPaymentNotes('');
        loadData();
      } else {
        alert(data.error || 'Erro ao registrar pagamento');
      }
    } catch (err) {
      alert('Erro de conexão ao registrar pagamento');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleScanDelivery = async (code: string) => {
    if (!scanModalOrder || !code) return;
    setScanning(true);
    setScanFeedback(null);

    try {
      const res = await fetch(`/api/orders/${scanModalOrder.id}/scan-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao bipar item no pedido');

      setScanFeedback({
        text: data.message,
        isNewItem: data.isNewItem,
        type: 'success',
      });

      if (data.order) {
        setScanModalOrder(data.order);
        if (selectedOrder && selectedOrder.id === data.order.id) {
          setSelectedOrder(data.order);
        }
        setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
      }
    } catch (err: any) {
      setScanFeedback({ text: err.message, type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  // Compute Today's Deliveries statistics
  const todayDateStr = new Date().toISOString().slice(0, 10);
  
  const todayDeliveries = orders.filter((o) => {
    if (!o.deliveryDate) return false;
    const dStr = new Date(o.deliveryDate).toISOString().slice(0, 10);
    return dStr === todayDateStr;
  });

  const todayPendingDeliveries = todayDeliveries.filter((o) => o.status !== 'ENTREGUE' && o.status !== 'CONCLUIDO' && o.status !== 'CANCELADO');
  const todayCompletedDeliveries = todayDeliveries.filter((o) => o.status === 'ENTREGUE' || o.status === 'CONCLUIDO');
  const todayTotalLiters = todayDeliveries.reduce((acc, o) => {
    return acc + (o.items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1) * (it.kegCapacity || 50), 0);
  }, 0);
  const todayTotalKegs = todayDeliveries.reduce((acc, o) => {
    return acc + (o.items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
  }, 0);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.client?.name && o.client.name.toLowerCase().includes(search.toLowerCase())) ||
      (o.client?.tradeName && o.client.tradeName.toLowerCase().includes(search.toLowerCase())) ||
      (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(search.toLowerCase()));
    
    let matchesStatus = true;
    if (statusFilter === 'TODAY') {
      if (!o.deliveryDate) matchesStatus = false;
      else {
        const dStr = new Date(o.deliveryDate).toISOString().slice(0, 10);
        matchesStatus = dStr === todayDateStr;
      }
    } else if (statusFilter === 'OPEN') {
      matchesStatus = o.status === 'CONFIRMADO' || o.status === 'EM_SEPARACAO' || o.status === 'EM_ROTA';
    } else if (statusFilter !== 'ALL') {
      matchesStatus = o.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            Pedidos & Entregas de Chopp
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie pedidos, rotas de entrega e comodatos. Clique em qualquer pedido para ver a ficha completa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternar Visualização Cards / Tabela / Agenda */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => changeViewMode('GRID')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => changeViewMode('TABLE')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Tabela / Linhas"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Linhas</span>
            </button>
            <button
              onClick={() => changeViewMode('CALENDAR')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'CALENDAR' ? 'bg-amber-500 text-slate-950 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Agenda / Calendário de Entregas"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>

          <button
            onClick={() => {
              const rows = filteredOrders.map((o) => ({
                'Nº Pedido': `#${o.orderNumber}`,
                'Data Pedido': formatDate(o.createdAt),
                'Data Entrega': o.deliveryDate ? formatDate(o.deliveryDate) : '—',
                'Cliente': o.client?.tradeName || o.client?.name || '—',
                'Cidade': o.client?.city || '—',
                'Telefone': o.client?.phone || '—',
                'Chopp / Itens': (o.items || []).map((i: any) => `${i.quantity}x ${i.recipe?.name || i.description || 'Barril'} (${i.kegCapacity || 50}L)`).join(', '),
                'Litros Totais': (o.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 1) * (it.kegCapacity || 50), 0),
                'Valor Total (R$)': o.totalAmount,
                'Valor Pago (R$)': o.paidAmount || 0,
                'Saldo Restante (R$)': Math.max(0, o.totalAmount - (o.paidAmount || 0)),
                'Status': o.status,
              }));
              exportJsonToExcel(rows, `Pedidos_PintTech_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Pedidos');
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-xs"
            title="Exportar pedidos filtrados para Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Exportar</span>
          </button>

          <button
            onClick={() => {
              setClientId('');
              setDriverName('');
              setDeliveryAddress('');
              setSelectedEquipments([]);
              setOrderItems([]);
              setNewPriceTableId(priceTables.find((t) => t.isDefault)?.id || '');
              setNewModalOpen(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Pedido</span>
          </button>
        </div>
      </div>

      {/* Painel Destaque: Entregas do Dia */}
      {todayDeliveries.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 p-4 rounded-2xl border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900">
                  Entregas de Hoje ({todayDeliveries.length})
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                  {todayPendingDeliveries.length} pendentes • {todayCompletedDeliveries.length} entregues
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Volume total do dia: <strong className="text-slate-900">{todayTotalLiters}L</strong> ({todayTotalKegs} barris) • Faturamento: <strong className="text-slate-900">{formatCurrency(todayDeliveries.reduce((acc, o) => acc + (o.totalAmount || 0), 0))}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setStatusFilter(statusFilter === 'TODAY' ? 'ALL' : 'TODAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'TODAY'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-300'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{statusFilter === 'TODAY' ? 'Mostrando Entregas de Hoje ✓' : 'Ver Entregas de Hoje'}</span>
            </button>

            <button
              onClick={() => {
                setStatusFilter('ALL');
                setViewMode('CALENDAR');
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-xs"
              title="Abrir Agenda / Calendário Completo"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Ver na Agenda</span>
            </button>
          </div>
        </div>
      )}

      {/* Filtros Rápidos & Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nº, cliente, bairro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos ({orders.length})
          </button>
          
          <button
            onClick={() => setStatusFilter('TODAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'TODAY'
                ? 'bg-amber-500 text-white shadow-xs font-black'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <CalendarDays className="w-3 h-3" />
            <span>Hoje ({todayDeliveries.length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('OPEN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'OPEN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Em Aberto ({orders.filter(o => o.status === 'CONFIRMADO' || o.status === 'EM_SEPARACAO' || o.status === 'EM_ROTA').length})
          </button>

          <button
            onClick={() => setStatusFilter('ORCAMENTO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'ORCAMENTO'
                ? 'bg-amber-600 text-white shadow-xs font-black'
                : 'bg-amber-50/80 text-amber-900 border border-amber-300 border-dashed hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Orçamentos ({orders.filter(o => o.status === 'ORCAMENTO').length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('EM_ROTA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'EM_ROTA'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Em Rota ({orders.filter(o => o.status === 'EM_ROTA').length})
          </button>

          <button
            onClick={() => setStatusFilter('ENTREGUE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'ENTREGUE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Entregues ({orders.filter(o => o.status === 'ENTREGUE' || o.status === 'CONCLUIDO').length})
          </button>
        </div>
      </div>

      {/* Orders View: CARDS, TABELA OU AGENDA */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Carregando pedidos...</div>
      ) : viewMode === 'CALENDAR' ? (
        /* VISUALIZAÇÃO EM AGENDA / CALENDÁRIO DE ENTREGAS */
        <OrderCalendarView
          orders={filteredOrders}
          onSelectOrder={(order) => openOrderDetails(order, 'DETAILS')}
          onCreateOrderOnDate={(dateStr) => {
            setClientId('');
            setDriverName('');
            setDeliveryAddress('');
            setSelectedEquipments([]);
            setOrderItems([]);
            setNewPriceTableId(priceTables.find((t) => t.isDefault)?.id || '');
            setDeliveryDate(dateStr);
            setNewModalOpen(true);
          }}
        />
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          Nenhum pedido encontrado com os filtros selecionados.
        </div>
      ) : viewMode === 'GRID' ? (
        /* VISUALIZAÇÃO EM CARDS COMPACTOS & DIRETOS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredOrders.map((order) => {
            const statusInfo = ORDER_STATUS_MAP[order.status] || {
              label: order.status,
              bg: 'bg-slate-100',
              color: 'text-slate-800',
            };

            const isPaid = order.paymentStatus === 'PAGO';
            const isPartial = order.paymentStatus === 'PARCIAL';
            const totalKegs = order.items?.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) || 0;
            const totalLiters = order.items?.reduce((acc: number, it: any) => acc + (it.quantity || 1) * (it.kegCapacity || 50), 0) || 0;

            const isOrderToday = order.deliveryDate && new Date(order.deliveryDate).toISOString().slice(0, 10) === todayDateStr;

            return (
              <div
                key={order.id}
                onClick={() => openOrderDetails(order, 'DETAILS')}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group shadow-xs space-y-3"
              >
                {/* Linha 1: Cabeçalho com Nº Pedido, Cliente e Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-amber-700">
                          #{order.orderNumber}
                        </span>
                        {isOrderToday && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white">
                            HOJE ⚡
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartial
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'PAGO' : isPartial ? 'PARCIAL' : 'PENDENTE'}
                        </span>
                        {order.priceTable && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 truncate max-w-[100px]" title={`Tabela: ${order.priceTable.name}`}>
                            {order.priceTable.name}
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-slate-900 text-sm mt-0.5 truncate group-hover:text-amber-600 transition-colors">
                        {order.client?.tradeName || order.client?.name}
                      </h3>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex-shrink-0 ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Linha 2: Resumo do Chopp / Itens e Comodatos */}
                  <div className="mt-2.5 bg-slate-50 p-2 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="truncate max-w-[200px] flex items-center gap-1">
                        🍺 {(order.items || []).length > 0
                          ? (order.items || []).map((i: any) => `${i.quantity}x ${i.description}`).join(', ')
                          : <span className="text-amber-700 italic font-medium">Sem itens (bipar na entrega)</span>}
                      </span>
                      <span className="text-[11px] text-amber-800 font-extrabold flex-shrink-0">
                        {totalLiters > 0 ? `${totalLiters}L` : totalKegs > 0 ? `${totalKegs} barris` : '0 itens'}
                      </span>
                    </div>

                    {order.orderEquipments?.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-orange-800 font-semibold pt-0.5">
                        <Wrench className="w-3 h-3 text-orange-600 flex-shrink-0" />
                        <span className="truncate">
                          Comodato: {order.orderEquipments.map((oe: any) => oe.equipment?.name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Linha 3: Endereço & Data de Entrega */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1 truncate max-w-[170px]" title={order.deliveryAddress}>
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{order.deliveryAddress || order.client?.neighborhood || order.client?.city || 'Sem endereço'}</span>
                    </span>

                    <span className="flex items-center gap-1 flex-shrink-0 font-bold text-slate-700">
                      <Calendar className="w-3 h-3 text-amber-600" />
                      {order.deliveryDate ? formatDateShort(order.deliveryDate) : 'Imediata'}
                    </span>
                  </div>

                  {(order.driverName || order.driverUser?.name) && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-900 font-bold bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/70">
                      <Truck className="w-3 h-3 text-amber-600 flex-shrink-0" />
                      <span className="truncate">Entrega: {order.driverName || order.driverUser?.name}</span>
                    </div>
                  )}
                </div>

                {/* Linha 4: Rodapé com Valor e Ações */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <span className="text-sm font-black text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    {!isPaid && (
                      <span className="text-[10px] text-rose-600 font-bold block">
                        Saldo: {formatCurrency(Math.max(0, order.totalAmount - (order.paidAmount || 0)))}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openOrderDetails(order, 'DETAILS')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                      title="Ver Ficha Completa do Pedido"
                    >
                      <Eye className="w-3 h-3 text-amber-600" />
                      <span>Detalhes</span>
                    </button>

                    <button
                      onClick={() => openOrderDetails(order, 'PAYMENT')}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-0.5"
                      title="Receber Pagamento"
                    >
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      <span>Receber</span>
                    </button>

                    <button
                      onClick={() => {
                        setScanFeedback(null);
                        setScanModalOrder(order);
                      }}
                      className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                      title="Bipar / Conferir Barris"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM TABELA COMPACTA */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Chopp / Itens</th>
                  <th className="py-3 px-4">Entrega</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredOrders.map((order) => {
                  const statusInfo = ORDER_STATUS_MAP[order.status] || {
                    label: order.status,
                    bg: 'bg-slate-100',
                    color: 'text-slate-800',
                  };
                  const isPaid = order.paymentStatus === 'PAGO';
                  const isPartial = order.paymentStatus === 'PARCIAL';
                  const totalLiters = order.items?.reduce((acc: number, it: any) => acc + (it.quantity || 1) * (it.kegCapacity || 50), 0) || 0;
                  const isOrderToday = order.deliveryDate && new Date(order.deliveryDate).toISOString().slice(0, 10) === todayDateStr;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => openOrderDetails(order, 'DETAILS')}
                      className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-amber-700">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{order.client?.tradeName || order.client?.name}</span>
                          {order.priceTable && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {order.priceTable.name}
                            </span>
                          )}
                        </div>
                        {order.deliveryAddress && (
                          <span className="text-[10px] text-slate-400 block font-normal truncate max-w-[160px]">
                            {order.deliveryAddress}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          {(order.items || []).length > 0
                            ? (order.items || []).map((i: any) => `${i.quantity}x ${i.description}`).join(', ')
                            : <span className="text-amber-700 italic font-medium">Sem itens (a bipar)</span>}
                        </span>
                        {totalLiters > 0 && (
                          <span className="text-[10px] text-amber-700 font-bold block">
                            {totalLiters}L totais
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isOrderToday ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white">
                            Hoje ⚡
                          </span>
                        ) : (
                          <span className="font-bold text-slate-700">
                            {order.deliveryDate ? formatDateShort(order.deliveryDate) : 'Imediata'}
                          </span>
                        )}
                        {(order.driverName || order.driverUser?.name) && (
                          <span className="text-[10px] text-amber-800 font-bold block truncate max-w-[130px] mt-0.5">
                            🚚 {order.driverName || order.driverUser?.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${statusInfo.bg} ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartial
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'PAGO' : isPartial ? 'PARCIAL' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openOrderDetails(order, 'DETAILS')}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openOrderDetails(order, 'PAYMENT')}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Receber Pagamento"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setScanFeedback(null);
                              setScanModalOrder(order);
                            }}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Bipar"
                          >
                            <QrCode className="w-3.5 h-3.5" />
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
      )}

      {/* Modal: Detalhes Completos, Edição e Recebimentos do Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            {/* Header with Title and Quick Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {selectedOrder.orderNumber}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Emissão: {formatDate(selectedOrder.createdAt)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      selectedOrder.paymentStatus === 'PAGO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedOrder.paymentStatus === 'PARCIAL'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedOrder.paymentStatus === 'PAGO' ? 'PAGO' : selectedOrder.paymentStatus === 'PARCIAL' ? 'PAGAMENTO PARCIAL' : 'PAGAMENTO PENDENTE'}
                  </span>
                  {selectedOrder.priceTable && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                      Tabela: {selectedOrder.priceTable.name}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {selectedOrder.client?.tradeName || selectedOrder.client?.name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleQuickStatusChange(selectedOrder.id, e.target.value)}
                  className="text-xs font-black px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-900 focus:outline-none"
                >
                  <option value="ORCAMENTO">ORÇAMENTO</option>
                  <option value="CONFIRMADO">CONFIRMADO</option>
                  <option value="EM_SEPARACAO">EM SEPARAÇÃO</option>
                  <option value="EM_ROTA">EM ROTA DE ENTREGA</option>
                  <option value="ENTREGUE">ENTREGUE</option>
                  <option value="CONCLUIDO">CONCLUÍDO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Orçamento Alert & Actions Banner */}
            {selectedOrder.status === 'ORCAMENTO' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-400 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-200/80 rounded-xl text-amber-800">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-amber-950">
                        Orçamento & Pré-Reserva de Data
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                        ⏳ Aguardando Confirmação
                      </span>
                    </div>
                    <p className="text-xs text-amber-800/90 mt-0.5">
                      Este orçamento reserva preventivamente a data, chopp e chopeiras na agenda, mas ainda não foi faturado como venda definitiva.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja realmente cancelar este orçamento e liberar as chopeiras e barris reservados?')) {
                        handleQuickStatusChange(selectedOrder.id, 'CANCELADO');
                      }
                    }}
                    className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all"
                  >
                    Cancelar Orçamento
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange(selectedOrder.id, 'CONFIRMADO')}
                    className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Efetivar & Confirmar Pedido</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Tabs */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setOrderModalTab('DETAILS')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  orderModalTab === 'DETAILS' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Detalhes & Visão Geral</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderModalTab('EDIT')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  orderModalTab === 'EDIT' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>Editar Pedido</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderModalTab('PAYMENT')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  orderModalTab === 'PAYMENT' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Recebimentos & Pagamentos</span>
              </button>
            </div>

            {/* TAB 1: VISÃO GERAL & DETALHES COMPLETOS */}
            {orderModalTab === 'DETAILS' && (
              <div className="space-y-4 text-xs">
                {/* 1. Endereços de Entrega e Retirada */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-950 flex items-center gap-1.5 text-sm">
                      <Truck className="w-4 h-4 text-amber-600" />
                      Logística de Entrega & Retirada
                    </span>
                    {copiedAddress && (
                      <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full animate-in fade-in">
                        ✓ Endereço copiado!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Endereço de Entrega */}
                    <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-600" /> Endereço de Entrega:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const addr = selectedOrder.deliveryAddress || `${selectedOrder.client?.address || ''}, ${selectedOrder.client?.number || ''}, ${selectedOrder.client?.city || ''}`;
                              copyAddressToClipboard(addr);
                            }}
                            className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                            title="Copiar Endereço"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.deliveryAddress || `${selectedOrder.client?.address || ''}, ${selectedOrder.client?.city || ''}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="Abrir no Google Maps / Waze"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      <p className="font-extrabold text-slate-900 text-xs leading-relaxed">
                        {selectedOrder.deliveryAddress || (
                          `${selectedOrder.client?.address || 'Sem rua cadastrada'}${selectedOrder.client?.number ? `, ${selectedOrder.client?.number}` : ''}${selectedOrder.client?.complement ? ` (${selectedOrder.client?.complement})` : ''} - ${selectedOrder.client?.neighborhood || ''}, ${selectedOrder.client?.city || ''} - ${selectedOrder.client?.state || ''} ${selectedOrder.client?.zipCode ? `• CEP: ${selectedOrder.client?.zipCode}` : ''}`
                        )}
                      </p>
                    </div>

                    {/* Endereço de Retirada / Recolha */}
                    <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-sm space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-600" /> Ponto de Retirada / Devolução de Vasilhames:
                      </span>
                      <p className="font-extrabold text-slate-800 text-xs leading-relaxed">
                        {selectedOrder.brewery?.address
                          ? `${selectedOrder.brewery.name} — ${selectedOrder.brewery.address}, ${selectedOrder.brewery.city || ''}/${selectedOrder.brewery.state || ''}`
                          : 'Pátio Central da Cervejaria (Devolução dos barris vazios e chopeiras comodatadas)'}
                      </p>
                    </div>

                    {/* Responsável pela Entrega / Motorista */}
                    <div className="md:col-span-2 p-3 bg-white rounded-xl border border-amber-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-slate-700">
                          Responsável pela Entrega: <strong className="font-black text-amber-900">{selectedOrder.driverName || selectedOrder.driverUser?.name || 'Não atribuído'}</strong>
                        </span>
                      </div>
                      {selectedOrder.driverUser?.phone && (
                        <span className="text-[11px] font-bold text-slate-600">
                          Contato: {selectedOrder.driverUser.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Datas e Cronograma */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Data do Pedido</span>
                    <span className="font-extrabold text-slate-800 text-xs mt-0.5 block">
                      {formatDate(selectedOrder.createdAt)}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-[10px] font-bold text-amber-800 block uppercase">Data de Entrega</span>
                    <span className="font-black text-amber-950 text-xs mt-0.5 block">
                      {selectedOrder.deliveryDate ? formatDate(selectedOrder.deliveryDate) : 'A Definir'}
                    </span>
                  </div>

                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <span className="text-[10px] font-bold text-orange-800 block uppercase">Previsão Recolha</span>
                    <span className="font-black text-orange-950 text-xs mt-0.5 block">
                      {selectedOrder.estimatedReturnDate ? formatDateShort(selectedOrder.estimatedReturnDate) : 'Não agendada'}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-800 block uppercase">Retorno Efetivo</span>
                    <span className="font-black text-emerald-950 text-xs mt-0.5 block">
                      {selectedOrder.actualReturnDate ? formatDate(selectedOrder.actualReturnDate) : (selectedOrder.status === 'CONCLUIDO' ? 'Finalizado' : 'Pendente')}
                    </span>
                  </div>
                </div>

                {/* 3. Dados do Cliente */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Dados do Cliente / Contratante:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Razão Social / Nome:</span>
                      <span className="font-extrabold text-slate-900 text-xs">{selectedOrder.client?.name}</span>
                      {selectedOrder.client?.tradeName && (
                        <span className="text-[11px] text-slate-500 block font-medium">({selectedOrder.client.tradeName})</span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Documento (CNPJ/CPF):</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {selectedOrder.client?.document || 'Não informado'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Contato & WhatsApp:</span>
                      {selectedOrder.client?.phone ? (
                        <a
                          href={`https://wa.me/55${selectedOrder.client.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 text-xs"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{selectedOrder.client.phone} (WhatsApp)</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">Não cadastrado</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Itens e Chopp Solicitados */}
                <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 flex items-center gap-1.5 text-xs">
                      <Cylinder className="w-4 h-4 text-purple-600" />
                      Barris de Chopp Solicitados ({selectedOrder.items?.length || 0})
                    </span>
                    <span className="text-[11px] font-bold text-purple-700">
                      Total: {formatCurrency(selectedOrder.subtotal || selectedOrder.items?.reduce((a: number, b: any) => a + (b.totalPrice || 0), 0) || 0)}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse bg-white rounded-xl overflow-hidden border border-purple-200">
                      <thead>
                        <tr className="bg-purple-100/70 text-[10px] font-black uppercase text-purple-900">
                          <th className="p-2.5 pl-3">Estilo / Chopp</th>
                          <th className="p-2.5 text-center">Qtd Barris</th>
                          <th className="p-2.5 text-right">Preço Unit.</th>
                          <th className="p-2.5 text-right pr-3">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100 text-xs">
                        {(!selectedOrder.items || selectedOrder.items.length === 0) ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-500 font-medium">
                              Nenhum chopp/barril adicionado a este pedido ainda. Os barris podem ser bipados na entrega!
                            </td>
                          </tr>
                        ) : (
                          selectedOrder.items.map((it: any) => (
                          <tr key={it.id} className="hover:bg-purple-50/50">
                            <td className="p-2.5 pl-3">
                              <span className="font-extrabold text-slate-900 block">{it.description}</span>
                              {it.recipe && (
                                <span className="text-[10px] text-purple-700 font-semibold">
                                  {it.recipe.style} • {it.recipe.abv}% ABV • {it.recipe.ibu} IBU
                                </span>
                              )}
                              {it.keg && (
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                                    Barril Físico: {it.keg.code} ({it.keg.capacity}L)
                                  </span>
                                  {['EM_ROTA', 'ENTREGUE'].includes(selectedOrder.status) && (
                                    <button
                                      type="button"
                                      onClick={() => setReturnKegModal({
                                        keg: it.keg,
                                        order: selectedOrder,
                                        condition: 'VAZIO_SUJO',
                                        returnVolumeLiters: '15',
                                        billingMode: 'FULL',
                                      })}
                                      className="text-[10px] font-bold text-orange-800 hover:text-orange-950 bg-orange-100/80 hover:bg-orange-200 px-2 py-0.5 rounded-md border border-orange-300 transition-colors flex items-center gap-1 shadow-2xs"
                                      title="Dar baixa e recolher barril"
                                    >
                                      <RefreshCw className="w-2.5 h-2.5" />
                                      <span>Registrar Retorno</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-black text-slate-800">{it.quantity}</td>
                            <td className="p-2.5 text-right font-medium text-slate-600">{formatCurrency(it.unitPrice)}</td>
                            <td className="p-2.5 text-right pr-3 font-black text-slate-900">{formatCurrency(it.totalPrice)}</td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Equipamentos em Comodato */}
                {selectedOrder.orderEquipments?.length > 0 && (
                  <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-2">
                    <span className="font-black text-orange-950 flex items-center gap-1.5 text-xs">
                      <Wrench className="w-4 h-4 text-orange-600" />
                      Chopeiras & Equipamentos em Comodato ({selectedOrder.orderEquipments.length})
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedOrder.orderEquipments.map((oe: any) => (
                        <div key={oe.id} className="p-2.5 bg-white rounded-xl border border-orange-200 flex items-center justify-between shadow-sm">
                          <div>
                            <span className="font-black text-slate-900 text-xs block">{oe.equipment?.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Código: {oe.equipment?.code} {oe.equipment?.voltage ? `• ${oe.equipment.voltage}` : ''} {oe.equipment?.serialNumber ? `• Nº Série: ${oe.equipment.serialNumber}` : ''}
                            </span>
                            {oe.conditionNotes && (
                              <p className="text-[10px] text-orange-700 mt-0.5 font-medium">{oe.conditionNotes}</p>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              oe.returned ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {oe.returned ? 'Devolvido' : 'Com o Cliente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Resumo Financeiro Completo */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" /> Detalhamento Financeiro do Pedido
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Forma: <strong className="text-white font-bold">{selectedOrder.paymentMethod || 'PIX'}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Subtotal Produtos:</span>
                      <span className="font-bold text-white text-sm">{formatCurrency(selectedOrder.subtotal || 0)}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Frete / Entrega:</span>
                      <span className="font-bold text-white text-sm">{formatCurrency(selectedOrder.deliveryFee || 0)}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Caução Equipamento:</span>
                      <span className="font-bold text-white text-sm">{formatCurrency(selectedOrder.cautionDeposit || 0)}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Desconto Aplicado:</span>
                      <span className="font-bold text-rose-400 text-sm">
                        {selectedOrder.discount > 0 ? `- ${formatCurrency(selectedOrder.discount)}` : 'R$ 0,00'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-xs block">Valor Total do Pedido:</span>
                      <span className="text-xl font-black text-amber-400">{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Total Pago:</span>
                          <span className="text-sm font-black text-emerald-400">{formatCurrency(selectedOrder.paidAmount || 0)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Saldo Devedor:</span>
                          <span className={`text-sm font-black ${selectedOrder.remainingAmount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {formatCurrency(selectedOrder.remainingAmount !== undefined ? selectedOrder.remainingAmount : (selectedOrder.totalAmount - (selectedOrder.paidAmount || 0)))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7. Observações */}
                {selectedOrder.notes && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 block mb-0.5">Observações do Pedido:</span>
                    <p className="text-slate-600 leading-relaxed">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Rodapé de Ações Rápidas */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setScanFeedback(null);
                      setScanModalOrder(selectedOrder);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 text-xs transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Bipar Entrega (Câmera)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 text-xs transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{selectedOrder.status === 'ORCAMENTO' ? 'Imprimir Orçamento' : 'Imprimir Pedido'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderModalTab('EDIT')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center gap-1.5 text-xs transition-all"
                    >
                      <Edit3 className="w-4 h-4 text-amber-600" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderModalTab('PAYMENT')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 text-xs transition-all"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Registrar Recebimento</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EDITAR PEDIDO */}
            {orderModalTab === 'EDIT' && (() => {
              const editSubtotal = editItems.reduce((acc, it) => acc + (it.quantity || 0) * (it.unitPrice || 0), 0);
              const editFee = parseFloat(editDeliveryFee) || 0;
              const editDisc = parseFloat(editDiscount) || 0;
              const editCaut = parseFloat(editCautionDeposit) || 0;
              const editTotal = Math.max(0, editSubtotal + editFee + editCaut - editDisc);
              const editTotalLiters = editItems.reduce((acc, it) => acc + (it.quantity || 0) * (it.kegCapacity || 50), 0);

              return (
                <form onSubmit={handleSaveOrderEdits} className="space-y-4 text-xs">
                  {/* Card Fixo: Cliente, Tabela de Preço, Status e Data de Entrega */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      {/* Cliente */}
                      <div className="sm:col-span-4">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-bold text-slate-700">Cliente / Ponto de Venda <span className="text-amber-600">*</span></label>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickClientTarget('EDIT_ORDER');
                              setQuickClientInitialName('');
                              setQuickClientModalOpen(true);
                            }}
                            className="text-[11px] font-extrabold text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline cursor-pointer transition-colors"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>+ Novo Cliente</span>
                          </button>
                        </div>
                        <ClientSearchSelect
                          clientId={editClientId}
                          clients={clients}
                          onSelectClient={(c) => {
                            setEditClientId(c.id);
                            if (!editAddress) {
                              const addr = [c.address, c.number, c.neighborhood, c.city].filter(Boolean).join(', ');
                              setEditAddress(addr);
                            }
                            if (c.priceTableId) {
                              handleEditPriceTableChange(c.priceTableId);
                            }
                          }}
                          onOpenQuickCreate={(initialName) => {
                            setQuickClientTarget('EDIT_ORDER');
                            setQuickClientInitialName(initialName);
                            setQuickClientModalOpen(true);
                          }}
                        />
                      </div>

                      {/* Tabela de Preço */}
                      <div className="sm:col-span-3">
                        <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Tabela de Preço</span>
                          {editPriceTableId && priceTables.find((t) => t.id === editPriceTableId)?.type === 'AT_COST' && (
                            <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">Preço de Custo</span>
                          )}
                        </label>
                        <select
                          value={editPriceTableId}
                          onChange={(e) => handleEditPriceTableChange(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                        >
                          <option value="">Padrão da Cervejaria</option>
                          {priceTables.map((pt) => (
                            <option key={pt.id} value={pt.id}>
                              {pt.name} {pt.isDefault ? '(Padrão)' : ''} {pt.adjustmentPercent ? `(${pt.adjustmentPercent > 0 ? '+' : ''}${pt.adjustmentPercent}%)` : ''} {pt.type === 'AT_COST' ? '(Custo)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status */}
                      <div className="sm:col-span-3">
                        <label className="block font-bold text-slate-700 mb-1">Status do Pedido</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-amber-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                        >
                          <option value="ORCAMENTO">ORÇAMENTO</option>
                          <option value="CONFIRMADO">CONFIRMADO</option>
                          <option value="EM_SEPARACAO">EM SEPARAÇÃO</option>
                          <option value="EM_ROTA">EM ROTA DE ENTREGA</option>
                          <option value="ENTREGUE">ENTREGUE</option>
                          <option value="CONCLUIDO">CONCLUÍDO</option>
                          <option value="CANCELADO">CANCELADO</option>
                        </select>
                      </div>

                      {/* Data de Entrega */}
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">Data Entrega <span className="text-amber-600">*</span></label>
                        <input
                          type="date"
                          value={editDeliveryDate}
                          onChange={(e) => setEditDeliveryDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sub-Abas Ergonômicas de Edição (Estilo ERP BierHeld) */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl border border-slate-300/80 w-fit">
                    <button
                      type="button"
                      onClick={() => setEditOrderTab('PRODUCTS')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        editOrderTab === 'PRODUCTS'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      <span>🍺 Produtos</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        editOrderTab === 'PRODUCTS' ? 'bg-amber-100 text-amber-900' : 'bg-slate-300/80 text-slate-700'
                      }`}>
                        {editItems.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditOrderTab('EQUIPMENT')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        editOrderTab === 'EQUIPMENT'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      <span>🎛️ Comodato (Chopeiras)</span>
                      {editEquipments.length > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          editOrderTab === 'EQUIPMENT' ? 'bg-orange-100 text-orange-900' : 'bg-slate-300/80 text-slate-700'
                        }`}>
                          {editEquipments.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditOrderTab('DELIVERY')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        editOrderTab === 'DELIVERY'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      <span>🚚 Logística & Devolução</span>
                      {editAddress && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  </div>

                  {/* SUB-ABA 1: PRODUTOS */}
                  {editOrderTab === 'PRODUCTS' && (
                    <div className="space-y-3">
                      {/* Tabela de Produtos */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 text-xs sm:text-sm">
                              🍺 Itens e Produtos do Pedido
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                              {editItems.length} {editItems.length === 1 ? 'item' : 'itens'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddEditItemRow}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar Item</span>
                          </button>
                        </div>

                        {/* Grid / Tabela */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="bg-slate-100/80 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider border-b border-slate-200">
                                <th className="py-2.5 px-3 text-center w-12">#</th>
                                <th className="py-2.5 px-3">Cerveja / Chopp</th>
                                <th className="py-2.5 px-3 w-32">Barril</th>
                                <th className="py-2.5 px-3 text-center w-24">Qtd</th>
                                <th className="py-2.5 px-3 text-right w-32">Unitário (R$)</th>
                                <th className="py-2.5 px-3 text-right w-36">Subtotal</th>
                                <th className="py-2.5 px-3 text-center w-12"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {editItems.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-10 text-center text-slate-400">
                                    <p className="text-xs font-semibold mb-2">Nenhum produto vinculado a este pedido.</p>
                                    <button
                                      type="button"
                                      onClick={handleAddEditItemRow}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs shadow-xs hover:bg-amber-600 transition-all cursor-pointer active:scale-95"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Adicionar Item</span>
                                    </button>
                                  </td>
                                </tr>
                              ) : (
                                editItems.map((item, idx) => {
                                  const stock = getStockAvailability(item.recipeId, item.kegCapacity || 50, selectedOrder?.id);
                                  const isOutOfStock = Boolean(item.recipeId) && stock.available <= 0;
                                  const isInsufficient = Boolean(item.recipeId) && !isOutOfStock && item.quantity > stock.available;
                                  const itemTotal = (item.quantity || 1) * (item.unitPrice || 0);

                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors group">
                                      <td className="py-3 px-3 text-center align-top pt-4">
                                        <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                          {idx + 1}
                                        </span>
                                      </td>

                                      <td className="py-3 px-3 align-top">
                                        <RecipeSearchSelect
                                          recipeId={item.recipeId}
                                          recipes={recipes}
                                          kegs={kegs}
                                          orders={orders}
                                          resolvePrice={(rec, cap) => resolveBeerPrice(rec, cap, editPriceTableId)}
                                          onSelectRecipe={(r, recommendedCap) => {
                                            const updated = [...editItems];
                                            const cap = recommendedCap || updated[idx].kegCapacity || 50;
                                            updated[idx].recipeId = r.id;
                                            updated[idx].kegCapacity = cap;
                                            updated[idx].description = `Barril ${cap}L - ${r.name}`;
                                            updated[idx].unitPrice = resolveBeerPrice(r, cap, editPriceTableId);
                                            updated[idx].totalPrice = updated[idx].quantity * updated[idx].unitPrice;
                                            setEditItems(updated);
                                          }}
                                        />
                                        {item.recipeId && (
                                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                            {stock.available > 0 ? (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <span>{stock.available} barril(is) livres na câmara fria</span>
                                                {stock.reserved > 0 && <span className="text-emerald-700">({stock.reserved} reservados)</span>}
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                <span>Sem estoque envasado livre ({stock.matchingTotal} cheios • {stock.reserved} reservados)</span>
                                              </span>
                                            )}
                                            {isInsufficient && (
                                              <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded border border-rose-200">
                                                Qtd pedida ({item.quantity}) supera estoque ({stock.available})
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </td>

                                      <td className="py-3 px-3 align-top">
                                        <select
                                          value={item.kegCapacity || 50}
                                          onChange={(e) => {
                                            const cap = parseInt(e.target.value, 10) || 50;
                                            const updated = [...editItems];
                                            updated[idx].kegCapacity = cap;
                                            const r = recipes.find((rec) => rec.id === updated[idx].recipeId);
                                            if (r) {
                                              updated[idx].description = `Barril ${cap}L - ${r.name}`;
                                              updated[idx].unitPrice = resolveBeerPrice(r, cap, editPriceTableId);
                                              updated[idx].totalPrice = updated[idx].quantity * updated[idx].unitPrice;
                                            }
                                            setEditItems(updated);
                                          }}
                                          className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                                        >
                                          {[50, 30, 20, 15, 10, 5].map((cap) => {
                                            const avail = item.recipeId ? getStockAvailability(item.recipeId, cap, selectedOrder?.id).available : 0;
                                            return (
                                              <option key={cap} value={cap}>
                                                {cap}L {avail > 0 ? `(${avail})` : ''}
                                              </option>
                                            );
                                          })}
                                        </select>
                                      </td>

                                      <td className="py-3 px-3 align-top">
                                        <input
                                          type="number"
                                          min="1"
                                          value={item.quantity}
                                          onChange={(e) => {
                                            const updated = [...editItems];
                                            const qty = parseInt(e.target.value, 10) || 1;
                                            updated[idx].quantity = qty;
                                            updated[idx].totalPrice = qty * updated[idx].unitPrice;
                                            setEditItems(updated);
                                          }}
                                          className="w-full px-2 py-2 rounded-xl font-bold text-center text-xs bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 focus:outline-none"
                                        />
                                      </td>

                                      <td className="py-3 px-3 align-top">
                                        <input
                                          type="number"
                                          step="5"
                                          value={item.unitPrice}
                                          onChange={(e) => {
                                            const updated = [...editItems];
                                            const price = parseFloat(e.target.value) || 0;
                                            updated[idx].unitPrice = price;
                                            updated[idx].totalPrice = updated[idx].quantity * price;
                                            setEditItems(updated);
                                          }}
                                          className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-right text-slate-800 text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                                        />
                                      </td>

                                      <td className="py-3 px-3 text-right align-top pt-4">
                                        <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                                          {formatCurrency(itemTotal)}
                                        </span>
                                      </td>

                                      <td className="py-3 px-3 text-center align-top pt-3">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveEditItemRow(idx)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                          title="Remover este item"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Rodapé da Tabela: Botão Adicionar Item (Esquerda) e Resumo Financeiro (Direita) */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <button
                              type="button"
                              onClick={handleAddEditItemRow}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-amber-50 text-slate-800 hover:text-amber-900 border border-slate-300 hover:border-amber-400 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
                            >
                              <Plus className="w-4 h-4 text-amber-600" />
                              <span>+ Adicionar Produto</span>
                            </button>
                            <div className="text-[11px] text-slate-500 font-bold mt-2">
                              Volume total: <strong className="text-slate-800">{editTotalLiters} Litros</strong>
                            </div>
                          </div>

                          {/* Resumo Financeiro Compacto (Estilo BierHeld) */}
                          <div className="w-full sm:w-80 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Subtotal dos Produtos:</span>
                              <span className="font-mono font-bold text-slate-900">{formatCurrency(editSubtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600 gap-2">
                              <span>Entrega / Frete:</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-slate-400">R$</span>
                                <input
                                  type="number"
                                  value={editDeliveryFee}
                                  onChange={(e) => setEditDeliveryFee(e.target.value)}
                                  className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-right text-xs focus:bg-white focus:outline-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-slate-600 gap-2">
                              <span>Desconto Comercial:</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-slate-400">R$</span>
                                <input
                                  type="number"
                                  value={editDiscount}
                                  onChange={(e) => setEditDiscount(e.target.value)}
                                  className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-right text-xs focus:bg-white focus:outline-none text-rose-600"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                            {editCaut > 0 && (
                              <div className="flex items-center justify-between text-slate-600">
                                <span>Caução Chopeiras:</span>
                                <span className="font-mono font-bold text-slate-900">{formatCurrency(editCaut)}</span>
                              </div>
                            )}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="font-extrabold text-slate-900">Total do Pedido:</span>
                              <span className="font-mono font-black text-amber-600 text-base">{formatCurrency(editTotal)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Observações Gerais */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Observações Gerais do Pedido
                        </label>
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Instruções para o entregador, pontos de referência, detalhes comerciais..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* SUB-ABA 2: COMODATO (CHOPEIRAS & CILINDROS) */}
                  {editOrderTab === 'EQUIPMENT' && (
                    <div className="space-y-3">
                      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div>
                            <span className="font-black text-slate-900 text-sm block">
                              🎛️ Equipamentos em Comodato (Chopeiras & Cilindros)
                            </span>
                            <span className="text-xs text-slate-500">
                              Selecione as chopeiras e equipamentos vinculados a este pedido
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-600">Caução Chopeira (R$):</label>
                            <input
                              type="number"
                              value={editCautionDeposit}
                              onChange={(e) => setEditCautionDeposit(e.target.value)}
                              className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-right text-xs focus:bg-white focus:outline-none"
                              placeholder="0,00"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                          {equipment.length === 0 ? (
                            <div className="col-span-2 py-8 text-center text-slate-400">
                              Nenhum equipamento cadastrado na cervejaria.
                            </div>
                          ) : (
                            equipment.map((eq) => {
                              const isSelected = editEquipments.includes(eq.id);
                              const conflict = getEquipmentReservationConflict(eq.id, selectedOrder?.id);

                              return (
                                <div
                                  key={eq.id}
                                  onClick={() => handleToggleEditOrderEquipment(eq)}
                                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                                    isSelected
                                      ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500/20'
                                      : conflict
                                      ? 'bg-orange-50/50 border-orange-200 hover:border-orange-300'
                                      : 'bg-white border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-bold text-slate-800 truncate block leading-tight">{eq.name}</span>
                                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{eq.code}</span>
                                    </div>
                                    {conflict ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-800 bg-orange-100/90 px-1.5 py-0.5 rounded-md mt-1 border border-orange-200">
                                        🔒 Reservado no Pedido #{conflict.orderNumber} ({conflict.client?.tradeName || conflict.client?.name})
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 mt-0.5">
                                        ✓ Disponível na Cervejaria
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-ABA 3: LOGÍSTICA & DEVOLUÇÃO */}
                  {editOrderTab === 'DELIVERY' && (
                    <div className="space-y-3">
                      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                        <span className="font-black text-slate-900 text-sm block pb-2 border-b border-slate-100">
                          🚚 Dados de Transporte, Entrega e Devolução
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Previsão Devolução / Recolha
                            </label>
                            <input
                              type="date"
                              value={editReturnDate}
                              onChange={(e) => setEditReturnDate(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              Data estimada para recolha dos barris vazios e chopeiras
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Retorno Efetivo (Recolha Realizada)
                            </label>
                            <input
                              type="date"
                              value={editActualReturnDate}
                              onChange={(e) => setEditActualReturnDate(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              Preencha quando os equipamentos retornarem à cervejaria
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Responsável pela Entrega / Motorista
                            </label>
                            <input
                              type="text"
                              list="drivers-datalist-edit"
                              value={editDriverName}
                              onChange={(e) => setEditDriverName(e.target.value)}
                              placeholder="Nome do motorista / entregador..."
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:outline-none"
                            />
                            <datalist id="drivers-datalist-edit">
                              {users.map((u) => (
                                <option key={u.id} value={u.name}>
                                  {u.name} ({u.role})
                                </option>
                              ))}
                            </datalist>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Endereço Completo de Entrega
                            </label>
                            <input
                              type="text"
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                              placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs focus:bg-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Barra Inferior com Total e Botão Salvar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Total do Pedido:</span>
                      <span className="text-xl font-black text-amber-600 font-mono">{formatCurrency(editTotal)}</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setOrderModalTab('DETAILS')}
                        className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Voltar aos Detalhes
                      </button>
                      <button
                        type="submit"
                        disabled={savingOrder}
                        className="px-6 py-2.5 font-black rounded-xl shadow-md shadow-amber-500/20 transition-all bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs active:scale-95 flex items-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>{savingOrder ? 'Salvando Alterações...' : 'Salvar Alterações do Pedido'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              );
            })()}

            {/* TAB 3: RECEBIMENTOS & PAGAMENTOS */}
            {orderModalTab === 'PAYMENT' && (
              <div className="space-y-4 text-xs">
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Total do Pedido</span>
                    <span className="text-base font-black text-slate-900">{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-700 block uppercase">Total Já Recebido</span>
                    <span className="text-base font-black text-emerald-800">{formatCurrency(selectedOrder.paidAmount || 0)}</span>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-700 block uppercase">Saldo Restante</span>
                    <span className="text-base font-black text-rose-800">
                      {formatCurrency(selectedOrder.remainingAmount !== undefined ? selectedOrder.remainingAmount : (selectedOrder.totalAmount - (selectedOrder.paidAmount || 0)))}
                    </span>
                  </div>
                </div>

                {/* Form to Record Payment */}
                <form onSubmit={handleRecordPayment} className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-black">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Registrar Novo Recebimento / Pagamento</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Valor Recebido (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-black text-slate-900 text-sm"
                        placeholder="Ex: 500.00"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800"
                      >
                        <option value="PIX">PIX</option>
                        <option value="DINHEIRO">Dinheiro</option>
                        <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                        <option value="CARTAO_DEBITO">Cartão de Débito</option>
                        <option value="BOLETO">Boleto Bancário</option>
                        <option value="TRANSFERENCIA">Transferência / TED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Data do Pagamento</label>
                      <input
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nº Comprovante / Doc</label>
                      <input
                        type="text"
                        placeholder="Ex: PIX-1238478"
                        value={paymentDoc}
                        onChange={(e) => setPaymentDoc(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Observações do Recebimento</label>
                      <input
                        type="text"
                        placeholder="Ex: Sinal de 50% pago na confirmação"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={submittingPayment}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>{submittingPayment ? 'Registrando...' : 'Confirmar Recebimento'}</span>
                    </button>
                  </div>
                </form>

                {/* Transactions History */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Histórico de Recebimentos Registrados:
                  </span>
                  {selectedOrder.transactions && selectedOrder.transactions.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {selectedOrder.transactions.map((tx: any) => (
                        <div key={tx.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900">{formatCurrency(tx.amount)}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                {tx.paymentMethod || 'PIX'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {formatDate(tx.paymentDate || tx.dueDate)}
                              </span>
                            </div>
                            {tx.description && <p className="text-[11px] text-slate-500 mt-0.5">{tx.description}</p>}
                          </div>
                          <span className="text-xs font-bold text-emerald-700">PAGO</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl text-center">
                      Nenhum recebimento registrado para este pedido ainda.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Bipar Entrega do Pedido */}
      {scanModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  Conferência & Bipagem de Entrega
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Pedido {scanModalOrder.orderNumber} • {scanModalOrder.client?.tradeName || scanModalOrder.client?.name}
                </h3>
                {(scanModalOrder.driverName || scanModalOrder.driverUser?.name) && (
                  <p className="text-xs text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    Entregador: <strong className="text-amber-800 font-black">{scanModalOrder.driverName || scanModalOrder.driverUser?.name}</strong>
                  </p>
                )}
              </div>
              <button
                onClick={() => setScanModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Scanner da Câmera */}
            <BarcodeScanner onScan={handleScanDelivery} isProcessing={scanning} />

            {/* Feedback Message */}
            {scanFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  scanFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {scanFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{scanFeedback.text}</span>
              </div>
            )}

            {/* Itens do Pedido Atualizados ao Vivo */}
            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-purple-950 text-xs flex items-center gap-1.5">
                  <Cylinder className="w-3.5 h-3.5 text-purple-600" />
                  Itens no Pedido ({scanModalOrder.items?.length || 0})
                </span>
                <span className="text-xs font-black text-purple-900">
                  Total: {formatCurrency(scanModalOrder.totalAmount || 0)}
                </span>
              </div>

              {(!scanModalOrder.items || scanModalOrder.items.length === 0) ? (
                <div className="bg-white/90 p-3 rounded-xl border border-dashed border-purple-200 text-center text-xs text-purple-900 font-medium">
                  Nenhum item bipado ainda. Aponte a câmera para o QR Code do barril para vincular ao pedido automaticamente!
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {scanModalOrder.items.map((it: any, idx: number) => (
                    <div
                      key={it.id || idx}
                      className="bg-white p-2.5 rounded-xl border border-purple-100 flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{it.description}</span>
                        {it.keg ? (
                          <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1 mt-0.5">
                            ✓ Barril Bipado: {it.keg.code} ({it.keg.capacity}L)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                            Aguardando bipagem
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-800 block">
                          {formatCurrency(it.totalPrice || (it.quantity * it.unitPrice))}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {it.quantity}x {formatCurrency(it.unitPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setScanModalOrder(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Concluir Bipagem do Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Pedido */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-50/70 rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-200 flex flex-col space-y-4">
            {/* Top Bar: Title & Live Total */}
            {(() => {
              const sub = orderItems.reduce((acc, it) => acc + ((it.quantity || 1) * (it.unitPrice || 0)), 0);
              const fee = parseFloat(deliveryFee) || 0;
              const caut = parseFloat(cautionDeposit) || 0;
              const disc = parseFloat(discount) || 0;
              const tot = Math.max(0, sub + fee + caut - disc);
              const totalLiters = orderItems.reduce((acc, it) => acc + ((it.quantity || 1) * (it.kegCapacity || 50)), 0);

              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-lg text-slate-900">Novo Pedido de Venda</h3>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                          Chopp & Distribuição
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cadastre os chopps, comodato de chopeiras e agendamento de entrega
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2 bg-slate-900 text-white rounded-2xl flex items-center gap-2.5 shadow-sm">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Previsto:</span>
                        <span className="text-base font-black text-amber-400 font-mono">
                          {formatCurrency(tot)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewModalOpen(false)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                        title="Fechar"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
                    <datalist id="recipes-datalist-new">
                      {recipes.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.style ? `${r.style} • ` : ''}{formatCurrency(r.salePricePerLiter || r.suggestedPricePerLiter || 20)}/L
                        </option>
                      ))}
                    </datalist>

                    {/* Card Superior: Cliente, Tabela de Preço e Data de Entrega */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {/* Busca Digitada de Cliente */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Cliente / Ponto de Venda <span className="text-amber-600">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickClientTarget('NEW_ORDER');
                              setQuickClientInitialName('');
                              setQuickClientModalOpen(true);
                            }}
                            className="text-[11px] font-extrabold text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline cursor-pointer transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Novo Cliente</span>
                          </button>
                        </div>
                        <ClientSearchSelect
                          clientId={clientId}
                          clients={clients}
                          onSelectClient={(c) => {
                            handleClientSelectForNewOrder(c.id);
                          }}
                          onOpenQuickCreate={(initialName) => {
                            setQuickClientTarget('NEW_ORDER');
                            setQuickClientInitialName(initialName);
                            setQuickClientModalOpen(true);
                          }}
                        />
                      </div>

                      {/* Tabela de Preço */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Tabela de Preço</span>
                          {newPriceTableId && priceTables.find((t) => t.id === newPriceTableId)?.type === 'AT_COST' && (
                            <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">Preço de Custo</span>
                          )}
                        </label>
                        <select
                          value={newPriceTableId}
                          onChange={(e) => handleNewPriceTableChange(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                        >
                          <option value="">Padrão da Cervejaria</option>
                          {priceTables.map((pt) => (
                            <option key={pt.id} value={pt.id}>
                              {pt.name} {pt.isDefault ? '(Padrão)' : ''} {pt.adjustmentPercent ? `(${pt.adjustmentPercent > 0 ? '+' : ''}${pt.adjustmentPercent}%)` : ''} {pt.type === 'AT_COST' ? '(Custo)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Data de Entrega Agendada */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Data de Entrega Agendada <span className="text-amber-600">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Barra de Navegação por Abas (Tabs) */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl border border-slate-300/80 w-fit">
                      <button
                        type="button"
                        onClick={() => setNewOrderTab('PRODUCTS')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                          newOrderTab === 'PRODUCTS'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                      >
                        <span>🍺 Produtos</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          newOrderTab === 'PRODUCTS' ? 'bg-amber-100 text-amber-900' : 'bg-slate-300/80 text-slate-700'
                        }`}>
                          {orderItems.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewOrderTab('EQUIPMENT')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                          newOrderTab === 'EQUIPMENT'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                      >
                        <span>🎛️ Comodato (Chopeiras)</span>
                        {selectedEquipments.length > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            newOrderTab === 'EQUIPMENT' ? 'bg-orange-100 text-orange-900' : 'bg-slate-300/80 text-slate-700'
                          }`}>
                            {selectedEquipments.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewOrderTab('DELIVERY')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                          newOrderTab === 'DELIVERY'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                      >
                        <span>🚚 Logística & Entrega</span>
                        {deliveryAddress && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    </div>

                    {/* ABA 1: PRODUTOS */}
                    {newOrderTab === 'PRODUCTS' && (
                      <div className="space-y-3">
                        {/* Tabela de Produtos */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                          {/* Cabeçalho do Card */}
                          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-800 text-xs sm:text-sm">
                                🍺 Produtos do Pedido
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                                {orderItems.length} {orderItems.length === 1 ? 'item' : 'itens'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleAddItemRow}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Adicionar Item</span>
                            </button>
                          </div>

                          {/* Grid / Tabela de Itens */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                              <thead>
                                <tr className="bg-slate-100/80 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider border-b border-slate-200">
                                  <th className="py-2.5 px-3 text-center w-12">#</th>
                                  <th className="py-2.5 px-3">Cerveja / Chopp</th>
                                  <th className="py-2.5 px-3 w-32">Barril</th>
                                  <th className="py-2.5 px-3 text-center w-24">Qtd</th>
                                  <th className="py-2.5 px-3 text-right w-32">Unitário (R$)</th>
                                  <th className="py-2.5 px-3 text-right w-36">Subtotal</th>
                                  <th className="py-2.5 px-3 text-center w-12"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {orderItems.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-10 text-center text-slate-400">
                                      <p className="text-xs font-semibold mb-2">Nenhum produto adicionado ao pedido ainda</p>
                                      <button
                                        type="button"
                                        onClick={handleAddItemRow}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs shadow-xs hover:bg-amber-600 transition-all cursor-pointer active:scale-95"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Adicionar Primeiro Item</span>
                                      </button>
                                    </td>
                                  </tr>
                                ) : (
                                  orderItems.map((item, idx) => {
                                    const stock = getStockAvailability(item.recipeId, item.kegCapacity || 50);
                                    const isOutOfStock = Boolean(item.recipeId) && stock.available <= 0;
                                    const isInsufficient = Boolean(item.recipeId) && !isOutOfStock && item.quantity > stock.available;
                                    const itemTotal = (item.quantity || 1) * (item.unitPrice || 0);

                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors group">
                                        <td className="py-3 px-3 text-center align-top pt-4">
                                          <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {idx + 1}
                                          </span>
                                        </td>

                                        <td className="py-3 px-3 align-top">
                                          <RecipeSearchSelect
                                            recipeId={item.recipeId}
                                            recipes={recipes}
                                            kegs={kegs}
                                            orders={orders}
                                            resolvePrice={(rec, cap) => resolveBeerPrice(rec, cap, newPriceTableId)}
                                            onSelectRecipe={(r, recommendedCap) => {
                                              const newItems = [...orderItems];
                                              const cap = recommendedCap || item.kegCapacity || 50;
                                              newItems[idx].recipeId = r.id;
                                              newItems[idx].kegCapacity = cap;
                                              newItems[idx].unitPrice = resolveBeerPrice(r, cap, newPriceTableId);
                                              setOrderItems(newItems);
                                            }}
                                          />
                                          {item.recipeId && (
                                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                              {stock.available > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                  <span>{stock.available} barril(is) livres na câmara fria</span>
                                                  {stock.reserved > 0 && <span className="text-emerald-700">({stock.reserved} reservados)</span>}
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                  <span>Sem estoque envasado (será produzido/envasado)</span>
                                                </span>
                                              )}
                                              {isInsufficient && (
                                                <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded border border-rose-200">
                                                  Qtd pedida ({item.quantity}) supera estoque ({stock.available})
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </td>

                                        <td className="py-3 px-3 align-top">
                                          <select
                                            value={item.kegCapacity || 50}
                                            onChange={(e) => {
                                              const cap = parseInt(e.target.value, 10) || 50;
                                              const newItems = [...orderItems];
                                              newItems[idx].kegCapacity = cap;
                                              const r = recipes.find((rec) => rec.id === newItems[idx].recipeId);
                                              if (r) {
                                                newItems[idx].unitPrice = resolveBeerPrice(r, cap, newPriceTableId);
                                              }
                                              setOrderItems(newItems);
                                            }}
                                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                                          >
                                            {[50, 30, 20, 15, 10, 5].map((cap) => {
                                              const avail = item.recipeId ? getStockAvailability(item.recipeId, cap).available : 0;
                                              return (
                                                <option key={cap} value={cap}>
                                                  {cap}L {avail > 0 ? `(${avail})` : ''}
                                                </option>
                                              );
                                            })}
                                          </select>
                                        </td>

                                        <td className="py-3 px-3 align-top">
                                          <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => {
                                              const newItems = [...orderItems];
                                              newItems[idx].quantity = parseInt(e.target.value, 10) || 1;
                                              setOrderItems(newItems);
                                            }}
                                            className="w-full px-2 py-2 rounded-xl font-bold text-center text-xs bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 focus:outline-none"
                                          />
                                        </td>

                                        <td className="py-3 px-3 align-top">
                                          <input
                                            type="number"
                                            step="5"
                                            value={item.unitPrice}
                                            onChange={(e) => {
                                              const newItems = [...orderItems];
                                              newItems[idx].unitPrice = parseFloat(e.target.value) || 0;
                                              setOrderItems(newItems);
                                            }}
                                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-right text-slate-800 text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                                          />
                                        </td>

                                        <td className="py-3 px-3 text-right align-top pt-4">
                                          <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                                            {formatCurrency(itemTotal)}
                                          </span>
                                        </td>

                                        <td className="py-3 px-3 text-center align-top pt-3">
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveItemRow(idx)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                            title="Remover este item"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Rodapé da Tabela: Botão Adicionar Item (Esquerda) e Resumo Financeiro (Direita) */}
                          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                              <button
                                type="button"
                                onClick={handleAddItemRow}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-amber-50 text-slate-800 hover:text-amber-900 border border-slate-300 hover:border-amber-400 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
                              >
                                <Plus className="w-4 h-4 text-amber-600" />
                                <span>+ Adicionar Produto</span>
                              </button>
                              <div className="text-[11px] text-slate-500 font-bold mt-2">
                                Volume total: <strong className="text-slate-800">{totalLiters} Litros</strong>
                              </div>
                            </div>

                            {/* Resumo Financeiro Compacto (Estilo BierHeld) */}
                            <div className="w-full sm:w-80 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                              <div className="flex items-center justify-between text-slate-600">
                                <span>Subtotal dos Produtos:</span>
                                <span className="font-mono font-bold text-slate-900">{formatCurrency(sub)}</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-600 gap-2">
                                <span>Entrega / Frete:</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-slate-400">R$</span>
                                  <input
                                    type="number"
                                    value={deliveryFee}
                                    onChange={(e) => setDeliveryFee(e.target.value)}
                                    className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-right text-xs focus:bg-white focus:outline-none"
                                    placeholder="0,00"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-slate-600 gap-2">
                                <span>Desconto Comercial:</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-slate-400">R$</span>
                                  <input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                    className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-right text-xs focus:bg-white focus:outline-none text-rose-600"
                                    placeholder="0,00"
                                  />
                                </div>
                              </div>
                              {caut > 0 && (
                                <div className="flex items-center justify-between text-slate-600">
                                  <span>Caução Chopeiras:</span>
                                  <span className="font-mono font-bold text-slate-900">{formatCurrency(caut)}</span>
                                </div>
                              )}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="font-extrabold text-slate-900">Total do Pedido:</span>
                                <span className="font-mono font-black text-amber-600 text-base">{formatCurrency(tot)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card: Observações Gerais do Pedido */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Observações Gerais do Pedido
                          </label>
                          <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Horário preferencial, restrições no local de entrega, detalhes comerciais..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* ABA 2: COMODATO (CHOPEIRAS & CILINDROS) */}
                    {newOrderTab === 'EQUIPMENT' && (
                      <div className="space-y-3">
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                            <div>
                              <span className="font-black text-slate-900 text-sm block">
                                🎛️ Equipamentos em Comodato (Chopeiras & Cilindros)
                              </span>
                              <span className="text-xs text-slate-500">
                                Selecione as chopeiras e equipamentos vinculados a este pedido
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-bold text-slate-600">Caução Chopeira (R$):</label>
                              <input
                                type="number"
                                value={cautionDeposit}
                                onChange={(e) => setCautionDeposit(e.target.value)}
                                className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-right text-xs focus:bg-white focus:outline-none"
                                placeholder="0,00"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                            {equipment.length === 0 ? (
                              <div className="col-span-2 py-8 text-center text-slate-400">
                                Nenhum equipamento cadastrado na cervejaria.
                              </div>
                            ) : (
                              equipment.map((eq) => {
                                const isSelected = selectedEquipments.includes(eq.id);
                                const conflict = getEquipmentReservationConflict(eq.id);

                                return (
                                  <div
                                    key={eq.id}
                                    onClick={() => handleToggleNewOrderEquipment(eq)}
                                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                                      isSelected
                                        ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500/20'
                                        : conflict
                                        ? 'bg-orange-50/50 border-orange-200 hover:border-orange-300'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      readOnly
                                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-slate-800 truncate block leading-tight">{eq.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{eq.code}</span>
                                      </div>
                                      {conflict ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-800 bg-orange-100/90 px-1.5 py-0.5 rounded-md mt-1 border border-orange-200">
                                          🔒 Reservado no Pedido #{conflict.orderNumber} ({conflict.client?.tradeName || conflict.client?.name})
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 mt-0.5">
                                          ✓ Disponível na Cervejaria
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ABA 3: LOGÍSTICA & ENTREGA */}
                    {newOrderTab === 'DELIVERY' && (
                      <div className="space-y-3">
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                          <span className="font-black text-slate-900 text-sm block pb-2 border-b border-slate-100">
                            🚚 Dados de Entrega, Recolha e Transporte
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Previsão de Devolução / Recolha
                              </label>
                              <input
                                type="date"
                                value={estimatedReturnDate}
                                onChange={(e) => setEstimatedReturnDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-400 mt-0.5 block">
                                Data estimada para recolha de barris vazios e chopeiras
                              </span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Responsável pela Entrega / Motorista
                              </label>
                              <input
                                type="text"
                                list="drivers-datalist-new"
                                value={driverName}
                                onChange={(e) => setDriverName(e.target.value)}
                                placeholder="Nome do motorista / entregador..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:outline-none"
                              />
                              <datalist id="drivers-datalist-new">
                                {users.map((u) => (
                                  <option key={u.id} value={u.name}>
                                    {u.name} ({u.role})
                                  </option>
                                ))}
                              </datalist>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Endereço Completo de Entrega <span className="text-amber-600">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs focus:bg-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rodapé Fixo de Ações do Modal */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setNewModalOpen(false)}
                        className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleCreateOrder(e, 'ORCAMENTO')}
                          className="px-4 py-2.5 font-bold rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/90 hover:bg-amber-100 text-amber-900 transition-all text-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          title="Gera orçamento e bloqueia preventivamente a data, chopp e chopeiras sem faturamento"
                        >
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Salvar Orçamento (Pré-Reserva)</span>
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirmar e Gerar Pedido ({formatCurrency(tot)})</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL 4: ⚠️ CONFLITO DE RESERVA DE EQUIPAMENTO */}
      {reservationConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Equipamento Já Reservado!</h3>
                <p className="text-xs text-slate-500">Conflito de reserva de comodato</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5 text-xs text-slate-800">
              <p>
                O equipamento <strong>{reservationConflictModal.equipment.name}</strong> (<span className="font-mono font-bold text-amber-900">{reservationConflictModal.equipment.code}</span>) já está reservado no:
              </p>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200 font-medium space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pedido:</span>
                  <strong className="text-slate-900">#{reservationConflictModal.conflictOrder.orderNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <strong className="text-slate-900">{reservationConflictModal.conflictOrder.client?.tradeName || reservationConflictModal.conflictOrder.client?.name}</strong>
                </div>
                {reservationConflictModal.conflictOrder.deliveryDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data de Entrega:</span>
                    <strong className="text-slate-900">{formatDate(reservationConflictModal.conflictOrder.deliveryDate)}</strong>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs font-bold text-slate-700 leading-relaxed">
              Deseja retirar a reserva do Pedido #{reservationConflictModal.conflictOrder.orderNumber} e transferir para este pedido?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReservationConflictModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar (Manter no outro)
              </button>
              <button
                type="button"
                onClick={handleConfirmTransferReservation}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Transferir Reserva</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: 🔄 REGISTRAR RETORNO DE BARRIL DO PEDIDO */}
      {returnKegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl border border-orange-200">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Registrar Retorno de Barril</h3>
                  <p className="text-xs text-slate-500">
                    Barril <strong className="font-mono text-slate-900">{returnKegModal.keg.code}</strong> ({returnKegModal.keg.capacity}L) • Pedido #{returnKegModal.order.orderNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReturnKegModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Condição do Retorno */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-800 block">
                1. Condição do Barril Retornado:
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReturnKegModal({ ...returnKegModal, condition: 'VAZIO_SUJO' })}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    returnKegModal.condition === 'VAZIO_SUJO'
                      ? 'bg-orange-50 border-orange-400 text-orange-950 ring-2 ring-orange-300 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-black block">1. Vazio / Sujo</span>
                  <span className="text-[10px] text-slate-500">Vai para CIP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReturnKegModal({ ...returnKegModal, condition: 'PARCIALMENTE_CHEIO' })}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    returnKegModal.condition === 'PARCIALMENTE_CHEIO'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-300 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-black block">2. Parcial / Sobra</span>
                  <span className="text-[10px] text-slate-500">Retorna ao estoque</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReturnKegModal({ ...returnKegModal, condition: 'CHEIO_RETORNADO' })}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    returnKegModal.condition === 'CHEIO_RETORNADO'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-black block">3. Cheio Intacto</span>
                  <span className="text-[10px] text-slate-500">Não consumido</span>
                </button>
              </div>
            </div>

            {/* Se Parcialmente Cheio: Litros + Escolha de Cobrança */}
            {returnKegModal.condition === 'PARCIALMENTE_CHEIO' && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 font-black">Litros restantes no barril:</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={returnKegModal.keg.capacity}
                    value={returnKegModal.returnVolumeLiters}
                    onChange={(e) => setReturnKegModal({ ...returnKegModal, returnVolumeLiters: e.target.value })}
                    className="w-24 px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-black text-center text-amber-950 text-xs"
                  />
                  <span className="font-bold text-slate-500">Litros</span>
                </div>

                {/* Pergunta de Cobrança ao Cliente */}
                <div className="space-y-1.5 pt-2 border-t border-amber-200/60">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
                    💳 Cobrança do Cliente no Pedido:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReturnKegModal({ ...returnKegModal, billingMode: 'FULL' })}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        returnKegModal.billingMode === 'FULL'
                          ? 'bg-white border-amber-400 text-amber-950 ring-2 ring-amber-300 font-bold shadow-xs'
                          : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="font-black text-xs block mb-0.5">🧾 Cobrar Barril Inteiro (100%)</span>
                      <span className="text-[10px] text-slate-500 block leading-tight">
                        Mantém o valor integral do barril no pedido (padrão de evento).
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReturnKegModal({ ...returnKegModal, billingMode: 'PARTIAL' })}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        returnKegModal.billingMode === 'PARTIAL'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300 font-bold shadow-xs'
                          : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="font-black text-xs text-emerald-800 block mb-0.5">💰 Cobrar Apenas Consumo Parcial</span>
                      <span className="text-[10px] text-slate-500 block leading-tight">
                        Calcula os litros consumidos e desconta a sobra no total do pedido.
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setReturnKegModal(null)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processingReturn}
                onClick={handleConfirmKegReturn}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                {processingReturn ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Confirmar Retorno</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastro Rápido de Cliente */}
      <QuickClientModal
        isOpen={quickClientModalOpen}
        initialName={quickClientInitialName}
        onClose={() => setQuickClientModalOpen(false)}
        onSuccess={handleQuickClientSuccess}
      />
    </div>
  );
}
