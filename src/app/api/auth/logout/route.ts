import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookieOptions } from '@/lib/auth';

function applyLogoutCookies(response: NextResponse, req: NextRequest) {
  const cookieOptions = getAuthCookieOptions(req);
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Limpeza padrão pelo Next.js com as mesmas opções de criação
  response.cookies.set('pinttech_token', '', {
    ...cookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });

  // 2. Limpeza adicional explícita cobrindo todos os escopos possíveis
  // (Domínio compartilhado com ponto, sem ponto e host-only)
  const cookieBase = 'pinttech_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax';

  if (isProduction) {
    response.headers.append('Set-Cookie', `${cookieBase}; Domain=.pinttech.com.br; Secure`);
    response.headers.append('Set-Cookie', `${cookieBase}; Domain=pinttech.com.br; Secure`);
    response.headers.append('Set-Cookie', `${cookieBase}; Secure`);
  } else {
    response.headers.append('Set-Cookie', cookieBase);
  }
}

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logout realizado com sucesso' });
  applyLogoutCookies(response, req);
  return response;
}

export async function GET(req: NextRequest) {
  const loginUrl = new URL('/login', req.url);
  const response = NextResponse.redirect(loginUrl);
  applyLogoutCookies(response, req);
  return response;
}

