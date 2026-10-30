import type { Metadata, Viewport } from 'next';
import './globals.css';
import { headers, cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';

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
  themeColor: '#f8fafc',
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
  // Padrão do sistema PintTech: Modo Claro refinado com alto contraste em todos os módulos e subdomínios
  const isDark = savedTheme === 'dark';

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
                  } else {
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
          <AppShell user={session} isBrewSubdomain={isBrewSubdomain}>
            {children}
          </AppShell>
        ) : (
          <main className="min-h-screen flex flex-col justify-center items-center p-4">
            {children}
          </main>
        )}
      </body>
    </html>
  );
}
