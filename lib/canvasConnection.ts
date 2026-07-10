import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { redis } from '@/lib/redis';

// Canvas personal access tokens are as powerful as the teacher's own login, so they're
// encrypted at rest (AES-256-GCM) rather than stored as plain text like other Redis values
// in this codebase. The key is derived from CANVAS_TOKEN_ENCRYPTION_KEY (or ANTHROPIC_API_KEY
// as a fallback so local/dev setups without the dedicated var still work) via SHA-256, so any
// length of source secret becomes a valid 32-byte AES key.
function encryptionKey(): Buffer {
  const secret = process.env.CANVAS_TOKEN_ENCRYPTION_KEY || process.env.ANTHROPIC_API_KEY || '';
  if (!secret) throw new Error('Server is not configured to store Canvas API tokens (missing CANVAS_TOKEN_ENCRYPTION_KEY).');
  return createHash('sha256').update(secret).digest();
}

function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return dec.toString('utf8');
}

export type CanvasConnection = { domain: string; tokenEnc: string; userName: string; connectedAt: string };

export async function saveCanvasConnection(accountId: string, domain: string, token: string, userName: string) {
  const record: CanvasConnection = { domain, tokenEnc: encrypt(token), userName, connectedAt: new Date().toISOString() };
  await redis.set(`ce:canvas-conn:${accountId}`, record);
}

export async function getCanvasConnection(accountId: string): Promise<{ domain: string; token: string; userName: string } | null> {
  const record = await redis.get<CanvasConnection>(`ce:canvas-conn:${accountId}`);
  if (!record) return null;
  try {
    return { domain: record.domain, token: decrypt(record.tokenEnc), userName: record.userName };
  } catch {
    return null;
  }
}

export async function clearCanvasConnection(accountId: string) {
  await redis.del(`ce:canvas-conn:${accountId}`);
}
