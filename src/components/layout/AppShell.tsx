'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar, { CurrentUser } from '@/components/layout/Navbar';
import BrewNavbar from '@/components/layout/BrewNavbar';
import Sidebar from '@/components/layout/Sidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt';

interface AppShellProps {
  user: CurrentUser | null;
  isBrewSubdomain: boolean;
  children: React.ReactNode;
}

export default function AppShell({ user, isBrewSubdomain, children }: AppShellProps) {
  const pathname = usePathname();
  const isFabrica = pathname?.startsWith('/fabrica');

  // Modo Imersivo de Chão de Fábrica (Tela cheia para tablets e celulares sem barras do ERP)
  if (isFabrica) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <main className="flex-1 w-full overflow-y-auto">
          {children}
        </main>
        <PwaInstallPrompt />
      </div>
    );
  }

  // Modo Subdomínio Brew (Apenas Tanques & Produção)
  if (isBrewSubdomain) {
    return (
      <div className="flex flex-col min-h-screen">
        <BrewNavbar user={user} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 w-full max-w-[1600px] mx-auto pb-16 md:pb-8">
          {children}
        </main>
        <PwaInstallPrompt />
      </div>
    );
  }

  // Modo ERP Padrão (Navbar superior, Sidebar lateral, Conteúdo central e Barra Mobile)
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <MobileBottomNav user={user} />
      <PwaInstallPrompt />
    </div>
  );
}
