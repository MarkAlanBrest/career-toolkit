import { NextResponse } from 'next/server';
import { getSession } from '@/lib/dcAuth';
import { redis } from '@/lib/billing';
import { cookies } from 'next/headers';

type UsageEntry = {
  email: string;
  name: string;
  docType: string;
  docTypeLabel: string;
  model: string;
  ts: number;
};

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Admin only.' }, { status: 403 });

  const key = `dc:usage:${session.schoolId}`;
  const raw = await redis.zrange(key, 0, -1) as (string | UsageEntry)[];

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();

  let totalAll = 0;
  let totalMonth = 0;
  const byTeacher: Record<string, { name: string; email: string; total: number; thisMonth: number }> = {};
  const byDocType: Record<string, { label: string; count: number }> = {};
  const allEntries: UsageEntry[] = [];

  for (const item of raw) {
    // The Redis client auto-deserializes JSON-shaped members, so entries may already be objects,
    // not strings — only parse when we actually got a string back.
    let parsed: UsageEntry;
    try { parsed = typeof item === 'string' ? (JSON.parse(item) as UsageEntry) : item; } catch { continue; }
    allEntries.push(parsed);

    totalAll++;
    if (parsed.ts >= monthStartMs) totalMonth++;

    if (!byTeacher[parsed.email]) {
      byTeacher[parsed.email] = { name: parsed.name, email: parsed.email, total: 0, thisMonth: 0 };
    }
    byTeacher[parsed.email].total++;
    if (parsed.ts >= monthStartMs) byTeacher[parsed.email].thisMonth++;

    if (!byDocType[parsed.docType]) {
      byDocType[parsed.docType] = { label: parsed.docTypeLabel || parsed.docType, count: 0 };
    }
    byDocType[parsed.docType].count++;
  }

  // Capped at 1000 per school (see usage/record route) — safe to return in full so per-teacher
  // activity views can filter client-side without missing older entries from less-active teachers.
  const recent = [...allEntries].sort((a, b) => b.ts - a.ts);

  return NextResponse.json({
    totalAll,
    totalMonth,
    byTeacher: Object.values(byTeacher).sort((a, b) => b.total - a.total),
    byDocType: Object.values(byDocType).sort((a, b) => b.count - a.count),
    recent,
  });
}
