import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { get, put } from '@vercel/blob';

export type EmployerNotificationRecipients = {
  applicantRequest: string[];
  jobPosting: string[];
  general: string[];
};

export type EmployerPortalSettings = {
  notificationRecipients: EmployerNotificationRecipients;
  senderEmail: string;
  senderAppPassword: string;
  senderName: string;
  replyToEmail: string;
  microsoftTenantId: string;
  microsoftClientId: string;
  microsoftRefreshToken: string;
  microsoftConnectedAt: string;
};

export type AdminAccount = {
  email: string;
  passwordHash: string;
  createdAt: string;
};

export const ADMIN_SESSION_COOKIE = 'employer_portal_admin_session';

const SETTINGS_PATHNAME = 'employer-portal/settings.json';
const ADMINS_PATHNAME = 'employer-portal/admins.json';
const ADMIN_SESSIONS_PATHNAME = 'employer-portal/admin-sessions.json';

export function getMasterPassword(): string {
  return process.env.EMPLOYER_PORTAL_ADMIN_PASSWORD || 'ncstadmin123';
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const suppliedHash = scryptSync(password, salt, 64);
  const storedHash = Buffer.from(hash, 'hex');
  if (suppliedHash.length !== storedHash.length) return false;
  return timingSafeEqual(suppliedHash, storedHash);
}

export async function getAdminAccounts(): Promise<AdminAccount[]> {
  const result = await get(ADMINS_PATHNAME, { access: 'private' });
  if (!result) return [];
  const data = await new Response(result.stream).json();
  return Array.isArray(data) ? data : [];
}

async function saveAdminAccounts(accounts: AdminAccount[]): Promise<void> {
  await put(ADMINS_PATHNAME, JSON.stringify(accounts), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function addAdminAccount(email: string, password: string): Promise<void> {
  const accounts = await getAdminAccounts();
  const next = accounts.filter(a => a.email.toLowerCase() !== email.toLowerCase());
  next.push({ email: email.toLowerCase(), passwordHash: hashPassword(password), createdAt: new Date().toISOString() });
  await saveAdminAccounts(next);
}

export async function removeAdminAccount(email: string): Promise<void> {
  const accounts = await getAdminAccounts();
  await saveAdminAccounts(accounts.filter(a => a.email.toLowerCase() !== email.toLowerCase()));
}

export async function isAdminAuthorized(email: string | null | undefined, password: string | null | undefined): Promise<boolean> {
  if (!password) return false;
  if (password === getMasterPassword()) return true;
  if (!email) return false;
  try {
    const accounts = await getAdminAccounts();
    const account = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
    return Boolean(account) && verifyPassword(password, account!.passwordHash);
  } catch {
    return false;
  }
}

type AdminSession = { tokenHash: string; email: string; expiresAt: number };

async function getAdminSessions(): Promise<AdminSession[]> {
  const result = await get(ADMIN_SESSIONS_PATHNAME, { access: 'private', useCache: false });
  if (!result) return [];
  const data = await new Response(result.stream).json();
  return Array.isArray(data) ? data : [];
}

async function saveAdminSessions(sessions: AdminSession[]): Promise<void> {
  await put(ADMIN_SESSIONS_PATHNAME, JSON.stringify(sessions), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function sessionTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAdminSessionToken(email: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  const sessions = (await getAdminSessions()).filter(session => session.expiresAt > now);
  sessions.push({
    tokenHash: sessionTokenHash(token),
    email: email.trim().toLowerCase(),
    expiresAt: now + 8 * 60 * 60 * 1000,
  });
  await saveAdminSessions(sessions);
  return token;
}

export async function getAdminSessionEmail(request: Request): Promise<string | null> {
  const cookie = request.headers.get('cookie') || '';
  const raw = cookie.split(';').map(item => item.trim()).find(item => item.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const token = raw ? decodeURIComponent(raw.slice(ADMIN_SESSION_COOKIE.length + 1)) : '';
  if (!token) return null;
  const hash = sessionTokenHash(token);
  const session = (await getAdminSessions())
    .find(item => item.tokenHash === hash && item.expiresAt > Date.now());
  return session?.email || null;
}

export async function isAdminRequestAuthorized(request: Request): Promise<boolean> {
  if (await getAdminSessionEmail(request)) return true;
  return isAdminAuthorized(
    request.headers.get('x-admin-email'),
    request.headers.get('x-admin-password'),
  );
}

export async function isMicrosoftAdminAllowed(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const accounts = await getAdminAccounts();
  if (accounts.some(account => account.email.toLowerCase() === normalized)) return true;
  if (accounts.length > 0) return false;
  const settings = await getEmployerPortalSettings();
  return settings.senderEmail.trim().toLowerCase() === normalized;
}

const EMPTY_SETTINGS: EmployerPortalSettings = {
  notificationRecipients: {
    applicantRequest: [],
    jobPosting: [],
    general: [],
  },
  senderEmail: '',
  senderAppPassword: '',
  senderName: '',
  replyToEmail: '',
  microsoftTenantId: '',
  microsoftClientId: '',
  microsoftRefreshToken: '',
  microsoftConnectedAt: '',
};

function cleanRecipientList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((email): email is string => typeof email === 'string')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean),
  ));
}

export async function getEmployerPortalSettings(): Promise<EmployerPortalSettings> {
  const result = await get(SETTINGS_PATHNAME, { access: 'private', useCache: false });
  if (!result) return { ...EMPTY_SETTINGS };
  const data = await new Response(result.stream).json();
  const recipients = data?.notificationRecipients;
  return {
    notificationRecipients: {
      applicantRequest: cleanRecipientList(recipients?.applicantRequest),
      jobPosting: cleanRecipientList(recipients?.jobPosting),
      general: cleanRecipientList(recipients?.general),
    },
    senderEmail: typeof data?.senderEmail === 'string' ? data.senderEmail : '',
    senderAppPassword: typeof data?.senderAppPassword === 'string' ? data.senderAppPassword : '',
    senderName: typeof data?.senderName === 'string' ? data.senderName : '',
    replyToEmail: typeof data?.replyToEmail === 'string' ? data.replyToEmail : '',
    microsoftTenantId: typeof data?.microsoftTenantId === 'string' ? data.microsoftTenantId : '',
    microsoftClientId: typeof data?.microsoftClientId === 'string' ? data.microsoftClientId : '',
    microsoftRefreshToken: typeof data?.microsoftRefreshToken === 'string' ? data.microsoftRefreshToken : '',
    microsoftConnectedAt: typeof data?.microsoftConnectedAt === 'string' ? data.microsoftConnectedAt : '',
  };
}

export async function saveEmployerPortalSettings(settings: EmployerPortalSettings): Promise<void> {
  await put(SETTINGS_PATHNAME, JSON.stringify(settings), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
