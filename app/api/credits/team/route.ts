import { NextRequest, NextResponse } from 'next/server';
import { cleanAccountId } from '@/lib/stripe';
import {
  addTeamMember,
  getOwnedTeamPool,
  getTeamUsage,
  isTeamOwner,
  isValidEmail,
  listSharedPoolsForAccount,
  listTeamMembers,
  normalizeEmail,
  removeTeamMember,
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

    const [ownerEnabled, ownedPool, members, sharedPools, recentUsage] = await Promise.all([
      isTeamOwner(accountId),
      getOwnedTeamPool(accountId),
      listTeamMembers(accountId),
      listSharedPoolsForAccount(accountId),
      getTeamUsage(accountId, 50),
    ]);

    return NextResponse.json({
      accountId,
      ownerEnabled,
      ownedTeam: {
        ownerAccountId: accountId,
        balance: ownedPool.balance,
        used: ownedPool.used,
        members,
        recentUsage,
      },
      sharedTeams: sharedPools,
    }, { headers: CORS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load team credits.' }, { status: 500, headers: CORS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const accountId = cleanAccountId(body?.accountId);
    if (!accountId) return NextResponse.json({ error: 'Invalid account.' }, { status: 400, headers: CORS });

    const ownerEnabled = await isTeamOwner(accountId);
    if (!ownerEnabled) {
      return NextResponse.json({ error: 'Buy AI credits before creating a shared department account.' }, { status: 403, headers: CORS });
    }

    const action = String(body?.action || '').trim();
    const email = normalizeEmail(body?.email);
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Enter a valid teacher email.' }, { status: 400, headers: CORS });

    if (action === 'add') {
      await addTeamMember(accountId, email);
    } else if (action === 'remove') {
      await removeTeamMember(accountId, email);
    } else {
      return NextResponse.json({ error: 'Invalid team action.' }, { status: 400, headers: CORS });
    }

    const [ownedPool, members, recentUsage] = await Promise.all([
      getOwnedTeamPool(accountId),
      listTeamMembers(accountId),
      getTeamUsage(accountId, 50),
    ]);

    return NextResponse.json({
      ok: true,
      ownedTeam: {
        ownerAccountId: accountId,
        balance: ownedPool.balance,
        used: ownedPool.used,
        members,
        recentUsage,
      },
    }, { headers: CORS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update team.' }, { status: 500, headers: CORS });
  }
}
