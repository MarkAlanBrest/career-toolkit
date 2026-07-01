import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/dcAuth';
import { cookies } from 'next/headers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('dc_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });

    const session = await getSession(token);
    if (!session) return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401, headers: CORS });

    return NextResponse.json({ session }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: 'Session check failed.' }, { status: 500, headers: CORS });
  }
}
