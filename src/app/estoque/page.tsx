'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, AlertTriangle, Layers, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function EstoquePage() {
  const [items, setItems] = useState<any[]>([
    { id: '1', name: 'Malte Pilsen Agrária', category: 'MALTE', currentQuantity: 1250, minimumQuantity: 500, unit: 'KG', costPerUnit: 4.8 },
    { id: '2', name: 'Malte Munich Weyermann', category: 'MALTE', currentQuantity: 200, minimumQuantity: 100, unit: 'KG', costPerUnit: 12.5 },
    { id: '3', name: 'Lúpulo Citra T90 (Safra 2025)', category: 'LUPULO', currentQuantity: 18.5, minimumQuantity: 10, unit: 'KG', costPerUnit: 280.0 },
    { id: '4', name: 'Lúpulo Mosaic Pellet', category: 'LUPULO', currentQuantity: 12.0, minimumQuantity: 5, unit: 'KG', costPerUnit: 290.0 },
    { id: '5', name: 'Levedura SafAle US-05', category: 'LEVEDURA', currentQuantity: 15, minimumQuantity: 5, unit: 'PACOTE', costPerUnit: 45.0 },
    { id: '6', name: 'Ácido Peracético 15% (Sanitizante)', category: 'QUIMICO_LIMPEZA', currentQuantity: 40, minimumQuantity: 20, unit: 'L', costPerUnit: 18.0 },
    { id: '7', name: 'Soda Cáustica Escamas (Limpeza CIP)', category: 'QUIMICO_LIMPEZA', currentQuantity: 75, minimumQuantity: 50, unit: 'KG', costPerUnit: 14.0 },
  ]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            Estoque de Insumos & Matérias-Primas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de maltes, lúpulos, leveduras, químicos de limpeza e embalagens
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {item.category}
                  </span>
                  <h3 className="font-black text-slate-900 text-base">{item.name}</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                  {item.unit}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-900">{item.currentQuantity}</span>
                  <span className="text-xs text-slate-400 font-semibold ml-1">{item.unit}</span>
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  Custo: {formatCurrency(item.costPerUnit)}/{item.unit}
                </span>
              </div>

              <p className="text-[10px] text-slate-400 mt-1">
                Estoque Mínimo: {item.minimumQuantity} {item.unit}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
