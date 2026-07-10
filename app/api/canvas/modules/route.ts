import { NextRequest, NextResponse } from 'next/server';
import { cleanAccountId } from '@/lib/stripe';
import { validateAccountToken } from '@/lib/accountAuth';
import { getCanvasConnection } from '@/lib/canvasConnection';
import { listModules, CanvasApiError } from '@/lib/canvasApi';

export const dynamic = 'force-dynamic';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function GET(request: NextRequest) {
  const accountId = cleanAccountId(request.nextUrl.searchParams.get('accountId'));
  const accountToken = request.nextUrl.searchParams.get('accountToken');
  const courseId = request.nextUrl.searchParams.get('courseId');
  if (!accountId) return NextResponse.json({ error: 'Missing account.' }, { status: 400, headers: CORS });
  if (!courseId) return NextResponse.json({ error: 'Missing course.' }, { status: 400, headers: CORS });

  const verified = await validateAccountToken(accountId, accountToken);
  if (!verified) return NextResponse.json({ error: 'Could not verify this account.' }, { status: 403, headers: CORS });

  const connection = await getCanvasConnection(accountId);
  if (!connection) return NextResponse.json({ error: 'Connect your Canvas account first.' }, { status: 409, headers: CORS });

  try {
    const modules = await listModules(connection.domain, connection.token, courseId);
    return NextResponse.json({ modules }, { headers: CORS });
  } catch (error) {
    const status = error instanceof CanvasApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Could not load modules.';
    return NextResponse.json({ error: message }, { status: status === 401 ? 401 : 502, headers: CORS });
  }
}
