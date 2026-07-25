import 'server-only';
import { randomUUID } from 'crypto';
import { redis } from '@/lib/redis';
import { deleteCanvasAnnouncements, type AnnouncementRef } from '@/lib/canvasBroadcast';

const EXPIRY_KEY = 'canvas-broadcast:announcement-expiry:v1';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type ExpiryJob = {
  id: string;
  broadcastId: string;
  createdAt: string;
  expiresAt: string;
  refs: AnnouncementRef[];
  attempts: number;
  errors: string[];
};

async function readJobs(): Promise<ExpiryJob[]> {
  const value = await redis.get<ExpiryJob[] | string>(EXPIRY_KEY);
  if (!value) return [];
  if (typeof value === 'string') {
    try { return JSON.parse(value) as ExpiryJob[]; } catch { return []; }
  }
  return Array.isArray(value) ? value : [];
}

export function announcementExpiryDate(createdAt = new Date()) {
  return new Date(createdAt.getTime() + SEVEN_DAYS_MS).toISOString();
}

export async function scheduleAnnouncementExpiry(
  broadcastId: string,
  refs: AnnouncementRef[],
  createdAt = new Date(),
) {
  if (!refs.length) return null;
  const jobs = await readJobs();
  const existing = jobs.find(job => job.broadcastId === broadcastId);
  if (existing) return existing;
  const job: ExpiryJob = {
    id: randomUUID(),
    broadcastId,
    createdAt: createdAt.toISOString(),
    expiresAt: announcementExpiryDate(createdAt),
    refs,
    attempts: 0,
    errors: [],
  };
  await redis.set(EXPIRY_KEY, [...jobs, job]);
  return job;
}

export async function deleteExpiredBroadcastAnnouncements(now = new Date()) {
  const jobs = await readJobs();
  const due = jobs.filter(job => new Date(job.expiresAt) <= now);
  const waiting = jobs.filter(job => new Date(job.expiresAt) > now);
  const retry: ExpiryJob[] = [];
  let deleted = 0;

  for (const job of due) {
    const result = await deleteCanvasAnnouncements(job.refs);
    deleted += result.sent;
    if (result.failed) {
      const deletedKeys = new Set(
        (result.announcementRefs || []).map(ref => `${ref.courseId}:${ref.topicId}`),
      );
      retry.push({
        ...job,
        refs: job.refs.filter(ref => !deletedKeys.has(`${ref.courseId}:${ref.topicId}`)),
        attempts: job.attempts + 1,
        errors: result.errors,
      });
    }
  }

  await redis.set(EXPIRY_KEY, [...waiting, ...retry]);
  return {
    jobsProcessed: due.length,
    announcementsDeleted: deleted,
    jobsRemaining: waiting.length + retry.length,
    errors: retry.flatMap(job => job.errors),
  };
}
