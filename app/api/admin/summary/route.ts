import { NextRequest, NextResponse } from 'next/server';
import { PRODUCTS } from '@/lib/products';
import { redis } from '@/lib/billing';

export const dynamic = 'force-dynamic';

type RedisLike = typeof redis & {
  keys?: (pattern: string) => Promise<string[]>;
  llen?: (key: string) => Promise<number>;
};

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, x-admin-token' };

function authorized(request: NextRequest) {
  const expected = process.env.ADMIN_TOKEN || process.env.SIGNUP_ADMIN_TOKEN || '';
  const provided = request.headers.get('x-admin-token') || request.nextUrl.searchParams.get('token') || '';
  return Boolean(expected && provided && provided === expected);
}

async function countKeys(client: RedisLike, pattern: string) {
  if (!client.keys) return null;
  const keys = await client.keys(pattern);
  return keys.length;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Admin token required.' }, { status: 401, headers: CORS });
  }

  const client = redis as RedisLike;
  try {
    const [signups, licenses, usageKeys, bonusKeys, customerLinks] = await Promise.all([
      client.llen ? client.llen('text-signups') : Promise.resolve(null),
      countKeys(client, 'ce:license:*'),
      countKeys(client, 'ce:usage:*'),
      countKeys(client, 'ce:bonus:*'),
      countKeys(client, 'ce:customer-licenses:*'),
    ]);

    return NextResponse.json({
      products: PRODUCTS,
      stats: {
        signups,
        licenses,
        usageKeys,
        bonusKeys,
        customerLinks,
      },
      billingProvider: 'stripe',
      accountModel: 'canvas_identity_plus_credits',
      generatedAt: new Date().toISOString(),
    }, { headers: CORS });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not load admin summary.',
      products: PRODUCTS,
    }, { status: 500, headers: CORS });
  }
}
