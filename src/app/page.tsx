import React from 'react';
import { getSessionFromCookies } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Cylinder,
  QrCode,
  Flame,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Truck,
  CheckCircle2,
  Users,
  Wrench,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate, KEG_STATUS_MAP } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = getSessionFromCookies();

  if (!session) {
    redirect('/login');
  }

  // Se o usuário for da Logística/Entregador, sugerir/redirecionar para o scanner móvel
  if (session.role === 'LOGISTICS') {
    redirect('/scanner');
  }

  const whereBrewery = session.breweryId ? { breweryId: session.breweryId } : {};

  // Buscar métricas da cervejaria
  const [
    kegs,
    equipment,
    clients,
    orders,
    batches,
    recentMovements,
    financials,
  ] = await Promise.all([
    prisma.keg.findMany({
      where: whereBrewery,
      include: { currentClient: true, currentBatch: { include: { recipe: true } } },
    }),
    prisma.equipment.findMany({
      where: whereBrewery,
      include: { currentClient: true },
    }),
    prisma.client.findMany({
      where: whereBrewery,
    }),
    prisma.order.findMany({
      where: whereBrewery,
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.productionBatch.findMany({
      where: whereBrewery,
      include: { recipe: true, tank: true },
      orderBy: { brewDate: 'desc' },
    }),
    prisma.kegMovement.findMany({
      where: whereBrewery,
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        keg: true,
        equipment: true,
        toClient: true,
      },
    }),
    prisma.financialTransaction.findMany({
      where: whereBrewery,
    }),
  ]);

  // Contadores de barris por status
  const totalKegs = kegs.length;
  const inClientsKegs = kegs.filter((k) => k.status === 'NO_CLIENTE').length;
  const inStockKegs = kegs.filter((k) => k.status === 'EM_ESTOQUE').length;
  const sanitizedKegs = kegs.filter((k) => k.status === 'HIGIENIZADO').length;
  const dirtyKegs = kegs.filter((k) => k.status === 'VAZIO_SUJO').length;
  const maintenanceKegs = kegs.filter((k) => k.status === 'MANUTENCAO').length;

  // Equipamentos em comodato
  const totalEquipment = equipment.length;
  const inUseEquipment = equipment.filter((e) => e.status === 'EM_USO_CLIENTE').length;

  // Financeiro
  const totalRevenue = financials
    .filter((f) => f.type === 'RECEITA' && f.status === 'PAGO')
    .reduce((acc, f) => acc + f.amount, 0);

  const pendingRevenue = financials
    .filter((f) => f.type === 'RECEITA' && f.status === 'PENDENTE')
    .reduce((acc, f) => acc + f.amount, 0);

  // Lotes em fermentação / maturação
  const activeBatches = batches.filter(
    (b) => b.status === 'FERMENTANDO' || b.status === 'MATURANDO' || b.status === 'BRASSAGEM'
  );

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Painel de Gestão Cervejeira
            </h1>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-extrabold text-[11px] rounded-full uppercase">
              {session.breweryName || 'PintTech'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visão consolidada de barris, comodatos, produção e faturamento.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/scanner"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all hover:scale-105"
          >
            <QrCode className="w-4 h-4" />
            <span>Abrir Scanner Mobile</span>
          </Link>
          <Link
            href="/barris"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 transition-all"
          >
            <Cylinder className="w-4 h-4 text-amber-600" />
            <span>Ver Barris</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Barris em Clientes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Barris em Clientes
            </span>
            <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900">{inClientsKegs}</span>
              <span className="text-xs text-slate-400 font-medium ml-1">/ {totalKegs} un.</span>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
              {totalKegs > 0 ? Math.round((inClientsKegs / totalKegs) * 100) : 0}% em giro
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-orange-500 h-full rounded-full"
              style={{ width: `${totalKegs > 0 ? (inClientsKegs / totalKegs) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Barris Prontos na Câmara Fria */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Na Câmara Fria
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-emerald-600">{inStockKegs}</span>
              <span className="text-xs text-slate-400 font-medium ml-1">cheios</span>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Prontos p/ entrega
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            + {sanitizedKegs} barris higienizados aguardando envase
          </p>
        </div>

        {/* Chopeiras & Comodato */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Chopeiras em Campo
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-blue-600">{inUseEquipment}</span>
              <span className="text-xs text-slate-400 font-medium ml-1">/ {totalEquipment} un.</span>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Comodato Ativo
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            {totalEquipment - inUseEquipment} equipamentos disponíveis no pátio
          </p>
        </div>

        {/* Financeiro / Faturamento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Faturamento Líquido
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {formatCurrency(totalRevenue)}
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> Recebido
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            + {formatCurrency(pendingRevenue)} a receber de pedidos
          </p>
        </div>
      </div>

      {/* Main Grid: Status dos Barris & Produção / Movimentações */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribuição dos Barris */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Cylinder className="w-4 h-4 text-amber-600" />
                Status dos Barris ({totalKegs} Total)
              </h2>
              <p className="text-xs text-slate-500">Localização e disponibilidade em tempo real</p>
            </div>
            <Link href="/barris" className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-0.5">
              Gerenciar <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <span className="text-[11px] font-bold text-orange-900 block">No Cliente</span>
              <span className="text-2xl font-black text-orange-700">{inClientsKegs}</span>
              <span className="text-[10px] text-orange-800/80 block mt-0.5">Em bares / eventos</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-900 block">Na Câmara Fria</span>
              <span className="text-2xl font-black text-emerald-700">{inStockKegs}</span>
              <span className="text-[10px] text-emerald-800/80 block mt-0.5">Envasados e prontos</span>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-[11px] font-bold text-blue-900 block">Higienizados</span>
              <span className="text-2xl font-black text-blue-700">{sanitizedKegs}</span>
              <span className="text-[10px] text-blue-800/80 block mt-0.5">Prontos p/ envase</span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[11px] font-bold text-amber-900 block">Vazios / Sujos</span>
              <span className="text-2xl font-black text-amber-700">{dirtyKegs}</span>
              <span className="text-[10px] text-amber-800/80 block mt-0.5">Aguardando lavagem</span>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <span className="text-[11px] font-bold text-rose-900 block">Manutenção</span>
              <span className="text-2xl font-black text-rose-700">{maintenanceKegs}</span>
              <span className="text-[10px] text-rose-800/80 block mt-0.5">Troca de válvula</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-center items-center text-center">
              <Link
                href="/scanner"
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <QrCode className="w-4 h-4" />
                Bipar Barril
              </Link>
            </div>
          </div>

          {/* Tanques de Fermentação & Maturação */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-blue-500" />
              Tanques & Lotes Ativos ({activeBatches.length})
            </h3>
            <div className="space-y-2">
              {activeBatches.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhum lote em fermentação no momento.</p>
              ) : (
                activeBatches.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{b.recipe?.name}</span>
                      <span className="text-[11px] text-slate-500 ml-1.5 font-mono">({b.batchNumber})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded">
                        {b.tank?.name || 'Tanque'} • {b.status}
                      </span>
                      <span className="text-slate-600 font-medium">{b.volumePlannedLiters}L</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Últimas Movimentações & Rastreabilidade */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                Rastreabilidade em Tempo Real
              </h2>
              <p className="text-xs text-slate-500">Últimos bipes e movimentações de ativos</p>
            </div>
          </div>

          <div className="space-y-3">
            {recentMovements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Nenhuma movimentação recente.</p>
            ) : (
              recentMovements.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="text-amber-600">{m.keg?.code || m.equipment?.code || 'ATIVO'}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-700">{m.action}</span>
                    </div>
                    {m.toClient && (
                      <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                        Cliente: {m.toClient.tradeName || m.toClient.name}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Por: {m.driverName || m.userName || 'Operador'} • {formatDate(m.createdAt)}
                    </p>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-700 whitespace-nowrap">
                    {m.toStatus}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
