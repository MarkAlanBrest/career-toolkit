import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

type RedisLike = typeof redis & {
  scard?: (key: string) => Promise<number>;
  smembers?: (key: string) => Promise<string[]>;
};

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, x-admin-token' };
const DAYS_BACK = 30;

function authorized(request: NextRequest) {
  const expected = process.env.ADMIN_TOKEN || process.env.SIGNUP_ADMIN_TOKEN || '';
  const provided = request.headers.get('x-admin-token') || request.nextUrl.searchParams.get('token') || '';
  return Boolean(expected && provided && provided === expected);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Powers the "Content Studio installs" panel in /admin — reads the install-ping data
// written by GET /api/content-studio/install (see pingInstall() in the userscript).
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Admin token required.' }, { status: 401, headers: CORS });
  }

  const client = redis as RedisLike;
  try {
    const totalInstalls = client.scard ? await client.scard('ce:cs-installed-accounts') : null;

    const days: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = DAYS_BACK - 1; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), count: 0 });
    }
    const counts = await Promise.all(days.map(day => redis.get<number>(`ce:cs-installs:${day.date}`)));
    days.forEach((day, index) => { day.count = Number(counts[index] || 0); });

    return NextResponse.json({
      totalInstalls,
      daily: days,
      generatedAt: new Date().toISOString(),
    }, { headers: CORS });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not load install stats.',
    }, { status: 500, headers: CORS });
  }
}
