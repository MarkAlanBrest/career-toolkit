import { NextRequest, NextResponse } from 'next/server';
import { getAccountEntitlements, licenseHash, MeterName } from '@/lib/billing';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const PACKS: Record<string, { amount: number; meter: MeterName; env: string }> = {
  teaching100: { amount: 100, meter: 'teaching', env: 'LEMONSQUEEZY_TEACHING_REFILL_VARIANT_ID' },
  creation50: { amount: 50, meter: 'creation', env: 'LEMONSQUEEZY_CREATION_REFILL_VARIANT_ID' },
};
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const licenseKeys = body?.licenseKeys ?? body?.licenseKey ?? '';
  const pack = PACKS[String(body?.pack || '')];
  if (!pack) return NextResponse.json({ error: 'Choose a valid credit pack.' }, { status: 400, headers: CORS });
  const account = await getAccountEntitlements(licenseKeys);
  const entitlement = account.packages[pack.meter];
  if (!entitlement?.valid) return NextResponse.json({ error: entitlement?.error || `An active ${pack.meter} package is required.` }, { status: 403, headers: CORS });

  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env[pack.env];
  if (!apiKey || !storeId || !variantId) return NextResponse.json({ error: 'Credit purchases are not configured yet.' }, { status: 503, headers: CORS });

  const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json' },
    body: JSON.stringify({ data: {
      type: 'checkouts',
      attributes: {
        checkout_data: { email: entitlement.customerEmail, custom: { license_hash: licenseHash(entitlement.licenseKey!), meter: pack.meter, credit_amount: String(pack.amount) } },
        product_options: process.env.NEXT_PUBLIC_APP_URL ? { redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/setup?credits=purchased` } : undefined,
      },
      relationships: { store: { data: { type: 'stores', id: String(storeId) } }, variant: { data: { type: 'variants', id: String(variantId) } } },
    } }),
  });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok) return NextResponse.json({ error: data?.errors?.[0]?.detail || 'Could not open checkout.' }, { status: 502, headers: CORS });
  return NextResponse.json({ url: data?.data?.attributes?.url }, { headers: CORS });
}
