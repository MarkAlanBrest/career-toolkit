import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUser, saveUser, getSchoolTeacherEmails, addTeacherToSchool, removeTeacherFromSchool, hashPassword, DcUser } from '@/lib/dcAuth';
import { cookies } from 'next/headers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return null;
  const session = await getSession(token);
  if (!session || session.role !== 'admin') return null;
  return session;
}

// GET — list all teachers in the school
export async function GET(_req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Admin access required.' }, { status: 403, headers: CORS });

  const emails = await getSchoolTeacherEmails(session.schoolId);
  const teachers = await Promise.all(
    emails.map(async (email) => {
      const user = await getUser(email);
      return user ? { email: user.email, name: user.name, active: user.active, createdAt: user.createdAt } : null;
    })
  );

  return NextResponse.json({ teachers: teachers.filter(Boolean) }, { headers: CORS });
}

// POST — create a new teacher
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Admin access required.' }, { status: 403, headers: CORS });

  const body = await req.json().catch(() => null);
  const email = String(body?.email || '').trim().toLowerCase();
  const name = String(body?.name || '').trim();
  const password = String(body?.password || '').trim();

  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Email, name, and password are required.' }, { status: 400, headers: CORS });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400, headers: CORS });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400, headers: CORS });
  }

  const existing = await getUser(email);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409, headers: CORS });
  }

  const { hash, salt } = hashPassword(password);
  const user: DcUser = {
    email,
    name,
    passwordHash: hash,
    passwordSalt: salt,
    schoolId: session.schoolId,
    role: 'teacher',
    active: true,
    createdAt: new Date().toISOString(),
  };

  await saveUser(user);
  await addTeacherToSchool(session.schoolId, email);

  return NextResponse.json({ ok: true, teacher: { email, name, active: true } }, { headers: CORS });
}

// DELETE — remove a teacher
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Admin access required.' }, { status: 403, headers: CORS });

  const body = await req.json().catch(() => null);
  const email = String(body?.email || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Email required.' }, { status: 400, headers: CORS });

  const user = await getUser(email);
  if (!user || user.schoolId !== session.schoolId) {
    return NextResponse.json({ error: 'Teacher not found in your school.' }, { status: 404, headers: CORS });
  }

  await removeTeacherFromSchool(session.schoolId, email);
  // Deactivate rather than delete so login attempts fail cleanly
  await saveUser({ ...user, active: false });

  return NextResponse.json({ ok: true }, { headers: CORS });
}

// PATCH — reset a teacher's password
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Admin access required.' }, { status: 403, headers: CORS });

  const body = await req.json().catch(() => null);
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '').trim();

  if (!email || !password) return NextResponse.json({ error: 'Email and new password required.' }, { status: 400, headers: CORS });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400, headers: CORS });

  const user = await getUser(email);
  if (!user || user.schoolId !== session.schoolId) {
    return NextResponse.json({ error: 'Teacher not found in your school.' }, { status: 404, headers: CORS });
  }

  const { hash, salt } = hashPassword(password);
  await saveUser({ ...user, passwordHash: hash, passwordSalt: salt });

  return NextResponse.json({ ok: true }, { headers: CORS });
}
