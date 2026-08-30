'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Beer,
  Lock,
  Mail,
  ArrowRight,
  Truck,
  Layers,
  Cylinder,
  ShieldCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar. Verifique seu e-mail e senha.');
      }

      if (data.user.role === 'SUPER_ADMIN') {
        router.push('/master');
      } else if (data.user.role === 'LOGISTICS') {
        router.push('/scanner');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      {/* Left side: Brand presentation */}
      <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
        <div className="inline-flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center text-white shadow-xl shadow-amber-500/20">
            <Beer className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Pint<span className="text-amber-600">Tech</span>
            </h1>
            <p className="text-xs uppercase font-bold tracking-widest text-slate-400">
              Brewery Management & Keg Tracking
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-tight">
            Controle total de barris, produção, estoque e faturamento.
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Sistema completo com rastreabilidade por código de barras, gestão de comodatos, pedidos e aplicativo para conferência e entregas.
          </p>
        </div>

        {/* Highlight features */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start gap-2.5">
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Scanner & Logística</p>
              <p className="text-[11px] text-slate-500">Envase, carga e recolha</p>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start gap-2.5">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Cylinder className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Gestão de Barris</p>
              <p className="text-[11px] text-slate-500">Rastreabilidade completa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Clean & Secure Login Form */}
      <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-7 sm:p-9 shadow-xl shadow-slate-200/50">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Acesso Seguro</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">Entrar no Sistema</h3>
          <p className="text-xs text-slate-500 mt-1">Informe suas credenciais de usuário para acessar o painel</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">E-mail de Acesso</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@cervejaria.com.br"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:bg-white text-slate-900 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:bg-white text-slate-900 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Acessar Painel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Access Badges for Client Presentation */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            ⚡ Acesso Rápido para Demonstração:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@demo.com');
                setPassword('admin123');
              }}
              className="p-2 text-left bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/60 rounded-xl transition-all"
            >
              <span className="block text-[11px] font-bold text-amber-900">👑 Gestor (Admin)</span>
              <span className="block text-[10px] text-amber-700/80 font-mono">admin@demo.com</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('mestre@demo.com');
                setPassword('admin123');
              }}
              className="p-2 text-left bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/60 rounded-xl transition-all"
            >
              <span className="block text-[11px] font-bold text-blue-900">🍺 Cervejeiro</span>
              <span className="block text-[10px] text-blue-700/80 font-mono">mestre@demo.com</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('vendas@demo.com');
                setPassword('admin123');
              }}
              className="p-2 text-left bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200/60 rounded-xl transition-all"
            >
              <span className="block text-[11px] font-bold text-purple-900">💼 Comercial</span>
              <span className="block text-[10px] text-purple-700/80 font-mono">vendas@demo.com</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('logistica@demo.com');
                setPassword('admin123');
              }}
              className="p-2 text-left bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/60 rounded-xl transition-all"
            >
              <span className="block text-[11px] font-bold text-emerald-900">🚚 Scanner / Entrega</span>
              <span className="block text-[10px] text-emerald-700/80 font-mono">logistica@demo.com</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('financeiro@demo.com');
                setPassword('admin123');
              }}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            >
              <span className="block text-[11px] font-bold text-slate-800">💰 Financeiro</span>
              <span className="block text-[10px] text-slate-600 font-mono">financeiro@demo.com</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('owner@pinttech.com');
                setPassword('admin123');
              }}
              className="p-2 text-left bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200/60 rounded-xl transition-all"
            >
              <span className="block text-[11px] font-bold text-rose-900">🛡️ Super Admin</span>
              <span className="block text-[10px] text-rose-700/80 font-mono">owner@pinttech.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
