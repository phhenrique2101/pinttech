'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Crown,
  Building2,
  DollarSign,
  Cylinder,
  Users,
  TrendingUp,
  Plus,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
  Sliders,
  FileSpreadsheet,
} from 'lucide-react';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function MasterDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<{
    breweries: any[];
    metrics: {
      totalBreweries: number;
      activeBreweries: number;
      totalMRR: number;
      totalKegsPlatform: number;
      totalUsersPlatform: number;
    };
  }>({
    breweries: [],
    metrics: {
      totalBreweries: 0,
      activeBreweries: 0,
      totalMRR: 0,
      totalKegsPlatform: 0,
      totalUsersPlatform: 0,
    },
  });

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master/breweries');
      const json = await res.json();
      if (json.breweries) setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImpersonate = async (breweryId: string) => {
    try {
      const res = await fetch('/api/auth/switch-brewery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breweryId }),
      });
      if (res.ok) {
        window.location.href = '/';
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner do Proprietário */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 rounded-3xl border border-amber-500/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                Portal Master • Proprietário SaaS
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Controle Geral da Plataforma PintTech
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2 max-w-xl leading-relaxed">
            Painel exclusivo para gerenciar suas cervejarias clientes, receita recorrente (MRR), usuários de clientes, reset de senhas e importação em lote para novos clientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/master/importacao"
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/30 flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
            <span>Migrar / Importar Dados</span>
          </Link>

          <Link
            href="/master/cervejarias"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Cervejarias</span>
          </Link>

          <Link
            href="/master/usuarios"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-all"
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>Resetar Senhas</span>
          </Link>
        </div>
      </div>

      {/* SaaS KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Receita Mensal (MRR)
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">
              {formatCurrency(data.metrics.totalMRR)}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> Recorrente
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Faturamento mensal de assinaturas SaaS
          </p>
        </div>

        {/* Total Cervejarias Clientes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cervejarias Clientes
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-600">
              {data.metrics.totalBreweries}
            </span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              {data.metrics.activeBreweries} ativas
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Tenants cadastrados na plataforma
          </p>
        </div>

        {/* Total de Barris Rastreados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Barris na Plataforma
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Cylinder className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-blue-600">
              {data.metrics.totalKegsPlatform}
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              com QR/Barcode
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Parque total de barris rastreados
          </p>
        </div>

        {/* Usuários Totais */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Usuários Totais
            </span>
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-purple-600">
              {data.metrics.totalUsersPlatform}
            </span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              em operação
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Cervejeiros, entregadores e gestores
          </p>
        </div>
      </div>

      {/* Cervejarias Clientes Overview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-base text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              Cervejarias Clientes do Sistema ({data.breweries.length})
            </h2>
            <p className="text-xs text-slate-500">Status financeiro, planos e atalho de acesso direto</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/master/cervejarias"
              className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-0.5"
            >
              Ver Todas <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-4">Cervejaria</th>
                <th className="p-3.5">Plano & Mensalidade</th>
                <th className="p-3.5">Status Cobrança</th>
                <th className="p-3.5">Barris & Ativos</th>
                <th className="p-3.5">Usuários</th>
                <th className="p-3.5 text-right pr-4">Ações do Proprietário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Carregando dados dos clientes...
                  </td>
                </tr>
              ) : data.breweries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Nenhuma cervejaria cadastrada.
                  </td>
                </tr>
              ) : (
                data.breweries.map((brewery) => {
                  const isUpToDate = brewery.billingStatus === 'EM_DIA';

                  return (
                    <tr key={brewery.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-4">
                        <span className="font-extrabold text-slate-900 text-sm block">
                          {brewery.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {brewery.email} • {brewery.city || 'SP'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-black text-[10px] uppercase">
                            {brewery.plan}
                          </span>
                          <span className="font-black text-slate-800 text-xs">
                            {formatCurrency(brewery.monthlyPrice || 299)}/mês
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isUpToDate
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {brewery.billingStatus || 'EM_DIA'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-800">
                          {brewery._count?.kegs || 0} barris
                        </span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          + {brewery._count?.equipment || 0} chopeiras
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-xs">
                          {brewery._count?.users || 0} usuários
                        </span>
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/api/auth/switch-brewery?breweryId=${brewery.id}&redirect=/`}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 flex items-center gap-1 transition-colors"
                            title="Entrar no sistema como esta cervejaria"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                            <span>Acessar</span>
                          </a>

                          <Link
                            href={`/master/usuarios?breweryId=${brewery.id}`}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1 transition-colors"
                            title="Ver e resetar senhas dos usuários"
                          >
                            <Key className="w-3.5 h-3.5 text-slate-500" />
                            <span>Senhas</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
