import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { Redis as UpstashRedis } from '@upstash/redis';

type MemoryStoreValue = { value: unknown; expiresAt?: number };
type MemoryStore = { data: Map<string, MemoryStoreValue>; sets: Map<string, Set<string>>; filePath: string };

function getFallbackFilePath(): string {
  const filePath = join(process.cwd(), '.next', 'cache', 'document-creator-redis.json');
  mkdirSync(dirname(filePath), { recursive: true });
  return filePath;
}

function loadMemoryStore(filePath: string): MemoryStore {
  const store: MemoryStore = { data: new Map(), sets: new Map(), filePath };
  if (!existsSync(filePath)) return store;

  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as { data?: Array<[string, MemoryStoreValue]>; sets?: Array<[string, string[]]> };
    if (raw.data) store.data = new Map(raw.data);
    if (raw.sets) store.sets = new Map(raw.sets.map(([key, values]) => [key, new Set(values)]));
  } catch {
    // Ignore corrupt fallback storage and keep going with an empty store.
  }

  return store;
}

function persistMemoryStore(store: MemoryStore): void {
  const payload = {
    data: Array.from(store.data.entries()),
    sets: Array.from(store.sets.entries()).map(([key, values]) => [key, Array.from(values)]),
  };
  writeFileSync(store.filePath, JSON.stringify(payload), 'utf8');
}

