import 'server-only';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import { redis } from '@/lib/redis';

const ACCOUNTS_KEY = 'canvas-broadcast:accounts';
const SETUP_LOCK_KEY = 'canvas-broadcast:setup-lock';

export type BroadcastAccount = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicBroadcastAccount = Omit<BroadcastAccount, 'passwordHash'>;

function publicAccount(account: BroadcastAccount): PublicBroadcastAccount {
  const { passwordHash: _passwordHash, ...safe } = account;
  return safe;
}

async function readAccounts(): Promise<BroadcastAccount[]> {
  const value = await redis.get<BroadcastAccount[] | string>(ACCOUNTS_KEY);
  if (!value) return [];
  if (typeof value === 'string') {
    try { return JSON.parse(value) as BroadcastAccount[]; } catch { return []; }
  }
  return Array.isArray(value) ? value : [];
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const supplied = scryptSync(password, salt, expected.length);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function validateInput(input: { name?: string; email?: string; password?: string }, passwordRequired: boolean) {
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (!name || name.length > 100) throw new Error('Enter a valid administrator name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Enter a valid email address.');
  if ((passwordRequired || password) && password.length < 10) throw new Error('Passwords must be at least 10 characters.');
  return { name, email, password };
}

export async function hasBroadcastAccounts() {
  return (await readAccounts()).length > 0;
}

export async function listBroadcastAccounts(): Promise<PublicBroadcastAccount[]> {
  return (await readAccounts()).map(publicAccount);
}

export async function getBroadcastAccount(id: string): Promise<PublicBroadcastAccount | null> {
  const account = (await readAccounts()).find(item => item.id === id);
  return account ? publicAccount(account) : null;
}

export async function authenticateBroadcastAccount(email: string, password: string): Promise<PublicBroadcastAccount | null> {
  const account = (await readAccounts()).find(item => item.email === email.trim().toLowerCase());
  return account && verifyPassword(password, account.passwordHash) ? publicAccount(account) : null;
}

export async function createFirstBroadcastAccount(input: { name?: string; email?: string; password?: string }) {
  const values = validateInput(input, true);
  const lock = await redis.set(SETUP_LOCK_KEY, randomUUID(), { nx: true, ex: 30 });
  if (!lock) throw new Error('Administrator setup is already in progress. Try again.');
  try {
    if (await hasBroadcastAccounts()) throw new Error('Administrator setup has already been completed.');
    return await createBroadcastAccount(values);
  } finally {
    await redis.del(SETUP_LOCK_KEY);
  }
}

export async function createBroadcastAccount(input: { name?: string; email?: string; password?: string }) {
  const values = validateInput(input, true);
  const accounts = await readAccounts();
  if (accounts.some(item => item.email === values.email)) throw new Error('An administrator with that email already exists.');
  const now = new Date().toISOString();
  const account: BroadcastAccount = {
    id: randomUUID(),
    name: values.name,
    email: values.email,
    passwordHash: hashPassword(values.password),
    createdAt: now,
    updatedAt: now,
  };
  await redis.set(ACCOUNTS_KEY, [...accounts, account]);
  return publicAccount(account);
}

export async function updateBroadcastAccount(id: string, input: { name?: string; email?: string; password?: string }) {
  const values = validateInput(input, false);
  const accounts = await readAccounts();
  const existing = accounts.find(item => item.id === id);
  if (!existing) throw new Error('Administrator account not found.');
  if (accounts.some(item => item.id !== id && item.email === values.email)) {
    throw new Error('An administrator with that email already exists.');
  }
  const updated: BroadcastAccount = {
    ...existing,
    name: values.name,
    email: values.email,
    passwordHash: values.password ? hashPassword(values.password) : existing.passwordHash,
    updatedAt: new Date().toISOString(),
  };
  await redis.set(ACCOUNTS_KEY, accounts.map(item => item.id === id ? updated : item));
  return publicAccount(updated);
}

export async function deleteBroadcastAccount(id: string, currentAccountId: string) {
  const accounts = await readAccounts();
  if (id === currentAccountId) throw new Error('You cannot delete the account you are currently using.');
  if (accounts.length <= 1) throw new Error('At least one administrator account is required.');
  if (!accounts.some(item => item.id === id)) throw new Error('Administrator account not found.');
  await redis.set(ACCOUNTS_KEY, accounts.filter(item => item.id !== id));
}
