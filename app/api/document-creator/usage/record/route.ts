import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/dcAuth';
import { redis } from '@/lib/billing';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const session = await getSession(token);
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { docType?: string; docTypeLabel?: string; model?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const entry = JSON.stringify({
    email: session.email,
    name: session.name,
    docType: body.docType || 'unknown',
    docTypeLabel: body.docTypeLabel || body.docType || 'Unknown',
    model: body.model || 'claude-haiku-4-5',
    ts: Date.now(),
  });

  const key = `dc:usage:${session.schoolId}`;
  await redis.zadd(key, { score: Date.now(), member: entry });
  // Keep only the most recent 1000 entries per school
  await redis.zremrangebyrank(key, 0, -1001);

  return NextResponse.json({ ok: true });
}
