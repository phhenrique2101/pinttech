import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export const KEG_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  VAZIO_SUJO: { label: 'Vazio / Sujo', color: 'text-amber-800', bg: 'bg-amber-100', border: 'border-amber-300' },
  HIGIENIZADO: { label: 'Higienizado (Pronto)', color: 'text-blue-800', bg: 'bg-blue-100', border: 'border-blue-300' },
  ENVASADO: { label: 'Envasado', color: 'text-purple-800', bg: 'bg-purple-100', border: 'border-purple-300' },
  EM_ESTOQUE: { label: 'Na Câmara Fria', color: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-300' },
  EM_TRANSITO: { label: 'Em Trânsito / Rota', color: 'text-cyan-800', bg: 'bg-cyan-100', border: 'border-cyan-300' },
  NO_CLIENTE: { label: 'No Cliente', color: 'text-orange-800', bg: 'bg-orange-100', border: 'border-orange-300' },
  MANUTENCAO: { label: 'Em Manutenção', color: 'text-rose-800', bg: 'bg-rose-100', border: 'border-rose-300' },
  INATIVO: { label: 'Inativo', color: 'text-gray-800', bg: 'bg-gray-100', border: 'border-gray-300' },
};

export const EQUIPMENT_TYPE_MAP: Record<string, string> = {
  CHOPEIRA_ELETRICA: 'Chopeira Elétrica',
  CHOPEIRA_GELO: 'Chopeira a Gelo',
  CILINDRO_CO2: 'Cilindro CO2',
  EXTRATORA: 'Válvula Extratora',
  MANOMETRO: 'Regulador / Manômetro',
  PINGADEIRA: 'Pingadeira',
  OUTRO: 'Outro Equipamento',
};

export const ROLE_MAP: Record<string, { label: string; description: string; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', description: 'Acesso total ao PintTech SaaS', color: 'bg-red-500 text-white' },
  ADMIN: { label: 'Gestor da Cervejaria', description: 'Controle total da cervejaria', color: 'bg-amber-600 text-white' },
  BREWER: { label: 'Mestre Cervejeiro', description: 'Produção, receitas e envase', color: 'bg-blue-600 text-white' },
  LOGISTICS: { label: 'Logística / Scanner', description: 'Entregas, recolha e chão de fábrica', color: 'bg-emerald-600 text-white' },
  SALES: { label: 'Comercial / Vendas', description: 'Clientes e pedidos', color: 'bg-indigo-600 text-white' },
  FINANCE: { label: 'Financeiro', description: 'Contas a pagar/receber', color: 'bg-violet-600 text-white' },
};

export const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  ORCAMENTO: { label: 'Orçamento', color: 'text-slate-800', bg: 'bg-slate-100' },
  CONFIRMADO: { label: 'Confirmado', color: 'text-blue-800', bg: 'bg-blue-100' },
  EM_SEPARACAO: { label: 'Em Separação', color: 'text-purple-800', bg: 'bg-purple-100' },
  EM_ROTA: { label: 'Em Rota / Trânsito', color: 'text-amber-800', bg: 'bg-amber-100' },
  ENTREGUE: { label: 'Entregue / Concluído', color: 'text-emerald-800', bg: 'bg-emerald-100' },
  CANCELADO: { label: 'Cancelado', color: 'text-rose-800', bg: 'bg-rose-100' },
  CONCLUIDO: { label: 'Finalizado', color: 'text-emerald-900', bg: 'bg-emerald-200' },
};

