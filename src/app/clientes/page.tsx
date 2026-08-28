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
} from 'lucide-react';

export default function ClientesPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientModal, setNewClientModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');

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

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tradeName, document, email, phone, address, city, state }),
      });
      if (res.ok) {
        setNewClientModal(false);
        setName('');
        setTradeName('');
        setDocument('');
        setEmail('');
        setPhone('');
        fetchClients();
      }
    } catch (e) {
      console.error(e);
    }
  };

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
            Cadastro de pontos de venda, extrato de barris e chopeiras retidas em comodato
          </p>
        </div>

        <button
          onClick={() => setNewClientModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">Carregando clientes...</div>
        ) : clients.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">Nenhum cliente cadastrado.</div>
        ) : (
          clients.map((client) => {
            const hasRetained = client.kegs?.length > 0 || client.equipment?.length > 0;

            return (
              <div
                key={client.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 text-base">
                        {client.tradeName || client.name}
                      </h3>
                      {client.tradeName && (
                        <p className="text-[11px] text-slate-400 font-medium">{client.name}</p>
                      )}
                      {client.document && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Doc: {client.document}
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        hasRetained
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {client.kegs?.length || 0} barris em posse
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{client.phone}</span>
                      </div>
                    )}

                    {client.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {client.address}, {client.city} - {client.state}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Vasilhames Retidos Atualmente */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      Ativos em Posse do Cliente:
                    </span>

                    {client.kegs && client.kegs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {client.kegs.map((k: any) => (
                          <span
                            key={k.id}
                            className="px-2 py-0.5 bg-orange-50 text-orange-900 border border-orange-200 rounded font-mono text-[10px] font-bold flex items-center gap-1"
                          >
                            <Cylinder className="w-3 h-3 text-orange-600" />
                            {k.code} ({k.capacity}L)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Nenhum barril retido.</p>
                    )}

                    {client.equipment && client.equipment.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
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
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Novo Cliente */}
      {newClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-4">Cadastrar Novo Cliente / Bar</h3>
            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bar do Alemão"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Razão Social / Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alemão Gastronomia e Bebidas Ltda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ ou CPF</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Endereço de Entrega</label>
                <input
                  type="text"
                  placeholder="Rua, Número, Bairro"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UF</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewClientModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
