import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedCreditAccount, validateAccountToken } from '@/lib/accountAuth';
import { redis } from '@/lib/billing';
import { cleanAccountId } from '@/lib/stripe';
import { getProfile } from '@/lib/teamCredits';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const accountId = cleanAccountId(body?.accountId);
    if (!accountId) return NextResponse.json({ ok: false }, { headers: CORS });
    const verified = await validateAccountToken(accountId, body?.accountToken);
    if (!verified) return NextResponse.json(unauthorizedCreditAccount, { status: 403, headers: CORS });

    const name         = String(body?.name         || '').trim().slice(0, 100);
    const canvasUserId = String(body?.canvasUserId || '').trim().slice(0, 50);
    const canvasDomain = String(body?.canvasDomain || '').trim().slice(0, 200);
    const existing = await getProfile(accountId);

    const needsWrite = !existing.name && !existing.email;
    const nameChanged = name && !existing.name;
    const canvasChanged = canvasUserId && !(existing as Record<string, unknown>).canvasUserId;

    if (needsWrite || nameChanged || canvasChanged) {
      await redis.set(`ce:profile:${accountId}`, {
        ...existing,
        ...(name && { name }),
        ...(canvasUserId && { canvasUserId }),
        ...(canvasDomain && { canvasDomain }),
        ...(!existing.name && !existing.email && { registeredAt: new Date().toISOString() }),
      });
    }

    // Ensure the email-to-accountId reverse lookup exists so this teacher is findable by email.
    // saveProfile writes it on profile save, but teachers who only auto-register need it too.
    if (existing.email) {
      await redis.set(`ce:email-account:${existing.email}`, accountId);
    }

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch {
    return NextResponse.json({ ok: false }, { headers: CORS });
  }
}
