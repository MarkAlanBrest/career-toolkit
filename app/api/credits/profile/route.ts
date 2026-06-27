import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedCreditAccount, validateAccountToken } from '@/lib/accountAuth';
import { stripe, cleanAccountId } from '@/lib/stripe';
import { getProfile, saveProfile } from '@/lib/teamCredits';

export type TeacherProfile = { name: string; email: string; };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const accountId = cleanAccountId(req.nextUrl.searchParams.get('accountId'));
  if (!accountId) return NextResponse.json({ profile: {} }, { headers: CORS });
  const verified = await validateAccountToken(accountId, req.nextUrl.searchParams.get('accountToken'));
  if (!verified) return NextResponse.json({ profile: {} }, { headers: CORS });
  const profile = await getProfile(accountId);
  return NextResponse.json({ profile }, { headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const accountId = cleanAccountId(body?.accountId);
    if (!accountId) return NextResponse.json({ error: 'Invalid account.' }, { status: 400, headers: CORS });
    const verified = await validateAccountToken(accountId, body?.accountToken);
    if (!verified) return NextResponse.json(unauthorizedCreditAccount, { status: 403, headers: CORS });

    const name          = String(body?.name         || '').trim().slice(0, 100);
    const email         = String(body?.email        || '').trim().toLowerCase().slice(0, 200);
    const canvasUserId  = String(body?.canvasUserId || '').trim().slice(0, 50);
    const canvasDomain  = String(body?.canvasDomain || '').trim().slice(0, 200);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Name and valid email required.' }, { status: 400, headers: CORS });
    }

    await saveProfile(accountId, { name, email, canvasUserId, canvasDomain });

    // Keep Stripe customer in sync
    const { redis } = await import('@/lib/billing');
    const customerId = await redis.get<string>(`ce:stripe-customer:${accountId}`);
    if (customerId) {
      await stripe.customers.update(customerId, { name, email }).catch(() => {});
    }

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save profile.' }, { status: 500, headers: CORS });
  }
}
