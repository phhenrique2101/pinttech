'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Verificar classe atual ou localStorage
    const stored = localStorage.getItem('pinttech_theme');
    
    if (stored === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else if (stored === 'light') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    } else {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    try {
      localStorage.setItem('pinttech_theme', nextTheme);
      document.cookie = `pinttech_theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  };

  // Evita hydration mismatch renderizando botão consistente
  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 opacity-50" />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl transition-all flex items-center justify-center ${
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-800 text-amber-400 border border-slate-700/80 hover:border-amber-400/40 shadow-sm'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-xs'
      }`}
      title={isDark ? 'Alternar para Modo Claro (Fundo Branco)' : 'Alternar para Modo Escuro (Fundo Escuro)'}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-90 duration-200" />
      )}
    </button>
  );
}
