'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  MapPin,
  Phone,
  Building,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
} from 'lucide-react';

interface QuickClientModalProps {
  isOpen: boolean;
  initialName?: string;
  onClose: () => void;
  onSuccess: (newClient: any) => void;
}

export default function QuickClientModal({
  isOpen,
  initialName = '',
  onClose,
  onSuccess,
}: QuickClientModalProps) {
  const [formData, setFormData] = useState({
    tradeName: '',
    name: '',
    phone: '',
    document: '',
    email: '',
    zipCode: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cepNotice, setCepNotice] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        tradeName: initialName || '',
        name: '',
        phone: '',
        document: '',
        email: '',
        zipCode: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        notes: '',
      });
      setErrorMessage('');
      setCepNotice('');
    }
  }, [isOpen, initialName]);

  // Busca automática de endereço por CEP (ViaCEP)
  const handleCepLookup = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    setCepNotice('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepNotice('CEP não encontrado na base dos Correios');
      } else {
        setFormData((prev) => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf ? data.uf.toUpperCase() : prev.state,
        }));
        setCepNotice('Endereço preenchido automaticamente');
      }
    } catch {
      setCepNotice('Não foi possível consultar o CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);

    let formatted = val;
    if (val.length > 5) {
      formatted = `${val.slice(0, 5)}-${val.slice(5)}`;
    }

    setFormData((prev) => ({ ...prev, zipCode: formatted }));

    if (val.length === 8) {
      handleCepLookup(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = (formData.tradeName || formData.name)?.trim();
    if (!finalName) {
      setErrorMessage('Por favor, informe ao menos o Nome Fantasia ou Razão Social do cliente.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        ...formData,
        name: formData.name.trim() || finalName,
        tradeName: formData.tradeName.trim() || finalName,
      };

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao cadastrar cliente');
        setLoading(false);
        return;
      }

      // Sucesso: fecha o modal e devolve o cliente cadastrado
      onSuccess(data);
      onClose();
    } catch {
      setErrorMessage('Erro de conexão ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/70 to-orange-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                Cadastro Rápido de Cliente
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                O cliente será salvo e selecionado automaticamente neste pedido
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Dados Principais */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Fantasia / Bar / Ponto <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bar do Alemão, Empório Beer"
                  value={formData.tradeName}
                  onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telefone / WhatsApp <span className="text-amber-600 font-normal">(recomendado)</span>
                </label>
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Razão Social / Nome Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Alemão Bebidas Eireli"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ ou CPF</label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">E-mail para Faturamento / Contato</label>
              <input
                type="email"
                placeholder="pedidos@empresa.com.br"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Seção de Endereço de Entrega */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                Endereço de Entrega
              </span>
              {loadingCep && (
                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Buscando CEP...
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">CEP</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={formData.zipCode}
                    onChange={handleCepChange}
                    onBlur={() => handleCepLookup(formData.zipCode)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Rua / Avenida</label>
                <input
                  type="text"
                  placeholder="Rua, Avenida, Praça..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {cepNotice && (
              <p className="text-[10px] font-medium text-amber-700 mb-2.5 -mt-1">
                {cepNotice}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2.5 mb-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Número</label>
                <input
                  type="text"
                  placeholder="123"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Complemento</label>
                <input
                  type="text"
                  placeholder="Galpão 2, Sala 10, Apto"
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Bairro</label>
                <input
                  type="text"
                  placeholder="Bairro"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Cidade</label>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="UF"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold uppercase text-center text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Observações / Ponto de Referência */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações Comerciais / Ponto de Referência
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Entrega pela porta lateral; falar com Carlos; recebimento apenas pela manhã..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar e Selecionar no Pedido</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
