import type { Metadata } from 'next';
import './globals.css';
import { getSessionFromCookies } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

export const metadata: Metadata = {
  title: 'PintTech — Gestão Inteligente para Cervejarias',
  description: 'Controle de barris por código de barras, rastreabilidade, lotes, estoque, pedidos e financeiro.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = getSessionFromCookies();

  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased">
        {session ? (
          <div className="flex flex-col min-h-screen">
            <Navbar user={session} />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar user={session} />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>
            <MobileBottomNav user={session} />
          </div>
        ) : (
          <main className="min-h-screen flex flex-col justify-center items-center p-4">
            {children}
          </main>
        )}
      </body>
    </html>
  );
}
