import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';

export type PackageName = 'teaching' | 'creation' | 'owner';
export type MeterName = 'teaching' | 'creation';
export type UsageSummary = { used: number; limit: number | null; remaining: number | null; bonus: number; resetsAt: string };
export type Entitlement = {
  valid: boolean; package?: PackageName; status?: string; customerId?: string; customerEmail?: string;
  usage?: UsageSummary; error?: string; chargedFrom?: string; licenseKey?: string;
};
export type AccountEntitlements = {
  valid: boolean; packages: Partial<Record<MeterName, Entitlement>>; errors: string[];
};
type LemonValidation = { valid?: boolean; error?: string; license_key?: { status?: string }; meta?: { variant_id?: number; customer_id?: number; customer_email?: string } };

const redis = Redis.fromEnv();
const LIMITS: Record<MeterName, number> = { teaching: 500, creation: 100 };
const envList = (name: string) => new Set((process.env[name] || '').split(',').map(v => v.trim()).filter(Boolean));

export const normalizeKey = (key: string) => String(key || '').trim();
export const normalizeKeys = (keys: string | string[]) => {
  const values = Array.isArray(keys) ? keys : String(keys || '').split(/[\n,]+/);
  return [...new Set(values.map(normalizeKey).filter(Boolean))];
};
export const licenseHash = (key: string) => createHash('sha256').update(normalizeKey(key)).digest('hex');

function packageForVariant(id: number | string | undefined): PackageName | undefined {
  const value = String(id || '');
  if (envList('LEMONSQUEEZY_TEACHING_VARIANT_IDS').has(value)) return 'teaching';
  if (envList('LEMONSQUEEZY_CREATION_VARIANT_IDS').has(value)) return 'creation';
}

function period() {
  const now = new Date();
  return { month: now.toISOString().slice(0, 7), resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString() };
}

async function usageFor(hash: string, meter: MeterName, unlimited = false): Promise<UsageSummary> {
  const { month, resetsAt } = period();
  const [usedValue, bonusValue] = await Promise.all([
    redis.get<number>(`ce:usage:${hash}:${meter}:${month}`), redis.get<number>(`ce:bonus:${hash}:${meter}`),
  ]);
  const used = Number(usedValue || 0);
  const bonus = Number(bonusValue || 0);
  if (unlimited) return { used, limit: null, remaining: null, bonus, resetsAt };
  const limit = LIMITS[meter];
  return { used, limit, remaining: Math.max(0, limit - used), bonus, resetsAt };
}

async function validateWithLemon(key: string): Promise<LemonValidation> {
  const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ license_key: key }), cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as LemonValidation;
  if (!response.ok) throw new Error(data.error || `License service returned ${response.status}`);
  return data;
}

export async function getEntitlement(rawKey: string, forceRefresh = false): Promise<Entitlement> {
  const key = normalizeKey(rawKey);
  if (!key) return { valid: false, error: 'Enter a license key in Global Settings.' };
  const ownerKey = normalizeKey(process.env.OWNER_KEY || '');
  if (ownerKey && key.toLowerCase() === ownerKey.toLowerCase()) return { valid: true, package: 'owner', status: 'active', licenseKey: key };

  const hash = licenseHash(key);
  const cacheKey = `ce:license:${hash}`;
  if (!forceRefresh) {
    const cached = await redis.get<Omit<Entitlement, 'usage' | 'licenseKey'>>(cacheKey);
    if (cached) {
      const meter = cached.package === 'teaching' || cached.package === 'creation' ? cached.package : undefined;
      return { ...cached, licenseKey: key, usage: cached.valid && meter ? await usageFor(hash, meter) : undefined };
    }
  }

  let lemon: LemonValidation;
  try { lemon = await validateWithLemon(key); }
  catch (error) { return { valid: false, licenseKey: key, error: error instanceof Error ? error.message : 'Could not validate license.' }; }
  const status = lemon.license_key?.status || (lemon.valid ? 'active' : 'inactive');
  const packageName = packageForVariant(lemon.meta?.variant_id);
  const valid = lemon.valid === true && status === 'active' && Boolean(packageName);
  const cached: Omit<Entitlement, 'usage' | 'licenseKey'> = {
    valid, package: packageName, status,
    customerId: lemon.meta?.customer_id ? String(lemon.meta.customer_id) : undefined,
    customerEmail: lemon.meta?.customer_email,
    error: !lemon.valid ? (lemon.error || 'This license is not active.')
      : !packageName ? 'This purchase is not connected to a Canvas Enhancer package.'
      : status !== 'active' ? `This license is ${status}.` : undefined,
  };
  await redis.set(cacheKey, cached, { ex: 300 });
  if (cached.customerId) await redis.sadd(`ce:customer-licenses:${cached.customerId}`, hash);
  return { ...cached, licenseKey: key, usage: valid && packageName ? await usageFor(hash, packageName) : undefined };
}

