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
} from 'lucide-react';
import { formatCurrency, formatDateShort, ORDER_STATUS_MAP } from '@/lib/utils';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';

export default function PedidosPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New order modal state
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [orderItems, setOrderItems] = useState<{ recipeId: string; quantity: number; unitPrice: number }[]>([]);
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
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
          setOrderItems([{ recipeId: rData[0].id, quantity: 1, unitPrice: (rData[0].suggestedPricePerLiter || 20) * 50 }]);
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

  const handleAddItemRow = () => {
    if (recipes.length > 0) {
      setOrderItems([...orderItems, { recipeId: recipes[0].id, quantity: 1, unitPrice: (recipes[0].suggestedPricePerLiter || 20) * 50 }]);
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
        // Atualizar lista principal
        setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
      }
    } catch (err: any) {
      setScanFeedback({ text: err.message, type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            Pedidos de Venda, Comodatos & Entregas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Emissão de pedidos, comodato automático e bipagem de entrega com recálculo inteligente
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

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">Carregando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">Nenhum pedido cadastrado.</div>
        ) : (
          orders.map((order) => {
            const statusInfo = ORDER_STATUS_MAP[order.status] || {
              label: order.status,
              bg: 'bg-slate-100',
              color: 'text-slate-800',
            };

            return (
              <div
                key={order.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-amber-700 block">
                        {order.orderNumber}
                      </span>
                      <h3 className="font-black text-slate-900 text-base mt-0.5">
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

                  {/* Items do Pedido */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Itens do Pedido ({order.items?.length || 0}):
                    </span>
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-slate-700 font-medium">
                        <span className="truncate max-w-[200px]">{item.description}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    ))}

                    {/* Comodatos de Equipamentos */}
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

                  {/* Total Amount */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-slate-500">Valor Total:</span>
                    <span className="text-xl font-black text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Ação: Bipar Entrega no Cliente */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formatDateShort(order.createdAt)}
                  </span>

                  <button
                    onClick={() => {
                      setScanFeedback(null);
                      setScanModalOrder(order);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Bipar Entrega</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Bipar Entrega do Pedido com Recálculo Automático */}
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

            {/* Alerta de Bipagem Inteligente */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Bipagem Inteligente Ativa:</strong> Se você bipar um barril que não estava no pedido, ele será incluído e o valor total recalculado na hora!
              </span>
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

            {/* Resumo Atualizado do Pedido */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Itens Conferidos / Entregues:</span>
                <span className="text-slate-900 font-black">{scanModalOrder.items?.length || 0} itens</span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {scanModalOrder.items?.map((it: any) => (
                  <div key={it.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">{it.description}</span>
                      {it.keg && (
                        <span className="text-[10px] text-amber-700 font-mono font-bold">
                          Barril: {it.keg.code} ({it.keg.status})
                        </span>
                      )}
                    </div>
                    <span className="font-black text-slate-900">{formatCurrency(it.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                <span className="font-bold text-slate-600">Total Recalculado:</span>
                <span className="text-xl font-black text-emerald-600">
                  {formatCurrency(scanModalOrder.totalAmount)}
                </span>
              </div>
            </div>

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
                          if (r) newItems[idx].unitPrice = (r.suggestedPricePerLiter || 20) * 50;
                          setOrderItems(newItems);
                        }}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md font-bold"
                      >
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} (R$ {r.suggestedPricePerLiter}/L)
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
