import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/billing';
import { cleanAccountId } from '@/lib/stripe';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export type AutoReloadSettings = {
  enabled: boolean;
  minBalance: number;
  reloadAmount: number;
  stripeCustomerId?: string;
  paymentMethodId?: string;
  cardBrand?: string;
  cardLast4?: string;
  failedAt?: string;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  try {
    const accountId = cleanAccountId(req.nextUrl.searchParams.get('accountId'));
    if (!accountId) return NextResponse.json({ error: 'Invalid account.' }, { status: 400, headers: CORS });
    const settings = await redis.get<AutoReloadSettings>(`ce:auto-reload:${accountId}`) || {};
    return NextResponse.json({ settings }, { headers: CORS });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not load settings.' }, { status: 500, headers: CORS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const accountId = cleanAccountId(body?.accountId);
    if (!accountId) return NextResponse.json({ error: 'Invalid account.' }, { status: 400, headers: CORS });

    const key = `ce:auto-reload:${accountId}`;
    const existing = (await redis.get<AutoReloadSettings>(key)) ?? {} as AutoReloadSettings;

    const updated: AutoReloadSettings = {
      ...existing,
      enabled: Boolean(body?.enabled ?? existing.enabled),
      minBalance: Math.max(0, Math.min(10000, Number(body?.minBalance ?? existing.minBalance ?? 100))),
      reloadAmount: [1000, 2000, 5000].includes(Number(body?.reloadAmount)) ? Number(body.reloadAmount) : (existing.reloadAmount ?? 1000),
    };

    await redis.set(key, updated);
    return NextResponse.json({ settings: updated }, { headers: CORS });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save settings.' }, { status: 500, headers: CORS });
  }
}
