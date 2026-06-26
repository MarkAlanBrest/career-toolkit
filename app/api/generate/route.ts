import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/billing';
import type { AutoReloadSettings } from '@/app/api/credits/auto-reload/route';
import { stripe } from '@/lib/stripe';
import { canUseSharedPool, recordUsage } from '@/lib/teamCredits';

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

async function deductCredits(params: {
  accountId: string;
  creditCost: number;
  meter: string;
  model: string;
  pool: 'personal' | 'shared';
  ownerAccountId?: string | null;
}) {
  const { accountId, creditCost, meter, model, pool } = params;
  const ownerAccountId = pool === 'shared' ? cleanAccountId(params.ownerAccountId) : null;

  if (pool === 'shared') {
    if (!ownerAccountId) return { ok: false, error: 'Choose a valid shared credit account.' };
    const allowed = await canUseSharedPool(accountId, ownerAccountId);
    if (!allowed) return { ok: false, error: 'You do not have access to those shared AI credits.' };

    const balanceKey = `ce:team:${ownerAccountId}:credits:ai`;
    const usedKey = `ce:team:${ownerAccountId}:credits-used:ai`;
    const script = `local bal=tonumber(redis.call('GET',KEYS[1]) or '0') if bal<tonumber(ARGV[1]) then return {-1,-1} end local nb=redis.call('DECRBY',KEYS[1],ARGV[1]) redis.call('INCRBY',KEYS[2],ARGV[1]) return {nb,bal}`;
    const result = await redis.eval(script, [balanceKey, usedKey], [creditCost]) as number[];
    if (!Array.isArray(result) || result[0] < 0) return { ok: false, error: 'Not enough shared AI credits.' };

    await recordUsage({ accountId, ownerAccountId, pool, credits: creditCost, meter, model }).catch(() => {});
    return { ok: true, pool, ownerAccountId, balanceKey, usedKey };
  }

  const balanceKey = `ce:credits:${accountId}:ai`;
  const usedKey = `ce:credits-used:${accountId}:ai`;
  const script = `local bal=tonumber(redis.call('GET',KEYS[1]) or '0') if bal<tonumber(ARGV[1]) then return {-1,-1} end local nb=redis.call('DECRBY',KEYS[1],ARGV[1]) redis.call('INCRBY',KEYS[2],ARGV[1]) return {nb,bal}`;
  const result = await redis.eval(script, [balanceKey, usedKey], [creditCost]) as number[];
  if (!Array.isArray(result) || result[0] < 0) return { ok: false, error: 'Not enough AI credits. Buy a pack from the toolbar to continue.' };

  await recordUsage({ accountId, pool, credits: creditCost, meter, model }).catch(() => {});
  return { ok: true, pool, balanceKey, usedKey, newBalance: result[0] };
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
  let deduction: Awaited<ReturnType<typeof deductCredits>> | null = null;
  if (accountId) {
    const pool = body.creditPool === 'shared' ? 'shared' : 'personal';
    deduction = await deductCredits({
      accountId,
      creditCost,
      meter,
      model,
      pool,
      ownerAccountId: body.sharedAccountId || body.ownerAccountId,
    });
    if (!deduction.ok) return NextResponse.json({ error: deduction.error }, { status: 402, headers: CORS });

    // Fire-and-forget auto-reload if balance is low
    if (deduction.pool === 'personal' && typeof deduction.newBalance === 'number') {
      checkAndAutoReload(accountId, deduction.newBalance).catch(() => {});
    }
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens, messages: body.messages, stream: true }),
  });

  if (!anthropicRes.ok) {
    // Refund credits on API failure
    if (deduction?.ok) {
      await redis.incrby(deduction.balanceKey, creditCost).catch(() => {});
      await redis.decrby(deduction.usedKey, creditCost).catch(() => {});
    }
    const errData = await anthropicRes.json().catch(() => ({}));
    return NextResponse.json({ error: (errData as any)?.error?.message || `Anthropic error ${anthropicRes.status}` }, { status: anthropicRes.status, headers: CORS });
  }

  return new NextResponse(anthropicRes.body, { status: 200, headers: {
    ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
  } });
}

async function checkAndAutoReload(accountId: string, currentBalance: number) {
  const key = `ce:auto-reload:${accountId}`;
  const settings = await redis.get<AutoReloadSettings>(key);
  if (!settings?.enabled || !settings.paymentMethodId || !settings.stripeCustomerId) return;
  if (currentBalance > settings.minBalance) return;
  if (settings.failedAt) return; // don't retry after a failure — user must re-enable

  const reloadAmount = settings.reloadAmount ?? 1000;
  const packCents = reloadAmount === 5000 ? 5000 : reloadAmount === 2000 ? 2000 : 1000;

  try {
    // Credits are added by the webhook (payment_intent.succeeded) — don't add here to avoid double-counting
    await stripe.paymentIntents.create({
      amount: packCents,
      currency: 'usd',
      customer: settings.stripeCustomerId,
      payment_method: settings.paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: { accountId, credits: String(reloadAmount), pack: 'auto-reload' },
      description: `Canvas Enhancer auto-reload — ${reloadAmount.toLocaleString()} credits`,
    });
  } catch {
    // Mark as failed so we don't keep retrying every generation
    await redis.set(key, { ...settings, failedAt: new Date().toISOString() });
  }
}
