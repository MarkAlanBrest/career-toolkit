import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/billing';
import { productByKey } from '@/lib/products';
import { getPayPalAccessToken, paypalBaseUrl, PayPalOrderResponse } from '@/lib/paypal';

export const dynamic = 'force-dynamic';

type CartItem = { key?: string; quantity?: number };
type PayMethod = 'card' | 'paypal';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function appUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

function cleanCart(items: CartItem[]) {
  const normalized = items.map(item => {
    const product = productByKey(String(item.key || ''));
    const quantity = Math.max(0, Math.min(20, Math.floor(Number(item.quantity || 0))));
    return product && quantity > 0 ? { product, quantity } : null;
  }).filter(Boolean) as { product: NonNullable<ReturnType<typeof productByKey>>; quantity: number }[];

  const hasCreationBasic = normalized.some(item => item.product.key === 'creation_tools');
  const hasCreationNoAi = normalized.some(item => item.product.key === 'creation_tools_basic');
  const hasCreationPro = normalized.some(item => item.product.key === 'creation_tools_pro');
  const creationPlanCount = [hasCreationNoAi, hasCreationBasic, hasCreationPro].filter(Boolean).length;
  const teachingPlanCount = normalized.filter(item => item.product.meter === 'teaching' && item.product.kind === 'subscription').length;
  if (creationPlanCount > 1) throw new Error('Choose one Creation Tools package.');
  if (teachingPlanCount > 1) throw new Error('Choose one Teaching Tools package.');
  if (!normalized.length) throw new Error('Choose at least one package.');
  return normalized;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const items = cleanCart(Array.isArray(body?.items) ? body.items : []);
    const method: PayMethod = body?.method === 'card' ? 'card' : 'paypal';
    const totalCents = items.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
    const checkoutId = randomUUID();
    const baseUrl = appUrl(request);
    const accessToken = await getPayPalAccessToken();

    const orderBody = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: checkoutId,
        description: 'Canvas Enhancer checkout',
        custom_id: checkoutId,
        amount: {
          currency_code: 'USD',
          value: dollars(totalCents),
          breakdown: {
            item_total: { currency_code: 'USD', value: dollars(totalCents) },
          },
        },
        items: items.map(item => ({
          name: item.product.name,
          description: item.product.description,
          sku: item.product.key,
          quantity: String(item.quantity),
          category: 'DIGITAL_GOODS',
          unit_amount: { currency_code: 'USD', value: dollars(item.product.priceCents) },
        })),
      }],
      application_context: {
        brand_name: 'Canvas Enhancer',
        landing_page: method === 'card' ? 'BILLING' : 'LOGIN',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${baseUrl}/cart?paypal=approved&checkout=${checkoutId}`,
        cancel_url: `${baseUrl}/cart?paypal=cancelled`,
      },
    };

    const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': checkoutId,
      },
      body: JSON.stringify(orderBody),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({})) as PayPalOrderResponse;
    if (!response.ok || !data.id) {
      const detail = data.details?.[0]?.description || data.message;
      return NextResponse.json({ error: detail || 'Could not start PayPal checkout.' }, { status: 502, headers: CORS });
    }

    await redis.set(`ce:paypal:checkout:${checkoutId}`, {
      checkoutId,
      orderId: data.id,
      method,
      totalCents,
      items: items.map(item => ({ key: item.product.key, quantity: item.quantity, priceCents: item.product.priceCents })),
      status: 'created',
      createdAt: new Date().toISOString(),
    }, { ex: 60 * 60 * 24 });

    const approveUrl = data.links?.find(link => link.rel === 'approve')?.href;
    if (!approveUrl) return NextResponse.json({ error: 'PayPal did not return an approval link.' }, { status: 502, headers: CORS });
    return NextResponse.json({ id: data.id, checkoutId, url: approveUrl }, { headers: CORS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not start checkout.' }, { status: 400, headers: CORS });
  }
}
