'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Cylinder, QrCode, ShoppingCart, Menu } from 'lucide-react';
import { CurrentUser } from './Navbar';

export default function MobileBottomNav({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Início', href: '/', icon: LayoutDashboard },
    { label: 'Barris', href: '/barris', icon: Cylinder },
    { label: 'Scanner', href: '/scanner', icon: QrCode, highlight: true },
    { label: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
    { label: 'Mais', href: '/menu', icon: Menu },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        if (item.highlight) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center -mt-5"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg flex items-center justify-center border-4 border-white transition-transform active:scale-95">
                <Icon className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-[10px] font-bold text-amber-700 mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
              isActive ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
