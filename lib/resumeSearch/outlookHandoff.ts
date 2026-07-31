import { randomBytes } from 'crypto';
import { redis } from '@/lib/redis';

export const OUTLOOK_HANDOFF_PREFIX = 'resume-search:outlook-handoff:';
export const OUTLOOK_HANDOFF_TTL_SECONDS = 15 * 60;
export const OUTLOOK_HANDOFF_MAX_BYTES = 4 * 1024 * 1024;
export const OUTLOOK_HANDOFF_MAX_ATTACHMENTS = 10;

export type OutlookHandoffAttachment = {
  name: string;
  mimeType: string;
  dataBase64: string;
};

export type OutlookHandoffPayload = {
  html?: string;
  subject?: string;
  attachments: OutlookHandoffAttachment[];
  createdAt: number;
};

export function createOutlookHandoffToken(): string {
  return randomBytes(18).toString('base64url');
}

export function outlookHandoffRedisKey(token: string): string {
  return `${OUTLOOK_HANDOFF_PREFIX}${token}`;
}

export function estimateHandoffBytes(payload: OutlookHandoffPayload): number {
  const htmlBytes = Buffer.byteLength(payload.html || '', 'utf8');
  const attachmentBytes = payload.attachments.reduce(
    (total, attachment) => total + Buffer.byteLength(attachment.dataBase64, 'utf8'),
    0,
  );
  return htmlBytes + attachmentBytes;
}

export async function saveOutlookHandoff(
  token: string,
  payload: OutlookHandoffPayload,
): Promise<void> {
  await redis.set(outlookHandoffRedisKey(token), payload, {
    ex: OUTLOOK_HANDOFF_TTL_SECONDS,
  });
}

export async function loadOutlookHandoff(
  token: string,
  consume = true,
): Promise<OutlookHandoffPayload | null> {
  const key = outlookHandoffRedisKey(token);
  const payload = await redis.get<OutlookHandoffPayload>(key);
  if (!payload) return null;
  if (consume) {
    await redis.del(key);
  }
  return payload;
}
