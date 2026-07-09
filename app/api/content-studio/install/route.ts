import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { cleanAccountId } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Fired once per install by the Canvas Content Studio userscript (see pingInstall() in
// extension/Canvas_Content_Studio.user.js) so we have a real distinct-install count —
// Tampermonkey gives self-hosted scripts no install telemetry of its own.
export async function GET(request: NextRequest) {
  try {
    const accountId = cleanAccountId(request.nextUrl.searchParams.get('accountId'));
    if (!accountId) return NextResponse.json({ ok: false }, { headers: CORS });

    const added = await redis.sadd('ce:cs-installed-accounts', accountId);
    if (added) {
      const day = new Date().toISOString().slice(0, 10);
      await redis.incr(`ce:cs-installs:${day}`);
    }
    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch {
    return NextResponse.json({ ok: false }, { headers: CORS });
  }
}
