import type { Metadata, Viewport } from 'next';
import './globals.css';
import { headers, cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import BrewNavbar from '@/components/layout/BrewNavbar';
import Sidebar from '@/components/layout/Sidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt';

export const metadata: Metadata = {
  title: 'PintTech — Gestão Inteligente para Cervejarias',
  description: 'Controle de produção, tanques, barris, rastreabilidade MAPA e financeiro.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PintTech Brew',
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
  const headerList = headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || '';
  const isBrewSubdomain = host.startsWith('brew.') || host.includes('brew.');

  const cookieStore = cookies();
  const savedTheme = cookieStore.get('pinttech_theme')?.value;
  // Se houver tema salvo (dark ou light), usa ele; caso contrário, brew default dark e ERP default light
  const isDark = savedTheme ? savedTheme === 'dark' : isBrewSubdomain;

  return (
    <html lang="pt-BR" className={isDark ? 'dark' : ''} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PintTech Brew" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('pinttech_theme');
                  if (saved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (saved === 'light') {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        {session ? (
          isBrewSubdomain ? (
            /* Layout exclusivo e maximizado para o subdomínio brew (somente Produção & Tanques + PWA) */
            <div className="flex flex-col min-h-screen">
              <BrewNavbar user={session} />
              <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 w-full max-w-[1600px] mx-auto pb-16 md:pb-8">
                {children}
              </main>
              <PwaInstallPrompt />
            </div>
          ) : (
            /* Layout ERP completo (Navbar, Sidebar completa com todos os módulos e MobileNav) */
            <div className="flex flex-col min-h-screen">
              <Navbar user={session} />
              <div className="flex flex-1 overflow-hidden">
                <Sidebar user={session} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
                  {children}
                </main>
              </div>
              <MobileBottomNav user={session} />
              <PwaInstallPrompt />
            </div>
          )
        ) : (
          <main className="min-h-screen flex flex-col justify-center items-center p-4">
            {children}
          </main>
        )}
      </body>
    </html>
  );
}
