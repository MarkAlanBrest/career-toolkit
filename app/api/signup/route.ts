import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

const redis = Redis.fromEnv();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type Signup = {
  id: number;
  name: string;
  phone: string;
  className: string;
  courseId: string;
  teacher?: string;
  term: string;
  optIn: boolean;
  createdAt: string;
};

type RawSignup = Partial<Signup> & {
  class_name?: string;
  created_at?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function normalizeSignup(raw: string | RawSignup): Signup {
  const parsed: RawSignup = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return {
    id: Number(parsed.id || 0),
    name: String(parsed.name || 'Student'),
    phone: String(parsed.phone || ''),
    className: String(parsed.className || parsed.class_name || '-'),
    courseId: String(parsed.courseId || '-'),
    teacher: parsed.teacher ? String(parsed.teacher) : '',
    term: String(parsed.term || '-'),
    optIn: parsed.optIn !== false,
    createdAt: String(parsed.createdAt || parsed.created_at || new Date(0).toISOString()),
  };
}

function duplicateKey(phone: string, courseId: string, className: string) {
  return `text-signup-check:${phone}:${courseId}:${className.toLowerCase()}`;
}

function authorized(req: NextRequest) {
  const expected = process.env.SIGNUP_ADMIN_TOKEN?.trim();
  if (!expected) return true;
  const provided = req.headers.get('x-signup-admin-token') || new URL(req.url).searchParams.get('token') || '';
  return provided === expected;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: { name?: string; phone?: string; className?: string; courseId?: string; teacher?: string; term?: string; optIn?: boolean };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }

  const { name, phone, className, courseId, teacher, term, optIn } = body;

  if (!phone || !/^\d{10}$/.test(phone)) return json({ error: 'A valid 10-digit phone number is required.' }, 400);
  if (!optIn)                             return json({ error: 'Opt-in consent is required.' }, 400);

  const normalizedClass = className?.trim() || '-';
  const normalizedCourseId = courseId?.trim() || '-';
  const dupKey = duplicateKey(phone, normalizedCourseId, normalizedClass);
  const already = await redis.exists(dupKey);
  if (already) return json({ error: 'This phone number is already signed up for that class.' }, 409);

  const signup: Signup = {
    id:        Date.now(),
    name:      name?.trim() || 'Student',
    phone,
    className: normalizedClass,
    courseId:  normalizedCourseId,
    teacher:   teacher?.trim() || '',
    term:      term?.trim() || '-',
    optIn:     true,
    createdAt: new Date().toISOString(),
  };

  await redis.rpush('text-signups', JSON.stringify(signup));
  await redis.set(dupKey, '1');

  return json({ ok: true }, 201);
}

// GET /api/signup?courseId=157
export async function GET(req: NextRequest) {
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);

  const { searchParams } = new URL(req.url);
  const teacherFilter = searchParams.get('teacher')?.toLowerCase();
  const classFilter   = searchParams.get('class')?.toLowerCase();
  const courseFilter  = searchParams.get('courseId');

  const raw = await redis.lrange<string | RawSignup>('text-signups', 0, -1);
  let signups = raw.map(normalizeSignup);

  if (teacherFilter) signups = signups.filter(s => s.teacher?.toLowerCase().includes(teacherFilter));
  if (classFilter)   signups = signups.filter(s => s.className.toLowerCase().includes(classFilter));
  if (courseFilter)  signups = signups.filter(s => String(s.courseId || '') === courseFilter);

  signups = signups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return json({ signups });
}

export async function DELETE(req: NextRequest) {
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing signup id.' }, 400);

  const raw = await redis.lrange<string | RawSignup>('text-signups', 0, -1);
  const signups = raw.map(normalizeSignup);
  const target = signups.find(s => String(s.id) === id);
  if (!target) return json({ error: 'Signup not found.' }, 404);

  await redis.lrem('text-signups', 1, JSON.stringify(target));
  await redis.del(duplicateKey(target.phone, target.courseId || '-', target.className || '-'));
  await redis.del(`text-signup-check:${target.phone}:${(target.className || '-').toLowerCase()}`);

  return json({ ok: true });
}
