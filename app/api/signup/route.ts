import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

const redis = Redis.fromEnv();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: { name?: string; phone?: string; className?: string; courseId?: string; term?: string; optIn?: boolean };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }

  const { name, phone, className, courseId, term, optIn } = body;

  if (!phone || !/^\d{10}$/.test(phone)) return json({ error: 'A valid 10-digit phone number is required.' }, 400);
  if (!optIn)                             return json({ error: 'Opt-in consent is required.' }, 400);

  // Duplicate check: same phone + class
  const dupKey = `text-signup-check:${phone}:${className.trim().toLowerCase()}`;
  const already = await redis.exists(dupKey);
  if (already) return json({ error: 'This phone number is already signed up for that class.' }, 409);

  const signup = {
    id:        Date.now(),
    name:      name?.trim()      || 'Student',
    phone,
    className: className?.trim() || '—',
    courseId:  courseId           || '—',
    term:      term?.trim()      || '—',
    optIn:     true,
    createdAt: new Date().toISOString(),
  };

  await redis.rpush('text-signups', JSON.stringify(signup));
  await redis.set(dupKey, '1');

  return json({ ok: true }, 201);
}

// GET /api/signup?teacher=Mr.+Smith&class=Biology+101
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teacherFilter = searchParams.get('teacher')?.toLowerCase();
  const classFilter   = searchParams.get('class')?.toLowerCase();

  const raw = await redis.lrange<string>('text-signups', 0, -1);
  type Signup = { id: number; name: string; phone: string; className: string; teacher: string; term: string; createdAt: string };
  let signups: Signup[] = raw.map(s => (typeof s === 'string' ? JSON.parse(s) : s));

  if (teacherFilter) signups = signups.filter(s => s.teacher.toLowerCase().includes(teacherFilter));
  if (classFilter)   signups = signups.filter(s => s.className.toLowerCase().includes(classFilter));

  signups = signups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return json({ signups });
}
