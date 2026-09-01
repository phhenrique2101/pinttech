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
  ];

  const breweryNavItems = [
    { label: 'Dashboard Operacional', href: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'BREWER', 'SALES', 'FINANCE', 'LOGISTICS'] },
    { label: 'Controle de Barris', href: '/barris', icon: Cylinder, moduleKey: 'BARRIS', roles: ['SUPER_ADMIN', 'ADMIN', 'BREWER', 'LOGISTICS', 'SALES'] },
    { label: 'Equipamentos & Chopeiras', href: '/equipamentos', icon: Wrench, moduleKey: 'EQUIPAMENTOS', roles: ['SUPER_ADMIN', 'ADMIN', 'LOGISTICS', 'SALES'] },
    { label: 'Scanner Mobile (Câmera)', href: '/scanner', icon: QrCode, badge: 'PWA', highlight: true, moduleKey: 'SCANNER', roles: ['SUPER_ADMIN', 'ADMIN', 'BREWER', 'LOGISTICS', 'SALES'] },
    { label: 'Brew Studio (Receitas)', href: '/brew', icon: Sparkles, badge: 'NEW', highlight: true, moduleKey: 'PRODUCAO', roles: ['SUPER_ADMIN', 'ADMIN', 'BREWER'] },
    { label: 'Produção & Tanques', href: '/producao', icon: Flame, moduleKey: 'PRODUCAO', roles: ['SUPER_ADMIN', 'ADMIN', 'BREWER'] },
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
    <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:flex flex-col border-r border-slate-800">
      {/* Super Admin Switcher in Sidebar */}
      {isSuperAdmin && (
        <div className="p-3 border-b border-amber-500/20 bg-slate-950/70">
          <label className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1.5 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Cervejaria Selecionada:</span>
          </label>
          <select
            value={user?.breweryId || ''}
            onChange={(e) => handleSwitchBrewery(e.target.value)}
            className="w-full text-xs bg-slate-800 text-amber-200 border border-amber-500/40 rounded-xl px-2.5 py-1.5 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
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
              className="mt-2 w-full py-1 text-[10px] font-black text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-500/30 rounded-lg text-center transition-colors block"
            >
              ← Voltar p/ Visão Master
            </button>
          )}
        </div>
      )}

      {/* Master Section (If Super Admin) */}
      {isSuperAdmin && (
        <div className="p-3 border-b border-amber-500/30 bg-amber-950/20">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 px-3 mb-2 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5" />
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
                  className={`flex items-center justify-between px-3 py-2 rounded-xl font-bold text-xs transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-amber-200/90 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Operações da Cervejaria */}
      <div className="p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 mb-2">
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
                className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-md font-semibold'
                    : item.highlight
                    ? 'bg-slate-800/80 text-amber-300 hover:bg-slate-800 hover:text-amber-200 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    isActive ? 'bg-white text-amber-700' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[11px] text-slate-400 font-medium">Plataforma SaaS Online</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">PintTech v1.0 • Master Multi-Tenant</p>
      </div>
    </aside>
  );
}
