import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') || '';

  // Detecta se a requisição veio através do subdomínio brew (ex: brew.pinttech.com.br ou brew.localhost:3000)
  const isBrewSubdomain = host.startsWith('brew.') || host.includes('brew.');

  if (isBrewSubdomain) {
    // Se estiver acessando a raiz do subdomínio, redireciona/reescreve internamente para a página do Brew Studio (/brew)
    if (url.pathname === '/') {
      url.pathname = '/brew';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icons, manifest (static assets)
     */
    '/((?!api|_next/static|_next/image|icons|favicon.ico|manifest.json).*)',
  ],
};
