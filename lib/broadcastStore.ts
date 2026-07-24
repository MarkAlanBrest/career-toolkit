import 'server-only';
import { randomUUID } from 'crypto';
import { redis } from '@/lib/redis';
import type { CampusCode, SendResult } from '@/lib/canvasBroadcast';

const TEMPLATES_KEY = 'canvas-broadcast:templates';
const HISTORY_KEY = 'canvas-broadcast:history';

export type MessageTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type BroadcastRecord = {
  id: string;
  createdAt: string;
  campus: CampusCode;
  campusName: string;
  subject: string;
  body: string;
  recipientCount: number;
  eligibleCourseCount: number;
  status: SendResult['status'];
  sentCount: number;
  failedCount: number;
  errors: string[];
};

async function readJsonList<T>(key: string): Promise<T[]> {
  const value = await redis.get<T[] | string>(key);
  if (!value) return [];
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T[]; } catch { return []; }
  }
  return Array.isArray(value) ? value : [];
}

export async function listTemplates() {
  return readJsonList<MessageTemplate>(TEMPLATES_KEY);
}

export async function saveTemplate(input: { id?: string; name: string; subject: string; body: string }) {
  const templates = await listTemplates();
  const now = new Date().toISOString();
  const existing = input.id ? templates.find(item => item.id === input.id) : undefined;
  const template: MessageTemplate = existing
    ? { ...existing, name: input.name, subject: input.subject, body: input.body, updatedAt: now }
    : { id: randomUUID(), name: input.name, subject: input.subject, body: input.body, createdAt: now, updatedAt: now };
  const next = existing ? templates.map(item => item.id === template.id ? template : item) : [template, ...templates];
  await redis.set(TEMPLATES_KEY, next);
  return template;
}

export async function deleteTemplate(id: string) {
  const templates = await listTemplates();
  const next = templates.filter(item => item.id !== id);
  if (next.length === templates.length) return false;
  await redis.set(TEMPLATES_KEY, next);
  return true;
}

export async function listBroadcasts() {
  return (await readJsonList<BroadcastRecord>(HISTORY_KEY)).slice(0, 25);
}

export async function addBroadcast(input: Omit<BroadcastRecord, 'id' | 'createdAt'>) {
  const record: BroadcastRecord = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
  const history = await listBroadcasts();
  await redis.set(HISTORY_KEY, [record, ...history].slice(0, 25));
  return record;
}
