'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Cylinder,
  Wrench,
  AlertTriangle,
  FileText,
  Download,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Building,
  CreditCard,
  History,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';
import { exportJsonToExcel } from '@/lib/exportUtils';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ClientesPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'COM_BARRIS' | 'SEM_BARRIS' | 'COM_CHOPEIRAS'>('ALL');

  // Modals
  const [newClientModal, setNewClientModal] = useState(false);
  const [editClientModal, setEditClientModal] = useState<any | null>(null);
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<any | null>(null);
  const [selectedClientHistory, setSelectedClientHistory] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states (Create / Edit)
  const [formData, setFormData] = useState({
    name: '',
    tradeName: '',
    document: '',
    email: '',
    phone: '',
    zipCode: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    creditLimit: '',
    notes: '',
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (Array.isArray(data)) setClients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openNewModal = () => {
    setFormData({
      name: '',
      tradeName: '',
      document: '',
      email: '',
      phone: '',
      zipCode: '',
      address: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: 'São Paulo',
      state: 'SP',
      creditLimit: '',
      notes: '',
    });
    setErrorMessage('');
    setNewClientModal(true);
  };

  const openEditModal = (client: any) => {
    setFormData({
      name: client.name || '',
      tradeName: client.tradeName || '',
      document: client.document || '',
      email: client.email || '',
      phone: client.phone || '',
      zipCode: client.zipCode || '',
      address: client.address || '',
      number: client.number || '',
      complement: client.complement || '',
      neighborhood: client.neighborhood || '',
      city: client.city || 'São Paulo',
      state: client.state || 'SP',
      creditLimit: client.creditLimit ? String(client.creditLimit) : '',
      notes: client.notes || '',
    });
    setErrorMessage('');
    setEditClientModal(client);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setNewClientModal(false);
        fetchClients();
      } else {
        setErrorMessage(data.error || 'Erro ao cadastrar cliente');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Erro de conexão ao salvar cliente');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClientModal) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/clients/${editClientModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setEditClientModal(null);
        fetchClients();
      } else {
        setErrorMessage(data.error || 'Erro ao atualizar dados do cliente');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Erro de conexão ao atualizar cliente');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteConfirmClient) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/clients/${deleteConfirmClient.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteConfirmClient(null);
        fetchClients();
      } else {
        setErrorMessage(data.error || 'Erro ao excluir cliente');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Erro ao conectar com o servidor');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtragem dos clientes
  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      c.name?.toLowerCase().includes(q) ||
      c.tradeName?.toLowerCase().includes(q) ||
      c.document?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    const hasKegs = (c.kegs && c.kegs.length > 0) || c.retainedKegsCount > 0;
    const hasEquipment = c.equipment && c.equipment.length > 0;

    if (filter === 'COM_BARRIS') return hasKegs;
    if (filter === 'SEM_BARRIS') return !hasKegs;
    if (filter === 'COM_CHOPEIRAS') return hasEquipment;
    return true;
  });

  // KPIs
  const totalClients = clients.length;
  const clientsWithKegs = clients.filter(
    (c) => (c.kegs && c.kegs.length > 0) || c.retainedKegsCount > 0
  ).length;
  const totalKegsInPossession = clients.reduce(
    (acc, c) => acc + (c.kegs ? c.kegs.length : c.retainedKegsCount || 0),
    0
  );
  const totalEquipmentInField = clients.reduce(
    (acc, c) => acc + (c.equipment ? c.equipment.length : 0),
    0
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            Clientes & Rastreamento de Vasilhames
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro completo de pontos de venda, edição de cadastros e comodatos ativos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const rows = clients.map((c) => ({
                'Nome / Razão Social': c.name,
                'Nome Fantasia': c.tradeName || c.name,
                'CNPJ / CPF': c.document || '—',
                'Telefone / WhatsApp': c.phone || '—',
                'E-mail': c.email || '—',
                'Endereço': `${c.address || ''} ${c.number || ''} ${c.complement || ''}`.trim() || '—',
                'Bairro': c.neighborhood || '—',
                'Cidade': c.city || '—',
                'Estado': c.state || '—',
                'CEP': c.zipCode || '—',
                'Barris Retidos': (c.kegs || []).length || c.retainedKegsCount || 0,
                'Chopeiras Retidas': (c.equipment || []).length || 0,
                'Total Pedidos': c._count?.orders || (c.orders || []).length || 0,
                'Observações': c.notes || '—',
              }));
              exportJsonToExcel(rows, `Clientes_PintTech_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Clientes');
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-xs"
            title="Exportar clientes para Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel ({clients.length})</span>
          </button>

          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total de Clientes
            </span>
            <span className="text-2xl font-black text-slate-900 mt-0.5 block">{totalClients}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pontos com Barris
            </span>
            <span className="text-2xl font-black text-amber-600 mt-0.5 block">{clientsWithKegs}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Barris em Posse
            </span>
            <span className="text-2xl font-black text-orange-600 mt-0.5 block">{totalKegsInPossession} un.</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Cylinder className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Chopeiras em Comodato
            </span>
            <span className="text-2xl font-black text-blue-600 mt-0.5 block">{totalEquipmentInField} un.</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, documento, fone, cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Todos ({clients.length})
          </button>

          <button
            onClick={() => setFilter('COM_BARRIS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'COM_BARRIS'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-50 hover:bg-orange-100 text-orange-800'
            }`}
          >
            Com Barris ({clientsWithKegs})
          </button>

          <button
            onClick={() => setFilter('COM_CHOPEIRAS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'COM_CHOPEIRAS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-800'
            }`}
          >
            Com Chopeiras
          </button>

          <button
            onClick={() => setFilter('SEM_BARRIS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'SEM_BARRIS'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Sem Retenção
          </button>
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">Carregando clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">Nenhum cliente encontrado.</p>
            <p className="text-xs text-slate-400">Tente ajustar a busca ou cadastre um novo cliente acima.</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const hasRetained = (client.kegs && client.kegs.length > 0) || (client.equipment && client.equipment.length > 0);
            const kegsCount = client.kegs?.length || client.retainedKegsCount || 0;
            const equipCount = client.equipment?.length || 0;

            return (
              <div
                key={client.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-black text-slate-900 text-base leading-snug">
                        {client.tradeName || client.name}
                      </h3>
                      {client.tradeName && client.name && (
                        <p className="text-[11px] text-slate-400 font-medium">{client.name}</p>
                      )}
                      {client.document && (
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          Doc: {client.document}
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex-shrink-0 ${
                        kegsCount > 0
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {kegsCount} barris retidos
                    </span>
                  </div>

                  {/* Contact & Address info */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-medium text-slate-700">{client.phone}</span>
                      </div>
                    )}

                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate text-slate-500">{client.email}</span>
                      </div>
                    )}

                    {(client.address || client.city) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight text-slate-500">
                          {client.address ? `${client.address}${client.number ? `, ${client.number}` : ''}` : ''}
                          {client.neighborhood ? ` - ${client.neighborhood}` : ''}
                          {client.city ? ` • ${client.city}/${client.state || 'SP'}` : ''}
                        </span>
                      </div>
                    )}

                    {client.notes && (
                      <p className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded-xl border border-slate-100 italic mt-1">
                        "{client.notes}"
                      </p>
                    )}
                  </div>

                  {/* Vasilhames Retidos Atualmente */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      Ativos em Posse ({kegsCount} barris • {equipCount} equip.):
                    </span>

                    {client.kegs && client.kegs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {client.kegs.map((k: any) => (
                          <span
                            key={k.id}
                            className="px-2 py-0.5 bg-orange-50 text-orange-900 border border-orange-200 rounded font-mono text-[10px] font-bold flex items-center gap-1"
                          >
                            <Cylinder className="w-3 h-3 text-orange-600" />
                            {k.code} ({k.capacity}L{k.currentBeerName ? ` • ${k.currentBeerName}` : ''})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Nenhum barril retido no momento.</p>
                    )}

                    {client.equipment && client.equipment.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                        {client.equipment.map((eq: any) => (
                          <span
                            key={eq.id}
                            className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[10px] font-bold flex items-center gap-1"
                          >
                            <Wrench className="w-3 h-3 text-blue-600" />
                            {eq.name} ({eq.code})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons: EDIT & DELETE */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openEditModal(client)}
                    className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-200 hover:border-amber-500 shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Dados</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmClient(client)}
                    className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors border border-slate-200 hover:border-rose-200"
                    title="Excluir cliente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Cadastrar Novo Cliente */}
      {newClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Cadastrar Novo Cliente / Bar</h3>
                  <p className="text-[11px] text-slate-400">Ponto de venda ou cliente final</p>
                </div>
              </div>
              <button
                onClick={() => setNewClientModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Fantasia <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bar do Alemão"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Razão Social / Nome Completo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Alemão Bebidas Ltda"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ ou CPF</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={formData.document}
                    onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="contato@cliente.com.br"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Endereço (Rua / Av)</label>
                  <input
                    type="text"
                    placeholder="Rua das Flores"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Número</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Centro"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold uppercase focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações Comerciais</label>
                <textarea
                  rows={2}
                  placeholder="Horário de entrega, preferências, responsável de compras..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewClientModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  {actionLoading ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: EDITAR CLIENTE */}
      {editClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Editar Dados do Cliente</h3>
                  <p className="text-[11px] text-slate-400">Atualize informações de contato e endereço</p>
                </div>
              </div>
              <button
                onClick={() => setEditClientModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdateClient} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Fantasia <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bar do Alemão"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Razão Social / Nome Completo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Alemão Bebidas Ltda"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ ou CPF</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={formData.document}
                    onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="contato@cliente.com.br"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Endereço (Rua / Av)</label>
                  <input
                    type="text"
                    placeholder="Rua das Flores"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Número</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Centro"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold uppercase focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações Comerciais</label>
                <textarea
                  rows={2}
                  placeholder="Horário de entrega, preferências, responsável de compras..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditClientModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  {actionLoading ? 'Atualizando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Cliente */}
      {deleteConfirmClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-black text-base text-slate-900">Excluir Cliente?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja realmente excluir <strong>{deleteConfirmClient.tradeName || deleteConfirmClient.name}</strong>?
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl text-left">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmClient(null);
                  setErrorMessage('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                {actionLoading ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
