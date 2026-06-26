import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/billing';
import { cleanAccountId } from '@/lib/stripe';
import { getProfile } from '@/lib/teamCredits';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const accountId = cleanAccountId(body?.accountId);
    if (!accountId) return NextResponse.json({ ok: false }, { headers: CORS });

    const name = String(body?.name || '').trim().slice(0, 100);
    const existing = await getProfile(accountId);

    // Only write if new (no profile yet) or name changed
    if (!existing.name && !existing.email) {
      await redis.set(`ce:profile:${accountId}`, {
        name: name || '',
        registeredAt: new Date().toISOString(),
      });
    } else if (name && !existing.name) {
      await redis.set(`ce:profile:${accountId}`, { ...existing, name });
    }

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch {
    return NextResponse.json({ ok: false }, { headers: CORS });
  }
}
