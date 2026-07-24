import 'server-only';
import { randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { getBroadcastAccount, type PublicBroadcastAccount } from '@/lib/broadcastAccounts';
import { redis } from '@/lib/redis';

export const BROADCAST_SESSION_COOKIE = 'canvas_broadcast_session';
export const BROADCAST_SESSION_SECONDS = 60 * 60 * 8;
const SESSION_PREFIX = 'canvas-broadcast:session:';

export async function createBroadcastSession(account: PublicBroadcastAccount): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await redis.set(`${SESSION_PREFIX}${token}`, { accountId: account.id }, { ex: BROADCAST_SESSION_SECONDS });
  return token;
}

export async function getBroadcastSession(request: NextRequest): Promise<PublicBroadcastAccount | null> {
  const token = request.cookies.get(BROADCAST_SESSION_COOKIE)?.value || '';
  if (!token) return null;
  const session = await redis.get<{ accountId?: string } | string>(`${SESSION_PREFIX}${token}`);
  if (!session) return null;
  let accountId = '';
  if (typeof session === 'string') {
    try { accountId = JSON.parse(session).accountId || ''; } catch { return null; }
  } else {
    accountId = session.accountId || '';
  }
  return accountId ? getBroadcastAccount(accountId) : null;
}

export async function destroyBroadcastSession(request: NextRequest) {
  const token = request.cookies.get(BROADCAST_SESSION_COOKIE)?.value || '';
  if (token) await redis.del(`${SESSION_PREFIX}${token}`);
}

export async function isBroadcastAuthorized(request: NextRequest): Promise<boolean> {
  return Boolean(await getBroadcastSession(request));
}

export function broadcastAuthError() {
  return { error: 'Please sign in to continue.' };
}
