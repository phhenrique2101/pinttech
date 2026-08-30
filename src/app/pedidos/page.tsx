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
  MapPin,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  Printer,
  Eye,
  ArrowRight,
  Share2,
  PackageCheck,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Download,
  RefreshCw,
  List,
  LayoutGrid,
  CalendarDays,
} from 'lucide-react';
import { formatCurrency, formatDateShort, formatDate, ORDER_STATUS_MAP, EQUIPMENT_TYPE_MAP } from '@/lib/utils';
import { exportJsonToExcel } from '@/lib/exportUtils';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';

export default function PedidosPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [kegs, setKegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Selected order modal for details / edit / payment
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderModalTab, setOrderModalTab] = useState<'DETAILS' | 'EDIT' | 'PAYMENT'>('DETAILS');
  const [savingOrder, setSavingOrder] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Edit Order Form State
  const [editClientId, setEditClientId] = useState('');
  const [editStatus, setEditStatus] = useState('CONFIRMADO');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editReturnDate, setEditReturnDate] = useState('');
  const [editActualReturnDate, setEditActualReturnDate] = useState('');
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
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [editClientSearchQuery, setEditClientSearchQuery] = useState('');
  const [editClientDropdownOpen, setEditClientDropdownOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<{ recipeId: string; quantity: number; unitPrice: number; kegCapacity?: number }[]>([]);
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedReturnDate, setEstimatedReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [cautionDeposit, setCautionDeposit] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');

  // Scan delivery modal
  const [scanModalOrder, setScanModalOrder] = useState<any>(null);
  const [scanFeedback, setScanFeedback] = useState<{ text: string; isNewItem?: boolean; type: 'success' | 'error' } | null>(null);
  const [scanning, setScanning] = useState(false);

  // Reservation Conflict Modal
  const [reservationConflictModal, setReservationConflictModal] = useState<{
    equipment: any;
    conflictOrder: any;
    targetMode: 'NEW' | 'EDIT';
  } | null>(null);

  // Keg Return / Recolha modal in order
  const [returnKegModal, setReturnKegModal] = useState<{
    keg: any;
    order: any;
    condition: 'VAZIO_SUJO' | 'PARCIALMENTE_CHEIO' | 'CHEIO_RETORNADO';
    returnVolumeLiters: string;
    billingMode: 'FULL' | 'PARTIAL';
  } | null>(null);
  const [processingReturn, setProcessingReturn] = useState(false);

  const handleConfirmKegReturn = async () => {
    if (!returnKegModal) return;
    setProcessingReturn(true);
    try {
      const res = await fetch('/api/kegs/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: returnKegModal.keg.code,
          action: 'RETURN',
          returnCondition: returnKegModal.condition,
          returnVolumeLiters: parseFloat(returnKegModal.returnVolumeLiters || '0'),
          billingMode: returnKegModal.billingMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar retorno do barril');
      alert(data.message || 'Retorno registrado com sucesso!');
      setReturnKegModal(null);
      loadData();
      if (selectedOrder) {
        const updatedRes = await fetch('/api/orders');
        const updatedOrders = await updatedRes.json();
        const found = (updatedOrders || []).find((o: any) => o.id === selectedOrder.id);
        if (found) setSelectedOrder(found);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar retorno');
    } finally {
      setProcessingReturn(false);
    }
  };

  const getStockAvailability = (recipeId: string, capacity: number, editingOrderId?: string) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return { available: 0, matchingTotal: 0, reserved: 0, reservedOrders: [], recipeName: 'Chopp' };

    // Find filled kegs in stock matching this recipe and capacity
    const matchingKegs = kegs.filter(
      (k) =>
        (k.status === 'EM_ESTOQUE' || k.status === 'ENVASADO') &&
        k.capacity === capacity &&
        (k.currentBatch?.recipeId === recipeId ||
          (k.currentBeerName && k.currentBeerName.toLowerCase() === recipe.name.toLowerCase()))
    );

    // Calculate quantity already committed in active unfulfilled orders
    let reservedCount = 0;
    const reservedOrders: { orderNumber: string; clientName: string; quantity: number; deliveryDate?: string }[] = [];

    orders.forEach((o) => {
      if (o.id !== editingOrderId && ['ORCAMENTO', 'CONFIRMADO', 'EM_SEPARACAO'].includes(o.status)) {
        let qtyInOrder = 0;
        (o.items || []).forEach((it: any) => {
          if (it.recipeId === recipeId && (it.kegCapacity || 50) === capacity) {
            qtyInOrder += (it.quantity || 1);
          }
        });
        if (qtyInOrder > 0) {
          reservedCount += qtyInOrder;
          reservedOrders.push({
            orderNumber: o.orderNumber,
            clientName: o.client?.tradeName || o.client?.name || 'Cliente',
            quantity: qtyInOrder,
            deliveryDate: o.deliveryDate,
          });
        }
      }
    });

    const available = Math.max(0, matchingKegs.length - reservedCount);
    return {
      available,
      matchingTotal: matchingKegs.length,
      reserved: reservedCount,
      reservedOrders,
      recipeName: recipe.name,
    };
  };

  const getEquipmentReservationConflict = (equipmentId: string, currentOrderId?: string) => {
    return orders.find(
      (o) =>
        o.id !== currentOrderId &&
        o.status !== 'CANCELADO' &&
        o.status !== 'CONCLUIDO' &&
        o.orderEquipments?.some((oe: any) => oe.equipmentId === equipmentId && !oe.returned)
    );
  };

  const handleToggleNewOrderEquipment = (eq: any) => {
    if (selectedEquipments.includes(eq.id)) {
      setSelectedEquipments(selectedEquipments.filter((id) => id !== eq.id));
      return;
    }
    const conflict = getEquipmentReservationConflict(eq.id);
    if (conflict) {
      setReservationConflictModal({
        equipment: eq,
        conflictOrder: conflict,
        targetMode: 'NEW',
      });
      return;
    }
    setSelectedEquipments([...selectedEquipments, eq.id]);
  };

  const handleToggleEditOrderEquipment = (eq: any) => {
    if (editEquipments.includes(eq.id)) {
      setEditEquipments(editEquipments.filter((id) => id !== eq.id));
      return;
    }
    const conflict = getEquipmentReservationConflict(eq.id, selectedOrder?.id);
    if (conflict) {
      setReservationConflictModal({
        equipment: eq,
        conflictOrder: conflict,
        targetMode: 'EDIT',
      });
      return;
    }
    setEditEquipments([...editEquipments, eq.id]);
  };

  const handleConfirmTransferReservation = () => {
    if (!reservationConflictModal) return;
    const { equipment: eq, conflictOrder, targetMode } = reservationConflictModal;

    if (targetMode === 'NEW') {
      setSelectedEquipments((prev) => (prev.includes(eq.id) ? prev : [...prev, eq.id]));
    } else {
      setEditEquipments((prev) => (prev.includes(eq.id) ? prev : [...prev, eq.id]));
    }

    // Release from local conflictOrder in orders state
    setOrders((prev) =>
      prev.map((o) =>
        o.id === conflictOrder.id
          ? {
              ...o,
              orderEquipments: (o.orderEquipments || []).filter(
                (oe: any) => oe.equipmentId !== eq.id
              ),
            }
          : o
      )
    );

    setReservationConflictModal(null);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [oRes, cRes, rRes, eRes, kRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/clients'),
        fetch('/api/recipes'),
        fetch('/api/equipment'),
        fetch('/api/kegs'),
      ]);

      const [oData, cData, rData, eData, kData] = await Promise.all([
        oRes.json(),
        cRes.json(),
        rRes.json(),
        eRes.json(),
        kRes.json(),
      ]);

      if (Array.isArray(oData)) setOrders(oData);
      if (Array.isArray(cData)) {
        setClients(cData);
        if (cData.length > 0 && !clientId) {
          setClientId(cData[0].id);
          const c = cData[0];
          const fullAddr = [c.address, c.number, c.complement, c.neighborhood, c.city, c.state]
            .filter(Boolean)
            .join(', ');
          setDeliveryAddress(fullAddr || '');
        }
      }
      if (Array.isArray(rData)) {
        setRecipes(rData);
        if (rData.length > 0 && orderItems.length === 0) {
          const defaultPrice = (rData[0].salePricePerLiter || rData[0].suggestedPricePerLiter || 20) * 50;
          setOrderItems([{ recipeId: rData[0].id, quantity: 1, unitPrice: defaultPrice, kegCapacity: 50 }]);
        }
      }
      if (Array.isArray(eData)) setEquipment(eData);
      if (Array.isArray(kData)) setKegs(kData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClientSelectForNewOrder = (selectedId: string) => {
    setClientId(selectedId);
    const client = clients.find((c) => c.id === selectedId);
    if (client) {
      const fullAddr = [
        client.address ? `${client.address}${client.number ? `, ${client.number}` : ''}` : '',
        client.complement ? `(${client.complement})` : '',
        client.neighborhood,
        client.city ? `${client.city} - ${client.state || ''}` : '',
        client.zipCode ? `CEP: ${client.zipCode}` : '',
      ]
        .filter(Boolean)
        .join(', ');
      setDeliveryAddress(fullAddr);
    }
  };

  const openOrderDetails = (order: any, tab: 'DETAILS' | 'EDIT' | 'PAYMENT' = 'DETAILS') => {
    setSelectedOrder(order);
    setOrderModalTab(tab);
    setCopiedAddress(false);
    setEditClientId(order.clientId || '');
    setEditClientSearchQuery(order.client?.tradeName || order.client?.name || '');
    setEditClientDropdownOpen(false);
    setEditStatus(order.status || 'CONFIRMADO');
    setEditDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : '');
    setEditReturnDate(order.estimatedReturnDate ? new Date(order.estimatedReturnDate).toISOString().split('T')[0] : '');
    setEditActualReturnDate(order.actualReturnDate ? new Date(order.actualReturnDate).toISOString().split('T')[0] : '');
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

  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updated);
        }
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyAddressToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  const handleAddItemRow = () => {
    if (recipes.length > 0) {
      const defaultPrice = (recipes[0].salePricePerLiter || recipes[0].suggestedPricePerLiter || 20) * 50;
      setOrderItems([...orderItems, { recipeId: recipes[0].id, quantity: 1, unitPrice: defaultPrice, kegCapacity: 50 }]);
    }
  };

  const handleRemoveItemRow = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    } else if (recipes.length > 0) {
      const defaultPrice = (recipes[0].salePricePerLiter || recipes[0].suggestedPricePerLiter || 20) * 50;
      setOrderItems([{ recipeId: recipes[0].id, quantity: 1, unitPrice: defaultPrice, kegCapacity: 50 }]);
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

  const handleRemoveEditItemRow = (index: number) => {
    if (editItems.length > 1) {
      setEditItems(editItems.filter((_, i) => i !== index));
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) {
      alert('Por favor, selecione ou busque um cliente para o pedido.');
      return;
    }

    if (orderItems.length === 0) {
      alert('Adicione pelo menos um item ao pedido.');
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          items: orderItems,
          equipmentIds: selectedEquipments,
          deliveryDate,
          estimatedReturnDate,
          deliveryAddress,
          deliveryFee,
          cautionDeposit,
          discount,
          notes,
        }),
      });

      if (res.ok) {
        setNewModalOpen(false);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao criar pedido');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveOrderEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    // Verify stock availability
    for (const it of editItems) {
      const stock = getStockAvailability(it.recipeId, 50, selectedOrder.id);
      if (it.quantity > stock.available) {
        alert(
          `⛔ Estoque Insuficiente!\n\nO estilo "${stock.recipeName}" possui apenas ${stock.available} barril(is) disponível(is) na câmara fria (Solicitado: ${it.quantity}).`
        );
        return;
      }
    }

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
          actualReturnDate: editActualReturnDate || null,
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
        setOrderModalTab('DETAILS');
        loadData();
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
        if (selectedOrder && selectedOrder.id === data.order.id) {
          setSelectedOrder(data.order);
        }
        setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
      }
    } catch (err: any) {
      setScanFeedback({ text: err.message, type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  // Compute Today's Deliveries statistics
  const todayDateStr = new Date().toISOString().slice(0, 10);
  
  const todayDeliveries = orders.filter((o) => {
    if (!o.deliveryDate) return false;
    const dStr = new Date(o.deliveryDate).toISOString().slice(0, 10);
    return dStr === todayDateStr;
  });

  const todayPendingDeliveries = todayDeliveries.filter((o) => o.status !== 'ENTREGUE' && o.status !== 'CONCLUIDO' && o.status !== 'CANCELADO');
  const todayCompletedDeliveries = todayDeliveries.filter((o) => o.status === 'ENTREGUE' || o.status === 'CONCLUIDO');
  const todayTotalLiters = todayDeliveries.reduce((acc, o) => {
    return acc + (o.items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1) * (it.kegCapacity || 50), 0);
  }, 0);
  const todayTotalKegs = todayDeliveries.reduce((acc, o) => {
    return acc + (o.items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
  }, 0);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.client?.name && o.client.name.toLowerCase().includes(search.toLowerCase())) ||
      (o.client?.tradeName && o.client.tradeName.toLowerCase().includes(search.toLowerCase())) ||
      (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(search.toLowerCase()));
    
    let matchesStatus = true;
    if (statusFilter === 'TODAY') {
      if (!o.deliveryDate) matchesStatus = false;
      else {
        const dStr = new Date(o.deliveryDate).toISOString().slice(0, 10);
        matchesStatus = dStr === todayDateStr;
      }
    } else if (statusFilter === 'OPEN') {
      matchesStatus = o.status === 'CONFIRMADO' || o.status === 'EM_SEPARACAO' || o.status === 'EM_ROTA';
    } else if (statusFilter !== 'ALL') {
      matchesStatus = o.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            Pedidos & Entregas de Chopp
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie pedidos, rotas de entrega e comodatos. Clique em qualquer pedido para ver a ficha completa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternar Visualização Cards / Tabela */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('GRID')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
          </div>

          <button
            onClick={() => {
              const rows = filteredOrders.map((o) => ({
                'Nº Pedido': `#${o.orderNumber}`,
                'Data Pedido': formatDate(o.createdAt),
                'Data Entrega': o.deliveryDate ? formatDate(o.deliveryDate) : '—',
                'Cliente': o.client?.tradeName || o.client?.name || '—',
                'Cidade': o.client?.city || '—',
                'Telefone': o.client?.phone || '—',
                'Chopp / Itens': (o.items || []).map((i: any) => `${i.quantity}x ${i.recipe?.name || i.description || 'Barril'} (${i.kegCapacity || 50}L)`).join(', '),
                'Litros Totais': (o.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 1) * (it.kegCapacity || 50), 0),
                'Valor Total (R$)': o.totalAmount,
                'Valor Pago (R$)': o.paidAmount || 0,
                'Saldo Restante (R$)': Math.max(0, o.totalAmount - (o.paidAmount || 0)),
                'Status': o.status,
              }));
              exportJsonToExcel(rows, `Pedidos_PintTech_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Pedidos');
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-xs"
            title="Exportar pedidos filtrados para Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Exportar</span>
          </button>

          <button
            onClick={() => {
              setClientSearchQuery('');
              setClientDropdownOpen(false);
              if (recipes.length > 0 && orderItems.length === 0) {
                const defaultPrice = (recipes[0].salePricePerLiter || recipes[0].suggestedPricePerLiter || 20) * 50;
                setOrderItems([{ recipeId: recipes[0].id, quantity: 1, unitPrice: defaultPrice, kegCapacity: 50 }]);
              }
              setNewModalOpen(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Pedido</span>
          </button>
        </div>
      </div>

      {/* Painel Destaque: Entregas do Dia */}
      {todayDeliveries.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 p-4 rounded-2xl border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900">
                  Entregas de Hoje ({todayDeliveries.length})
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                  {todayPendingDeliveries.length} pendentes • {todayCompletedDeliveries.length} entregues
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Volume total do dia: <strong className="text-slate-900">{todayTotalLiters}L</strong> ({todayTotalKegs} barris) • Faturamento: <strong className="text-slate-900">{formatCurrency(todayDeliveries.reduce((acc, o) => acc + (o.totalAmount || 0), 0))}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setStatusFilter(statusFilter === 'TODAY' ? 'ALL' : 'TODAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'TODAY'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-300'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{statusFilter === 'TODAY' ? 'Mostrando Entregas de Hoje ✓' : 'Ver Entregas de Hoje'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Filtros Rápidos & Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nº, cliente, bairro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos ({orders.length})
          </button>
          
          <button
            onClick={() => setStatusFilter('TODAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'TODAY'
                ? 'bg-amber-500 text-white shadow-xs font-black'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <CalendarDays className="w-3 h-3" />
            <span>Hoje ({todayDeliveries.length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('OPEN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'OPEN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Em Aberto ({orders.filter(o => o.status === 'CONFIRMADO' || o.status === 'EM_SEPARACAO' || o.status === 'EM_ROTA').length})
          </button>

          <button
            onClick={() => setStatusFilter('EM_ROTA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'EM_ROTA'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Em Rota ({orders.filter(o => o.status === 'EM_ROTA').length})
          </button>

          <button
            onClick={() => setStatusFilter('ENTREGUE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'ENTREGUE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Entregues ({orders.filter(o => o.status === 'ENTREGUE' || o.status === 'CONCLUIDO').length})
          </button>
        </div>
      </div>

      {/* Orders View: CARDS COMPACTOS OU TABELA */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Carregando pedidos...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          Nenhum pedido encontrado com os filtros selecionados.
        </div>
      ) : viewMode === 'GRID' ? (
        /* VISUALIZAÇÃO EM CARDS COMPACTOS & DIRETOS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredOrders.map((order) => {
            const statusInfo = ORDER_STATUS_MAP[order.status] || {
              label: order.status,
              bg: 'bg-slate-100',
              color: 'text-slate-800',
            };

            const isPaid = order.paymentStatus === 'PAGO';
            const isPartial = order.paymentStatus === 'PARCIAL';
            const totalKegs = order.items?.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) || 0;
            const totalLiters = order.items?.reduce((acc: number, it: any) => acc + (it.quantity || 1) * (it.kegCapacity || 50), 0) || 0;

            const isOrderToday = order.deliveryDate && new Date(order.deliveryDate).toISOString().slice(0, 10) === todayDateStr;

            return (
              <div
                key={order.id}
                onClick={() => openOrderDetails(order, 'DETAILS')}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group shadow-xs space-y-3"
              >
                {/* Linha 1: Cabeçalho com Nº Pedido, Cliente e Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-amber-700">
                          #{order.orderNumber}
                        </span>
                        {isOrderToday && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white">
                            HOJE ⚡
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartial
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'PAGO' : isPartial ? 'PARCIAL' : 'PENDENTE'}
                        </span>
                      </div>
                      <h3 className="font-black text-slate-900 text-sm mt-0.5 truncate group-hover:text-amber-600 transition-colors">
                        {order.client?.tradeName || order.client?.name}
                      </h3>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex-shrink-0 ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Linha 2: Resumo do Chopp / Itens e Comodatos */}
                  <div className="mt-2.5 bg-slate-50 p-2 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="truncate max-w-[200px] flex items-center gap-1">
                        🍺 {(order.items || []).map((i: any) => `${i.quantity}x ${i.description}`).join(', ') || 'Chopp'}
                      </span>
                      <span className="text-[11px] text-amber-800 font-extrabold flex-shrink-0">
                        {totalLiters > 0 ? `${totalLiters}L` : `${totalKegs} barris`}
                      </span>
                    </div>

                    {order.orderEquipments?.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-orange-800 font-semibold pt-0.5">
                        <Wrench className="w-3 h-3 text-orange-600 flex-shrink-0" />
                        <span className="truncate">
                          Comodato: {order.orderEquipments.map((oe: any) => oe.equipment?.name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Linha 3: Endereço & Data de Entrega */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1 truncate max-w-[170px]" title={order.deliveryAddress}>
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{order.deliveryAddress || order.client?.neighborhood || order.client?.city || 'Sem endereço'}</span>
                    </span>

                    <span className="flex items-center gap-1 flex-shrink-0 font-bold text-slate-700">
                      <Calendar className="w-3 h-3 text-amber-600" />
                      {order.deliveryDate ? formatDateShort(order.deliveryDate) : 'Imediata'}
                    </span>
                  </div>
                </div>

                {/* Linha 4: Rodapé com Valor e Ações */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <span className="text-sm font-black text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    {!isPaid && (
                      <span className="text-[10px] text-rose-600 font-bold block">
                        Saldo: {formatCurrency(Math.max(0, order.totalAmount - (order.paidAmount || 0)))}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openOrderDetails(order, 'DETAILS')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                      title="Ver Ficha Completa do Pedido"
                    >
                      <Eye className="w-3 h-3 text-amber-600" />
                      <span>Detalhes</span>
                    </button>

                    <button
                      onClick={() => openOrderDetails(order, 'PAYMENT')}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-0.5"
                      title="Receber Pagamento"
                    >
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      <span>Receber</span>
                    </button>

                    <button
                      onClick={() => {
                        setScanFeedback(null);
                        setScanModalOrder(order);
                      }}
                      className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                      title="Bipar / Conferir Barris"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM TABELA COMPACTA */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Chopp / Itens</th>
                  <th className="py-3 px-4">Entrega</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredOrders.map((order) => {
                  const statusInfo = ORDER_STATUS_MAP[order.status] || {
                    label: order.status,
                    bg: 'bg-slate-100',
                    color: 'text-slate-800',
                  };
                  const isPaid = order.paymentStatus === 'PAGO';
                  const isPartial = order.paymentStatus === 'PARCIAL';
                  const totalLiters = order.items?.reduce((acc: number, it: any) => acc + (it.quantity || 1) * (it.kegCapacity || 50), 0) || 0;
                  const isOrderToday = order.deliveryDate && new Date(order.deliveryDate).toISOString().slice(0, 10) === todayDateStr;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => openOrderDetails(order, 'DETAILS')}
                      className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-amber-700">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {order.client?.tradeName || order.client?.name}
                        {order.deliveryAddress && (
                          <span className="text-[10px] text-slate-400 block font-normal truncate max-w-[160px]">
                            {order.deliveryAddress}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          {(order.items || []).map((i: any) => `${i.quantity}x ${i.description}`).join(', ') || 'Chopp'}
                        </span>
                        {totalLiters > 0 && (
                          <span className="text-[10px] text-amber-700 font-bold block">
                            {totalLiters}L totais
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isOrderToday ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white">
                            Hoje ⚡
                          </span>
                        ) : (
                          <span className="font-bold text-slate-700">
                            {order.deliveryDate ? formatDateShort(order.deliveryDate) : 'Imediata'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${statusInfo.bg} ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartial
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'PAGO' : isPartial ? 'PARCIAL' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openOrderDetails(order, 'DETAILS')}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openOrderDetails(order, 'PAYMENT')}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Receber Pagamento"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setScanFeedback(null);
                              setScanModalOrder(order);
                            }}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Bipar"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Detalhes Completos, Edição e Recebimentos do Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            {/* Header with Title and Quick Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {selectedOrder.orderNumber}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Emissão: {formatDate(selectedOrder.createdAt)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      selectedOrder.paymentStatus === 'PAGO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedOrder.paymentStatus === 'PARCIAL'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedOrder.paymentStatus === 'PAGO' ? 'PAGO' : selectedOrder.paymentStatus === 'PARCIAL' ? 'PAGAMENTO PARCIAL' : 'PAGAMENTO PENDENTE'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {selectedOrder.client?.tradeName || selectedOrder.client?.name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleQuickStatusChange(selectedOrder.id, e.target.value)}
                  className="text-xs font-black px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-900 focus:outline-none"
                >
                  <option value="ORCAMENTO">ORÇAMENTO</option>
                  <option value="CONFIRMADO">CONFIRMADO</option>
                  <option value="EM_SEPARACAO">EM SEPARAÇÃO</option>
                  <option value="EM_ROTA">EM ROTA DE ENTREGA</option>
                  <option value="ENTREGUE">ENTREGUE</option>
                  <option value="CONCLUIDO">CONCLUÍDO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setOrderModalTab('DETAILS')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  orderModalTab === 'DETAILS' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Detalhes & Visão Geral</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderModalTab('EDIT')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  orderModalTab === 'EDIT' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>Editar Pedido</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderModalTab('PAYMENT')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  orderModalTab === 'PAYMENT' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Recebimentos & Pagamentos</span>
              </button>
            </div>

            {/* TAB 1: VISÃO GERAL & DETALHES COMPLETOS */}
            {orderModalTab === 'DETAILS' && (
              <div className="space-y-4 text-xs">
                {/* 1. Endereços de Entrega e Retirada */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-950 flex items-center gap-1.5 text-sm">
                      <Truck className="w-4 h-4 text-amber-600" />
                      Logística de Entrega & Retirada
                    </span>
                    {copiedAddress && (
                      <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full animate-in fade-in">
                        ✓ Endereço copiado!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Endereço de Entrega */}
                    <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-600" /> Endereço de Entrega:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const addr = selectedOrder.deliveryAddress || `${selectedOrder.client?.address || ''}, ${selectedOrder.client?.number || ''}, ${selectedOrder.client?.city || ''}`;
                              copyAddressToClipboard(addr);
                            }}
                            className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                            title="Copiar Endereço"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.deliveryAddress || `${selectedOrder.client?.address || ''}, ${selectedOrder.client?.city || ''}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="Abrir no Google Maps / Waze"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      <p className="font-extrabold text-slate-900 text-xs leading-relaxed">
                        {selectedOrder.deliveryAddress || (
                          `${selectedOrder.client?.address || 'Sem rua cadastrada'}${selectedOrder.client?.number ? `, ${selectedOrder.client?.number}` : ''}${selectedOrder.client?.complement ? ` (${selectedOrder.client?.complement})` : ''} - ${selectedOrder.client?.neighborhood || ''}, ${selectedOrder.client?.city || ''} - ${selectedOrder.client?.state || ''} ${selectedOrder.client?.zipCode ? `• CEP: ${selectedOrder.client?.zipCode}` : ''}`
                        )}
                      </p>
                    </div>

                    {/* Endereço de Retirada / Recolha */}
                    <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-sm space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-600" /> Ponto de Retirada / Devolução de Vasilhames:
                      </span>
                      <p className="font-extrabold text-slate-800 text-xs leading-relaxed">
                        {selectedOrder.brewery?.address
                          ? `${selectedOrder.brewery.name} — ${selectedOrder.brewery.address}, ${selectedOrder.brewery.city || ''}/${selectedOrder.brewery.state || ''}`
                          : 'Pátio Central da Cervejaria (Devolução dos barris vazios e chopeiras comodatadas)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Datas e Cronograma */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Data do Pedido</span>
                    <span className="font-extrabold text-slate-800 text-xs mt-0.5 block">
                      {formatDate(selectedOrder.createdAt)}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-[10px] font-bold text-amber-800 block uppercase">Data de Entrega</span>
                    <span className="font-black text-amber-950 text-xs mt-0.5 block">
                      {selectedOrder.deliveryDate ? formatDate(selectedOrder.deliveryDate) : 'A Definir'}
                    </span>
                  </div>

                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <span className="text-[10px] font-bold text-orange-800 block uppercase">Previsão Recolha</span>
                    <span className="font-black text-orange-950 text-xs mt-0.5 block">
                      {selectedOrder.estimatedReturnDate ? formatDateShort(selectedOrder.estimatedReturnDate) : 'Não agendada'}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-800 block uppercase">Retorno Efetivo</span>
                    <span className="font-black text-emerald-950 text-xs mt-0.5 block">
                      {selectedOrder.actualReturnDate ? formatDate(selectedOrder.actualReturnDate) : (selectedOrder.status === 'CONCLUIDO' ? 'Finalizado' : 'Pendente')}
                    </span>
                  </div>
                </div>

                {/* 3. Dados do Cliente */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Dados do Cliente / Contratante:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Razão Social / Nome:</span>
                      <span className="font-extrabold text-slate-900 text-xs">{selectedOrder.client?.name}</span>
                      {selectedOrder.client?.tradeName && (
                        <span className="text-[11px] text-slate-500 block font-medium">({selectedOrder.client.tradeName})</span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Documento (CNPJ/CPF):</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {selectedOrder.client?.document || 'Não informado'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Contato & WhatsApp:</span>
                      {selectedOrder.client?.phone ? (
                        <a
                          href={`https://wa.me/55${selectedOrder.client.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 text-xs"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{selectedOrder.client.phone} (WhatsApp)</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">Não cadastrado</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Itens e Chopp Solicitados */}
                <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 flex items-center gap-1.5 text-xs">
                      <Cylinder className="w-4 h-4 text-purple-600" />
                      Barris de Chopp Solicitados ({selectedOrder.items?.length || 0})
                    </span>
                    <span className="text-[11px] font-bold text-purple-700">
                      Total: {formatCurrency(selectedOrder.subtotal || selectedOrder.items?.reduce((a: number, b: any) => a + (b.totalPrice || 0), 0) || 0)}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse bg-white rounded-xl overflow-hidden border border-purple-200">
                      <thead>
                        <tr className="bg-purple-100/70 text-[10px] font-black uppercase text-purple-900">
                          <th className="p-2.5 pl-3">Estilo / Chopp</th>
                          <th className="p-2.5 text-center">Qtd Barris</th>
                          <th className="p-2.5 text-right">Preço Unit.</th>
                          <th className="p-2.5 text-right pr-3">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100 text-xs">
                        {selectedOrder.items?.map((it: any) => (
                          <tr key={it.id} className="hover:bg-purple-50/50">
                            <td className="p-2.5 pl-3">
                              <span className="font-extrabold text-slate-900 block">{it.description}</span>
                              {it.recipe && (
                                <span className="text-[10px] text-purple-700 font-semibold">
                                  {it.recipe.style} • {it.recipe.abv}% ABV • {it.recipe.ibu} IBU
                                </span>
                              )}
                              {it.keg && (
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                                    Barril Físico: {it.keg.code} ({it.keg.capacity}L)
                                  </span>
                                  {['EM_ROTA', 'ENTREGUE'].includes(selectedOrder.status) && (
                                    <button
                                      type="button"
                                      onClick={() => setReturnKegModal({
                                        keg: it.keg,
                                        order: selectedOrder,
                                        condition: 'VAZIO_SUJO',
                                        returnVolumeLiters: '15',
                                        billingMode: 'FULL',
                                      })}
                                      className="text-[10px] font-bold text-orange-800 hover:text-orange-950 bg-orange-100/80 hover:bg-orange-200 px-2 py-0.5 rounded-md border border-orange-300 transition-colors flex items-center gap-1 shadow-2xs"
                                      title="Dar baixa e recolher barril"
                                    >
                                      <RefreshCw className="w-2.5 h-2.5" />
                                      <span>Registrar Retorno</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-black text-slate-800">{it.quantity}</td>
                            <td className="p-2.5 text-right font-medium text-slate-600">{formatCurrency(it.unitPrice)}</td>
                            <td className="p-2.5 text-right pr-3 font-black text-slate-900">{formatCurrency(it.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Equipamentos em Comodato */}
                {selectedOrder.orderEquipments?.length > 0 && (
                  <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-2">
                    <span className="font-black text-orange-950 flex items-center gap-1.5 text-xs">
                      <Wrench className="w-4 h-4 text-orange-600" />
                      Chopeiras & Equipamentos em Comodato ({selectedOrder.orderEquipments.length})
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedOrder.orderEquipments.map((oe: any) => (
                        <div key={oe.id} className="p-2.5 bg-white rounded-xl border border-orange-200 flex items-center justify-between shadow-sm">
                          <div>
                            <span className="font-black text-slate-900 text-xs block">{oe.equipment?.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Código: {oe.equipment?.code} {oe.equipment?.voltage ? `• ${oe.equipment.voltage}` : ''} {oe.equipment?.serialNumber ? `• Nº Série: ${oe.equipment.serialNumber}` : ''}
                            </span>
                            {oe.conditionNotes && (
                              <p className="text-[10px] text-orange-700 mt-0.5 font-medium">{oe.conditionNotes}</p>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              oe.returned ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {oe.returned ? 'Devolvido' : 'Com o Cliente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Resumo Financeiro Completo */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" /> Detalhamento Financeiro do Pedido
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Forma: <strong className="text-white font-bold">{selectedOrder.paymentMethod || 'PIX'}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Subtotal Produtos:</span>
                      <span className="font-bold text-white text-sm">{formatCurrency(selectedOrder.subtotal || 0)}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Frete / Entrega:</span>
                      <span className="font-bold text-white text-sm">{formatCurrency(selectedOrder.deliveryFee || 0)}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Caução Equipamento:</span>
                      <span className="font-bold text-white text-sm">{formatCurrency(selectedOrder.cautionDeposit || 0)}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Desconto Aplicado:</span>
                      <span className="font-bold text-rose-400 text-sm">
                        {selectedOrder.discount > 0 ? `- ${formatCurrency(selectedOrder.discount)}` : 'R$ 0,00'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-xs block">Valor Total do Pedido:</span>
                      <span className="text-xl font-black text-amber-400">{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Total Pago:</span>
                          <span className="text-sm font-black text-emerald-400">{formatCurrency(selectedOrder.paidAmount || 0)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Saldo Devedor:</span>
                          <span className={`text-sm font-black ${selectedOrder.remainingAmount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {formatCurrency(selectedOrder.remainingAmount !== undefined ? selectedOrder.remainingAmount : (selectedOrder.totalAmount - (selectedOrder.paidAmount || 0)))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7. Observações */}
                {selectedOrder.notes && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 block mb-0.5">Observações do Pedido:</span>
                    <p className="text-slate-600 leading-relaxed">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Rodapé de Ações Rápidas */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setScanFeedback(null);
                      setScanModalOrder(selectedOrder);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 text-xs transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Bipar Entrega (Câmera)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 text-xs transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderModalTab('EDIT')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center gap-1.5 text-xs transition-all"
                    >
                      <Edit3 className="w-4 h-4 text-amber-600" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderModalTab('PAYMENT')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 text-xs transition-all"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Registrar Recebimento</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EDITAR PEDIDO */}
            {orderModalTab === 'EDIT' && (
              <form onSubmit={handleSaveOrderEdits} className="space-y-4 text-xs">
                <datalist id="recipes-datalist-edit">
                  {recipes.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.style ? `${r.style} • ` : ''}{formatCurrency(r.salePricePerLiter || r.suggestedPricePerLiter || 20)}/L
                    </option>
                  ))}
                </datalist>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block font-bold text-slate-700 mb-1">Cliente / Ponto de Venda</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="🔍 Digite para buscar cliente..."
                        value={editClientSearchQuery || (clients.find(c => c.id === editClientId)?.tradeName || clients.find(c => c.id === editClientId)?.name || '')}
                        onChange={(e) => {
                          setEditClientSearchQuery(e.target.value);
                          setEditClientDropdownOpen(true);
                        }}
                        onFocus={() => setEditClientDropdownOpen(true)}
                        className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                      />
                      {(editClientSearchQuery || editClientId) && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditClientSearchQuery('');
                            setEditClientId('');
                            setEditClientDropdownOpen(true);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {editClientDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                        {clients
                          .filter((c) => {
                            if (!editClientSearchQuery) return true;
                            const q = editClientSearchQuery.toLowerCase();
                            return (
                              (c.name && c.name.toLowerCase().includes(q)) ||
                              (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
                              (c.document && c.document.includes(q)) ||
                              (c.city && c.city.toLowerCase().includes(q))
                            );
                          })
                          .slice(0, 15)
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setEditClientId(c.id);
                                setEditClientSearchQuery(c.tradeName || c.name);
                                setEditClientDropdownOpen(false);
                                if (!editAddress) {
                                  const addr = [c.address, c.number, c.neighborhood, c.city].filter(Boolean).join(', ');
                                  setEditAddress(addr);
                                }
                              }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-colors flex items-center justify-between ${
                                editClientId === c.id ? 'bg-amber-50 font-bold text-amber-900' : 'text-slate-800'
                              }`}
                            >
                              <div>
                                <span className="font-extrabold block">{c.tradeName || c.name}</span>
                                <span className="text-[10px] text-slate-400 block font-normal">{c.city || ''} {c.document ? `• CNPJ: ${c.document}` : ''}</span>
                              </div>
                              {editClientId === c.id && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                            </button>
                          ))}
                      </div>
                    )}
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <label className="block font-bold text-slate-700 mb-1">Previsão Devolução</label>
                    <input
                      type="date"
                      value={editReturnDate}
                      onChange={(e) => setEditReturnDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Retorno Efetivo</label>
                    <input
                      type="date"
                      value={editActualReturnDate}
                      onChange={(e) => setEditActualReturnDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Endereço Completo de Entrega</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>

                {/* Items */}
                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 flex items-center gap-1 text-xs">
                      🍺 Itens do Pedido ({editItems.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddEditItemRow}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs hover:bg-purple-100/50 transition-colors"
                    >
                      + Adicionar Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {editItems.map((item, idx) => {
                      const selectedRecipe = recipes.find((r) => r.id === item.recipeId);

                      return (
                        <div key={idx} className="bg-white p-2.5 rounded-xl border border-purple-200 shadow-2xs">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            {/* Busca Digitada de Cerveja */}
                            <div className="col-span-5">
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Cerveja / Produto</label>
                              <input
                                type="text"
                                list="recipes-datalist-edit"
                                placeholder="🔍 Digite a cerveja..."
                                value={selectedRecipe?.name || item.description?.replace(/^Barril - /, '') || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const matched = recipes.find(
                                    (r) => r.name.toLowerCase() === val.toLowerCase() || r.name.toLowerCase().includes(val.toLowerCase())
                                  );
                                  if (matched) {
                                    const updated = [...editItems];
                                    updated[idx].recipeId = matched.id;
                                    updated[idx].description = `Barril - ${matched.name}`;
                                    updated[idx].unitPrice = (matched.salePricePerLiter || matched.suggestedPricePerLiter || 20) * 50;
                                    updated[idx].totalPrice = updated[idx].quantity * updated[idx].unitPrice;
                                    setEditItems(updated);
                                  }
                                }}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                              />
                            </div>

                            {/* Quantidade */}
                            <div className="col-span-3">
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5 text-center">Qtd</label>
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
                                className="w-full px-2 py-1.5 rounded-lg font-bold text-center text-xs bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 focus:outline-none"
                                placeholder="Qtd"
                              />
                            </div>

                            {/* Preço Unitário */}
                            <div className="col-span-3">
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5 text-right">Unitário (R$)</label>
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
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-right text-slate-800 text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                                placeholder="Preço Unit."
                              />
                            </div>

                            {/* Botão de Excluir */}
                            <div className="col-span-1 flex items-center justify-end gap-1 pt-3">
                              <button
                                type="button"
                                onClick={() => handleRemoveEditItemRow(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Excluir este item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-bold pt-1.5 mt-1 border-t border-purple-50">
                            <span className="text-slate-500">
                              Subtotal: <strong className="text-slate-900">{item.quantity} un</strong>
                            </span>
                            <span className="font-black text-purple-900 text-xs">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Comodato de Chopeiras */}
                <div className="p-3.5 bg-orange-50 rounded-2xl border border-orange-200 space-y-2">
                  <span className="font-extrabold text-orange-900 block">
                    Equipamentos em Comodato (Chopeiras / Cilindros)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {equipment.map((eq) => {
                      const isSelected = editEquipments.includes(eq.id);
                      const conflict = getEquipmentReservationConflict(eq.id, selectedOrder?.id);

                      return (
                        <div
                          key={eq.id}
                          onClick={() => handleToggleEditOrderEquipment(eq)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500/20'
                              : conflict
                              ? 'bg-orange-50/50 border-orange-200 hover:border-orange-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-slate-800 truncate block leading-tight">{eq.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{eq.code}</span>
                            </div>
                            {conflict ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-800 bg-orange-100/90 px-1.5 py-0.5 rounded-md mt-1 border border-orange-200">
                                🔒 Reservado no Pedido #{conflict.orderNumber} ({conflict.client?.tradeName || conflict.client?.name})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 mt-0.5">
                                ✓ Disponível
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
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

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observações do Pedido</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Instruções para o entregador, pontos de referência..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
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

                {/* Stock Insufficiency Warning Banner in Edit */}
                {(() => {
                  const hasStockErrors = editItems.some((it) => {
                    const stock = getStockAvailability(it.recipeId, 50, selectedOrder?.id);
                    return it.quantity > stock.available;
                  });

                  return (
                    hasStockErrors && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                        <span>
                          Não é possível salvar: Há itens sem estoque disponível suficiente na câmara fria.
                        </span>
                      </div>
                    )
                  );
                })()}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setOrderModalTab('DETAILS')}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Voltar aos Detalhes
                  </button>
                  {(() => {
                    const hasStockErrors = editItems.some((it) => {
                      const stock = getStockAvailability(it.recipeId, 50, selectedOrder?.id);
                      return it.quantity > stock.available;
                    });

                    return (
                      <button
                        type="submit"
                        disabled={savingOrder || hasStockErrors}
                        className={`px-5 py-2.5 font-bold rounded-xl shadow-sm transition-all ${
                          hasStockErrors
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                      >
                        {savingOrder ? 'Salvando...' : hasStockErrors ? 'Estoque Insuficiente' : 'Salvar Alterações do Pedido'}
                      </button>
                    );
                  })()}
                </div>
              </form>
            )}

            {/* TAB 3: RECEBIMENTOS & PAGAMENTOS */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-1">Novo Pedido de Chopp</h3>
            <p className="text-xs text-slate-500 mb-4">Cadastre a venda, comodato de chopeiras e agendamento de entrega e recolha</p>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <datalist id="recipes-datalist-new">
                {recipes.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.style ? `${r.style} • ` : ''}{formatCurrency(r.salePricePerLiter || r.suggestedPricePerLiter || 20)}/L
                  </option>
                ))}
              </datalist>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Busca Digitada de Cliente */}
                <div className="col-span-2 sm:col-span-1 relative">
                  <label className="block font-bold text-slate-700 mb-1">
                    Cliente / Ponto de Venda <span className="text-amber-600">*</span>
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="🔍 Digite para buscar cliente..."
                      value={clientSearchQuery || (clients.find(c => c.id === clientId)?.tradeName || clients.find(c => c.id === clientId)?.name || '')}
                      onChange={(e) => {
                        setClientSearchQuery(e.target.value);
                        setClientDropdownOpen(true);
                      }}
                      onFocus={() => setClientDropdownOpen(true)}
                      className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:bg-white focus:border-amber-500 focus:outline-none shadow-xs"
                    />
                    {(clientSearchQuery || clientId) && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearchQuery('');
                          setClientId('');
                          setDeliveryAddress('');
                          setClientDropdownOpen(true);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown de Clientes Filtrados */}
                  {clientDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {clients
                        .filter((c) => {
                          if (!clientSearchQuery) return true;
                          const q = clientSearchQuery.toLowerCase();
                          return (
                            (c.name && c.name.toLowerCase().includes(q)) ||
                            (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
                            (c.document && c.document.includes(q)) ||
                            (c.city && c.city.toLowerCase().includes(q)) ||
                            (c.phone && c.phone.includes(q))
                          );
                        })
                        .slice(0, 15)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              handleClientSelectForNewOrder(c.id);
                              setClientSearchQuery(c.tradeName || c.name);
                              setClientDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-colors flex items-center justify-between ${
                              clientId === c.id ? 'bg-amber-50 font-bold text-amber-900' : 'text-slate-800'
                            }`}
                          >
                            <div>
                              <span className="font-extrabold block">{c.tradeName || c.name}</span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {c.city ? `${c.city}/${c.state || ''}` : ''} {c.document ? `• CNPJ: ${c.document}` : ''}
                              </span>
                            </div>
                            {clientId === c.id && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Entrega Agendada</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Previsão Devolução / Recolha</label>
                  <input
                    type="date"
                    value={estimatedReturnDate}
                    onChange={(e) => setEstimatedReturnDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Endereço Completo de Entrega</label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Rua, número, bairro, cidade..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs"
                  />
                </div>
              </div>

              {/* Itens */}
              <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-purple-950 flex items-center gap-1.5 text-xs">
                    🍺 Itens do Pedido ({orderItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs hover:bg-purple-100/50 transition-colors"
                  >
                    + Adicionar Item
                  </button>
                </div>

                <div className="space-y-2">
                  {orderItems.map((item, idx) => {
                    const selectedRecipe = recipes.find((r) => r.id === item.recipeId);

                    return (
                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-purple-200 shadow-2xs">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          {/* Busca Digitada de Cerveja */}
                          <div className="col-span-5">
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Cerveja / Produto</label>
                            <input
                              type="text"
                              list="recipes-datalist-new"
                              placeholder="🔍 Digite a cerveja..."
                              value={selectedRecipe?.name || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const matched = recipes.find(
                                  (r) => r.name.toLowerCase() === val.toLowerCase() || r.name.toLowerCase().includes(val.toLowerCase())
                                );
                                if (matched) {
                                  const newItems = [...orderItems];
                                  newItems[idx].recipeId = matched.id;
                                  const cap = item.kegCapacity || 50;
                                  newItems[idx].unitPrice = (matched.salePricePerLiter || matched.suggestedPricePerLiter || 20) * cap;
                                  setOrderItems(newItems);
                                }
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                            />
                          </div>

                          {/* Capacidade */}
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Tamanho</label>
                            <select
                              value={item.kegCapacity || 50}
                              onChange={(e) => {
                                const cap = parseInt(e.target.value, 10) || 50;
                                const newItems = [...orderItems];
                                newItems[idx].kegCapacity = cap;
                                const r = recipes.find((rec) => rec.id === newItems[idx].recipeId);
                                if (r) {
                                  newItems[idx].unitPrice = (r.salePricePerLiter || r.suggestedPricePerLiter || 20) * cap;
                                }
                                setOrderItems(newItems);
                              }}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                            >
                              <option value="50">50 Litros</option>
                              <option value="30">30 Litros</option>
                              <option value="20">20 Litros</option>
                              <option value="15">15 Litros</option>
                              <option value="10">10 Litros</option>
                              <option value="5">5 Litros</option>
                            </select>
                          </div>

                          {/* Quantidade */}
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5 text-center">Qtd</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...orderItems];
                                newItems[idx].quantity = parseInt(e.target.value, 10) || 1;
                                setOrderItems(newItems);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg font-bold text-center text-xs bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 focus:outline-none"
                            />
                          </div>

                          {/* Preço Unitário */}
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5 text-right">Unitário (R$)</label>
                            <input
                              type="number"
                              step="5"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const newItems = [...orderItems];
                                newItems[idx].unitPrice = parseFloat(e.target.value) || 0;
                                setOrderItems(newItems);
                              }}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-right text-slate-800 text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                            />
                          </div>

                          {/* Botão de Excluir */}
                          <div className="col-span-1 flex items-center justify-end gap-1 pt-3">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir este item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold pt-1.5 mt-1 border-t border-purple-50">
                          <span className="text-slate-500">
                            Subtotal: <strong className="text-slate-900">{item.quantity}x {item.kegCapacity || 50}L = {(item.quantity) * (item.kegCapacity || 50)} Litros</strong>
                          </span>
                          <span className="font-black text-purple-900 text-xs">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comodato de Chopeiras */}
              <div className="p-3.5 bg-orange-50 rounded-2xl border border-orange-200 space-y-2">
                <span className="font-extrabold text-orange-900 block">
                  Equipamentos em Comodato (Chopeiras / Cilindros)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {equipment.map((eq) => {
                    const isSelected = selectedEquipments.includes(eq.id);
                    const conflict = getEquipmentReservationConflict(eq.id);

                    return (
                      <div
                        key={eq.id}
                        onClick={() => handleToggleNewOrderEquipment(eq)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500/20'
                            : conflict
                            ? 'bg-orange-50/50 border-orange-200 hover:border-orange-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-800 truncate block leading-tight">{eq.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{eq.code}</span>
                          </div>
                          {conflict ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-800 bg-orange-100/90 px-1.5 py-0.5 rounded-md mt-1 border border-orange-200">
                              🔒 Reservado no Pedido #{conflict.orderNumber} ({conflict.client?.tradeName || conflict.client?.name})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 mt-0.5">
                              ✓ Disponível
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Valores Adicionais */}
              <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Taxa de Entrega (R$)</label>
                  <input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Caução Chopeira (R$)</label>
                  <input
                    type="number"
                    value={cautionDeposit}
                    onChange={(e) => setCautionDeposit(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Desconto (R$)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações do Pedido</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Horário preferencial, nome de quem vai receber no local..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Stock Insufficiency Warning Banner */}
              {(() => {
                const hasStockErrors = orderItems.some((it) => {
                  const stock = getStockAvailability(it.recipeId, it.kegCapacity || 50);
                  return it.quantity > stock.available;
                });

                return (
                  hasStockErrors && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                      <span>
                        Não é possível gerar o pedido: Há itens sem estoque disponível suficiente na câmara fria.
                      </span>
                    </div>
                  )
                );
              })()}

              {/* Prévia do Total */}
              {(() => {
                const sub = orderItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
                const fee = parseFloat(deliveryFee) || 0;
                const caut = parseFloat(cautionDeposit) || 0;
                const disc = parseFloat(discount) || 0;
                const tot = Math.max(0, sub + fee + caut - disc);

                return (
                  <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Valor Total Previsto:</span>
                      <span className="text-xs text-slate-300">Subtotal {formatCurrency(sub)} + Frete {formatCurrency(fee)}</span>
                    </div>
                    <span className="text-xl font-black text-amber-400">{formatCurrency(tot)}</span>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                {(() => {
                  const hasStockErrors = orderItems.some((it) => {
                    const stock = getStockAvailability(it.recipeId, it.kegCapacity || 50);
                    return it.quantity > stock.available;
                  });

                  return (
                    <button
                      type="submit"
                      disabled={hasStockErrors}
                      className={`px-5 py-2.5 font-bold rounded-xl shadow-sm transition-all ${
                        hasStockErrors
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {hasStockErrors ? 'Estoque Insuficiente' : 'Gerar Pedido'}
                    </button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ⚠️ CONFLITO DE RESERVA DE EQUIPAMENTO */}
      {reservationConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Equipamento Já Reservado!</h3>
                <p className="text-xs text-slate-500">Conflito de reserva de comodato</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5 text-xs text-slate-800">
              <p>
                O equipamento <strong>{reservationConflictModal.equipment.name}</strong> (<span className="font-mono font-bold text-amber-900">{reservationConflictModal.equipment.code}</span>) já está reservado no:
              </p>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200 font-medium space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pedido:</span>
                  <strong className="text-slate-900">#{reservationConflictModal.conflictOrder.orderNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <strong className="text-slate-900">{reservationConflictModal.conflictOrder.client?.tradeName || reservationConflictModal.conflictOrder.client?.name}</strong>
                </div>
                {reservationConflictModal.conflictOrder.deliveryDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data de Entrega:</span>
                    <strong className="text-slate-900">{formatDate(reservationConflictModal.conflictOrder.deliveryDate)}</strong>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs font-bold text-slate-700 leading-relaxed">
              Deseja retirar a reserva do Pedido #{reservationConflictModal.conflictOrder.orderNumber} e transferir para este pedido?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReservationConflictModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar (Manter no outro)
              </button>
              <button
                type="button"
                onClick={handleConfirmTransferReservation}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Transferir Reserva</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: 🔄 REGISTRAR RETORNO DE BARRIL DO PEDIDO */}
      {returnKegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl border border-orange-200">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Registrar Retorno de Barril</h3>
                  <p className="text-xs text-slate-500">
                    Barril <strong className="font-mono text-slate-900">{returnKegModal.keg.code}</strong> ({returnKegModal.keg.capacity}L) • Pedido #{returnKegModal.order.orderNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReturnKegModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Condição do Retorno */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-800 block">
                1. Condição do Barril Retornado:
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReturnKegModal({ ...returnKegModal, condition: 'VAZIO_SUJO' })}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    returnKegModal.condition === 'VAZIO_SUJO'
                      ? 'bg-orange-50 border-orange-400 text-orange-950 ring-2 ring-orange-300 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-black block">1. Vazio / Sujo</span>
                  <span className="text-[10px] text-slate-500">Vai para CIP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReturnKegModal({ ...returnKegModal, condition: 'PARCIALMENTE_CHEIO' })}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    returnKegModal.condition === 'PARCIALMENTE_CHEIO'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-300 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-black block">2. Parcial / Sobra</span>
                  <span className="text-[10px] text-slate-500">Retorna ao estoque</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReturnKegModal({ ...returnKegModal, condition: 'CHEIO_RETORNADO' })}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    returnKegModal.condition === 'CHEIO_RETORNADO'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-black block">3. Cheio Intacto</span>
                  <span className="text-[10px] text-slate-500">Não consumido</span>
                </button>
              </div>
            </div>

            {/* Se Parcialmente Cheio: Litros + Escolha de Cobrança */}
            {returnKegModal.condition === 'PARCIALMENTE_CHEIO' && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 font-black">Litros restantes no barril:</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={returnKegModal.keg.capacity}
                    value={returnKegModal.returnVolumeLiters}
                    onChange={(e) => setReturnKegModal({ ...returnKegModal, returnVolumeLiters: e.target.value })}
                    className="w-24 px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-black text-center text-amber-950 text-xs"
                  />
                  <span className="font-bold text-slate-500">Litros</span>
                </div>

                {/* Pergunta de Cobrança ao Cliente */}
                <div className="space-y-1.5 pt-2 border-t border-amber-200/60">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
                    💳 Cobrança do Cliente no Pedido:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReturnKegModal({ ...returnKegModal, billingMode: 'FULL' })}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        returnKegModal.billingMode === 'FULL'
                          ? 'bg-white border-amber-400 text-amber-950 ring-2 ring-amber-300 font-bold shadow-xs'
                          : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="font-black text-xs block mb-0.5">🧾 Cobrar Barril Inteiro (100%)</span>
                      <span className="text-[10px] text-slate-500 block leading-tight">
                        Mantém o valor integral do barril no pedido (padrão de evento).
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReturnKegModal({ ...returnKegModal, billingMode: 'PARTIAL' })}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        returnKegModal.billingMode === 'PARTIAL'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300 font-bold shadow-xs'
                          : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="font-black text-xs text-emerald-800 block mb-0.5">💰 Cobrar Apenas Consumo Parcial</span>
                      <span className="text-[10px] text-slate-500 block leading-tight">
                        Calcula os litros consumidos e desconta a sobra no total do pedido.
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setReturnKegModal(null)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processingReturn}
                onClick={handleConfirmKegReturn}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                {processingReturn ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Confirmar Retorno</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
