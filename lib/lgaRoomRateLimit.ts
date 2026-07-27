import { redis } from '@/lib/redis';

const WINDOW_SECONDS = 60 * 60;
const MAX_REQUESTS_PER_WINDOW = 5;

export async function checkReservationRateLimit(clientKey: string): Promise<{ allowed: boolean }> {
  const key = `lga-room:reservation-rate:${clientKey}`;
  const current = Number(await redis.get(key) || 0);
  if (current >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false };
  }
  if (current === 0) {
    await redis.set(key, 1, { ex: WINDOW_SECONDS });
  } else {
    await redis.incr(key);
  }
  return { allowed: true };
}
