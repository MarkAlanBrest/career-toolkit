import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedCreditAccount, validateAccountToken } from '@/lib/accountAuth';
import { redis } from '@/lib/billing';
import { cleanAccountId } from '@/lib/stripe';
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
  const searcherAccountId = cleanAccountId(req.nextUrl.searchParams.get('accountId'));
  if (!searcherAccountId) {
    return NextResponse.json({ error: 'Invalid account.' }, { status: 400, headers: CORS });
  }
  const verified = await validateAccountToken(searcherAccountId, req.nextUrl.searchParams.get('accountToken'));
  if (!verified) return NextResponse.json(unauthorizedCreditAccount, { status: 403, headers: CORS });

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
