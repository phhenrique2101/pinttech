import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'pinttech-default-secret-key-2026';

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'BREWER' | 'LOGISTICS' | 'SALES' | 'FINANCE';
  breweryId: string | null;
  breweryName?: string;
  brewerySlug?: string;
  permissions?: string[];
  mustChangePassword?: boolean;
}

export function signJwtToken(payload: UserSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function signBiApiToken(payload: UserSession): string {
  return jwt.sign({ ...payload, isBiToken: true }, JWT_SECRET, { expiresIn: '365d' });
}

export function verifyJwtToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
  } catch (error) {
    return null;
  }
}

export function getSessionFromCookies(): UserSession | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('pinttech_token')?.value;
    if (!token) return null;
    return verifyJwtToken(token);
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): UserSession | null {
  const token = req.cookies.get('pinttech_token')?.value || req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyJwtToken(token);
}

export function getAuthCookieOptions(req?: NextRequest | { headers: { get: (name: string) => string | null } }) {
  const isProduction = process.env.NODE_ENV === 'production';
  let host = '';
  if (req) {
    host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  }
  const hostname = host.split(':')[0].toLowerCase();
  const domain = isProduction && hostname.endsWith('pinttech.com.br') ? '.pinttech.com.br' : undefined;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
    ...(domain ? { domain } : {}),
  };
}
