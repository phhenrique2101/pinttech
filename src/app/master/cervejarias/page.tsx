'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  DollarSign,
  Key,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Edit,
  Trash2,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function MasterCervejariasPage() {
  const router = useRouter();
  const [breweries, setBreweries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset brewery states
  const [resetModal, setResetModal] = useState<any | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetUsers, setResetUsers] = useState(false);
  const [resetTanks, setResetTanks] = useState(true);
  const [resetRecipes, setResetRecipes] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // New brewery modal
  const [newModal, setNewModal] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [plan, setPlan] = useState('PRO');
  const [monthlyPrice, setMonthlyPrice] = useState('299');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');

  // Edit brewery modal
  const [editModal, setEditModal] = useState<any>(null);

  const fetchBreweries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master/breweries');
      const json = await res.json();
      if (json.breweries) setBreweries(json.breweries);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreweries();
  }, []);

  const handleCreateBrewery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/master/breweries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          document,
          email,
          phone,
          city,
          state,
          plan,
          monthlyPrice,
          adminName,
          adminEmail,
          adminPassword,
        }),
      });

      if (res.ok) {
        setNewModal(false);
        setName('');
        setDocument('');
        setEmail('');
        setAdminEmail('');
        fetchBreweries();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateBrewery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    try {
      const res = await fetch(`/api/master/breweries/${editModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editModal.name,
          email: editModal.email,
          phone: editModal.phone,
          plan: editModal.plan,
          monthlyPrice: editModal.monthlyPrice,
          billingStatus: editModal.billingStatus,
          active: editModal.active,
        }),
      });

      if (res.ok) {
        setEditModal(null);
        fetchBreweries();
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  const handleResetBreweryData = async () => {
    if (!resetModal) return;
    setResetLoading(true);
    setResetError('');
    try {
      const res = await fetch(`/api/master/breweries/${resetModal.id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetUsers, resetTanks, resetRecipes }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetModal(null);
        setResetConfirmText('');
        fetchBreweries();
        alert(data.message || 'Dados zerados com sucesso!');
      } else {
        setResetError(data.error || 'Erro ao zerar dados da cervejaria');
      }
    } catch (e: any) {
      console.error(e);
      setResetError('Erro de conexão ao processar requisição');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            Cervejarias Clientes (Tenants do SaaS)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre novas cervejarias clientes, edite planos, mensalidades e controle de acesso
          </p>
        </div>

        <button
          onClick={() => {
            setAdminPassword('admin123');
            setNewModal(true);
          }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Cervejaria Cliente</span>
        </button>
      </div>

      {/* Breweries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">Carregando cervejarias...</div>
        ) : breweries.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">Nenhuma cervejaria cadastrada.</div>
        ) : (
          breweries.map((b) => (
            <div
              key={b.id}
              className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                b.active ? 'border-slate-200 hover:border-amber-400' : 'border-rose-200 bg-rose-50/30 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Plano {b.plan}
                    </span>
                    <h3 className="font-black text-slate-900 text-base mt-1.5">{b.name}</h3>
                    <p className="text-xs text-slate-500">{b.city} - {b.state}</p>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      b.billingStatus === 'EM_DIA'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {b.billingStatus}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Mensalidade:</span>
                    <span className="font-black text-slate-900">{formatCurrency(b.monthlyPrice || 299)}/mês</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">E-mail de Contato:</span>
                    <span className="font-semibold text-slate-800">{b.email}</span>
                  </div>

                  {b.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Telefone:</span>
                      <span className="font-medium text-slate-700">{b.phone}</span>
                    </div>
                  )}

                  {/* Resumo de Ativos */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[11px]">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">Barris</span>
                      <span className="font-black text-slate-800">{b._count?.kegs || 0}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">Usuários</span>
                      <span className="font-black text-purple-700">{b._count?.users || 0}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">Pedidos</span>
                      <span className="font-black text-emerald-700">{b._count?.orders || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Proprietário */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <a
                  href={`/api/auth/switch-brewery?breweryId=${b.id}&redirect=/`}
                  className="flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all shadow-2xs"
                  title="Entrar no sistema desta cervejaria"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Acessar</span>
                </a>

                <Link
                  href={`/master/usuarios?breweryId=${b.id}`}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  title="Ver usuários e resetar senhas"
                >
                  <Key className="w-4 h-4 text-slate-600" />
                </Link>

                <button
                  onClick={() => setEditModal(b)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  title="Editar plano e mensalidade"
                >
                  <Edit className="w-4 h-4 text-slate-600" />
                </button>

                <button
                  onClick={() => {
                    setResetModal(b);
                    setResetConfirmText('');
                    setResetUsers(false);
                    setResetTanks(true);
                    setResetRecipes(true);
                    setResetError('');
                  }}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors border border-rose-200"
                  title="Zerar todos os dados operacionais desta cervejaria (Barris, Pedidos, Produção, Estoque)"
                >
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Cadastrar Nova Cervejaria */}
      {newModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-1">Cadastrar Nova Cervejaria Cliente</h3>
            <p className="text-xs text-slate-500 mb-4">Cria o tenant da cervejaria e o login de acesso do primeiro administrador</p>

            <form onSubmit={handleCreateBrewery} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nome da Cervejaria</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cervejaria Craft Beer Brasil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail Principal</label>
                  <input
                    type="email"
                    required
                    placeholder="contato@craftbeer.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-8888"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">UF</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold uppercase"
                  />
                </div>
              </div>

              {/* Plano SaaS & Mensalidade */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <span className="font-extrabold text-amber-900 block">Assinatura & Plano do SaaS</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Plano Contratado</label>
                    <select
                      value={plan}
                      onChange={(e) => {
                        setPlan(e.target.value);
                        if (e.target.value === 'STARTER') setMonthlyPrice('199');
                        if (e.target.value === 'PRO') setMonthlyPrice('299');
                        if (e.target.value === 'ENTERPRISE') setMonthlyPrice('499');
                      }}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-800"
                    >
                      <option value="STARTER">Starter (Até 50 barris) - R$ 199/mês</option>
                      <option value="PRO">Pro (Até 300 barris) - R$ 299/mês</option>
                      <option value="ENTERPRISE">Enterprise (Ilimitado) - R$ 499/mês</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Mensalidade Cobrada (R$)</label>
                    <input
                      type="number"
                      required
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-black text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Primeiro Administrador */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                <span className="font-extrabold text-purple-900 block">Criar Usuário Administrador Inicial</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block font-bold text-purple-900 mb-1">Nome do Gestor</label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos Silva"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-medium"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block font-bold text-purple-900 mb-1">E-mail de Login</label>
                    <input
                      type="email"
                      placeholder="admin@craftbeer.com.br"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-bold text-purple-900 mb-1">Senha Inicial do Cliente</label>
                    <input
                      type="text"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Criar Cervejaria & Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Cervejaria */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-4">Editar Cervejaria Cliente</h3>
            <form onSubmit={handleUpdateBrewery} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome da Cervejaria</label>
                <input
                  type="text"
                  required
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plano</label>
                  <select
                    value={editModal.plan}
                    onChange={(e) => setEditModal({ ...editModal, plan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="STARTER">STARTER</option>
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mensalidade (R$)</label>
                  <input
                    type="number"
                    value={editModal.monthlyPrice}
                    onChange={(e) => setEditModal({ ...editModal, monthlyPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Cobrança</label>
                  <select
                    value={editModal.billingStatus}
                    onChange={(e) => setEditModal({ ...editModal, billingStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="EM_DIA">Em Dia</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="ATRASADO">Atrasado</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status de Acesso</label>
                  <select
                    value={editModal.active ? 'true' : 'false'}
                    onChange={(e) => setEditModal({ ...editModal, active: e.target.value === 'true' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="true">Ativo (Acesso Liberado)</option>
                    <option value="false">Bloqueado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: ZERAR DADOS DA CERVEJARIA */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-300 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Zerar Dados da Cervejaria</h3>
                  <p className="text-[11px] text-slate-500 font-bold">{resetModal.name}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Box */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5 text-rose-900 text-xs">
              <div className="flex items-center gap-2 font-black text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>ATENÇÃO: AÇÃO IRREVERSÍVEL!</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-800/90">
                Esta ação vai <strong>apagar permanentemente</strong> todos os barris, movimentações de rastreamento, pedidos de vendas, comodatos, clientes, produção e financeiro desta fábrica.
              </p>
            </div>

            {/* Checklist of what will be reset */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <span className="font-black text-slate-700 text-[11px] uppercase tracking-wider block">
                O que será zerado / excluído:
              </span>
              <ul className="space-y-1 text-slate-600 text-[11px]">
                <li className="flex items-center gap-1.5 font-bold text-rose-600">
                  <span>✓</span> Todos os Barris ({resetModal._count?.kegs || 0} un.) e histórico de bipagens
                </li>
                <li className="flex items-center gap-1.5 font-bold text-rose-600">
                  <span>✓</span> Todos os Pedidos ({resetModal._count?.orders || 0} un.) e comodatos de chopeiras
                </li>
                <li className="flex items-center gap-1.5 font-bold text-rose-600">
                  <span>✓</span> Todos os Clientes e Transações Financeiras
                </li>
                <li className="flex items-center gap-1.5 font-bold text-rose-600">
                  <span>✓</span> Estoque de Insumos e Lotes de Produção
                </li>
              </ul>
            </div>

            {/* Options */}
            <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={resetTanks}
                  onChange={(e) => setResetTanks(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Zerar também os Tanques e Fermentadores</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={resetRecipes}
                  onChange={(e) => setResetRecipes(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Zerar também as Receitas de Cerveja cadastradas</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={resetUsers}
                  onChange={(e) => setResetUsers(e.target.checked)}
                  className="rounded text-rose-500 focus:ring-rose-400"
                />
                <span className="text-rose-700">Excluir também os Usuários da cervejaria (exceto Proprietário)</span>
              </label>
            </div>

            {/* Confirmation Safety Input */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700">
                Digite <strong className="text-rose-600 font-black">ZERAR</strong> para confirmar:
              </label>
              <input
                type="text"
                placeholder="ZERAR"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black uppercase text-rose-700 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
                {resetError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetBreweryData}
                disabled={resetLoading || resetConfirmText.trim().toUpperCase() !== 'ZERAR'}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resetLoading ? 'Zerando Dados...' : 'Confirmar e Zerar Tudo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
