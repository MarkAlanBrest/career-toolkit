import { redis } from '@/lib/billing';

export function cleanAccountToken(value: unknown): string | null {
  const token = String(value || '').trim();
  return /^[a-zA-Z0-9._:-]{16,200}$/.test(token) ? token : null;
}

export async function validateAccountToken(accountId: string, tokenValue: unknown): Promise<boolean> {
  const token = cleanAccountToken(tokenValue);
  if (!token) return false;

  const key = `ce:account-token:${accountId}`;
  const existing = await redis.get<string>(key);
  if (existing) return existing === token;

  await redis.set(key, token);
  return true;
}

export const unauthorizedCreditAccount = {
  error: 'Could not verify this credit account. Reopen Canvas Enhancer and try again.',
};
