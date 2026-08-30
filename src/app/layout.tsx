import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getSessionFromCookies } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

export const metadata: Metadata = {
  title: 'PintTech — Gestão Inteligente para Cervejarias',
  description: 'Controle de barris por código de barras, rastreabilidade, lotes, estoque, pedidos e financeiro.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PintTech',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = getSessionFromCookies();

  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PintTech" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
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
