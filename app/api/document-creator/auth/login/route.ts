import { NextRequest, NextResponse } from 'next/server';
import { getUser, getSchool, verifyPassword, createSession, sessionCookieOptions, DcSession } from '@/lib/dcAuth';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400, headers: CORS });
    }

    const user = await getUser(email);
    if (!user || !user.active) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401, headers: CORS });
    }

    const valid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401, headers: CORS });
    }

    const school = await getSchool(user.schoolId);
    if (!school) {
      return NextResponse.json({ error: 'School account not found. Contact your administrator.' }, { status: 403, headers: CORS });
    }

    const session: DcSession = {
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      schoolName: school.name,
      accountId: school.accountId,
      accountToken: school.accountToken,
    };

    const token = await createSession(session);

    const resp = NextResponse.json({ ok: true, session }, { headers: CORS });
    resp.cookies.set('dc_session', token, sessionCookieOptions());
    return resp;
  } catch (e) {
    console.error('DC login error', e);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500, headers: CORS });
  }
}
