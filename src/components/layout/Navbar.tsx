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
  permissions?: string[];
  mustChangePassword?: boolean;
}

export default function Navbar({ user }: { user: CurrentUser | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [breweries, setBreweries] = useState<{ id: string; name: string }[]>([]);

  // Mandatory password change state
  const [forcePasswordModal, setForcePasswordModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.mustChangePassword) {
      setForcePasswordModal(true);
    }
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (newPass.length < 6) {
      setPassError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setPassError('A confirmação de senha não confere com a nova senha digitada.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar senha.');
      }

      setForcePasswordModal(false);
      alert('Senha definida com sucesso! Bem-vindo ao PintTech.');
      window.location.reload();
    } catch (err: any) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

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

  const handleSwitchBrewery = (breweryId: string) => {
    const targetUrl = breweryId ? '/' : '/master';
    window.location.href = `/api/auth/switch-brewery?breweryId=${encodeURIComponent(breweryId)}&redirect=${encodeURIComponent(targetUrl)}`;
  };

  const roleInfo = user?.role ? ROLE_MAP[user.role] : null;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Impersonation Alert Banner for Super Admin */}
      {isSuperAdmin && user?.breweryId && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 text-white px-4 py-2 text-xs font-bold flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="p-1 bg-white/20 rounded-md">🏢</span>
            <span>
              Acessando a cervejaria: <strong className="underline decoration-white/60">{user.breweryName || 'Cervejaria Selecionada'}</strong> (Visualização do Cliente)
            </span>
          </div>

          <button
            onClick={() => handleSwitchBrewery('')}
            className="px-3 py-1 bg-white hover:bg-amber-50 text-amber-950 rounded-lg font-black text-[11px] transition-colors shadow-2xs flex items-center gap-1.5 flex-shrink-0"
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>Voltar para Visão Master Global</span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Logo & Tenant */}
        <div className="flex items-center gap-3">
          <Link href={isSuperAdmin && !user?.breweryId ? '/master' : '/'} className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Beer className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-1">
                Pint<span className="text-amber-600">Tech</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block -mt-1">
                {isSuperAdmin && !user?.breweryId ? 'SaaS Master OS' : 'Brewery OS'}
              </span>
            </div>
          </Link>

          {/* Master Portal Badge */}
          {isSuperAdmin && (
            <Link
              href="/master"
              className="hidden sm:flex items-center gap-1.5 ml-2 px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs rounded-full shadow-sm"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Painel Master</span>
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
          {isSuperAdmin && (
            <div className="hidden md:flex items-center gap-1.5 ml-2">
              <select
                className="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl px-2.5 py-1.5 font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                value={user.breweryId || ''}
                onChange={(e) => handleSwitchBrewery(e.target.value)}
              >
                <option value="">👑 Visão Master Global</option>
                {breweries.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏢 {b.name}
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

                      {/* Brewery switcher inside profile dropdown */}
                      {breweries.length > 0 && (
                        <div className="pt-2 mt-1 border-t border-slate-100 px-3 py-1 space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                            Alternar Cervejaria:
                          </span>
                          <div className="max-h-36 overflow-y-auto space-y-0.5">
                            <button
                              type="button"
                              onClick={() => handleSwitchBrewery('')}
                              className={`w-full text-left px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-between transition-colors ${
                                !user?.breweryId ? 'bg-amber-100 text-amber-950 font-black' : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span>👑 Visão Master Global</span>
                              {!user?.breweryId && <span>✓</span>}
                            </button>
                            {breweries.map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => handleSwitchBrewery(b.id)}
                                className={`w-full text-left px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-between transition-colors ${
                                  user?.breweryId === b.id ? 'bg-amber-100 text-amber-950 font-black' : 'text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span className="truncate">🏢 {b.name}</span>
                                {user?.breweryId === b.id && <span>✓</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
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

      {/* Mandatory First Access Password Change Modal */}
      {forcePasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-amber-300 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Key className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Defina sua Nova Senha Pessoal
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Olá, <strong>{user?.name}</strong>! Por motivos de segurança, você precisa cadastrar sua senha pessoal definitiva no primeiro acesso ao sistema.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
                  {passError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nova Senha Pessoal (mínimo 6 dígitos)
                </label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={passLoading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {passLoading ? 'Salvando Nova Senha...' : 'Salvar Nova Senha & Acessar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
