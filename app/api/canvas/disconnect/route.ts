import { NextRequest, NextResponse } from 'next/server';
import { cleanAccountId } from '@/lib/stripe';
import { validateAccountToken } from '@/lib/accountAuth';
import { clearCanvasConnection } from '@/lib/canvasConnection';

export const dynamic = 'force-dynamic';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const accountId = cleanAccountId(body?.accountId);
  if (!accountId) return NextResponse.json({ error: 'Missing account.' }, { status: 400, headers: CORS });

  const verified = await validateAccountToken(accountId, body?.accountToken);
  if (!verified) return NextResponse.json({ error: 'Could not verify this account.' }, { status: 403, headers: CORS });

  await clearCanvasConnection(accountId);
  return NextResponse.json({ ok: true }, { headers: CORS });
}
