import { NextRequest, NextResponse } from 'next/server';
import {
  BROADCAST_SESSION_COOKIE,
  BROADCAST_SESSION_SECONDS,
  createBroadcastSession,
  isBroadcastAuthorized,
  validateBroadcastLogin,
} from '@/lib/broadcastAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isBroadcastAuthorized(request) });
}

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);
  const email = String(input?.email || '');
  const password = String(input?.password || '');
  if (!validateBroadcastLogin(email, password)) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(BROADCAST_SESSION_COOKIE, createBroadcastSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: BROADCAST_SESSION_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(BROADCAST_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
