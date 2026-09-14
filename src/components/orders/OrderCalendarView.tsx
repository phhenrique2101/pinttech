'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  Plus,
  Filter,
  Eye,
  Layers,
  Cylinder,
  MapPin,
  Phone,
  ArrowRight,
  User,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateShort, getLocalDateString } from '@/lib/utils';

interface OrderCalendarViewProps {
  orders: any[];
  onSelectOrder: (order: any) => void;
  onCreateOrderOnDate?: (dateStr: string) => void;
}

export type AgendaFilterType = 'DELIVERIES' | 'RETURNS' | 'ALL';
export type CalendarScopeType = 'MONTH' | 'WEEK';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

// Helper seguro para extrair YYYY-MM-DD sem distorção de fuso horário
function parseDateKey(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}
  return '';
}

// Extrai horário se presente
function parseTimeStr(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const match = val.match(/T(\d{2}):(\d{2})/);
  if (match && !(match[1] === '00' && match[2] === '00')) {
    return `${match[1]}:${match[2]}`;
  }
  return null;
}

export default function OrderCalendarView({
  orders = [],
  onSelectOrder,
  onCreateOrderOnDate,
}: OrderCalendarViewProps) {
  const todayStr = getLocalDateString();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [scope, setScope] = useState<CalendarScopeType>('MONTH');
  const [filterType, setFilterType] = useState<AgendaFilterType>('DELIVERIES');
  const [selectedDayPopover, setSelectedDayPopover] = useState<string | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Navegação
  const handlePrev = () => {
    if (scope === 'MONTH') {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const handleNext = () => {
    if (scope === 'MONTH') {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Mapeamento de Eventos (Entregas e/ou Devoluções)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();

    orders.forEach((order) => {
      // 1. Evento de Entrega
      if (filterType === 'DELIVERIES' || filterType === 'ALL') {
        const delKey = parseDateKey(order.deliveryDate);
        if (delKey) {
          const isDelivered = order.status === 'ENTREGUE' || order.status === 'CONCLUIDO';
          const isLate = !isDelivered && order.status !== 'CANCELADO' && delKey < todayStr;
          const totalLiters = (order.items || []).reduce(
            (acc: number, it: any) => acc + (it.quantity || 1) * (it.kegCapacity || 50),
            0
          );
          const totalKegs = (order.items || []).reduce(
            (acc: number, it: any) => acc + (it.quantity || 1),
            0
          );

          const event = {
            id: `${order.id}-del`,
            order,
            type: 'DELIVERY' as const,
            dateKey: delKey,
            time: parseTimeStr(order.deliveryDate) || '12:00',
            clientName: order.client?.tradeName || order.client?.name || 'Cliente',
            status: order.status,
            paymentStatus: order.paymentStatus,
            isPaid: order.paymentStatus === 'PAGO',
            isLate,
            totalLiters,
            totalKegs,
            totalAmount: order.totalAmount || 0,
            address: order.deliveryAddress || order.client?.address || '',
            driverName: order.driverName || order.driverUser?.name || null,
          };

          const list = map.get(delKey) || [];
          list.push(event);
          map.set(delKey, list);
        }
      }

      // 2. Evento de Devolução / Recolhimento de Comodato
      if (filterType === 'RETURNS' || filterType === 'ALL') {
        const retKey = parseDateKey(order.estimatedReturnDate);
        if (retKey && !order.actualReturnDate) {
          const hasEquipments = order.orderEquipments && order.orderEquipments.length > 0;
          const totalKegs = (order.items || []).reduce(
            (acc: number, it: any) => acc + (it.quantity || 1),
            0
          );

          const event = {
            id: `${order.id}-ret`,
            order,
            type: 'RETURN' as const,
            dateKey: retKey,
            time: parseTimeStr(order.estimatedReturnDate) || '18:00',
            clientName: order.client?.tradeName || order.client?.name || 'Cliente',
            status: 'RECOLHIMENTO',
            paymentStatus: order.paymentStatus,
            isPaid: order.paymentStatus === 'PAGO',
            isLate: retKey < todayStr,
            totalLiters: 0,
            totalKegs,
            hasEquipments,
            totalAmount: order.totalAmount || 0,
            address: order.deliveryAddress || order.client?.address || '',
            driverName: order.driverName || null,
          };

          const list = map.get(retKey) || [];
          list.push(event);
          map.set(retKey, list);
        }
      }
    });

    return map;
  }, [orders, filterType, todayStr]);

  // Estatísticas do Mês/Período Visível
  const periodStats = useMemo(() => {
    let totalEvents = 0;
    let totalLiters = 0;
    let totalKegs = 0;
    let totalAmount = 0;
    let lateCount = 0;

    eventsByDate.forEach((events, dKey) => {
      // Filtra pelo mês atual se estiver em visão mensal
      if (scope === 'MONTH') {
        const [y, m] = dKey.split('-');
        if (parseInt(y, 10) !== currentYear || parseInt(m, 10) - 1 !== currentMonth) {
          return;
        }
      }
      events.forEach((ev) => {
        totalEvents++;
        totalLiters += ev.totalLiters;
        totalKegs += ev.totalKegs;
        totalAmount += ev.totalAmount;
        if (ev.isLate) lateCount++;
      });
    });

    return { totalEvents, totalLiters, totalKegs, totalAmount, lateCount };
  }, [eventsByDate, scope, currentYear, currentMonth]);

  // Células da Grade Mensal
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Dom) a 6 (Sáb)
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    // Dias do mês anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dNum);
      const dateKey = getLocalDateString(prevDate);
      days.push({
        dateKey,
        dayNumber: dNum,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const curDate = new Date(currentYear, currentMonth, i);
      const dateKey = getLocalDateString(curDate);
      days.push({
        dateKey,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
      });
    }

    // Dias do próximo mês para fechar as semanas
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nextDate = new Date(currentYear, currentMonth + 1, i);
        const dateKey = getLocalDateString(nextDate);
        days.push({
          dateKey,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: dateKey === todayStr,
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  // Células da Grade Semanal
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 (Dom) a 6 (Sáb)
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateKey = getLocalDateString(d);
      days.push({
        dateKey,
        dayNumber: d.getDate(),
        monthName: MONTH_NAMES[d.getMonth()],
        weekdayName: WEEKDAYS[i],
        isToday: dateKey === todayStr,
        fullDate: d,
      });
    }
    return days;
  }, [currentDate, todayStr]);

  // Helper de Estilo para Pills de Pedidos
  const getEventPillStyle = (ev: any) => {
    if (ev.isLate) {
      return {
        bg: 'bg-rose-500/15 dark:bg-rose-950/50 hover:bg-rose-500/25',
        border: 'border-rose-400 dark:border-rose-500/50',
        text: 'text-rose-900 dark:text-rose-200',
        badge: 'bg-rose-600 text-white',
        icon: <AlertTriangle className="w-3 h-3 text-rose-500 flex-shrink-0 animate-pulse" />,
      };
    }

    if (ev.type === 'RETURN') {
      return {
        bg: 'bg-purple-500/15 dark:bg-purple-950/50 hover:bg-purple-500/25',
        border: 'border-purple-300 dark:border-purple-500/50',
        text: 'text-purple-900 dark:text-purple-200',
        badge: 'bg-purple-600 text-white',
        icon: <RotateCcw className="w-3 h-3 text-purple-500 flex-shrink-0" />,
      };
    }

    if (ev.status === 'ENTREGUE' || ev.status === 'CONCLUIDO') {
      return {
        bg: 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80',
        border: 'border-slate-300 dark:border-slate-700',
        text: 'text-slate-700 dark:text-slate-300',
        badge: 'bg-slate-700 text-slate-200',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />,
      };
    }

    if (ev.status === 'EM_ROTA' || ev.status === 'SAIU_ENTREGA') {
      return {
        bg: 'bg-cyan-500/15 dark:bg-cyan-950/50 hover:bg-cyan-500/25',
        border: 'border-cyan-300 dark:border-cyan-500/50',
        text: 'text-cyan-900 dark:text-cyan-200',
        badge: 'bg-cyan-600 text-white',
        icon: <Truck className="w-3 h-3 text-cyan-500 flex-shrink-0 animate-bounce" />,
      };
    }

    if (ev.status === 'ORCAMENTO') {
      return {
        bg: 'bg-amber-100/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50',
        border: 'border-2 border-dashed border-amber-400 dark:border-amber-500',
        text: 'text-amber-950 dark:text-amber-200',
        badge: 'bg-amber-400/90 text-amber-950 font-black',
        icon: <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
      };
    }

    // Padrão: Pendente / Confirmado
    return {
      bg: 'bg-amber-500/20 dark:bg-amber-950/60 hover:bg-amber-500/30',
      border: 'border-amber-400 dark:border-amber-500/60',
      text: 'text-amber-950 dark:text-amber-100',
      badge: 'bg-amber-500 text-slate-950 font-black',
      icon: <Truck className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
    };
  };

  return (
    <div className="space-y-4">
      {/* 1. BARRA SUPERIOR: FILTROS DE EVENTOS & ATALHOS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        {/* Abas de Tipos de Eventos */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType('DELIVERIES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              filterType === 'DELIVERIES'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Entregas</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('RETURNS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              filterType === 'RETURNS'
                ? 'bg-purple-600 text-white font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Devoluções de Comodato</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              filterType === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Todos os Eventos</span>
          </button>
        </div>

        {/* Resumo Rápido da Janela */}
        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="hidden lg:flex items-center gap-2">
            <span>Volume:</span>
            <strong className="text-slate-900 dark:text-white font-mono font-bold">
              {periodStats.totalLiters.toLocaleString('pt-BR')}L
            </strong>
            <span className="text-slate-400">({periodStats.totalKegs} barris)</span>
          </div>

          {periodStats.lateCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{periodStats.lateCount} em atraso</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition"
          >
            Hoje
          </button>
        </div>
      </div>

      {/* 2. CABEÇALHO DO CALENDÁRIO: NAVEGAÇÃO & TÍTULO (Ex: Setembro de 2026) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrev}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white capitalize">
            {scope === 'MONTH'
              ? `${MONTH_NAMES[currentMonth]} de ${currentYear}`
              : `Semana de ${weekDays[0].dayNumber} a ${weekDays[6].dayNumber} de ${weekDays[6].monthName}`}
          </h2>
        </div>

        {/* Alternador de Escopo: Mês vs Semana */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setScope('MONTH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              scope === 'MONTH'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Mês
          </button>
          <button
            type="button"
            onClick={() => setScope('WEEK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              scope === 'WEEK'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Semana
          </button>
        </div>
      </div>

      {/* 3. VISUALIZAÇÃO EM GRADE: MÊS */}
      {scope === 'MONTH' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center text-xs font-black text-amber-600 dark:text-amber-400 py-2.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Células dos Dias */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 dark:divide-slate-800/80">
            {monthDays.map((cell) => {
              const dayEvents = eventsByDate.get(cell.dateKey) || [];

              return (
                <div
                  key={cell.dateKey}
                  className={`min-h-[115px] sm:min-h-[135px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors relative group ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/50 dark:bg-slate-950/30 opacity-40'
                      : 'bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-850/40'
                  } ${cell.isToday ? 'ring-2 ring-inset ring-amber-500 bg-amber-50/20 dark:bg-amber-500/5' : ''}`}
                >
                  {/* Topo da Célula: Número do Dia & Botão Novo Pedido */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-lg ${
                        cell.isToday
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : cell.isCurrentMonth
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Botão rápido para criar pedido nesta data */}
                    {onCreateOrderOnDate && cell.isCurrentMonth && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateOrderOnDate(cell.dateKey);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-amber-500 hover:bg-amber-100 dark:hover:bg-slate-800 transition"
                        title={`Novo Pedido para ${cell.dayNumber}/${currentMonth + 1}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Lista de Eventos do Dia */}
                  <div className="space-y-1.5 my-1 flex-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const style = getEventPillStyle(ev);
                      return (
                        <div
                          key={ev.id}
                          onClick={() => onSelectOrder(ev.order)}
                          className={`p-1 sm:p-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all shadow-2xs flex flex-col gap-0.5 ${style.bg} ${style.border} ${style.text}`}
                          title={`Pedido #${ev.order.orderNumber} - ${ev.clientName} (${ev.totalLiters}L)`}
                        >
                          <div className="flex items-center justify-between gap-1 leading-none">
                            <div className="flex items-center gap-1 truncate">
                              {style.icon}
                              <span className="font-mono text-[10px] opacity-80">{ev.time}</span>
                              <span className="truncate font-semibold max-w-[85px] sm:max-w-[110px]">
                                {ev.clientName}
                              </span>
                            </div>

                            {/* Ícone de Pagamento */}
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold flex-shrink-0 ${
                                ev.isPaid
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              }`}
                              title={ev.isPaid ? 'Pago' : 'Pagamento Pendente'}
                            >
                              $
                            </span>
                          </div>

                          {/* Segunda linha: Detalhes do Chopp / Volume */}
                          <div className="flex items-center justify-between text-[9px] opacity-75 font-mono">
                            <span className="flex items-center gap-1">
                              #{ev.order.orderNumber}
                              {ev.status === 'ORCAMENTO' && (
                                <span className="text-[8px] bg-amber-200/90 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200 px-1 py-0.2 rounded font-sans font-black">
                                  Orçamento
                                </span>
                              )}
                            </span>
                            {ev.totalLiters > 0 && <span>{ev.totalLiters}L</span>}
                          </div>
                        </div>
                      );
                    })}

                    {/* Indicador de mais pedidos */}
                    {dayEvents.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDayPopover(cell.dateKey)}
                        className="w-full text-center py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline block"
                      >
                        +{dayEvents.length - 3} mais...
                      </button>
                    )}
                  </div>

                  {/* Rodapé da célula vazio */}
                  <div className="h-1" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. VISUALIZAÇÃO EM GRADE: SEMANA */}
      {scope === 'WEEK' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
            {weekDays.map((day) => {
              const dayEvents = eventsByDate.get(day.dateKey) || [];
              return (
                <div key={day.dateKey} className="min-h-[350px] p-3 flex flex-col justify-between">
                  {/* Cabeçalho do Dia */}
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                        {day.weekdayName}
                      </span>
                      <strong className="text-base font-black text-slate-900 dark:text-white">
                        {day.dayNumber} {day.monthName}
                      </strong>
                    </div>

                    {day.isToday && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
                        HOJE
                      </span>
                    )}
                  </div>

                  {/* Lista de Pedidos com Mais Detalhes */}
                  <div className="space-y-2.5 my-3 flex-1 overflow-y-auto">
                    {dayEvents.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs font-medium">
                        Nenhuma entrega
                      </div>
                    ) : (
                      dayEvents.map((ev) => {
                        const style = getEventPillStyle(ev);
                        return (
                          <div
                            key={ev.id}
                            onClick={() => onSelectOrder(ev.order)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all shadow-xs space-y-1.5 ${style.bg} ${style.border} ${style.text}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {style.icon}
                                <span className="font-mono text-xs font-black">#{ev.order.orderNumber}</span>
                                {ev.status === 'ORCAMENTO' && (
                                 <span className="text-[10px] bg-amber-200/90 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200 px-1.5 py-0.5 rounded font-black">
                                   ⏳ Orçamento
                                 </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono font-bold bg-white/40 dark:bg-slate-900/60 px-1.5 py-0.5 rounded">
                                {ev.time}
                              </span>
                            </div>

                            <strong className="block text-xs font-bold leading-tight">{ev.clientName}</strong>

                            {ev.address && (
                              <p className="text-[11px] opacity-80 truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span>{ev.address}</span>
                              </p>
                            )}

                            <div className="pt-1.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[11px] font-mono">
                              <span>
                                {ev.totalLiters}L • {ev.totalKegs} {ev.totalKegs === 1 ? 'barril' : 'barris'}
                              </span>
                              <span className="font-bold">{formatCurrency(ev.totalAmount)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Botão Novo Pedido no Dia */}
                  {onCreateOrderOnDate && (
                    <button
                      type="button"
                      onClick={() => onCreateOrderOnDate(day.dateKey)}
                      className="w-full py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agendar</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. MODAL POPOVER PARA DIAS COM MUITOS PEDIDOS */}
      {selectedDayPopover && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-amber-500" />
                  <span>Entregas de {formatDateShort(selectedDayPopover)}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {eventsByDate.get(selectedDayPopover)?.length || 0} pedidos programados para esta data
                </p>
              </div>
              <button
                onClick={() => setSelectedDayPopover(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(eventsByDate.get(selectedDayPopover) || []).map((ev) => {
                const style = getEventPillStyle(ev);
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedDayPopover(null);
                      onSelectOrder(ev.order);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all shadow-xs flex items-center justify-between gap-3 ${style.bg} ${style.border} ${style.text}`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black flex-wrap">
                        {style.icon}
                        <span>#{ev.order.orderNumber}</span>
                        {ev.status === 'ORCAMENTO' && (
                          <span className="text-[10px] bg-amber-200/90 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200 px-1.5 py-0.2 rounded font-black">
                            ⏳ Orçamento
                          </span>
                        )}
                        <span className="font-mono opacity-75">({ev.time})</span>
                      </div>
                      <span className="block text-xs font-bold mt-0.5">{ev.clientName}</span>
                      <span className="text-[11px] opacity-75 block">
                        {ev.totalLiters}L • {ev.totalKegs} barris • {formatCurrency(ev.totalAmount)}
                      </span>
                    </div>

                    <button className="px-3 py-1.5 rounded-lg bg-white/70 dark:bg-slate-800 text-xs font-bold flex items-center gap-1 hover:bg-amber-500 hover:text-slate-950 transition">
                      <span>Ver</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
