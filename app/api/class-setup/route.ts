import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

const redis = Redis.fromEnv();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function randomId() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 5);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: { teacherName?: string; className?: string; term?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }

  const { teacherName, className, term } = body;
  if (!className?.trim()) return json({ error: 'Class name is required.' }, 400);
  if (!term?.trim())      return json({ error: 'Term is required.' }, 400);

  const id = randomId();
  const config = {
    id,
    teacherName: teacherName?.trim() || '',
    className:   className.trim(),
    term:        term.trim(),
    createdAt:   new Date().toISOString(),
  };

  await redis.set(`class-config:${id}`, JSON.stringify(config));
  return json({ id }, 201);
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, 400);

  const raw = await redis.get<string>(`class-config:${id}`);
  if (!raw) return json({ error: 'Class not found.' }, 404);

  const config = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return json(config);
}
