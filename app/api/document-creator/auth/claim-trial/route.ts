import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/dcAuth';
import { redis } from '@/lib/billing';
import { cookies } from 'next/headers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

const TOP_UP = 1000;
const COOLDOWN = 60 * 60 * 24; // 24 hours in seconds

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });

  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: 'Session expired.' }, { status: 401, headers: CORS });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403, headers: CORS });

  const cooldownKey = `dc:topup-cooldown:${session.schoolId}`;
  const onCooldown  = await redis.get(cooldownKey);
  if (onCooldown) {
    return NextResponse.json({ error: 'You can add test credits once every 24 hours.' }, { status: 429, headers: CORS });
  }

  const balanceKey = `ce:credits:${session.accountId}:ai`;
  const newBalance = await redis.incrby(balanceKey, TOP_UP);
  await redis.set(cooldownKey, '1', { ex: COOLDOWN });

  return NextResponse.json({ ok: true, added: TOP_UP, balance: newBalance }, { headers: CORS });
}
