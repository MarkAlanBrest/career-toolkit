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
  if (!body) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: CORS });
  }

  const { messages, max_tokens = 12000, model = 'claude-sonnet-4-6' } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: CORS });
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens, messages }),
  });

  const data = await anthropicRes.json();

  if (!anthropicRes.ok) {
    return NextResponse.json(
      { error: data?.error?.message || `Anthropic error ${anthropicRes.status}` },
      { status: anthropicRes.status, headers: CORS }
    );
  }

  return NextResponse.json(data, { status: 200, headers: CORS });
}