export async function getAccountEntitlements(rawKeys: string | string[], forceRefresh = false): Promise<AccountEntitlements> {
  const keys = normalizeKeys(rawKeys);
  if (!keys.length) return { valid: false, packages: {}, errors: ['Enter a license key in Global Settings.'] };
  const results = await Promise.all(keys.map(key => getEntitlement(key, forceRefresh)));
  const packages: Partial<Record<MeterName, Entitlement>> = {};
  const errors: string[] = [];
  for (const result of results) {
    if (result.valid && result.package === 'owner') {
      packages.teaching = { ...result, package: 'teaching', usage: await usageFor(licenseHash(result.licenseKey!), 'teaching', true) };
      packages.creation = { ...result, package: 'creation', usage: await usageFor(licenseHash(result.licenseKey!), 'creation', true) };
    } else if (result.valid && (result.package === 'teaching' || result.package === 'creation')) packages[result.package] = result;
    else if (result.error) errors.push(result.error);
  }
  return { valid: Boolean(packages.teaching || packages.creation), packages, errors };
}

export async function reserveGeneration(rawKeys: string | string[], meter: MeterName) {
  const account = await getAccountEntitlements(rawKeys);
  const entitlement = account.packages[meter];
  if (!entitlement?.valid || !entitlement.licenseKey) return { valid: false, error: `The ${meter === 'teaching' ? 'Teaching Tools' : 'Creation Tools'} package is required.` } as Entitlement;
  const ownerKey = normalizeKey(process.env.OWNER_KEY || '');
  if (ownerKey && entitlement.licenseKey.toLowerCase() === ownerKey.toLowerCase()) return entitlement;
  const hash = licenseHash(entitlement.licenseKey);
  const usageKey = `ce:usage:${hash}:${meter}:${period().month}`;
  const bonusKey = `ce:bonus:${hash}:${meter}`;
  const script = `local used=tonumber(redis.call('GET',KEYS[1]) or '0') local lim=tonumber(ARGV[1]) if used<lim then used=redis.call('INCR',KEYS[1]) redis.call('EXPIRE',KEYS[1],34560000) return {'plan',used} end local bonus=tonumber(redis.call('GET',KEYS[2]) or '0') if bonus>0 then bonus=redis.call('DECR',KEYS[2]) return {'bonus',bonus} end return {'denied',used}`;
  const result = await redis.eval(script, [usageKey, bonusKey], [LIMITS[meter]]) as [string, number];
  if (result[0] === 'denied') return { ...entitlement, valid: false, error: `You have used all ${meter === 'teaching' ? 'AI gradings' : 'creation generations'} for this month. You can buy a refill in Global Settings.` };
  return { ...entitlement, usage: await usageFor(hash, meter), chargedFrom: result[0] };
}

export async function refundGeneration(rawKey: string, meter: MeterName, chargedFrom?: string) {
  const hash = licenseHash(rawKey);
  if (chargedFrom === 'bonus') await redis.incr(`ce:bonus:${hash}:${meter}`);
  if (chargedFrom === 'plan') {
    const key = `ce:usage:${hash}:${meter}:${period().month}`;
    if (Number(await redis.get<number>(key) || 0) > 0) await redis.decr(key);
  }
}

export async function addCredits(hash: string, meter: MeterName, amount: number) {
  if (!/^[a-f0-9]{64}$/.test(hash) || amount <= 0) throw new Error('Invalid credit purchase');
  return redis.incrby(`ce:bonus:${hash}:${meter}`, amount);
}

export async function invalidateCustomerLicenses(customerId: string) {
  const hashes = await redis.smembers<string[]>(`ce:customer-licenses:${customerId}`);
  await Promise.all(hashes.map(hash => redis.del(`ce:license:${hash}`)));
}

export { redis };
