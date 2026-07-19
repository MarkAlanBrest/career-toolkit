import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';
import { redis } from '@/lib/redis';

export const SESSION_COOKIE = 'dc_session';
export const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export interface DcSchool {
  id: string;
  name: string;
  adminEmail: string;
  accountId: string;
  accountToken: string;
  createdAt: string;
}

export interface DcUser {
  email: string;
  passwordHash: string;
  passwordSalt: string;
  name: string;
  schoolId: string;
  role: 'teacher' | 'admin';
  active: boolean;
  createdAt: string;
  sharepointFolderPath?: string;
  // Departments this teacher may create documents for. Empty/undefined = full access
  // (unrestricted) — used both for legacy accounts and admins who haven't restricted anyone yet.
  departmentIds?: string[];
}

export interface DcSession {
  email: string;
  name: string;
  role: 'teacher' | 'admin';
  schoolId: string;
  schoolName: string;
  accountId: string;
  accountToken: string;
  departmentIds?: string[];
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, s, 120000, 64, 'sha256').toString('hex');
  return { hash, salt: s };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function normalizeFolderPath(raw: string): string {
  return String(raw || '')
    .trim()
    .split('/')
    .map(seg => seg.trim())
    .filter(seg => seg && seg !== '.' && seg !== '..')
    .join('/');
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(session: DcSession): Promise<string> {
  const token = generateToken();
  await redis.set(`dc:session:${token}`, JSON.stringify(session), { ex: SESSION_TTL });
  return token;
}

export async function getSession(token: string): Promise<DcSession | null> {
  try {
    const raw = await redis.get<string>(`dc:session:${token}`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw as DcSession;
  } catch {
    return null;
  }
}

export async function deleteSession(token: string): Promise<void> {
  await redis.del(`dc:session:${token}`);
}

export async function getSchool(schoolId: string): Promise<DcSchool | null> {
  try {
    const raw = await redis.get<string>(`dc:school:${schoolId}`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw as DcSchool;
  } catch {
    return null;
  }
}

export async function getUser(email: string): Promise<DcUser | null> {
  try {
    const raw = await redis.get<string>(`dc:user:${email.toLowerCase()}`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw as DcUser;
  } catch {
    return null;
  }
}

export async function saveUser(user: DcUser): Promise<void> {
  await redis.set(`dc:user:${user.email.toLowerCase()}`, JSON.stringify(user));
}

export async function saveSchool(school: DcSchool): Promise<void> {
  await redis.set(`dc:school:${school.id}`, JSON.stringify(school));
}

export async function addSchoolToIndex(schoolId: string): Promise<void> {
  const existing = await redis.get<string>('dc:schools');
  const ids: string[] = existing ? (typeof existing === 'string' ? JSON.parse(existing) : existing as string[]) : [];
  if (!ids.includes(schoolId)) {
    ids.push(schoolId);
    await redis.set('dc:schools', JSON.stringify(ids));
  }
}

export async function removeSchoolFromIndex(schoolId: string): Promise<void> {
  const existing = await redis.get<string>('dc:schools');
  const ids: string[] = existing ? (typeof existing === 'string' ? JSON.parse(existing) : existing as string[]) : [];
  await redis.set('dc:schools', JSON.stringify(ids.filter(id => id !== schoolId)));
}

export async function listSchoolIds(): Promise<string[]> {
  try {
    const raw = await redis.get<string>('dc:schools');
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw as string[];
  } catch {
    return [];
  }
}

export async function getSchoolTeacherEmails(schoolId: string): Promise<string[]> {
  try {
    const raw = await redis.get<string>(`dc:school:${schoolId}:teachers`);
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw as string[];
  } catch {
    return [];
  }
}

export async function getSchoolTeachers(schoolId: string): Promise<DcUser[]> {
  try {
    const keys = await redis.keys('dc:user:*');
    const users = await Promise.all(keys.map(async (key) => {
      try {
        const raw = await redis.get<string>(key);
        if (!raw) return null;
        const user = typeof raw === 'string' ? JSON.parse(raw) : raw as DcUser;
        return user.schoolId === schoolId && user.role === 'teacher' ? user : null;
      } catch {
        return null;
      }
    }));
    return users.filter((u): u is DcUser => Boolean(u));
  } catch {
    return [];
  }
}

export async function addTeacherToSchool(schoolId: string, email: string): Promise<void> {
  const emails = await getSchoolTeacherEmails(schoolId);
  if (!emails.includes(email)) {
    emails.push(email);
    await redis.set(`dc:school:${schoolId}:teachers`, JSON.stringify(emails));
  }
}

export async function removeTeacherFromSchool(schoolId: string, email: string): Promise<void> {
  const emails = await getSchoolTeacherEmails(schoolId);
  await redis.set(`dc:school:${schoolId}:teachers`, JSON.stringify(emails.filter(e => e !== email)));
}

export function sessionCookieOptions(maxAge = SESSION_TTL) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
