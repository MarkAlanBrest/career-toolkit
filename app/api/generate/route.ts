import { NextRequest, NextResponse } from 'next/server';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

const ALLOWED_MODELS = ['claude-haiku-4-5', 'claude-sonnet-4-6'] as const;
type AllowedModel = typeof ALLOWED_MODELS[number];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages) || !body.messages.length) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400, headers: CORS });
  }

  const meter = body.usageType === 'teaching' ? 'teaching' : 'creation';
  const requestedModel = (ALLOWED_MODELS as readonly string[]).includes(String(body.model || '')) ? body.model as AllowedModel : null;
  const model: AllowedModel = requestedModel || (meter === 'teaching' ? 'claude-haiku-4-5' : 'claude-sonnet-4-6');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: CORS });

  const max_tokens = Math.max(1, Math.min(Number(body.max_tokens) || 12000, 16000));

  // Only the built-in web search tool may be requested — this is a public proxy, so arbitrary
  // client-supplied tools are never forwarded to Anthropic.
  const ALLOWED_TOOLS = ['web_search_20250305'];
  const tools = Array.isArray(body.tools)
    ? body.tools.filter((t: unknown) => ALLOWED_TOOLS.includes((t as { type?: string })?.type || ''))
    : [];

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens, messages: body.messages, stream: true, ...(tools.length ? { tools } : {}) }),
  });

  if (!anthropicRes.ok) {
    const errData = await anthropicRes.json().catch(() => ({}));
    return NextResponse.json({ error: (errData as any)?.error?.message || `Anthropic error ${anthropicRes.status}` }, { status: anthropicRes.status, headers: CORS });
  }

  return new NextResponse(anthropicRes.body, { status: 200, headers: {
    ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
  } });
}
