'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  Key,
  Lock,
  Unlock,
  Plus,
  Copy,
  Check,
  Building2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Phone,
  Mail,
  Send,
} from 'lucide-react';
import { ROLE_MAP } from '@/lib/utils';

function MasterUsuariosContent() {
  const searchParams = useSearchParams();
  const initialBreweryId = searchParams.get('breweryId') || 'ALL';

  const [users, setUsers] = useState<any[]>([]);
  const [breweries, setBreweries] = useState<any[]>([]);
  const [selectedBrewery, setSelectedBrewery] = useState(initialBreweryId);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('admin123');
  const [resetSuccess, setResetSuccess] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // New User Modal
  const [newUserModal, setNewUserModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('admin123');
  const [userRole, setUserRole] = useState('ADMIN');
  const [userPhone, setUserPhone] = useState('');
  const [userBreweryId, setUserBreweryId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBrewery !== 'ALL') params.append('breweryId', selectedBrewery);
      if (searchTerm) params.append('search', searchTerm);

      const [uRes, bRes] = await Promise.all([
        fetch(`/api/master/users?${params.toString()}`),
        fetch('/api/master/breweries'),
      ]);

      const [uData, bData] = await Promise.all([uRes.json(), bRes.json()]);

      if (Array.isArray(uData)) setUsers(uData);
      if (bData.breweries) {
        setBreweries(bData.breweries);
        if (bData.breweries.length > 0 && !userBreweryId) {
          setUserBreweryId(bData.breweries[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBrewery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;

    try {
      const res = await fetch(`/api/master/users/${resetModalUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setResetSuccess(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      const res = await fetch(`/api/master/users/${user.id}/toggle-active`, {
        method: 'POST',
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/master/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breweryId: userBreweryId,
          name: userName,
          email: userEmail,
          password: userPassword,
          role: userRole,
          phone: userPhone,
        }),
      });

      if (res.ok) {
        setNewUserModal(false);
        setUserName('');
        setUserEmail('');
        setUserPhone('');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            Gestão de Usuários & Reset de Senhas dos Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualize todos os usuários das cervejarias, redefina senhas e gerencie permissões
          </p>
        </div>

        <button
          onClick={() => {
            setUserPassword('admin123');
            setNewUserModal(true);
          }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Usuário em Cervejaria</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500">Filtrar Cervejaria:</span>
          <select
            value={selectedBrewery}
            onChange={(e) => setSelectedBrewery(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
          >
            <option value="ALL">Todas as Cervejarias</option>
            {breweries.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-4">Usuário</th>
                <th className="p-3.5">Cervejaria Cliente</th>
                <th className="p-3.5">Cargo / Perfil</th>
                <th className="p-3.5">Contato</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right pr-4">Ações do Proprietário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Carregando usuários...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const roleInfo = ROLE_MAP[user.role] || {
                    label: user.role,
                    color: 'bg-slate-200 text-slate-800',
                  };

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase">
                            {user.name.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block">{user.name}</span>
                            <span className="text-[11px] text-slate-500">{user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-800">
                          {user.brewery?.name || 'Acesso Global (Master)'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 font-medium">
                        {user.phone || '-'}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            user.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {user.active ? 'Ativo' : 'Bloqueado'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setResetSuccess(null);
                              setNewPassword('admin123');
                              setResetModalUser(user);
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 flex items-center gap-1 transition-colors"
                            title="Resetar senha deste usuário"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-700" />
                            <span>Resetar Senha</span>
                          </button>

                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              user.active
                                ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={user.active ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                          >
                            {user.active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Resetar Senha */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Redefinir Senha do Usuário</h3>
                <p className="text-xs text-slate-500">{resetModalUser.name} • {resetModalUser.email}</p>
              </div>
            </div>

            {!resetSuccess ? (
              <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nova Senha Provisória</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPassword(`Pint${Math.floor(1000 + Math.random() * 9000)}!`)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                    >
                      Gerar
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                  >
                    Confirmar Nova Senha
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs animate-in fade-in">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 mb-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Senha Redefinida com Sucesso!
                  </div>
                  <p>A nova senha para <strong>{resetModalUser.email}</strong> é:</p>
                  <p className="text-base font-black font-mono text-emerald-950 mt-1 bg-white p-2 rounded-lg border border-emerald-300 inline-block">
                    {resetSuccess.newPassword}
                  </p>
                </div>

                {/* Copiar mensagem de WhatsApp pronta */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-bold text-slate-700 block">Mensagem pronta para enviar ao cliente:</span>
                  <p className="text-[11px] text-slate-600 font-mono bg-white p-2.5 rounded border border-slate-200">
                    Olá {resetModalUser.name}, sua nova senha de acesso ao PintTech é: <strong>{resetSuccess.newPassword}</strong>. Acesse em: http://localhost:3000/login
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `Olá ${resetModalUser.name}, sua nova senha de acesso ao PintTech é: ${resetSuccess.newPassword}. Acesse em: http://localhost:3000/login`
                      )
                    }
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Mensagem Copiada!' : 'Copiar Mensagem para Enviar'}</span>
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Novo Usuário */}
      {newUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-4">Cadastrar Usuário em Cervejaria</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cervejaria Cliente</label>
                <select
                  value={userBreweryId}
                  onChange={(e) => setUserBreweryId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {breweries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Roberto Cervejeiro"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail de Login</label>
                <input
                  type="email"
                  required
                  placeholder="roberto@cervejaria.com.br"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Senha Inicial</label>
                  <input
                    type="text"
                    required
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 98888-0000"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cargo / Nível de Acesso</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="ADMIN">Gestor da Cervejaria (Acesso Completo)</option>
                  <option value="LOGISTICS">Logística & Entregador (App Scanner)</option>
                  <option value="BREWER">Mestre Cervejeiro (Produção & Lotes)</option>
                  <option value="SALES">Comercial / Vendas (Pedidos & Clientes)</option>
                  <option value="FINANCE">Financeiro (Contas & Faturamento)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewUserModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MasterUsuariosPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500">Carregando usuários...</div>}>
      <MasterUsuariosContent />
    </Suspense>
  );
}
