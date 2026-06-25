import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/billing';

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function cleanAccountId(value: unknown) {
  const accountId = String(value || '').trim();
  if (!/^[a-zA-Z0-9:_-]{8,80}$/.test(accountId)) throw new Error('Could not identify this browser for AI credits.');
  return accountId;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  try {
    const accountId = cleanAccountId(request.nextUrl.searchParams.get('accountId'));
    const [balance, used] = await Promise.all([
      redis.get<number>(`ce:credits:${accountId}:ai`),
      redis.get<number>(`ce:credits-used:${accountId}:ai`),
    ]);

    return NextResponse.json({
      accountId,
      balance: Number(balance || 0),
      used: Number(used || 0),
      pack: { priceCents: 2000, credits: 250 },
      costs: { grading: 1, page: 5, quiz: 5 },
    }, { headers: CORS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load AI credits.' }, { status: 400, headers: CORS });
  }
}
