import { NextRequest, NextResponse } from 'next/server';
import { cleanAccountId } from '@/lib/stripe';
import { getCreditTransfers, getPersonalPool, listTeamMembers } from '@/lib/teamCredits';

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  try {
    const accountId = cleanAccountId(request.nextUrl.searchParams.get('accountId'));
    if (!accountId) throw new Error('Could not identify this browser for AI credits.');
    const [personal, teachers, transfers] = await Promise.all([
      getPersonalPool(accountId),
      listTeamMembers(accountId),
      getCreditTransfers(accountId, 20),
    ]);

    return NextResponse.json({
      accountId,
      balance: personal.balance,
      used: personal.used,
      personal,
      teachers,
      transfers,
      models: {
        grading: [
          { id: 'claude-haiku-4-5', label: 'Haiku - Fast & Economical', credits: 1, recommended: true },
          { id: 'claude-sonnet-4-6', label: 'Sonnet - Higher Quality', credits: 4, recommended: false },
        ],
        creation: [
          { id: 'claude-haiku-4-5', label: 'Haiku - Fast & Simple', credits: 3, recommended: false },
          { id: 'claude-sonnet-4-6', label: 'Sonnet - Best Quality', credits: 10, recommended: true },
        ],
      },
    }, { headers: CORS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load AI credits.' }, { status: 400, headers: CORS });
  }
}
