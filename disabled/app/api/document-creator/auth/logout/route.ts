import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, sessionCookieOptions } from '@/lib/dcAuth';
import { cookies } from 'next/headers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (token) await deleteSession(token);
  const resp = NextResponse.json({ ok: true }, { headers: CORS });
  resp.cookies.set('dc_session', '', { ...sessionCookieOptions(0), maxAge: 0 });
  return resp;
}
