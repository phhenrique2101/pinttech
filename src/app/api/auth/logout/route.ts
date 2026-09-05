import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logout realizado com sucesso' });
  const cookieOptions = getAuthCookieOptions(req);

  response.cookies.set('pinttech_token', '', {
    ...cookieOptions,
    maxAge: 0,
  });
  response.cookies.delete('pinttech_token');

  return response;
}
