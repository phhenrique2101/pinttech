'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Cylinder,
  QrCode,
  Flame,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  Wrench,
  UserCheck,
  Building2,
  Crown,
  Key,
  CreditCard,
  FileSpreadsheet,
  Download,
  Sparkles,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { CurrentUser } from './Navbar';

export default function Sidebar({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [breweries, setBreweries] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/breweries')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setBreweries(data);
        })
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  const handleSwitchBrewery = (breweryId: string) => {
    const targetUrl = breweryId ? '/' : '/master';
    window.location.href = `/api/auth/switch-brewery?breweryId=${encodeURIComponent(breweryId)}&redirect=${encodeURIComponent(targetUrl)}`;
  };

  const masterNavItems = [
    { label: 'Visão Master (SaaS)', href: '/master', icon: Crown, highlight: true },
    { label: 'Cervejarias Clientes', href: '/master/cervejarias', icon: Building2 },
    { label: 'Usuários & Reset Senha', href: '/master/usuarios', icon: Key },
    { label: 'Faturamento & MRR', href: '/master/financeiro', icon: CreditCard },
    { label: 'Importar / Migrar Dados', href: '/master/importacao', icon: FileSpreadsheet },
    { label: 'Relatórios & Exportação', href: '/relatorios', icon: Download },
    { label: 'Integração Power BI', href: '/relatorios/powerbi', icon: BarChart3, highlight: true },
  ];

  const breweryNavItems = [
    { label: 'Dashboard Operacional', href: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'BREWER', 'SALES', 'FINANCE', 'LOGISTICS'] },
    { label: 'Controle de Barris', href: '/barris', icon: Cylinder, moduleKey: 'BARRIS', roles: ['SUPER_ADMIN', 'ADMIN', 'BREWER', 'LOGISTICS', 'SALES'] },
    { label: 'Equipamentos & Chopeiras', href: '/equipamentos', icon: Wrench, moduleKey: 'EQUIPAMENTOS', roles: ['SUPER_ADMIN', 'ADMIN', 'LOGISTICS', 'SALES'] },
    { label: 'Scanner Mobile (Câmera)', href: '/scanner', icon: QrCode, badge: 'PWA', highlight: true, moduleKey: 'SCANNER', roles: ['SUPER_ADMIN', 'ADMIN', 'BREWER', 'LOGISTICS', 'SALES'] },
    { label: 'Produção & Tanques', href: '/producao', icon: Flame, badge: 'MAPA', highlight: true, moduleKey: 'PRODUCAO', roles: ['SUPER_ADMIN', 'ADMIN', 'BREWER'] },
    { label: 'Estoque & Insumos', href: '/estoque', icon: Package, moduleKey: 'ESTOQUE', roles: ['SUPER_ADMIN', 'ADMIN', 'BREWER'] },
    { label: 'Pedidos & Comodato', href: '/pedidos', icon: ShoppingCart, moduleKey: 'PEDIDOS', roles: ['SUPER_ADMIN', 'ADMIN', 'SALES', 'LOGISTICS', 'FINANCE'] },
    { label: 'Clientes & Vasilhames', href: '/clientes', icon: Users, moduleKey: 'CLIENTES', roles: ['SUPER_ADMIN', 'ADMIN', 'SALES', 'LOGISTICS', 'FINANCE'] },
    { label: 'Financeiro Cervejaria', href: '/financeiro', icon: DollarSign, moduleKey: 'FINANCEIRO', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'] },
    { label: 'Relatórios & Exportação', href: '/relatorios', icon: Download, moduleKey: 'RELATORIOS', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SALES'] },
    { label: 'Importar Planilha (Excel)', href: '/importacao', icon: FileSpreadsheet, moduleKey: 'USUARIOS', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { label: 'Usuários da Cervejaria', href: '/usuarios', icon: UserCheck, moduleKey: 'USUARIOS', roles: ['ADMIN'] },
  ];

  const userRole = user?.role || 'LOGISTICS';
  const allowedBreweryItems = breweryNavItems.filter((item) => {
    if (isSuperAdmin || userRole === 'ADMIN') return true;
    if (user?.permissions && user.permissions.length > 0) {
      if (!item.moduleKey) return true;
      return user.permissions.includes(item.moduleKey);
    }
    return item.roles.includes(userRole);
  });

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex-shrink-0 hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 transition-colors select-none">
      {/* Super Admin Switcher in Sidebar */}
      {isSuperAdmin && (
        <div className="p-3 border-b border-slate-200 dark:border-amber-500/20 bg-slate-50/90 dark:bg-slate-950/70">
          <label className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 block mb-1.5 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Cervejaria Selecionada:</span>
          </label>
          <select
            value={user?.breweryId || ''}
            onChange={(e) => handleSwitchBrewery(e.target.value)}
            className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-amber-200 border border-slate-300 dark:border-amber-500/40 rounded-xl px-2.5 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
          >
            <option value="">👑 Visão Master Global</option>
            {breweries.map((b) => (
              <option key={b.id} value={b.id}>
                🏢 {b.name}
              </option>
            ))}
          </select>

          {user?.breweryId && (
            <button
              onClick={() => handleSwitchBrewery('')}
              className="mt-2 w-full py-1 text-[10px] font-black text-amber-800 hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-300 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 border border-amber-300 dark:border-amber-500/30 rounded-lg text-center transition-colors block shadow-xs"
            >
              ← Voltar p/ Visão Master
            </button>
          )}
        </div>
      )}

      {/* Conteúdo rolável de navegação */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Master Section (If Super Admin) */}
        {isSuperAdmin && (
          <div className="p-3 border-b border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400 px-3 mb-2 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Portal do Proprietário (SaaS)
            </p>
            <div className="space-y-1">
              {masterNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl font-bold text-xs transition-all ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                        : 'text-amber-900/80 hover:text-amber-950 hover:bg-amber-100/70 dark:text-amber-200/90 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-slate-950 stroke-[2.5]' : 'text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-300'}`} />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Operações da Cervejaria */}
        <div className="px-3 pt-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">
            {isSuperAdmin ? 'Módulos da Cervejaria' : 'Navegação Principal'}
          </p>
          <nav className="space-y-1">
            {allowedBreweryItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : item.highlight
                      ? 'bg-amber-50/90 hover:bg-amber-100 text-amber-900 hover:text-amber-950 border border-amber-200/80 font-bold dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-300 dark:hover:text-amber-200 dark:border-amber-500/30'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/90 font-medium dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-slate-950 stroke-[2.5]'
                          : item.highlight
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wide transition-colors ${
                        isActive
                          ? 'bg-white/90 text-slate-950 border border-amber-600/30 shadow-2xs'
                          : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Plataforma SaaS Online</span>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">PintTech v1.0 • Master Multi-Tenant</p>
      </div>
    </aside>
  );
}
