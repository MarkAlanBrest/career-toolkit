import { NextRequest, NextResponse } from 'next/server';
import { addAdminAccount, getAdminAccounts, isAdminAuthorized, removeAdminAccount } from '@/lib/lgaRoom';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function authorized(request: NextRequest) {
  return isAdminAuthorized(request.headers.get('x-admin-email'), request.headers.get('x-admin-password'));
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  try {
    const accounts = await getAdminAccounts();
    return NextResponse.json({ admins: accounts.map(a => ({ email: a.email, createdAt: a.createdAt })) });
  } catch (error) {
    console.error('[lga-room] Could not load admins:', error);
    return NextResponse.json({ error: 'Could not load admins.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email, password } = body as Record<string, string>;
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  try {
    await addAdminAccount(email.trim(), password);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('[lga-room] Could not add admin:', error);
    return NextResponse.json({ error: 'Could not add this admin.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'An email is required.' }, { status: 400 });
  }

  try {
    await removeAdminAccount(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[lga-room] Could not remove admin:', error);
    return NextResponse.json({ error: 'Could not remove this admin.' }, { status: 500 });
  }
}
