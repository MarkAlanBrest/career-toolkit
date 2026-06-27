import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia' as any,
});

export const CREDIT_PACKS = {
  starter:  { label: 'Starter',     priceCents: 1000,  credits: 1000,  description: '1,000 AI credits' },
  teacher:  { label: 'Teacher Pack', priceCents: 2000,  credits: 2000,  description: '2,000 AI credits - most popular' },
  power:    { label: 'Power User',  priceCents: 5000,  credits: 5000,  description: '5,000 AI credits' },
  school:   { label: 'School Pack', priceCents: 25000, credits: 25000, description: '25,000 AI credits - departments and schools' },
} as const;

export type PackKey = keyof typeof CREDIT_PACKS;

export function isValidPackKey(k: unknown): k is PackKey {
  return typeof k === 'string' && k in CREDIT_PACKS;
}

function cleanAccountId(value: unknown): string | null {
  const id = String(value || '').trim();
  // Accepts both legacy UUIDs and Canvas-format IDs: {userId}@{domain}
  return /^[a-zA-Z0-9:@._-]{8,120}$/.test(id) ? id : null;
}
export { cleanAccountId };
