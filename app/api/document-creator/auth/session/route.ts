import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUser, saveUser, hashPassword, SESSION_TTL } from '@/lib/dcAuth';
import { redis } from '@/lib/billing';
import { cookies } from 'next/headers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('dc_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });

    const session = await getSession(token);
    if (!session) return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401, headers: CORS });

    return NextResponse.json({ session }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: 'Session check failed.' }, { status: 500, headers: CORS });
  }
}

// PATCH — self-service: any signed-in user (teacher or admin) can update their own name/password.
// Always scoped to the caller's own session email — never accepts a target email.
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });

  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401, headers: CORS });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const password = typeof body?.password === 'string' ? body.password.trim() : '';

  if (!name && !password) {
    return NextResponse.json({ error: 'Enter a new name or password.' }, { status: 400, headers: CORS });
  }
  if (password && password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400, headers: CORS });
  }

  const user = await getUser(session.email);
  if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404, headers: CORS });

  const updatedUser = { ...user };
  if (name) updatedUser.name = name;
  if (password) {
    const { hash, salt } = hashPassword(password);
    updatedUser.passwordHash = hash;
    updatedUser.passwordSalt = salt;
  }
  await saveUser(updatedUser);

  // Keep the active session's cached name in sync so the UI reflects it without re-login.
  if (name) {
    await redis.set(`dc:session:${token}`, JSON.stringify({ ...session, name }), { ex: SESSION_TTL });
  }

  return NextResponse.json({ ok: true, name: name || session.name }, { headers: CORS });
}
