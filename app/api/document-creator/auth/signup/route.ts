import { NextRequest, NextResponse } from 'next/server';
import {
  DcSchool, DcUser, DcSession,
  addSchoolToIndex, generateId, generateToken,
  hashPassword, saveSchool, saveUser, getUser, createSession, sessionCookieOptions,
} from '@/lib/dcAuth';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const schoolName = String(body?.schoolName || '').trim();
    const name      = String(body?.name       || '').trim();
    const email     = String(body?.email      || '').trim().toLowerCase();
    const password  = String(body?.password   || '');

    if (!schoolName || !name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400, headers: CORS });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400, headers: CORS });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400, headers: CORS });
    }

    // Check if email already exists
    const existing = await getUser(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409, headers: CORS });
    }

    const schoolId    = generateId();
    const accountId   = 'dc_' + generateId();
    const accountToken = generateToken();

    const school: DcSchool = {
      id: schoolId, name: schoolName, adminEmail: email,
      accountId, accountToken, createdAt: new Date().toISOString(),
    };

    const { hash, salt } = hashPassword(password);
    const user: DcUser = {
      email, name, passwordHash: hash, passwordSalt: salt,
      schoolId, role: 'admin', active: true,
      createdAt: new Date().toISOString(),
    };

    await Promise.all([saveSchool(school), saveUser(user), addSchoolToIndex(schoolId)]);

    const session: DcSession = {
      email, name, role: 'admin',
      schoolId, schoolName: school.name,
      accountId, accountToken,
    };
    const token = await createSession(session);

    const resp = NextResponse.json({ ok: true }, { headers: CORS });
    resp.cookies.set('dc_session', token, sessionCookieOptions());
    return resp;
  } catch (e) {
    console.error('DC signup error', e);
    return NextResponse.json({ error: 'Sign up failed. Please try again.' }, { status: 500, headers: CORS });
  }
}
