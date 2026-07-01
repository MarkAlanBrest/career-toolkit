import { NextRequest, NextResponse } from 'next/server';
import { DcSchool, DcUser, addSchoolToIndex, addTeacherToSchool, generateId, generateToken, getSchool, getSchoolTeacherEmails, getUser, hashPassword, listSchoolIds, removeSchoolFromIndex, removeTeacherFromSchool, saveSchool, saveUser } from '@/lib/dcAuth';
import { redis } from '@/lib/billing';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, x-admin-token' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
export const dynamic = 'force-dynamic';

function verifyAdmin(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token');
  const expected = process.env.ADMIN_TOKEN;
  return !!expected && token === expected;
}

// GET — list all schools with stats
export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: CORS });

  const ids = await listSchoolIds();
  const schools = await Promise.all(ids.map(async (id) => {
    const school = await getSchool(id);
    if (!school) return null;
    const teacherEmails = await getSchoolTeacherEmails(id);
    const balance = await redis.get<number>(`ce:credits:${school.accountId}:ai`) ?? 0;
    return { ...school, teacherCount: teacherEmails.length, balance };
  }));

  return NextResponse.json({ schools: schools.filter(Boolean) }, { headers: CORS });
}

// POST — create a new school + admin account
export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: CORS });

  const body = await req.json().catch(() => null);
  const schoolName = String(body?.schoolName || '').trim();
  const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
  const adminName = String(body?.adminName || '').trim();
  const adminPassword = String(body?.adminPassword || '').trim();

  if (!schoolName || !adminEmail || !adminName || !adminPassword) {
    return NextResponse.json({ error: 'School name, admin email, name, and password are required.' }, { status: 400, headers: CORS });
  }
  if (adminPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400, headers: CORS });
  }

  const existing = await getUser(adminEmail);
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409, headers: CORS });
  }

  const schoolId = generateId();
  const accountId = 'dc_' + generateId();
  const accountToken = generateToken();

  const school: DcSchool = {
    id: schoolId,
    name: schoolName,
    adminEmail,
    accountId,
    accountToken,
    createdAt: new Date().toISOString(),
  };

  const { hash, salt } = hashPassword(adminPassword);
  const adminUser: DcUser = {
    email: adminEmail,
    name: adminName,
    passwordHash: hash,
    passwordSalt: salt,
    schoolId,
    role: 'admin',
    active: true,
    createdAt: new Date().toISOString(),
  };

  await Promise.all([
    saveSchool(school),
    saveUser(adminUser),
    addSchoolToIndex(schoolId),
  ]);

  return NextResponse.json({ ok: true, school: { id: schoolId, name: schoolName, adminEmail, accountId } }, { headers: CORS });
}

// PATCH — update school name or reset admin password
export async function PATCH(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: CORS });

  const body = await req.json().catch(() => null);
  const schoolId = String(body?.schoolId || '');
  if (!schoolId) return NextResponse.json({ error: 'schoolId required.' }, { status: 400, headers: CORS });

  const school = await getSchool(schoolId);
  if (!school) return NextResponse.json({ error: 'School not found.' }, { status: 404, headers: CORS });

  if (body?.schoolName) {
    await saveSchool({ ...school, name: String(body.schoolName).trim() });
  }

  if (body?.adminPassword) {
    const password = String(body.adminPassword).trim();
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400, headers: CORS });
    const admin = await getUser(school.adminEmail);
    if (admin) {
      const { hash, salt } = hashPassword(password);
      await saveUser({ ...admin, passwordHash: hash, passwordSalt: salt });
    }
  }

  if (typeof body?.credits === 'number') {
    await redis.set(`ce:credits:${school.accountId}:ai`, body.credits);
  }

  return NextResponse.json({ ok: true }, { headers: CORS });
}

// DELETE — remove a school and all its teachers
export async function DELETE(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: CORS });

  const body = await req.json().catch(() => null);
  const schoolId = String(body?.schoolId || '');
  if (!schoolId) return NextResponse.json({ error: 'schoolId required.' }, { status: 400, headers: CORS });

  const school = await getSchool(schoolId);
  if (!school) return NextResponse.json({ error: 'School not found.' }, { status: 404, headers: CORS });

  const teacherEmails = await getSchoolTeacherEmails(schoolId);
  await Promise.all([
    ...teacherEmails.map(email => saveUser({ ...(({} as DcUser)), email, active: false } as DcUser).catch(() => {})),
    removeSchoolFromIndex(schoolId),
    redis.del(`dc:school:${schoolId}`),
    redis.del(`dc:school:${schoolId}:teachers`),
    redis.del(`dc:school:${schoolId}:settings`),
    redis.del(`dc:school:${schoolId}:types`),
  ]);

  return NextResponse.json({ ok: true }, { headers: CORS });
}
