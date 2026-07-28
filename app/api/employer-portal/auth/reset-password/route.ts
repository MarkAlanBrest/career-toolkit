import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/employerPortalEmail';
import {
  EMPLOYER_SESSION_COOKIE,
  consumePasswordResetToken,
  createEmployerSessionToken,
  createPasswordResetToken,
  getEmployerByEmail,
  getEmployerDashboard,
  getPasswordResetEmail,
  updateEmployerPassword,
} from '@/lib/employerPortalUsers';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://career-toolkit-ruby.vercel.app';
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
  const token = request.nextUrl.searchParams.get('token') || '';
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  const email = await getPasswordResetEmail(token);
  return NextResponse.json({ valid: Boolean(email) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === 'string' ? body.action : '';

  if (action === 'request') {
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    const token = await createPasswordResetToken(email);
    if (token) {
      const resetUrl = `${APP_URL}/employer-portal/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(email, resetUrl);
    }

    return NextResponse.json({
      ok: true,
      message: 'If an employer account exists for that email, a reset link has been sent.',
    });
  }

  if (action === 'confirm') {
    const token = typeof body?.token === 'string' ? body.token : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';

    if (!token) {
      return NextResponse.json({ error: 'Reset link is invalid or has expired.' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Choose a password with at least 8 characters.' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const email = await consumePasswordResetToken(token);
    if (!email) {
      return NextResponse.json({ error: 'Reset link is invalid or has expired.' }, { status: 400 });
    }

    await updateEmployerPassword(email, password);
    const account = await getEmployerByEmail(email);
    if (!account) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
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

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
