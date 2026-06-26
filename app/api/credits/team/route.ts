import { NextRequest, NextResponse } from 'next/server';
import { cleanAccountId } from '@/lib/stripe';
import {
  addTeamMember,
  getCreditTransfers,
  getPersonalPool,
  isValidEmail,
  listTeamMembers,
  normalizeEmail,
  removeTeamMember,
  sendCreditsToTeacher,
} from '@/lib/teamCredits';

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  try {
    const accountId = cleanAccountId(req.nextUrl.searchParams.get('accountId'));
    if (!accountId) return NextResponse.json({ error: 'Invalid account.' }, { status: 400, headers: CORS });

    const [credits, teachers, transfers] = await Promise.all([
      getPersonalPool(accountId),
      listTeamMembers(accountId),
      getCreditTransfers(accountId, 50),
    ]);

    return NextResponse.json({
      accountId,
      credits,
      teachers,
      transfers,
    }, { headers: CORS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load teachers.' }, { status: 500, headers: CORS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const accountId = cleanAccountId(body?.accountId);
    if (!accountId) return NextResponse.json({ error: 'Invalid account.' }, { status: 400, headers: CORS });

    const action = String(body?.action || '').trim();
    const email = normalizeEmail(body?.email);
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Enter a valid teacher email.' }, { status: 400, headers: CORS });

    if (action === 'add') {
      await addTeamMember(accountId, email);
    } else if (action === 'remove') {
      await removeTeamMember(accountId, email);
    } else if (action === 'send') {
      const amount = Math.floor(Number(body?.credits || 0));
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
        return NextResponse.json({ error: 'Enter a valid credit amount.' }, { status: 400, headers: CORS });
      }
      await sendCreditsToTeacher(accountId, email, amount);
    } else {
      return NextResponse.json({ error: 'Invalid teacher action.' }, { status: 400, headers: CORS });
    }

    const [credits, teachers, transfers] = await Promise.all([
      getPersonalPool(accountId),
      listTeamMembers(accountId),
      getCreditTransfers(accountId, 50),
    ]);

    return NextResponse.json({
      ok: true,
      credits,
      teachers,
      transfers,
    }, { headers: CORS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update teachers.' }, { status: 500, headers: CORS });
  }
}
