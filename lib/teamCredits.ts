import { redis } from '@/lib/billing';
import { randomUUID } from 'crypto';

export type CreditPool = {
  id: string;
  label: string;
  ownerAccountId: string;
  ownerName?: string;
  ownerEmail?: string;
  balance: number;
  used: number;
};

export type TeacherProfile = {
  name?: string;
  email?: string;
};

export function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase().slice(0, 200);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function saveProfile(accountId: string, profile: Required<TeacherProfile>) {
  await redis.set(`ce:profile:${accountId}`, profile);
  await redis.set(`ce:email-account:${profile.email}`, accountId);
}

export async function getProfile(accountId: string): Promise<TeacherProfile> {
  return (await redis.get<TeacherProfile>(`ce:profile:${accountId}`)) ?? {};
}

export async function enableTeamOwner(accountId: string) {
  await redis.set(`ce:team-owner:${accountId}`, '1');
}

export async function isTeamOwner(accountId: string): Promise<boolean> {
  const [flag, personalBalance, personalUsed, sharedBalance, sharedUsed] = await Promise.all([
    redis.get<string>(`ce:team-owner:${accountId}`),
    redis.get<number>(`ce:credits:${accountId}:ai`),
    redis.get<number>(`ce:credits-used:${accountId}:ai`),
    redis.get<number>(`ce:team:${accountId}:credits:ai`),
    redis.get<number>(`ce:team:${accountId}:credits-used:ai`),
  ]);

  return Boolean(flag) ||
    Number(personalBalance || 0) > 0 ||
    Number(personalUsed || 0) > 0 ||
    Number(sharedBalance || 0) > 0 ||
    Number(sharedUsed || 0) > 0;
}

export async function addTeamMember(ownerAccountId: string, email: string) {
  await enableTeamOwner(ownerAccountId);
  await redis.sadd(`ce:team:${ownerAccountId}:member-emails`, email);
  await redis.sadd(`ce:teams-for-email:${email}`, ownerAccountId);
}

export async function removeTeamMember(ownerAccountId: string, email: string) {
  await redis.srem(`ce:team:${ownerAccountId}:member-emails`, email);
  await redis.srem(`ce:teams-for-email:${email}`, ownerAccountId);
}

export async function listTeamMembers(ownerAccountId: string) {
  const emails = await redis.smembers<string[]>(`ce:team:${ownerAccountId}:member-emails`);

  return Promise.all((emails || []).sort().map(async email => {
    const accountId = await redis.get<string>(`ce:email-account:${email}`);
    const profile = accountId ? await getProfile(accountId) : {};
    return {
      email,
      accountId: accountId || null,
      name: profile.name || '',
    };
  }));
}

export async function getPersonalPool(accountId: string) {
  const [balance, used] = await Promise.all([
    redis.get<number>(`ce:credits:${accountId}:ai`),
    redis.get<number>(`ce:credits-used:${accountId}:ai`),
  ]);

  return {
    balance: Number(balance || 0),
    used: Number(used || 0),
  };
}

export async function getOwnedTeamPool(ownerAccountId: string) {
  const [balance, used] = await Promise.all([
    redis.get<number>(`ce:team:${ownerAccountId}:credits:ai`),
    redis.get<number>(`ce:team:${ownerAccountId}:credits-used:ai`),
  ]);

  return {
    balance: Number(balance || 0),
    used: Number(used || 0),
  };
}

export async function listSharedPoolsForAccount(accountId: string): Promise<CreditPool[]> {
  const profile = await getProfile(accountId);
  const email = normalizeEmail(profile.email);
  if (!isValidEmail(email)) return [];

  const ownerIds = await redis.smembers<string[]>(`ce:teams-for-email:${email}`);
  const uniqueOwnerIds = [...new Set(ownerIds || [])].filter(ownerId => ownerId !== accountId);

  return Promise.all(uniqueOwnerIds.map(async ownerAccountId => {
    const [ownerProfile, pool] = await Promise.all([
      getProfile(ownerAccountId),
      getOwnedTeamPool(ownerAccountId),
    ]);

    return {
      id: ownerAccountId,
      label: ownerProfile.name ? `${ownerProfile.name}'s shared credits` : 'Shared department credits',
      ownerAccountId,
      ownerName: ownerProfile.name,
      ownerEmail: ownerProfile.email,
      balance: pool.balance,
      used: pool.used,
    };
  }));
}

export async function canUseSharedPool(accountId: string, ownerAccountId: string): Promise<boolean> {
  if (accountId === ownerAccountId) return true;

  const profile = await getProfile(accountId);
  const email = normalizeEmail(profile.email);
  if (!isValidEmail(email)) return false;

  const ownerIds = await redis.smembers<string[]>(`ce:teams-for-email:${email}`);
  return (ownerIds || []).includes(ownerAccountId);
}

export async function recordUsage(event: {
  accountId: string;
  pool: 'personal' | 'shared';
  ownerAccountId?: string;
  credits: number;
  meter: string;
  model: string;
}) {
  const id = `${Date.now()}:${randomUUID()}`;
  const profile = await getProfile(event.accountId);
  const record = {
    ...event,
    teacherName: profile.name || '',
    teacherEmail: profile.email || '',
    createdAt: new Date().toISOString(),
  };

  await redis.set(`ce:ai-usage:${id}`, record);
  await redis.lpush(`ce:ai-usage-by-account:${event.accountId}`, id);
  await redis.ltrim(`ce:ai-usage-by-account:${event.accountId}`, 0, 99);

  if (event.pool === 'shared' && event.ownerAccountId) {
    await redis.lpush(`ce:ai-usage-by-team:${event.ownerAccountId}`, id);
    await redis.ltrim(`ce:ai-usage-by-team:${event.ownerAccountId}`, 0, 199);
  }
}

export async function getTeamUsage(ownerAccountId: string, limit = 50) {
  const ids = await redis.lrange<string>(`ce:ai-usage-by-team:${ownerAccountId}`, 0, Math.max(0, limit - 1));
  const records = await Promise.all((ids || []).map(id => redis.get<Record<string, unknown>>(`ce:ai-usage:${id}`)));

  return records.filter(Boolean);
}
