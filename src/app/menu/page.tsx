import React from 'react';
import Link from 'next/link';
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
  LogOut,
} from 'lucide-react';
import { getSessionFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default function MobileMenuPage() {
  const session = getSessionFromCookies();
  if (!session) redirect('/login');

  const links = [
    { label: 'Painel Principal', href: '/', icon: LayoutDashboard, color: 'text-amber-600 bg-amber-50' },
    { label: 'Controle de Barris', href: '/barris', icon: Cylinder, color: 'text-amber-600 bg-amber-50' },
    { label: 'Scanner de Campo (Câmera)', href: '/scanner', icon: QrCode, color: 'text-amber-600 bg-amber-500 text-white font-bold' },
    { label: 'Equipamentos & Chopeiras', href: '/equipamentos', icon: Wrench, color: 'text-blue-600 bg-blue-50' },
    { label: 'Produção, Tanques & Lotes', href: '/producao', icon: Flame, color: 'text-purple-600 bg-purple-50' },
    { label: 'Estoque de Insumos', href: '/estoque', icon: Package, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Pedidos & Vendas', href: '/pedidos', icon: ShoppingCart, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Clientes & Vasilhames', href: '/clientes', icon: Users, color: 'text-cyan-600 bg-cyan-50' },
    { label: 'Módulo Financeiro', href: '/financeiro', icon: DollarSign, color: 'text-violet-600 bg-violet-50' },
    { label: 'Usuários & Permissões', href: '/usuarios', icon: UserCheck, color: 'text-slate-600 bg-slate-100' },
  ];

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="font-black text-slate-900 text-lg">Menu Completo</h1>
        <p className="text-xs text-slate-500">Acesse todos os módulos do sistema</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${link.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-bold text-xs text-slate-800">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
