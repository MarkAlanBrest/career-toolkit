import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { redis } from '@/lib/billing';
import { enableTeamOwner } from '@/lib/teamCredits';

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const { accountId, credits, creditTarget } = pi.metadata || {};

    if (accountId && credits) {
      const creditAmount = Number(credits);
      if (creditAmount > 0) {
        if (creditTarget === 'shared') {
          await enableTeamOwner(accountId);
          await redis.incrby(`ce:team:${accountId}:credits:ai`, creditAmount);
        } else {
          await enableTeamOwner(accountId);
          await redis.incrby(`ce:credits:${accountId}:ai`, creditAmount);
        }
      }

      // If card was saved for future use, store payment method details for auto-reload
      // Clear any auto-reload failure flag on any successful payment
      if (accountId) {
        const arKey = `ce:auto-reload:${accountId}`;
        const ar = await redis.get<Record<string, unknown>>(arKey);
        if (ar?.failedAt) await redis.set(arKey, { ...ar, failedAt: undefined });
      }

      if (pi.setup_future_usage === 'off_session' && pi.payment_method && pi.customer) {
        try {
          const pm = await stripe.paymentMethods.retrieve(String(pi.payment_method));
          const autoReloadKey = `ce:auto-reload:${accountId}`;
          const existing = await redis.get<Record<string, unknown>>(autoReloadKey) || {};
          await redis.set(autoReloadKey, {
            ...existing,
            stripeCustomerId: String(pi.customer),
            paymentMethodId: String(pi.payment_method),
            cardBrand: pm.card?.brand || 'card',
            cardLast4: pm.card?.last4 || '????',
          });
        } catch { /* non-critical — card save failed silently */ }
      }
    }
  }

  return NextResponse.json({ received: true });
}
