'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Building2,
  ChevronDown,
  LogOut,
  ExternalLink,
  Crown,
  Smartphone,
} from 'lucide-react';
import { CurrentUser } from './Navbar';
import BreweryEditModal from '@/components/brew/BreweryEditModal';
import UndoActionWidget from '@/components/common/UndoActionWidget';
import ThemeToggle from '@/components/theme/ThemeToggle';

export default function BrewNavbar({ user }: { user: CurrentUser | null }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [breweryModalOpen, setBreweryModalOpen] = useState(false);
  const [breweryData, setBreweryData] = useState<any>(null);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  };

  // Determina URL do ERP principal para voltar se necessário
  const getErpUrl = () => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      if (host.startsWith('brew.localhost')) {
        return window.location.protocol + '//localhost' + (window.location.port ? `:${window.location.port}` : '') + '/';
      }
      if (host.includes('brew.pinttech.com.br')) {
        return 'https://pinttech.com.br/';
      }
    }
    return 'https://pinttech.com.br/';
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800 text-white shadow-lg">
      <div className="flex items-center justify-between h-16 px-4 md:px-6 max-w-[1600px] mx-auto">
        {/* Brand & Subdomain Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 fill-slate-950 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-white">
                  Pint<span className="text-amber-400">Tech</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-amber-500 text-slate-950 shadow-xs">
                  BREW
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
                Produção & Tanques (Chão de Fábrica)
              </span>
            </div>
          </Link>

          {/* Active Brewery Badge */}
          {user?.breweryName && (
            <div className="hidden sm:flex items-center gap-1.5 ml-3 px-3 py-1 bg-slate-900 border border-slate-700/80 rounded-full text-xs font-semibold text-amber-300">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate max-w-[200px]">{user.breweryName}</span>
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Undo Action Widget */}
          <UndoActionWidget />

          {/* Link para voltar ao ERP Completo */}
          <a
            href={getErpUrl()}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold transition shadow-xs"
            title="Acessar painel completo com Barris, Clientes, Pedidos e Financeiro"
          >
            <span>Acessar ERP Completo</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          {/* Theme Toggle (Modo Claro / Escuro) */}
          <ThemeToggle />

          {/* User Profile */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black text-xs uppercase flex items-center justify-center shadow-sm">
                  {user.name.slice(0, 2)}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-200 leading-tight truncate max-w-[120px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-amber-400/90 font-medium">
                    {user.role}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 text-slate-200"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-slate-800">
                    <p className="text-sm font-bold text-white">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    {user.breweryName && (
                      <p className="text-[11px] text-amber-400 mt-1 font-semibold flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {user.breweryName}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setDropdownOpen(false);
                      try {
                        const res = await fetch('/api/brewery');
                        if (res.ok) {
                          const b = await res.json();
                          if (b && !b.error) setBreweryData(b);
                        }
                      } catch (e) {}
                      setBreweryModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white text-left transition"
                  >
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>Dados da Cervejaria (CNPJ / MAPA)</span>
                  </button>

                  <a
                    href={getErpUrl()}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <Crown className="w-4 h-4 text-amber-400" />
                      Acessar ERP Completo
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition border-t border-slate-800 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da Conta
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição dos Dados Cadastrais da Cervejaria */}
      <BreweryEditModal
        isOpen={breweryModalOpen}
        onClose={() => setBreweryModalOpen(false)}
        brewery={breweryData}
        onSuccess={(updated) => {
          setBreweryData(updated);
          if (updated?.name && updated.name !== user?.breweryName) {
            window.location.reload();
          }
        }}
      />
    </header>
  );
}
