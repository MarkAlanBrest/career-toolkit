import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/dcAuth';
import { redis } from '@/lib/billing';
import { cookies } from 'next/headers';

type HistoryEntry = {
  id: string;
  docType: string;
  docTypeLabel: string;
  html: string;
  ts: number;
};

const CAP = 20;

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: 'Session expired.' }, { status: 401 });

  const key = `dc:history:${session.schoolId}:${session.email}`;
  const raw = await redis.zrange(key, 0, -1) as string[];

  const docs = raw
    .map(item => { try { return JSON.parse(item) as HistoryEntry; } catch { return null; } })
    .filter((d): d is HistoryEntry => d !== null)
    .sort((a, b) => b.ts - a.ts);

  return NextResponse.json({ docs });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: 'Session expired.' }, { status: 401 });

  let body: { docType?: string; docTypeLabel?: string; html?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (!body.html) return NextResponse.json({ ok: false }, { status: 400 });

  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    docType: body.docType || 'custom',
    docTypeLabel: body.docTypeLabel || 'Document',
    html: body.html,
    ts: Date.now(),
  };

  const key = `dc:history:${session.schoolId}:${session.email}`;
  await redis.zadd(key, { score: entry.ts, member: JSON.stringify(entry) });
  await redis.zremrangebyrank(key, 0, -(CAP + 1));

  return NextResponse.json({ ok: true, id: entry.id });
}
