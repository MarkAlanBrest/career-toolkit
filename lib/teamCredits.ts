import { redis } from '@/lib/billing';
import { randomUUID } from 'crypto';

export type ContactTeacher = {
  email: string;
  accountId: string | null;
  name: string;
};

export type TeacherProfile = {
  name?: string;
  email?: string;
  canvasUserId?: string;
  canvasDomain?: string;
  registeredAt?: string;
};

export function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase().slice(0, 200);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function saveProfile(accountId: string, profile: TeacherProfile & { name: string; email: string }) {
  const email = normalizeEmail(profile.email);
  const existing = await getProfile(accountId);
  const oldEmail = normalizeEmail(existing.email);

  await redis.set(`ce:profile:${accountId}`, { ...profile, email });
  if (oldEmail && oldEmail !== email) await redis.del(`ce:email-account:${oldEmail}`);
  await redis.set(`ce:email-account:${email}`, accountId);

  // Atomic: read pending, delete pending key, credit balance - all in one script.
  // Prevents double-credit if the server crashes between incrby and del.
  const pendingScript = `local p=tonumber(redis.call('GET',KEYS[1]) or '0') if p>0 then redis.call('DEL',KEYS[1]) redis.call('INCRBY',KEYS[2],p) end return p`;
  await redis.eval(pendingScript, [
    `ce:pending-credits:${email}:ai`,
    `ce:credits:${accountId}:ai`,
  ], []);
}

export async function getProfile(accountId: string): Promise<TeacherProfile> {
  return (await redis.get<TeacherProfile>(`ce:profile:${accountId}`)) ?? {};
}

export async function addTeamMember(ownerAccountId: string, email: string) {
  await redis.sadd(`ce:team:${ownerAccountId}:member-emails`, email);
}

export async function removeTeamMember(ownerAccountId: string, email: string) {
  await redis.srem(`ce:team:${ownerAccountId}:member-emails`, email);
}

export async function listTeamMembers(ownerAccountId: string): Promise<ContactTeacher[]> {
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

export async function sendCreditsToTeacher(senderAccountId: string, email: string, amount: number) {
  const contactEmails = await redis.smembers<string[]>(`ce:team:${senderAccountId}:member-emails`);
  if (!(contactEmails || []).includes(email)) throw new Error('Add this teacher before sending credits.');

  // Look up recipient before the Lua script so we can include the credit key atomically.
  // This way the deduct and credit happen in one script - no crash window where sender
  // loses credits but recipient never receives them.
  const [senderProfile, recipientAccountId] = await Promise.all([
    getProfile(senderAccountId),
    redis.get<string>(`ce:email-account:${email}`),
  ]);
  if (recipientAccountId === senderAccountId || normalizeEmail(senderProfile.email) === email) {
    throw new Error('You cannot send credits to yourself.');
  }

  const creditKey = recipientAccountId
    ? `ce:credits:${recipientAccountId}:ai`
    : `ce:pending-credits:${email}:ai`;

  const balanceKey = `ce:credits:${senderAccountId}:ai`;
  const sentKey = `ce:credits-sent:${senderAccountId}:ai`;
  const script = `local bal=tonumber(redis.call('GET',KEYS[1]) or '0') if bal<tonumber(ARGV[1]) then return {-1,-1} end local nb=redis.call('DECRBY',KEYS[1],ARGV[1]) redis.call('INCRBY',KEYS[2],ARGV[1]) redis.call('INCRBY',KEYS[3],ARGV[1]) return {nb,bal}`;
  const result = await redis.eval(script, [balanceKey, sentKey, creditKey], [amount]) as number[];
  if (!Array.isArray(result) || result[0] === -1) throw new Error('Not enough credits to send.');

  const id = `${Date.now()}:${randomUUID()}`;
  await redis.set(`ce:credit-transfer:${id}`, {
    id,
    senderAccountId,
    senderName: senderProfile.name || '',
    senderEmail: senderProfile.email || '',
    recipientAccountId: recipientAccountId || '',
    recipientEmail: email,
    credits: amount,
    createdAt: new Date().toISOString(),
    status: recipientAccountId ? 'delivered' : 'pending',
  });
  await redis.lpush(`ce:credit-transfers:${senderAccountId}`, id);
  await redis.ltrim(`ce:credit-transfers:${senderAccountId}`, 0, 99);

  return { remainingBalance: result[0], recipientAccountId: recipientAccountId || null };
}

export async function getCreditTransfers(accountId: string, limit = 50) {
  const ids = await redis.lrange<string[]>(`ce:credit-transfers:${accountId}`, 0, Math.max(0, limit - 1));
  const records = await Promise.all((ids || []).map(id => redis.get<Record<string, unknown>>(`ce:credit-transfer:${id}`)));
  return records.filter(Boolean);
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

export async function recordUsage(event: {
  accountId: string;
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
}
