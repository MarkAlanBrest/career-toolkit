import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/dcAuth';
import { redis } from '@/lib/billing';
import { cookies } from 'next/headers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

const TRIAL_CREDITS = 1000;

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });

  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: 'Session expired.' }, { status: 401, headers: CORS });

  const balanceKey = `ce:credits:${session.accountId}:ai`;
  const claimKey   = `dc:trial-claimed:${session.schoolId}`;

  const alreadyClaimed = await redis.get(claimKey);
  if (alreadyClaimed) {
    return NextResponse.json({ error: 'Trial credits already claimed.' }, { status: 409, headers: CORS });
  }

  await Promise.all([
    redis.set(balanceKey, TRIAL_CREDITS),
    redis.set(claimKey, '1'),
  ]);

  return NextResponse.json({ ok: true, credits: TRIAL_CREDITS }, { headers: CORS });
}
