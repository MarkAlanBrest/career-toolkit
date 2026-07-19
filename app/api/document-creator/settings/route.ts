import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/dcAuth';
import { redis } from '@/lib/redis';
import { cookies } from 'next/headers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
export const dynamic = 'force-dynamic';

async function getSessionFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return null;
  return getSession(token);
}

export async function GET(_req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });

  const [rawSettings, rawTypes] = await Promise.all([
    redis.get<string>(`dc:school:${session.schoolId}:settings`),
    redis.get<string>(`dc:school:${session.schoolId}:types`),
  ]);

  const adminSettings = rawSettings
    ? (typeof rawSettings === 'string' ? JSON.parse(rawSettings) : rawSettings)
    : null;
  const docTypes = rawTypes
    ? (typeof rawTypes === 'string' ? JSON.parse(rawTypes) : rawTypes)
    : null;

  return NextResponse.json({ adminSettings, docTypes }, { headers: CORS });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403, headers: CORS });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: CORS });

  await Promise.all([
    body.adminSettings !== undefined
      ? redis.set(`dc:school:${session.schoolId}:settings`, JSON.stringify(body.adminSettings))
      : Promise.resolve(),
    body.docTypes !== undefined
      ? redis.set(`dc:school:${session.schoolId}:types`, JSON.stringify(body.docTypes))
      : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true }, { headers: CORS });
}
