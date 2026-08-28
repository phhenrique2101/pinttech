'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Beer,
  QrCode,
  LogOut,
  User as UserIcon,
  Building2,
  Shield,
  ChevronDown,
  Crown,
  Key,
  DollarSign,
} from 'lucide-react';
import { ROLE_MAP } from '@/lib/utils';
import UndoActionWidget from '@/components/common/UndoActionWidget';

export interface CurrentUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  breweryId: string | null;
  breweryName?: string;
  brewerySlug?: string;
}

export default function Navbar({ user }: { user: CurrentUser | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [breweries, setBreweries] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      fetch('/api/breweries')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setBreweries(data);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleSwitchBrewery = async (breweryId: string) => {
    await fetch('/api/auth/switch-brewery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ breweryId }),
    });
    router.refresh();
    window.location.reload();
  };

  const roleInfo = user?.role ? ROLE_MAP[user.role] : null;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Logo & Tenant */}
        <div className="flex items-center gap-3">
          <Link href={isSuperAdmin ? '/master' : '/'} className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Beer className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-1">
                Pint<span className="text-amber-600">Tech</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block -mt-1">
                {isSuperAdmin ? 'SaaS Master OS' : 'Brewery OS'}
              </span>
            </div>
          </Link>

          {/* Master Portal Badge */}
          {isSuperAdmin && (
            <Link
              href="/master"
              className="hidden sm:flex items-center gap-1.5 ml-4 px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs rounded-full shadow-sm"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Painel do Proprietário</span>
            </Link>
          )}

          {/* Cervejaria Badge / Tenant Switcher */}
          {!isSuperAdmin && user?.breweryName && (
            <div className="hidden sm:flex items-center gap-1.5 ml-4 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-900">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>{user.breweryName}</span>
            </div>
          )}

          {/* Super Admin Switcher */}
          {isSuperAdmin && breweries.length > 0 && (
            <div className="hidden lg:flex items-center gap-2 ml-3">
              <span className="text-xs text-slate-500 font-medium">Acessar Cervejaria:</span>
              <select
                className="text-xs bg-slate-100 border border-slate-300 rounded-md px-2 py-1 font-semibold text-slate-800"
                value={user.breweryId || ''}
                onChange={(e) => handleSwitchBrewery(e.target.value)}
              >
                <option value="">-- Visão Master Global --</option>
                {breweries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Actions: Undo Widget, Quick Scanner & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Undo Action Widget */}
          <UndoActionWidget />

          {/* Quick Scanner Mobile Button */}
          <Link
            href="/scanner"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${
              pathname === '/scanner'
                ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Scanner Mobile</span>
          </Link>

          {/* User Profile */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
                  isSuperAdmin ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-white'
                }`}>
                  {isSuperAdmin ? <Crown className="w-4 h-4" /> : user.name.slice(0, 2)}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</span>
                  <span className="text-[10px] text-slate-500">{roleInfo?.label || user.role}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1.5">
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold ${roleInfo?.color || 'bg-slate-200 text-slate-800'}`}>
                        {roleInfo?.label || user.role}
                      </span>
                    </div>
                  </div>

                  {isSuperAdmin ? (
                    <>
                      <Link
                        href="/master"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50"
                      >
                        <Crown className="w-4 h-4 text-amber-600" />
                        Painel do Proprietário (SaaS)
                      </Link>
                      <Link
                        href="/master/cervejarias"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Building2 className="w-4 h-4 text-slate-400" />
                        Cervejarias Clientes
                      </Link>
                      <Link
                        href="/master/usuarios"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Key className="w-4 h-4 text-slate-400" />
                        Resetar Senhas de Clientes
                      </Link>
                      <Link
                        href="/master/financeiro"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        Faturamento SaaS & MRR
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/usuarios"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Shield className="w-4 h-4 text-slate-400" />
                      Gerenciar Usuários
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair do Sistema
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
