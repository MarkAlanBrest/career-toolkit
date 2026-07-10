import { NextRequest, NextResponse } from 'next/server';
import { cleanAccountId } from '@/lib/stripe';
import { validateAccountToken } from '@/lib/accountAuth';
import { getCanvasConnection } from '@/lib/canvasConnection';

export const dynamic = 'force-dynamic';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function GET(request: NextRequest) {
  const accountId = cleanAccountId(request.nextUrl.searchParams.get('accountId'));
  const accountToken = request.nextUrl.searchParams.get('accountToken');
  if (!accountId) return NextResponse.json({ connected: false }, { headers: CORS });

  const verified = await validateAccountToken(accountId, accountToken);
  if (!verified) return NextResponse.json({ error: 'Could not verify this account.' }, { status: 403, headers: CORS });

  const connection = await getCanvasConnection(accountId);
  if (!connection) return NextResponse.json({ connected: false }, { headers: CORS });
  return NextResponse.json({ connected: true, domain: connection.domain, userName: connection.userName }, { headers: CORS });
}
