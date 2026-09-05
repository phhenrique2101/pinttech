import { NextRequest, NextResponse } from 'next/server';

function isTokenValid(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (!payload || !payload.userId) return false;
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') || '';

  // Detecta se a requisição veio através do subdomínio brew (ex: brew.pinttech.com.br ou brew.localhost:3000)
  const isBrewSubdomain = host.startsWith('brew.') || host.includes('brew.');

  const token = req.cookies.get('pinttech_token')?.value;
  const isAuthenticated = isTokenValid(token);

  const isLoginPage = url.pathname === '/login';

  // 1. Se o usuário não está autenticado e tenta acessar qualquer página protegida (incluindo brew.pinttech.com.br/)
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL('/login', req.url);
    if (url.pathname !== '/') {
      loginUrl.searchParams.set('redirect', url.pathname + url.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Se o usuário já está autenticado e acessa a página de login
  if (isAuthenticated && isLoginPage) {
    const redirectParam = url.searchParams.get('redirect');
    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      const targetUrl = new URL(redirectParam, req.url);
      return NextResponse.redirect(targetUrl);
    }

    const homeUrl = new URL('/', req.url);
    return NextResponse.redirect(homeUrl);
  }

  // 3. Se estiver no subdomínio brew e autenticado:
  if (isBrewSubdomain) {
    // Se estiver acessando a raiz do subdomínio, redireciona/reescreve internamente para a página de Produção & Tanques (/producao)
    if (url.pathname === '/') {
      url.pathname = '/producao';
      return NextResponse.rewrite(url);
    }

    if (url.pathname === '/brew') {
      url.pathname = '/producao';
      return NextResponse.redirect(url);
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
    '/((?!api|_next/static|_next/image|icons|favicon.ico|manifest.json|manifest.webmanifest).*)',
  ],
};
