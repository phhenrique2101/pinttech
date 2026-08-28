'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Shield,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  Lock,
  Edit,
  Trash2,
  Check,
  CheckSquare,
  Square,
  Search,
  Key,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Users,
  Cylinder,
  Wrench,
  QrCode,
  Flame,
  Package,
  ShoppingCart,
  DollarSign,
  Download,
} from 'lucide-react';
import { ROLE_MAP, formatDate } from '@/lib/utils';

interface ModulePermission {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
}

const AVAILABLE_MODULES: ModulePermission[] = [
  { id: 'BARRIS', name: 'Controle de Barris', description: 'Rastreamento, status na câmara fria e baixas de barris', icon: Cylinder, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'EQUIPAMENTOS', name: 'Chopeiras & Comodato', description: 'Chopeiras elétricas, a gelo, cilindros de CO2 e alocação', icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'SCANNER', name: 'Scanner Mobile (Câmera)', description: 'Leitor de código de barras e QR code por celular PWA', icon: QrCode, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'PRODUCAO', name: 'Produção & Tanques', description: 'Brassagens, controle de receitas, fermentadores e maturação', icon: Flame, color: 'text-rose-600', bg: 'bg-rose-50' },
  { id: 'ESTOQUE', name: 'Estoque & Insumos', description: 'Consulta de chopp envasado, saldo de malte, lúpulo e químicos', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'PEDIDOS', name: 'Pedidos & Entregas', description: 'Emissão de orçamentos, pedidos, fretes e conferência de entrega', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'CLIENTES', name: 'Clientes & Vasilhames', description: 'Cadastro de pontos de venda e controle de vasilhames retidos', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'FINANCEIRO', name: 'Financeiro Cervejaria', description: 'Contas a receber, fluxo de caixa e registro de pagamentos', icon: DollarSign, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { id: 'RELATORIOS', name: 'Relatórios & Exportação', description: 'Geração e download de relatórios customizados em Excel', icon: Download, color: 'text-amber-700', bg: 'bg-amber-50' },
  { id: 'USUARIOS', name: 'Gestão de Usuários', description: 'Adicionar e editar membros da equipe e níveis de permissão', icon: UserCheck, color: 'text-slate-700', bg: 'bg-slate-100' },
];

const PRESETS = [
  {
    name: 'Administrador Completo',
    role: 'ADMIN',
    modules: AVAILABLE_MODULES.map((m) => m.id),
  },
  {
    name: 'Mestre Cervejeiro / Produção',
    role: 'BREWER',
    modules: ['PRODUCAO', 'ESTOQUE', 'BARRIS', 'SCANNER', 'RELATORIOS'],
  },
  {
    name: 'Entregador / Logística',
    role: 'LOGISTICS',
    modules: ['BARRIS', 'EQUIPAMENTOS', 'SCANNER', 'PEDIDOS', 'CLIENTES'],
  },
  {
    name: 'Comercial / Vendas',
    role: 'SALES',
    modules: ['PEDIDOS', 'CLIENTES', 'ESTOQUE', 'RELATORIOS'],
  },
  {
    name: 'Financeiro',
    role: 'FINANCE',
    modules: ['FINANCEIRO', 'PEDIDOS', 'RELATORIOS'],
  },
];

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New User Modal State
  const [newModal, setNewModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('cervejaria2026');
  const [role, setRole] = useState('LOGISTICS');
  const [phone, setPhone] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>(['BARRIS', 'SCANNER', 'PEDIDOS']);
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [savingNewUser, setSavingNewUser] = useState(false);
  const [newUserError, setNewUserError] = useState<string | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editSelectedModules, setEditSelectedModules] = useState<string[]>([]);
  const [editMustChangePassword, setEditMustChangePassword] = useState(false);
  const [savingEditUser, setSavingEditUser] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);

  // Delete User State
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApplyPreset = (presetModules: string[], presetRole: string, isEdit = false) => {
    if (isEdit) {
      setEditSelectedModules(presetModules);
      setEditRole(presetRole);
    } else {
      setSelectedModules(presetModules);
      setRole(presetRole);
    }
  };

  const toggleModule = (modId: string, isEdit = false) => {
    if (isEdit) {
      setEditSelectedModules((prev) =>
        prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
      );
    } else {
      setSelectedModules((prev) =>
        prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
      );
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserError(null);
    setSavingNewUser(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          phone,
          permissions: selectedModules,
          mustChangePassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      setNewModal(false);
      setName('');
      setEmail('');
      setPassword('cervejaria2026');
      setPhone('');
      setSelectedModules(['BARRIS', 'SCANNER', 'PEDIDOS']);
      setMustChangePassword(true);
      fetchUsers();
    } catch (err: any) {
      setNewUserError(err.message);
    } finally {
      setSavingNewUser(false);
    }
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditPhone(u.phone || '');
    setEditRole(u.role || 'LOGISTICS');
    setEditActive(u.active !== false);
    setEditPassword('');
    setEditMustChangePassword(Boolean(u.mustChangePassword));

    let perms: string[] = [];
    if (u.permissions) {
      try {
        perms = JSON.parse(u.permissions);
      } catch {
        perms = String(u.permissions).split(',').map((p) => p.trim());
      }
    } else {
      // Default to all modules if admin, else standard roles
      perms = u.role === 'ADMIN' ? AVAILABLE_MODULES.map((m) => m.id) : ['BARRIS', 'SCANNER', 'PEDIDOS'];
    }
    setEditSelectedModules(perms);
    setEditUserError(null);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSavingEditUser(true);
    setEditUserError(null);

    try {
      const payload: any = {
        name: editName,
        email: editEmail,
        phone: editPhone,
        role: editRole,
        active: editActive,
        permissions: editSelectedModules,
        mustChangePassword: editMustChangePassword,
      };

      if (editPassword.trim().length > 0) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar usuário');
      }

      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setEditUserError(err.message);
    } finally {
      setSavingEditUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setDeletingUser(true);

    try {
      const res = await fetch(`/api/users/${deleteConfirmUser.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir usuário');
      }

      setDeleteConfirmUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingUser(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.phone?.toLowerCase().includes(s) ||
      u.role?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-600" />
            Equipe da Cervejaria & Níveis de Acesso
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre membros da equipe com permissões específicas por módulo, redefina senhas e gerencie acessos.
          </p>
        </div>

        <button
          onClick={() => {
            setNewModal(true);
            setNewUserError(null);
          }}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Usuário</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Buscar usuário por nome, e-mail ou cargo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs font-semibold bg-transparent focus:outline-none"
        />
        <span className="text-[11px] font-black text-slate-400 pr-2 whitespace-nowrap">
          {filteredUsers.length} usuário(s)
        </span>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-5">Nome & E-mail</th>
                <th className="p-3.5">Cargo / Perfil</th>
                <th className="p-3.5">Módulos Liberados</th>
                <th className="p-3.5">Status & Segurança</th>
                <th className="p-3.5 text-right pr-5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Carregando usuários...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  let userModules: string[] = [];
                  if (u.permissions) {
                    try {
                      userModules = JSON.parse(u.permissions);
                    } catch {
                      userModules = String(u.permissions).split(',').map((p) => p.trim());
                    }
                  } else if (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') {
                    userModules = AVAILABLE_MODULES.map((m) => m.id);
                  }

                  const roleInfo = ROLE_MAP[u.role] || { label: u.role, color: 'text-slate-700' };

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      {/* Nome & E-mail */}
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-black text-xs">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">
                              {u.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-normal">
                              {u.email}
                            </span>
                            {u.phone && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                📞 {u.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cargo */}
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-800 inline-flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-600" />
                          {roleInfo.label}
                        </span>
                      </td>

                      {/* Módulos Liberados */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {userModules.length === AVAILABLE_MODULES.length ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ✓ Acesso Completo ({userModules.length} módulos)
                            </span>
                          ) : userModules.length > 0 ? (
                            userModules.map((mId) => {
                              const mInfo = AVAILABLE_MODULES.find((m) => m.id === mId);
                              return (
                                <span
                                  key={mId}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700"
                                >
                                  {mInfo?.name || mId}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sem módulos liberados</span>
                          )}
                        </div>
                      </td>

                      {/* Status & Segurança */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div>
                            {u.active ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Ativo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Inativo
                              </span>
                            )}
                          </div>
                          {u.mustChangePassword && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <Key className="w-3 h-3 text-amber-600" />
                              Troca de Senha Pendente
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors"
                            title="Editar Usuário e Permissões"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmUser(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* MODAL: CRIAR NOVO USUÁRIO */}
      {newModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Cadastrar Novo Membro da Equipe
                  </h3>
                  <span className="text-xs text-slate-500">
                    Configure os dados e selecione as permissões exatas deste usuário
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {newUserError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{newUserError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Mestre Cervejeiro"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail de Acesso *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@cervejaria.com.br"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Senha Inicial Temporária *</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha temporária"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs"
                  />
                </div>
              </div>

              {/* Force Password Change Toggle */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="font-black text-amber-950 block">
                      Exigir troca de senha no primeiro login
                    </span>
                    <span className="text-[11px] text-amber-800/80">
                      O usuário será obrigado a cadastrar sua senha pessoal definitiva assim que acessar o sistema.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={mustChangePassword}
                  onChange={(e) => setMustChangePassword(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                />
              </div>

              {/* Preset Selector */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 block">
                    Presets Rápidos de Função:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset.modules, preset.role, false)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 font-bold rounded-lg text-[11px] transition-colors border border-slate-200"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Module Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 block">
                    Selecione as Funções e Módulos Liberados:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedModules.length === AVAILABLE_MODULES.length) {
                        setSelectedModules([]);
                      } else {
                        setSelectedModules(AVAILABLE_MODULES.map((m) => m.id));
                      }
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900"
                  >
                    {selectedModules.length === AVAILABLE_MODULES.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isChecked = selectedModules.includes(mod.id);
                    const Icon = mod.icon;

                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id, false)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-3.5 h-3.5 ${mod.color}`} />
                            <span className="font-black text-slate-900">{mod.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5 truncate">
                            {mod.description}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
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
                  disabled={savingNewUser}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-md disabled:opacity-50"
                >
                  {savingNewUser ? 'Salvando...' : 'Salvar Novo Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR USUÁRIO */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Editar Usuário & Permissões
                  </h3>
                  <span className="text-xs text-slate-500">{editingUser.email}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {editUserError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{editUserError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Redefinir Senha (deixe em branco para manter)
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                  />
                </div>
              </div>

              {/* Status and Force Password Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Usuário Ativo no Sistema</span>
                    <span className="text-[10px] text-slate-500">Se desmarcado, o login é bloqueado.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-950 block">Exigir Troca de Senha</span>
                    <span className="text-[10px] text-amber-800/80">Obriga o usuário a mudar a senha no próximo acesso.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editMustChangePassword}
                    onChange={(e) => setEditMustChangePassword(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Presets in Edit */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 block">
                    Presets Rápidos de Função:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset.modules, preset.role, true)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 font-bold rounded-lg text-[11px] transition-colors border border-slate-200"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Module Checkboxes in Edit */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 block">
                    Módulos e Funções Liberados:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (editSelectedModules.length === AVAILABLE_MODULES.length) {
                        setEditSelectedModules([]);
                      } else {
                        setEditSelectedModules(AVAILABLE_MODULES.map((m) => m.id));
                      }
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900"
                  >
                    {editSelectedModules.length === AVAILABLE_MODULES.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isChecked = editSelectedModules.includes(mod.id);
                    const Icon = mod.icon;

                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id, true)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-3.5 h-3.5 ${mod.color}`} />
                            <span className="font-black text-slate-900">{mod.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5 truncate">
                            {mod.description}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEditUser}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-md disabled:opacity-50"
                >
                  {savingEditUser ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE USUÁRIO */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Excluir Usuário Permanentemente?
              </h3>
              <p className="text-xs text-slate-500">
                Tem certeza que deseja excluir o acesso de <strong>{deleteConfirmUser.name}</strong> ({deleteConfirmUser.email})? Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingUser}
                onClick={handleDeleteUser}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-md disabled:opacity-50"
              >
                {deletingUser ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
