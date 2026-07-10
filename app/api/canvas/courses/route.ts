import { NextRequest, NextResponse } from 'next/server';
import { cleanAccountId } from '@/lib/stripe';
import { validateAccountToken } from '@/lib/accountAuth';
import { getCanvasConnection } from '@/lib/canvasConnection';
import { listCourses, CanvasApiError } from '@/lib/canvasApi';

export const dynamic = 'force-dynamic';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function GET(request: NextRequest) {
  const accountId = cleanAccountId(request.nextUrl.searchParams.get('accountId'));
  const accountToken = request.nextUrl.searchParams.get('accountToken');
  if (!accountId) return NextResponse.json({ error: 'Missing account.' }, { status: 400, headers: CORS });

  const verified = await validateAccountToken(accountId, accountToken);
  if (!verified) return NextResponse.json({ error: 'Could not verify this account.' }, { status: 403, headers: CORS });

  const connection = await getCanvasConnection(accountId);
  if (!connection) return NextResponse.json({ error: 'Connect your Canvas account first.' }, { status: 409, headers: CORS });

  try {
    const courses = await listCourses(connection.domain, connection.token);
    return NextResponse.json({ courses }, { headers: CORS });
  } catch (error) {
    const status = error instanceof CanvasApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Could not load courses.';
    return NextResponse.json({ error: message }, { status: status === 401 ? 401 : 502, headers: CORS });
  }
}
