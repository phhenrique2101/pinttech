'use client';

import React, { useState } from 'react';
import { LogOut } from 'lucide-react';

export default function MobileLogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 p-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold text-sm rounded-2xl border border-rose-200 dark:border-rose-900/50 transition-colors shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer"
    >
      <LogOut className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
      <span>{loading ? 'Saindo do Sistema...' : 'Sair do Sistema (Desconectar)'}</span>
    </button>
  );
}
