import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logout realizado com sucesso' });
  response.cookies.delete('pinttech_token');
  return response;
}
