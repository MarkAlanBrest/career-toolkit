import { NextRequest, NextResponse } from 'next/server';
import { getEntitlement } from '@/lib/billing';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const key = String(body?.key ?? '').trim();
  if (!key) return NextResponse.json({ valid: false, error: 'No key provided' }, { status: 400, headers: CORS });
  return NextResponse.json(await getEntitlement(key, true), { status: 200, headers: CORS });
}