function createFileBackedRedis() {
  const store = loadMemoryStore(getFallbackFilePath());

  const cleanupExpired = () => {
    const now = Date.now();
    for (const [key, value] of Array.from(store.data.entries())) {
      if (value.expiresAt && value.expiresAt <= now) {
        store.data.delete(key);
      }
    }
    if (store.data.size || store.sets.size) persistMemoryStore(store);
  };

  const getStoredValue = (key: string): unknown => {
    const entry = store.data.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      store.data.delete(key);
      persistMemoryStore(store);
      return undefined;
    }
    return entry.value;
  };

  return {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      cleanupExpired();
      return getStoredValue(key) as T | undefined;
    },
    async set(key: string, value: unknown, options?: { ex?: number; nx?: boolean }) {
      cleanupExpired();
      if (options?.nx && store.data.has(key) && getStoredValue(key) !== undefined) return null;
      store.data.set(key, { value, expiresAt: options?.ex ? Date.now() + options.ex * 1000 : undefined });
      persistMemoryStore(store);
      return 'OK';
    },
    async del(...keys: string[]) {
      cleanupExpired();
      let deleted = 0;
      keys.forEach(key => {
        if (store.data.delete(key)) deleted += 1;
        if (store.sets.delete(key)) deleted += 1;
      });
      if (deleted) persistMemoryStore(store);
      return deleted;
    },
    async keys(pattern: string) {
      cleanupExpired();
      const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      return Array.from(store.data.keys()).filter(key => regex.test(key));
    },
    async exists(key: string) {
      cleanupExpired();
      return getStoredValue(key) !== undefined ? 1 : 0;
    },
    async sadd(key: string, ...values: string[]) {
      cleanupExpired();
      const set = store.sets.get(key) || new Set<string>();
      values.forEach(value => set.add(value));
      store.sets.set(key, set);
      persistMemoryStore(store);
      return set.size;
    },
    async srem(key: string, ...values: string[]) {
      cleanupExpired();
      const set = store.sets.get(key);
      if (!set) return 0;
      values.forEach(value => set.delete(value));
      if (!set.size) store.sets.delete(key);
      persistMemoryStore(store);
      return values.length;
    },
    async smembers(key: string) {
      cleanupExpired();
      return Array.from(store.sets.get(key) || []);
    },
    async scard(key: string) {
      cleanupExpired();
      return (store.sets.get(key) || new Set<string>()).size;
    },
    async zadd(key: string, items: { score: number; member: string } | { score: number; member: string }[]) {
      cleanupExpired();
      const entries = Array.isArray(items) ? items : [items];
      const sorted = (getStoredValue(key) as Array<{ score: number; member: string }> | undefined || []) as Array<{ score: number; member: string }>;
      const next = [...sorted.filter((entry: { score: number; member: string }) => !entries.some(item => item.member === entry.member))];
      next.push(...entries);
      next.sort((a, b) => a.score - b.score);
      store.data.set(key, { value: next });
      persistMemoryStore(store);
      return next.length;
    },
    async zrange(key: string, start: number, stop: number) {
      cleanupExpired();
      const sorted = (getStoredValue(key) as Array<{ score: number; member: string }> | undefined || []) as Array<{ score: number; member: string }>;
      if (start === 0 && stop === -1) return sorted.map(entry => entry.member);
      const items = sorted.slice(start, stop === -1 ? undefined : stop + 1);
      return items.map(entry => entry.member);
    },
    async zcard(key: string) {
      cleanupExpired();
      const sorted = (getStoredValue(key) as Array<{ score: number; member: string }> | undefined || []) as Array<{ score: number; member: string }>;
      return sorted.length;
    },
    async zremrangebyrank(key: string, start: number, stop: number) {
      cleanupExpired();
      const sorted = (getStoredValue(key) as Array<{ score: number; member: string }> | undefined || []) as Array<{ score: number; member: string }>;
      const next = sorted.filter((_, index) => index < start || index > stop);
      store.data.set(key, { value: next });
      persistMemoryStore(store);
      return next.length;
    },
    async lpush(key: string, ...values: string[]) {
      cleanupExpired();
      const list = (getStoredValue(key) as string[] | undefined) || [];
      const next = [...values, ...list];
      store.data.set(key, { value: next });
      persistMemoryStore(store);
      return next.length;
    },
    async lrange(key: string, start: number, stop: number) {
      cleanupExpired();
      const list = (getStoredValue(key) as string[] | undefined) || [];
      if (stop === -1) return list.slice(start);
      return list.slice(start, stop + 1);
    },
    async lrem(key: string, count: number, value: string) {
      cleanupExpired();
      const list = (getStoredValue(key) as string[] | undefined) || [];
      const next = list.filter(item => item !== value);
      store.data.set(key, { value: next });
      persistMemoryStore(store);
      return next.length;
    },
    async rpush(key: string, ...values: string[]) {
      cleanupExpired();
      const list = (getStoredValue(key) as string[] | undefined) || [];
      const next = [...list, ...values];
      store.data.set(key, { value: next });
      persistMemoryStore(store);
      return next.length;
    },
    async ltrim(key: string, start: number, stop: number) {
      cleanupExpired();
      const list = (getStoredValue(key) as string[] | undefined) || [];
      const next = stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
      store.data.set(key, { value: next });
      persistMemoryStore(store);
      return 'OK';
    },
    async llen(key: string) {
      cleanupExpired();
      return (getStoredValue(key) as string[] | undefined || []).length;
    },
    async eval(_script: string, _keys: string[] = [], _args: Array<string | number> = []) {
      return ['denied', 0];
    },
    async incr(key: string) {
      cleanupExpired();
      const next = (Number(getStoredValue(key) || 0) + 1);
      store.data.set(key, { value: next });
      persistMemoryStore(store);
      return next;
    },
    async decr(key: string) {
      cleanupExpired();
      const next = (Number(getStoredValue(key) || 0) - 1);
      store.data.set(key, { value: next });
      persistMemoryStore(store);
      return next;
    },
    async incrby(key: string, amount: number) {
      cleanupExpired();
      const next = (Number(getStoredValue(key) || 0) + amount);
      store.data.set(key, { value: next });
      persistMemoryStore(store);
      return next;
    },
    async decrby(key: string, amount: number) {
      cleanupExpired();
      const next = (Number(getStoredValue(key) || 0) - amount);
      store.data.set(key, { value: next });
      persistMemoryStore(store);
      return next;
    },
  };
}

// Vercel's "Upstash for Redis" marketplace integration names these KV_REST_API_* rather than
// UPSTASH_REDIS_REST_*, which is what Redis.fromEnv() looks for by default — support both so the
// real database is used whichever naming this project actually has configured.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const hasRedisConfig = Boolean(redisUrl && redisToken);
export const redis = hasRedisConfig ? new UpstashRedis({ url: redisUrl!, token: redisToken! }) : createFileBackedRedis();
