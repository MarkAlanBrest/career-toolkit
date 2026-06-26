import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/billing';
import { stripe, CREDIT_PACKS, isValidPackKey, cleanAccountId } from '@/lib/stripe';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

async function getOrCreateCustomer(accountId: string): Promise<string> {
  const cacheKey = `ce:stripe-customer:${accountId}`;
  const existing = await redis.get<string>(cacheKey);
  if (existing) return existing;

  const customer = await stripe.customers.create({ metadata: { accountId } });
  await redis.set(cacheKey, customer.id);
  return customer.id;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const accountId = cleanAccountId(body?.accountId);
    if (!accountId) return NextResponse.json({ error: 'Invalid account.' }, { status: 400, headers: CORS });

    const pack = body?.pack;
    if (!isValidPackKey(pack)) return NextResponse.json({ error: 'Invalid pack.' }, { status: 400, headers: CORS });

    const packConfig = CREDIT_PACKS[pack];
    const saveCard = body?.saveCard === true;
    const name = String(body?.name || '').trim().slice(0, 100);
    const email = String(body?.email || '').trim().toLowerCase().slice(0, 200);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const customerId = await getOrCreateCustomer(accountId);

    if (name || emailValid) {
      await stripe.customers.update(customerId, {
        ...(name && { name }),
        ...(emailValid && { email }),
      }).catch(() => {});
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: packConfig.priceCents,
      currency: 'usd',
      customer: customerId,
      receipt_email: emailValid ? email : undefined,
      setup_future_usage: saveCard ? 'off_session' : undefined,
      metadata: { accountId, credits: String(packConfig.credits), pack },
      description: `Canvas Enhancer - ${packConfig.description}`,
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret }, { headers: CORS });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not start checkout.' }, { status: 500, headers: CORS });
  }
}
