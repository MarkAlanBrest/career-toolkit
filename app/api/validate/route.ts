import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const redis = Redis.fromEnv();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const key: string = String(body?.key ?? '').toUpperCase().trim();

  if (!key) {
    return NextResponse.json({ valid: false, error: 'No key provided' }, { status: 400, headers: CORS });
  }

  const formatOk = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key);
  if (!formatOk) {
    return NextResponse.json({ valid: false, error: 'Invalid key format' }, { status: 200, headers: CORS });
  }

  const redisKey = `license:${key}`;
  const existing = await redis.get<{ plan: string; active: boolean }>(redisKey);

  if (existing) {
    // Key already activated — return current status
    return NextResponse.json({ valid: existing.active, plan: existing.plan }, { status: 200, headers: CORS });
  }

  // TODO: verify against Lemon Squeezy API before activating
  // For now: any correctly formatted key is accepted and stored as pro
  const thisMonth = new Date().toISOString().slice(0, 7);
  const record = { plan: 'pro', usage: 0, reset: thisMonth, active: true, activated: Date.now() };
  await redis.set(redisKey, record);

  return NextResponse.json({ valid: true, plan: 'pro' }, { status: 200, headers: CORS });
}
