import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';

export type Plan = 'base' | 'pro' | 'owner';
export type UsageSummary = { used: number; limit: number | null; remaining: number | null; bonus: number; resetsAt: string };
export type Entitlement = { valid: boolean; plan?: Plan; status?: string; customerId?: string; customerEmail?: string; usage?: UsageSummary; error?: string; chargedFrom?: string };
type LemonValidation = { valid?: boolean; error?: string; license_key?: { status?: string }; meta?: { variant_id?: number; customer_id?: number; customer_email?: string } };

const redis = Redis.fromEnv();
const LIMITS = { base: 50, pro: 150 } as const;
const envList = (name: string) => new Set((process.env[name] || '').split(',').map(v => v.trim()).filter(Boolean));

export const normalizeKey = (key: string) => String(key || '').trim();
export const licenseHash = (key: string) => createHash('sha256').update(normalizeKey(key)).digest('hex');

function planForVariant(id: number | string | undefined): Plan | undefined {
  const value = String(id || '');
  if (envList('LEMONSQUEEZY_BASE_VARIANT_IDS').has(value)) return 'base';
  if (envList('LEMONSQUEEZY_PRO_VARIANT_IDS').has(value)) return 'pro';
}

function period() {
  const now = new Date();
  return {
    month: now.toISOString().slice(0, 7),
    resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}

async function usageFor(hash: string, plan: Plan): Promise<UsageSummary> {
  const { month, resetsAt } = period();
  const [usedValue, bonusValue] = await Promise.all([
    redis.get<number>(`ce:usage:${hash}:${month}`), redis.get<number>(`ce:bonus:${hash}`),
  ]);
  const used = Number(usedValue || 0);
  const bonus = Number(bonusValue || 0);
  if (plan === 'owner') return { used, limit: null, remaining: null, bonus, resetsAt };
  const limit = LIMITS[plan];
  return { used, limit, remaining: Math.max(0, limit - used), bonus, resetsAt };
}

async function validateWithLemon(key: string): Promise<LemonValidation> {
  const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ license_key: key }), cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as LemonValidation;
  if (!response.ok) throw new Error(data.error || `License service returned ${response.status}`);
  return data;
}

export async function getEntitlement(rawKey: string, forceRefresh = false): Promise<Entitlement> {
  const key = normalizeKey(rawKey);
  if (!key) return { valid: false, error: 'Enter your license key in Global Settings.' };
  const ownerKey = normalizeKey(process.env.OWNER_KEY || '');
  if (ownerKey && key.toLowerCase() === ownerKey.toLowerCase()) {
    return { valid: true, plan: 'owner', status: 'active', usage: await usageFor(licenseHash(key), 'owner') };
  }

  const hash = licenseHash(key);
  const cacheKey = `ce:license:${hash}`;
  if (!forceRefresh) {
    const cached = await redis.get<Omit<Entitlement, 'usage'>>(cacheKey);
    if (cached) return cached.valid && cached.plan ? { ...cached, usage: await usageFor(hash, cached.plan) } : cached;
  }

  let lemon: LemonValidation;
  try { lemon = await validateWithLemon(key); }
  catch (error) { return { valid: false, error: error instanceof Error ? error.message : 'Could not validate license.' }; }

  const status = lemon.license_key?.status || (lemon.valid ? 'active' : 'inactive');
  const plan = planForVariant(lemon.meta?.variant_id);
  const valid = lemon.valid === true && status === 'active' && Boolean(plan);
  const result: Omit<Entitlement, 'usage'> = {
    valid, plan, status,
    customerId: lemon.meta?.customer_id ? String(lemon.meta.customer_id) : undefined,
    customerEmail: lemon.meta?.customer_email,
    error: !lemon.valid ? (lemon.error || 'This license is not active.')
      : !plan ? 'This purchase is not connected to a Canvas Enhancer plan.'
      : status !== 'active' ? `This license is ${status}.` : undefined,
  };
  await redis.set(cacheKey, result, { ex: 300 });
  if (result.customerId) await redis.sadd(`ce:customer-licenses:${result.customerId}`, hash);
  return valid && plan ? { ...result, usage: await usageFor(hash, plan) } : result;
}

export async function reserveGeneration(rawKey: string) {
  const entitlement = await getEntitlement(rawKey);
  if (!entitlement.valid || !entitlement.plan || entitlement.plan === 'owner') return entitlement;
  const hash = licenseHash(rawKey);
  const usageKey = `ce:usage:${hash}:${period().month}`;
  const bonusKey = `ce:bonus:${hash}`;
  const script = `local used=tonumber(redis.call('GET',KEYS[1]) or '0') local lim=tonumber(ARGV[1]) if used<lim then used=redis.call('INCR',KEYS[1]) redis.call('EXPIRE',KEYS[1],34560000) return {'plan',used} end local bonus=tonumber(redis.call('GET',KEYS[2]) or '0') if bonus>0 then bonus=redis.call('DECR',KEYS[2]) return {'bonus',bonus} end return {'denied',used}`;
  const result = await redis.eval(script, [usageKey, bonusKey], [LIMITS[entitlement.plan]]) as [string, number];
  if (result[0] === 'denied') return { ...entitlement, valid: false, error: 'You have used all AI generations for this month. Buy extra generations in Global Settings.' };
  return { ...entitlement, usage: await usageFor(hash, entitlement.plan), chargedFrom: result[0] };
}

export async function refundGeneration(rawKey: string, chargedFrom?: string) {
  const hash = licenseHash(rawKey);
  if (chargedFrom === 'bonus') await redis.incr(`ce:bonus:${hash}`);
  if (chargedFrom === 'plan') {
    const key = `ce:usage:${hash}:${period().month}`;
    if (Number(await redis.get<number>(key) || 0) > 0) await redis.decr(key);
  }
}

export async function addCredits(hash: string, amount: number) {
  if (!/^[a-f0-9]{64}$/.test(hash) || amount <= 0) throw new Error('Invalid credit purchase');
  return redis.incrby(`ce:bonus:${hash}`, amount);
}

export async function invalidateCustomerLicenses(customerId: string) {
  const hashes = await redis.smembers<string[]>(`ce:customer-licenses:${customerId}`);
  await Promise.all(hashes.map(hash => redis.del(`ce:license:${hash}`)));
}

export { redis };
