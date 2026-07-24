import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {
  BROADCAST_SESSION_COOKIE,
  BROADCAST_SESSION_SECONDS,
  createBroadcastSession,
  destroyBroadcastSession,
  getBroadcastSession,
} from '@/lib/broadcastAuth';
import {
  authenticateBroadcastAccount,
  createFirstBroadcastAccount,
  hasBroadcastAccounts,
} from '@/lib/broadcastAccounts';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

function bootstrapCredentials() {
  return {
    email: process.env.CANVAS_BROADCAST_ADMIN_EMAIL?.trim().toLowerCase() || '',
    password: process.env.CANVAS_BROADCAST_ADMIN_PASSWORD || '',
  };
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(BROADCAST_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: BROADCAST_SESSION_SECONDS,
  });
}

export async function GET(request: NextRequest) {
  const account = await getBroadcastSession(request);
  const hasAccounts = await hasBroadcastAccounts();
  const bootstrap = bootstrapCredentials();
  return NextResponse.json({
    authenticated: Boolean(account),
    account,
    setupRequired: !hasAccounts && !(bootstrap.email && bootstrap.password),
  });
}

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);
  const action = String(input?.action || 'login');
  try {
    let account;
    if (action === 'setup') {
      account = await createFirstBroadcastAccount(input || {});
    } else {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const attemptsKey = `canvas-broadcast:login-attempts:${ip}`;
      const attempts = Number(await redis.get<number>(attemptsKey) || 0);
      if (attempts >= 5) return NextResponse.json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }, { status: 429 });
      const loginEmail = String(input?.email || '').trim().toLowerCase();
      const loginPassword = String(input?.password || '');
      account = await authenticateBroadcastAccount(loginEmail, loginPassword);
      if (!account && !(await hasBroadcastAccounts())) {
        const bootstrap = bootstrapCredentials();
        if (bootstrap.email && bootstrap.password
          && safeEqual(loginEmail, bootstrap.email)
          && safeEqual(loginPassword, bootstrap.password)) {
          account = await createFirstBroadcastAccount({
            name: loginEmail.split('@')[0] || 'Administrator',
            email: loginEmail,
            password: loginPassword,
          });
        }
      }
      if (!account) {
        await redis.set(attemptsKey, attempts + 1, { ex: 900 });
        return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
      }
      await redis.del(attemptsKey);
    }

    const response = NextResponse.json({ authenticated: true, account });
    setSessionCookie(response, await createBroadcastSession(account));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create administrator account.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  await destroyBroadcastSession(request);
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
