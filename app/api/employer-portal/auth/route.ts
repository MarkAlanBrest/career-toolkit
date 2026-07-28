import { NextRequest, NextResponse } from 'next/server';
import {
  EMPLOYER_SESSION_COOKIE,
  authenticateEmployer,
  createEmployerSessionToken,
  deleteEmployerSession,
  getEmployerByEmail,
  getEmployerDashboard,
  getEmployerSessionEmail,
} from '@/lib/employerPortalUsers';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function setSessionCookie(response: NextResponse, email: string) {
  response.cookies.set(EMPLOYER_SESSION_COOKIE, await createEmployerSessionToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function GET(request: NextRequest) {
  const email = await getEmployerSessionEmail(request);
  if (!email) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const account = await getEmployerByEmail(email);
  if (!account) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const dashboard = await getEmployerDashboard(email);
  return NextResponse.json({
    authenticated: true,
    email,
    profile: account.profile,
    dashboard,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
  }

  const account = await authenticateEmployer(email, password);
  if (!account) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  const response = NextResponse.json({
    authenticated: true,
    email: account.email,
    profile: account.profile,
    dashboard: await getEmployerDashboard(account.email),
  });
  await setSessionCookie(response, account.email);
  return response;
}

export async function DELETE(request: NextRequest) {
  await deleteEmployerSession(request);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(EMPLOYER_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
