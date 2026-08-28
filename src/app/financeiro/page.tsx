'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
} from 'lucide-react';
import { formatCurrency, formatDateShort } from '@/lib/utils';

export default function FinanceiroPage() {
  const [data, setData] = useState<{ transactions: any[]; summary: any }>({
    transactions: [],
    summary: { totalIncome: 0, pendingIncome: 0, totalExpense: 0, balance: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [newModal, setNewModal] = useState(false);

  // Form states
  const [type, setType] = useState('RECEITA');
  const [category, setCategory] = useState('VENDA_CERVEJA');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [status, setStatus] = useState('PENDENTE');

  const fetchFinance = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/financial');
      const json = await res.json();
      if (json.transactions) setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, category, description, amount, dueDate, paymentMethod, status }),
      });
      if (res.ok) {
        setNewModal(false);
        setDescription('');
        setAmount('');
        fetchFinance();
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
            <DollarSign className="w-5 h-5 text-amber-600" />
            Módulo Financeiro & Contas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Contas a receber de pedidos, despesas operacionais e controle de depósitos de caução
          </p>
        </div>

        <button
          onClick={() => setNewModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Lançamento</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Recebido
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrency(data.summary?.totalIncome || 0)}
          </p>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold mt-2 inline-block">
            Entradas liquidadas
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            A Receber (Pedidos)
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {formatCurrency(data.summary?.pendingIncome || 0)}
          </p>
          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold mt-2 inline-block">
            Previsão futura
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Despesas Totais
          </span>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {formatCurrency(data.summary?.totalExpense || 0)}
          </p>
          <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold mt-2 inline-block">
            Insumos & Operacional
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Saldo Operacional
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(data.summary?.balance || 0)}
          </p>
          <span className="text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-bold mt-2 inline-block">
            Líquido do período
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-5">Descrição / Categoria</th>
                <th className="p-3.5">Vencimento</th>
                <th className="p-3.5">Tipo</th>
                <th className="p-3.5">Forma Pgto</th>
                <th className="p-3.5">Valor</th>
                <th className="p-3.5 text-right pr-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Carregando financeiro...
                  </td>
                </tr>
              ) : data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Nenhum lançamento financeiro registrado.
                  </td>
                </tr>
              ) : (
                data.transactions.map((t) => {
                  const isIncome = t.type === 'RECEITA';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-5">
                        <span className="font-bold text-slate-900 block">{t.description}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{t.category}</span>
                      </td>

                      <td className="p-3.5 text-slate-600 font-medium">
                        {formatDateShort(t.dueDate)}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-700">
                        {t.paymentMethod || 'PIX'}
                      </td>

                      <td className={`p-3.5 font-black text-sm ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                      </td>

                      <td className="p-3.5 text-right pr-5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            t.status === 'PAGO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo Lançamento */}
      {newModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-4">Novo Lançamento Financeiro</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="RECEITA">Receita (Entrada)</option>
                    <option value="DESPESA">Despesa (Saída)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="VENDA_CERVEJA">Venda Cerveja</option>
                    <option value="ALUGUEL_CHOPEIRA">Locação Chopeira</option>
                    <option value="CAUCAO">Depósito Caução</option>
                    <option value="COMPRA_INSUMO">Compra de Malte/Lúpulo</option>
                    <option value="MANUTENCAO">Manutenção</option>
                    <option value="FIXO">Custos Fixos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de 500kg Malte Pilsen"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1500.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vencimento</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="PAGO">Pago / Liquidado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="PIX">Pix</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CARTAO">Cartão</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                  </select>
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
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
