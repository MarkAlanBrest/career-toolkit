import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { addCredits, invalidateCustomerLicenses, MeterName, redis } from '@/lib/billing';

function validSignature(body: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature || '', 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function creditPack(variantId: string): { amount: number; meter: MeterName } | undefined {
  if (variantId === String(process.env.LEMONSQUEEZY_TEACHING_REFILL_VARIANT_ID || '')) return { amount: 100, meter: 'teaching' };
  if (variantId === String(process.env.LEMONSQUEEZY_CREATION_REFILL_VARIANT_ID || '')) return { amount: 50, meter: 'creation' };
}

export async function POST(req: NextRequest) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';
  const raw = await req.text();
  if (!secret || !validSignature(raw, req.headers.get('x-signature') || '', secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }
  const payload = JSON.parse(raw);
  const event = String(payload?.meta?.event_name || 'unknown');
  const objectId = String(payload?.data?.id || payload?.meta?.webhook_id || 'unknown');
  const eventKey = `ce:webhook:${event}:${objectId}`;
  const first = await redis.set(eventKey, 'processing', { nx: true, ex: 60 * 60 * 24 * 400 });
  if (!first) return NextResponse.json({ ok: true, duplicate: true });

  try {
    const attributes = payload?.data?.attributes || {};
    if (event === 'order_created') {
      const custom = payload?.meta?.custom_data || {};
      const variantId = String(attributes?.first_order_item?.variant_id || attributes?.variant_id || '');
      const pack = creditPack(variantId);
      if (pack && custom.license_hash) await addCredits(String(custom.license_hash), pack.meter, pack.amount);
    }
    if (event.startsWith('subscription_')) {
      const customerId = String(attributes?.customer_id || '');
      if (customerId) await invalidateCustomerLicenses(customerId);
      await redis.set(`ce:subscription:${objectId}`, {
        customerId, status: attributes?.status, variantId: attributes?.variant_id,
        renewsAt: attributes?.renews_at, endsAt: attributes?.ends_at, updatedAt: new Date().toISOString(),
      });
    }
    await redis.set(eventKey, 'complete', { ex: 60 * 60 * 24 * 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await redis.del(eventKey);
    console.error('Lemon Squeezy webhook failed', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
