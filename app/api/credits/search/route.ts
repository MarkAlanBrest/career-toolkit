import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/billing';
import { getProfile, getPersonalPool, normalizeEmail, isValidEmail } from '@/lib/teamCredits';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const email = normalizeEmail(req.nextUrl.searchParams.get('email'));
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400, headers: CORS });
  }

  // Extract the searcher's Canvas domain from their accountId ({userId}@{domain}).
  const searcherAccountId = String(req.nextUrl.searchParams.get('accountId') || '');
  const atIdx = searcherAccountId.indexOf('@');
  const searcherDomain = atIdx > 0 ? searcherAccountId.slice(atIdx + 1) : '';

  const accountId = await redis.get<string>(`ce:email-account:${email}`);
  if (!accountId) {
    return NextResponse.json({ found: false }, { headers: CORS });
  }

  const [profile, pool] = await Promise.all([
    getProfile(accountId),
    getPersonalPool(accountId),
  ]);

  // Only return teachers from the same Canvas domain.
  if (searcherDomain && profile.canvasDomain && profile.canvasDomain !== searcherDomain) {
    return NextResponse.json({ found: false }, { headers: CORS });
  }

  return NextResponse.json({
    found: true,
    teacher: {
      accountId,
      name: profile.name || '',
      email: profile.email || email,
      balance: pool.balance,
    },
  }, { headers: CORS });
}
