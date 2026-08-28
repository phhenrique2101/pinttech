'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  TrendingUp,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
} from 'lucide-react';
import { formatCurrency, formatDateShort } from '@/lib/utils';

export default function MasterFinanceiroPage() {
  const [data, setData] = useState<{ payments: any[]; summary: any }>({
    payments: [],
    summary: { totalMRR: 0, receivedPayments: 0, pendingPayments: 0, totalClients: 0, upToDateClients: 0, pendingClients: 0 },
  });

  const [breweries, setBreweries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Payment Modal
  const [newModal, setNewModal] = useState(false);
  const [breweryId, setBreweryId] = useState('');
  const [amount, setAmount] = useState('299');
  const [referenceMonth, setReferenceMonth] = useState('02/2026');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('PAGO');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [fRes, bRes] = await Promise.all([
        fetch('/api/master/finance'),
        fetch('/api/master/breweries'),
      ]);

      const [fData, bData] = await Promise.all([fRes.json(), bRes.json()]);

      if (fData.payments) setData(fData);
      if (bData.breweries) {
        setBreweries(bData.breweries);
        if (bData.breweries.length > 0 && !breweryId) {
          setBreweryId(bData.breweries[0].id);
          setAmount(String(bData.breweries[0].monthlyPrice || 299));
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
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/master/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breweryId,
          amount,
          referenceMonth,
          dueDate,
          status,
          paymentMethod,
          notes,
        }),
      });

      if (res.ok) {
        setNewModal(false);
        setNotes('');
        loadData();
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
            Faturamento SaaS & Mensalidades dos Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de receita recorrente (MRR), assinaturas pagas e cobranças de clientes
          </p>
        </div>

        <button
          onClick={() => setNewModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Pagamento de Mensalidade</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Receita Mensal (MRR)
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrency(data.summary?.totalMRR || 0)}
          </p>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold mt-2 inline-block">
            Previsão mensal total
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Mensalidades Recebidas
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(data.summary?.receivedPayments || 0)}
          </p>
          <span className="text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-bold mt-2 inline-block">
            Liquidadas na conta
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Mensalidades Pendentes
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {formatCurrency(data.summary?.pendingPayments || 0)}
          </p>
          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold mt-2 inline-block">
            Aguardando pagamento
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Adimplência dos Clientes
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {data.summary?.upToDateClients || 0} / {data.summary?.totalClients || 0}
          </p>
          <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold mt-2 inline-block">
            Clientes em dia
          </span>
        </div>
      </div>

      {/* Payments History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-4">Cervejaria Cliente</th>
                <th className="p-3.5">Mês Ref.</th>
                <th className="p-3.5">Vencimento</th>
                <th className="p-3.5">Forma Pgto</th>
                <th className="p-3.5">Valor Mensalidade</th>
                <th className="p-3.5 text-right pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Carregando extrato de mensalidades...
                  </td>
                </tr>
              ) : data.payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Nenhum pagamento registrado.
                  </td>
                </tr>
              ) : (
                data.payments.map((p) => {
                  const isPaid = p.status === 'PAGO';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-4">
                        <span className="font-extrabold text-slate-900 block">
                          {p.brewery?.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          Plano {p.brewery?.plan}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold font-mono text-slate-700">
                        {p.referenceMonth}
                      </td>

                      <td className="p-3.5 text-slate-600 font-medium">
                        {formatDateShort(p.dueDate)}
                      </td>

                      <td className="p-3.5 font-semibold text-slate-700">
                        {p.paymentMethod || 'PIX'}
                      </td>

                      <td className="p-3.5 font-black text-sm text-emerald-600">
                        {formatCurrency(p.amount)}
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {p.status}
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

      {/* Modal: Registrar Pagamento */}
      {newModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-4">Registrar Pagamento de Assinatura</h3>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cervejaria Cliente</label>
                <select
                  value={breweryId}
                  onChange={(e) => {
                    setBreweryId(e.target.value);
                    const sel = breweries.find((b) => b.id === e.target.value);
                    if (sel) setAmount(String(sel.monthlyPrice || 299));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {breweries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({formatCurrency(b.monthlyPrice)}/mês)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mês de Referência</label>
                  <input
                    type="text"
                    required
                    placeholder="03/2026"
                    value={referenceMonth}
                    onChange={(e) => setReferenceMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900"
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
                    <option value="PAGO">Pago / Confirmado</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="ATRASADO">Atrasado</option>
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
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="CARTAO">Cartão de Crédito</option>
                    <option value="TRANSFERENCIA">Transferência Bancária</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações / Comprovante</label>
                <textarea
                  rows={2}
                  placeholder="ID da transação Pix, comprovante, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
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
                  Salvar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
