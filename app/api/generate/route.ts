import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/billing';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

const ALLOWED_MODELS = ['claude-haiku-4-5', 'claude-sonnet-4-6'] as const;
type AllowedModel = typeof ALLOWED_MODELS[number];

// Credits charged per action per model (3x Anthropic cost)
const CREDIT_COSTS: Record<AllowedModel, Record<string, number>> = {
  'claude-haiku-4-5': { teaching: 1, creation: 3 },
  'claude-sonnet-4-6': { teaching: 4, creation: 10 },
};

function cleanAccountId(value: unknown): string | null {
  const id = String(value || '').trim();
  return /^[a-zA-Z0-9:_-]{8,80}$/.test(id) ? id : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages) || !body.messages.length) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400, headers: CORS });
  }

  const meter = body.usageType === 'teaching' ? 'teaching' : 'creation';
  const requestedModel = (ALLOWED_MODELS as readonly string[]).includes(String(body.model || '')) ? body.model as AllowedModel : null;
  const model: AllowedModel = requestedModel || (meter === 'teaching' ? 'claude-haiku-4-5' : 'claude-sonnet-4-6');
  const creditCost = CREDIT_COSTS[model][meter];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: CORS });

  const max_tokens = Math.max(1, Math.min(Number(body.max_tokens) || 12000, 16000));

  // Deduct credits if accountId is provided (new credits system)
  const accountId = cleanAccountId(body.accountId);
  if (accountId) {
    const balanceKey = `ce:credits:${accountId}:ai`;
    const usedKey = `ce:credits-used:${accountId}:ai`;
    const script = `local bal=tonumber(redis.call('GET',KEYS[1]) or '0') if bal<tonumber(ARGV[1]) then return 'insufficient' end redis.call('DECRBY',KEYS[1],ARGV[1]) redis.call('INCRBY',KEYS[2],ARGV[1]) return 'ok'`;
    const result = await redis.eval(script, [balanceKey, usedKey], [creditCost]) as string;
    if (result !== 'ok') {
      return NextResponse.json({ error: 'Not enough AI credits. Buy a pack from the toolbar to continue.' }, { status: 402, headers: CORS });
    }
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens, messages: body.messages, stream: true }),
  });

  if (!anthropicRes.ok) {
    // Refund credits on API failure
    if (accountId) {
      await redis.incrby(`ce:credits:${accountId}:ai`, creditCost).catch(() => {});
      await redis.decrby(`ce:credits-used:${accountId}:ai`, creditCost).catch(() => {});
    }
    const errData = await anthropicRes.json().catch(() => ({}));
    return NextResponse.json({ error: (errData as any)?.error?.message || `Anthropic error ${anthropicRes.status}` }, { status: anthropicRes.status, headers: CORS });
  }

  return new NextResponse(anthropicRes.body, { status: 200, headers: {
    ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
  } });
}
