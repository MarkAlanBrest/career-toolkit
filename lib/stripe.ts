import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export const CREDIT_PACKS = {
  starter:    { label: 'Starter',        priceCents: 1000, credits: 1000, description: '1,000 AI credits' },
  teacher:    { label: 'Teacher Pack',    priceCents: 2000, credits: 2000, description: '2,000 AI credits — most popular' },
  department: { label: 'Department Pack', priceCents: 5000, credits: 5000, description: '5,000 AI credits' },
} as const;

export type PackKey = keyof typeof CREDIT_PACKS;

export function isValidPackKey(k: unknown): k is PackKey {
  return typeof k === 'string' && k in CREDIT_PACKS;
}

function cleanAccountId(value: unknown): string | null {
  const id = String(value || '').trim();
  return /^[a-zA-Z0-9:_-]{8,80}$/.test(id) ? id : null;
}
export { cleanAccountId };
