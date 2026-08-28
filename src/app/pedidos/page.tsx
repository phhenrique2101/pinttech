'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  Cylinder,
  Wrench,
  QrCode,
  Sparkles,
  Check,
  Building2,
  Edit3,
  CreditCard,
  Receipt,
  Trash2,
  X,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';
import { formatCurrency, formatDateShort, formatDate, ORDER_STATUS_MAP } from '@/lib/utils';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';

export default function PedidosPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected order modal for details / edit / payment
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderModalTab, setOrderModalTab] = useState<'EDIT' | 'PAYMENT'>('EDIT');
  const [savingOrder, setSavingOrder] = useState(false);

  // Edit Order Form State
  const [editClientId, setEditClientId] = useState('');
  const [editStatus, setEditStatus] = useState('CONFIRMADO');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editReturnDate, setEditReturnDate] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<{ id?: string; recipeId: string; description?: string; quantity: number; unitPrice: number; totalPrice: number }[]>([]);
  const [editEquipments, setEditEquipments] = useState<string[]>([]);
  const [editDiscount, setEditDiscount] = useState('0');
  const [editDeliveryFee, setEditDeliveryFee] = useState('0');
  const [editCautionDeposit, setEditCautionDeposit] = useState('0');

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDoc, setPaymentDoc] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // New order modal state
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [orderItems, setOrderItems] = useState<{ recipeId: string; quantity: number; unitPrice: number }[]>([]);
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [cautionDeposit, setCautionDeposit] = useState('0');
  const [notes, setNotes] = useState('');

  // Scan delivery modal
  const [scanModalOrder, setScanModalOrder] = useState<any>(null);
  const [scanFeedback, setScanFeedback] = useState<{ text: string; isNewItem?: boolean; type: 'success' | 'error' } | null>(null);
  const [scanning, setScanning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [oRes, cRes, rRes, eRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/clients'),
        fetch('/api/recipes'),
        fetch('/api/equipment'),
      ]);

      const [oData, cData, rData, eData] = await Promise.all([
        oRes.json(),
        cRes.json(),
        rRes.json(),
        eRes.json(),
      ]);

      if (Array.isArray(oData)) setOrders(oData);
      if (Array.isArray(cData)) {
        setClients(cData);
        if (cData.length > 0 && !clientId) setClientId(cData[0].id);
      }
      if (Array.isArray(rData)) {
        setRecipes(rData);
        if (rData.length > 0 && orderItems.length === 0) {
          const defaultPrice = (rData[0].salePricePerLiter || rData[0].suggestedPricePerLiter || 20) * 50;
          setOrderItems([{ recipeId: rData[0].id, quantity: 1, unitPrice: defaultPrice }]);
        }
      }
      if (Array.isArray(eData)) setEquipment(eData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setOrderModalTab('EDIT');
    setEditClientId(order.clientId || '');
    setEditStatus(order.status || 'CONFIRMADO');
    setEditDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : '');
    setEditReturnDate(order.estimatedReturnDate ? new Date(order.estimatedReturnDate).toISOString().split('T')[0] : '');
    setEditAddress(order.deliveryAddress || '');
    setEditNotes(order.notes || '');
    setEditDiscount(String(order.discount || '0'));
    setEditDeliveryFee(String(order.deliveryFee || '0'));
    setEditCautionDeposit(String(order.cautionDeposit || '0'));

    if (order.items && order.items.length > 0) {
      setEditItems(
        order.items.map((it: any) => ({
          id: it.id,
          recipeId: it.recipeId || (recipes[0]?.id || ''),
          description: it.description,
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || 0,
          totalPrice: it.totalPrice || (it.quantity * it.unitPrice),
        }))
      );
    } else if (recipes.length > 0) {
      const defaultPrice = (recipes[0].salePricePerLiter || recipes[0].suggestedPricePerLiter || 20) * 50;
      setEditItems([{ recipeId: recipes[0].id, quantity: 1, unitPrice: defaultPrice, totalPrice: defaultPrice }]);
    }

    if (order.orderEquipments) {
      setEditEquipments(order.orderEquipments.map((oe: any) => oe.equipmentId));
    } else {
      setEditEquipments([]);
    }

    // Reset payment amount to remaining amount
    const remaining = order.remainingAmount !== undefined ? order.remainingAmount : (order.totalAmount - (order.paidAmount || 0));
    setPaymentAmount(remaining > 0 ? String(remaining) : '');
  };

  const handleAddItemRow = () => {
    if (recipes.length > 0) {
      const defaultPrice = (recipes[0].salePricePerLiter || recipes[0].suggestedPricePerLiter || 20) * 50;
      setOrderItems([...orderItems, { recipeId: recipes[0].id, quantity: 1, unitPrice: defaultPrice }]);
    }
  };

  const handleAddEditItemRow = () => {
    if (recipes.length > 0) {
      const defaultPrice = (recipes[0].salePricePerLiter || recipes[0].suggestedPricePerLiter || 20) * 50;
      setEditItems([
        ...editItems,
        {
          recipeId: recipes[0].id,
          quantity: 1,
          unitPrice: defaultPrice,
          totalPrice: defaultPrice,
        },
      ]);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          items: orderItems,
          equipmentIds: selectedEquipments,
          deliveryDate,
          deliveryFee,
          cautionDeposit,
          notes,
        }),
      });

      if (res.ok) {
        setNewModalOpen(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveOrderEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingOrder(true);
    try {
      const computedSubtotal = editItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
      const disc = parseFloat(editDiscount) || 0;
      const fee = parseFloat(editDeliveryFee) || 0;
      const caut = parseFloat(editCautionDeposit) || 0;
      const finalTotal = Math.max(0, computedSubtotal + fee + caut - disc);

      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: editClientId,
          status: editStatus,
          deliveryDate: editDeliveryDate || null,
          estimatedReturnDate: editReturnDate || null,
          deliveryAddress: editAddress,
          notes: editNotes,
          items: editItems,
          equipmentIds: editEquipments,
          subtotal: computedSubtotal,
          discount: disc,
          deliveryFee: fee,
          cautionDeposit: caut,
          totalAmount: finalTotal,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedOrder(updated);
        loadData();
        alert('Pedido atualizado com sucesso!');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao atualizar pedido');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao atualizar pedido');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Informe um valor de recebimento válido');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentMethod,
          paymentDate,
          documentNumber: paymentDoc,
          notes: paymentNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedOrder(data.order);
        setPaymentAmount('');
        setPaymentDoc('');
        setPaymentNotes('');
        loadData();
        alert(`Recebimento de ${formatCurrency(amount)} registrado com sucesso!`);
      } else {
        alert(data.error || 'Erro ao registrar pagamento');
      }
    } catch (err) {
      alert('Erro de conexão ao registrar pagamento');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleScanDelivery = async (code: string) => {
    if (!scanModalOrder || !code) return;
    setScanning(true);
    setScanFeedback(null);

    try {
      const res = await fetch(`/api/orders/${scanModalOrder.id}/scan-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao bipar item no pedido');

      setScanFeedback({
        text: data.message,
        isNewItem: data.isNewItem,
        type: 'success',
      });

      if (data.order) {
        setScanModalOrder(data.order);
        setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
      }
    } catch (err: any) {
      setScanFeedback({ text: err.message, type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.client?.name && o.client.name.toLowerCase().includes(search.toLowerCase())) ||
      (o.client?.tradeName && o.client.tradeName.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            Pedidos de Venda, Comodatos & Recebimentos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Clique no pedido para editar itens, valores, chopeiras e gerenciar recebimentos/pagamentos
          </p>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Pedido de Chopp</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nº do pedido ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-400 shadow-sm"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'CONFIRMADO', 'EM_SEPARACAO', 'EM_ROTA', 'ENTREGUE', 'CONCLUIDO'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL' ? 'Todos os Pedidos' : ORDER_STATUS_MAP[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">Carregando pedidos...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 p-8">
            Nenhum pedido encontrado.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusInfo = ORDER_STATUS_MAP[order.status] || {
              label: order.status,
              bg: 'bg-slate-100',
              color: 'text-slate-800',
            };

            const isPaid = order.paymentStatus === 'PAGO';
            const isPartial = order.paymentStatus === 'PARCIAL';

            return (
              <div
                key={order.id}
                onClick={() => openOrderDetails(order)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-amber-700 block">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isPartial
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isPaid ? 'PAGO' : isPartial ? 'PAGO PARCIAL' : 'PAGAMENTO PENDENTE'}
                        </span>
                      </div>
                      <h3 className="font-black text-slate-900 text-base mt-1 group-hover:text-amber-600 transition-colors">
                        {order.client?.tradeName || order.client?.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {order.client?.city} • {order.client?.neighborhood || ''}
                      </p>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Items Summary */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Itens do Pedido ({order.items?.length || 0}):
                    </span>
                    {order.items?.slice(0, 3).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-slate-700 font-medium">
                        <span className="truncate max-w-[200px]">{item.description}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-bold block">
                        + {order.items.length - 3} outros itens...
                      </span>
                    )}

                    {/* Comodato de Equipamentos */}
                    {order.orderEquipments?.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-orange-700 block">
                          Chopeiras em Comodato ({order.orderEquipments.length}):
                        </span>
                        {order.orderEquipments.map((oe: any) => (
                          <span key={oe.id} className="inline-block text-[10px] bg-orange-50 text-orange-800 px-2 py-0.5 rounded mr-1 mt-1 font-semibold">
                            {oe.equipment?.name} ({oe.equipment?.code})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Total & Paid Balance */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-slate-500">Valor Total:</span>
                      <span className="text-lg font-black text-slate-900">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>

                    {(order.paidAmount > 0 || order.remainingAmount > 0) && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-700 font-bold">
                          Pago: {formatCurrency(order.paidAmount || 0)}
                        </span>
                        <span className="text-rose-700 font-bold">
                          Saldo: {formatCurrency(order.remainingAmount !== undefined ? order.remainingAmount : (order.totalAmount - (order.paidAmount || 0)))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Row */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openOrderDetails(order)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Editar / Receber</span>
                  </button>

                  <button
                    onClick={() => {
                      setScanFeedback(null);
                      setScanModalOrder(order);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Bipar Entrega</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Detalhes, Edição e Recebimentos do Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  Gestão do Pedido {selectedOrder.orderNumber}
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedOrder.client?.tradeName || selectedOrder.client?.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setOrderModalTab('EDIT')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  orderModalTab === 'EDIT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>Editar Pedido & Valores</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderModalTab('PAYMENT')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  orderModalTab === 'PAYMENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Recebimentos & Pagamentos</span>
              </button>
            </div>

            {/* TAB: EDIT ORDER */}
            {orderModalTab === 'EDIT' && (
              <form onSubmit={handleSaveOrderEdits} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cliente</label>
                    <select
                      value={editClientId}
                      onChange={(e) => setEditClientId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.tradeName || c.name} ({c.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status do Pedido</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-amber-900"
                    >
                      <option value="ORCAMENTO">ORÇAMENTO</option>
                      <option value="CONFIRMADO">CONFIRMADO</option>
                      <option value="EM_SEPARACAO">EM SEPARAÇÃO</option>
                      <option value="EM_ROTA">EM ROTA DE ENTREGA</option>
                      <option value="ENTREGUE">ENTREGUE</option>
                      <option value="CONCLUIDO">CONCLUÍDO</option>
                      <option value="CANCELADO">CANCELADO</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data de Entrega</label>
                    <input
                      type="date"
                      value={editDeliveryDate}
                      onChange={(e) => setEditDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Previsão Devolução Chopeira</label>
                    <input
                      type="date"
                      value={editReturnDate}
                      onChange={(e) => setEditReturnDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950">Barris de Chopp Solicitados</span>
                    <button
                      type="button"
                      onClick={handleAddEditItemRow}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900"
                    >
                      + Adicionar Estilo
                    </button>
                  </div>

                  {editItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-purple-200">
                      <div className="col-span-5">
                        <select
                          value={item.recipeId}
                          onChange={(e) => {
                            const updated = [...editItems];
                            updated[idx].recipeId = e.target.value;
                            const r = recipes.find((rec) => rec.id === e.target.value);
                            if (r) {
                              updated[idx].unitPrice = (r.salePricePerLiter || r.suggestedPricePerLiter || 20) * 50;
                              updated[idx].totalPrice = updated[idx].quantity * updated[idx].unitPrice;
                            }
                            setEditItems(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                        >
                          {recipes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({formatCurrency(r.salePricePerLiter || r.suggestedPricePerLiter || 20)}/L)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...editItems];
                            const qty = parseInt(e.target.value, 10) || 1;
                            updated[idx].quantity = qty;
                            updated[idx].totalPrice = qty * updated[idx].unitPrice;
                            setEditItems(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-center"
                          placeholder="Qtd"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="10"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...editItems];
                            const price = parseFloat(e.target.value) || 0;
                            updated[idx].unitPrice = price;
                            updated[idx].totalPrice = updated[idx].quantity * price;
                            setEditItems(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-right text-slate-800"
                          placeholder="Preço Unit."
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <span className="font-black text-slate-900 text-xs">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                        {editItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comodato de Chopeiras */}
                <div className="p-3 bg-orange-50 rounded-2xl border border-orange-200 space-y-2">
                  <span className="font-extrabold text-orange-900 block">
                    Equipamentos em Comodato (Chopeiras / Cilindros)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {equipment.map((eq) => (
                      <label key={eq.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-orange-200 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editEquipments.includes(eq.id)}
                          onChange={(e) => {
                            if (e.target.checked) setEditEquipments([...editEquipments, eq.id]);
                            else setEditEquipments(editEquipments.filter((id) => id !== eq.id));
                          }}
                          className="rounded text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block leading-tight">{eq.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{eq.code}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Taxas e Valores */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Desconto (R$)</label>
                    <input
                      type="number"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Frete / Entrega (R$)</label>
                    <input
                      type="number"
                      value={editDeliveryFee}
                      onChange={(e) => setEditDeliveryFee(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Caução Chopeira (R$)</label>
                    <input
                      type="number"
                      value={editCautionDeposit}
                      onChange={(e) => setEditCautionDeposit(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Recalculated Total Box */}
                {(() => {
                  const subtotal = editItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
                  const disc = parseFloat(editDiscount) || 0;
                  const fee = parseFloat(editDeliveryFee) || 0;
                  const caut = parseFloat(editCautionDeposit) || 0;
                  const total = Math.max(0, subtotal + fee + caut - disc);

                  return (
                    <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Total Recalculado do Pedido:</span>
                        <span className="text-xs text-slate-300 font-medium">Subtotal {formatCurrency(subtotal)} {disc > 0 && `- Desc. ${formatCurrency(disc)}`}</span>
                      </div>
                      <span className="text-2xl font-black text-amber-400">{formatCurrency(total)}</span>
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingOrder}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                  >
                    {savingOrder ? 'Salvando...' : 'Salvar Alterações do Pedido'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB: PAYMENTS & RECEIPTS */}
            {orderModalTab === 'PAYMENT' && (
              <div className="space-y-4 text-xs">
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Total do Pedido</span>
                    <span className="text-base font-black text-slate-900">{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-700 block uppercase">Total Já Recebido</span>
                    <span className="text-base font-black text-emerald-800">{formatCurrency(selectedOrder.paidAmount || 0)}</span>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-700 block uppercase">Saldo Restante</span>
                    <span className="text-base font-black text-rose-800">
                      {formatCurrency(selectedOrder.remainingAmount !== undefined ? selectedOrder.remainingAmount : (selectedOrder.totalAmount - (selectedOrder.paidAmount || 0)))}
                    </span>
                  </div>
                </div>

                {/* Form to Record Payment */}
                <form onSubmit={handleRecordPayment} className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-black">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Registrar Novo Recebimento / Pagamento</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Valor Recebido (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-black text-slate-900 text-sm"
                        placeholder="Ex: 500.00"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800"
                      >
                        <option value="PIX">PIX</option>
                        <option value="DINHEIRO">Dinheiro</option>
                        <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                        <option value="CARTAO_DEBITO">Cartão de Débito</option>
                        <option value="BOLETO">Boleto Bancário</option>
                        <option value="TRANSFERENCIA">Transferência / TED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Data do Pagamento</label>
                      <input
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nº Comprovante / Doc</label>
                      <input
                        type="text"
                        placeholder="Ex: PIX-1238478"
                        value={paymentDoc}
                        onChange={(e) => setPaymentDoc(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Observações do Recebimento</label>
                      <input
                        type="text"
                        placeholder="Ex: Sinal de 50% pago na confirmação"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={submittingPayment}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>{submittingPayment ? 'Registrando...' : 'Confirmar Recebimento'}</span>
                    </button>
                  </div>
                </form>

                {/* Transactions History */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Histórico de Recebimentos Registrados:
                  </span>
                  {selectedOrder.transactions && selectedOrder.transactions.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {selectedOrder.transactions.map((tx: any) => (
                        <div key={tx.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900">{formatCurrency(tx.amount)}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                {tx.paymentMethod || 'PIX'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {formatDate(tx.paymentDate || tx.dueDate)}
                              </span>
                            </div>
                            {tx.description && <p className="text-[11px] text-slate-500 mt-0.5">{tx.description}</p>}
                          </div>
                          <span className="text-xs font-bold text-emerald-700">PAGO</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl text-center">
                      Nenhum recebimento registrado para este pedido ainda.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Bipar Entrega do Pedido */}
      {scanModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  Conferência & Bipagem de Entrega
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Pedido {scanModalOrder.orderNumber} • {scanModalOrder.client?.tradeName || scanModalOrder.client?.name}
                </h3>
              </div>
              <button
                onClick={() => setScanModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Scanner da Câmera */}
            <BarcodeScanner onScan={handleScanDelivery} isProcessing={scanning} />

            {/* Feedback Message */}
            {scanFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  scanFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {scanFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{scanFeedback.text}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setScanModalOrder(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Concluir Bipagem do Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Pedido */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-1">Novo Pedido de Chopp</h3>
            <p className="text-xs text-slate-500 mb-4">Selecione o cliente, barris de chopp e chopeiras em comodato</p>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.tradeName || c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Itens */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-purple-900">Barris de Chopp Solicitados</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900"
                  >
                    + Adicionar Estilo
                  </button>
                </div>

                {orderItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-purple-200">
                    <div className="col-span-6">
                      <select
                        value={item.recipeId}
                        onChange={(e) => {
                          const newItems = [...orderItems];
                          newItems[idx].recipeId = e.target.value;
                          const r = recipes.find((rec) => rec.id === e.target.value);
                          if (r) newItems[idx].unitPrice = (r.salePricePerLiter || r.suggestedPricePerLiter || 20) * 50;
                          setOrderItems(newItems);
                        }}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md font-bold"
                      >
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({formatCurrency(r.salePricePerLiter || r.suggestedPricePerLiter || 20)}/L)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...orderItems];
                          newItems[idx].quantity = parseInt(e.target.value, 10) || 1;
                          setOrderItems(newItems);
                        }}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md font-bold text-center"
                        placeholder="Qtd Barris"
                      />
                    </div>

                    <div className="col-span-3 font-black text-right pr-1 text-slate-900">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comodato de Chopeiras */}
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 space-y-2">
                <span className="font-extrabold text-orange-900 block">
                  Equipamentos em Comodato (Chopeiras / CO2)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {equipment.map((eq) => (
                    <label key={eq.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-orange-200 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEquipments.includes(eq.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEquipments([...selectedEquipments, eq.id]);
                          else setSelectedEquipments(selectedEquipments.filter((id) => id !== eq.id));
                        }}
                        className="rounded text-orange-600 focus:ring-orange-500"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block leading-tight">{eq.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{eq.code}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Gerar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
