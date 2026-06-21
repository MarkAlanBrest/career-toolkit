import { NextRequest, NextResponse } from 'next/server';
import { getAccountEntitlements } from '@/lib/billing';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const keys = body?.keys ?? body?.key ?? '';
  if (!String(Array.isArray(keys) ? keys.join('') : keys).trim()) return NextResponse.json({ valid: false, packages: {}, errors: ['No key provided'] }, { status: 400, headers: CORS });
  return NextResponse.json(await getAccountEntitlements(keys, true), { status: 200, headers: CORS });
}
