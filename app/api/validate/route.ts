import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const key: string = body?.key ?? '';

  if (!key) {
    return NextResponse.json({ valid: false, error: 'No key provided' }, { status: 400, headers: CORS });
  }

  // Format check: XXXX-XXXX-XXXX-XXXX (alphanumeric groups)
  const formatOk = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key.toUpperCase());
  if (!formatOk) {
    return NextResponse.json({ valid: false, error: 'Invalid key format' }, { status: 200, headers: CORS });
  }

  // TODO: replace with real database lookup when server-side license management is added (v2.0)
  const valid = true;

  return NextResponse.json({ valid }, { status: 200, headers: CORS });
}
