import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const PLAN_LIMITS: Record<string, number> = {
  base: 50,
  pro: 150,
  owner: 99999,
};

// Owner backdoor key — never expires, never rate-limited
const OWNER_KEY = process.env.OWNER_KEY ?? '';

const redis = Redis.fromEnv();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: CORS });
  }

  const { messages, max_tokens = 12000, model = 'claude-sonnet-4-6', licenseKey } = body;

  if (!licenseKey) {
    return NextResponse.json({ error: 'License key required' }, { status: 401, headers: CORS });
  }

  // Owner backdoor — bypasses Redis and usage limits entirely
  const isOwner = OWNER_KEY && String(licenseKey).toUpperCase() === OWNER_KEY.toUpperCase();

  // Load license record from Redis
  const redisKey = `license:${String(licenseKey).toUpperCase()}`;

  if (!isOwner) {
    const record = await redis.get<{
      plan: string; usage: number; reset: string; active: boolean;
    }>(redisKey);

    if (!record || !record.active) {
      return NextResponse.json({ error: 'Invalid or inactive license key. Enter your key in Settings.' }, { status: 403, headers: CORS });
    }

    const thisMonth = new Date().toISOString().slice(0, 7);
    const usage = record.reset === thisMonth ? record.usage : 0;
    const limit = PLAN_LIMITS[record.plan] ?? PLAN_LIMITS.pro;

    if (usage >= limit) {
      return NextResponse.json(
        { error: `Monthly limit reached (${limit} generations). Upgrade your plan for more.` },
        { status: 429, headers: CORS }
      );
    }

    // Increment usage after successful call (done below)
    const _recordRef = record; void _recordRef;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: CORS });
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens, messages }),
  });

  const data = await anthropicRes.json();

  if (!anthropicRes.ok) {
    return NextResponse.json(
      { error: data?.error?.message || `Anthropic error ${anthropicRes.status}` },
      { status: anthropicRes.status, headers: CORS }
    );
  }

  // Increment usage after successful generation (skip for owner key)
  if (!isOwner) {
    const rec = await redis.get<{ plan: string; usage: number; reset: string; active: boolean }>(redisKey);
    if (rec) {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const usage = rec.reset === thisMonth ? rec.usage : 0;
      await redis.set(redisKey, { ...rec, usage: usage + 1, reset: thisMonth });
    }
  }

  return NextResponse.json(data, { status: 200, headers: CORS });
}
