import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { get, put } from '@vercel/blob';
import type { ServicePanelId } from './employerPortalForms';

export const EMPLOYER_SESSION_COOKIE = 'employer_portal_user_session';

const EMPLOYERS_PATHNAME = 'employer-portal/employers.json';
const EMPLOYER_SESSIONS_PATHNAME = 'employer-portal/employer-sessions.json';
const EMPLOYER_PASSWORD_RESETS_PATHNAME = 'employer-portal/employer-password-resets.json';
const SUBMISSIONS_PATHNAME = 'employer-portal/submissions.json';

export type EmployerProfile = {
  employerName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  mailingAddress: string;
  notes: string;
  updatedAt: string;
};

export type EmployerAccount = {
  email: string;
  passwordHash: string;
  profile: EmployerProfile;
  createdAt: string;
};

export type SubmissionRecord = {
  id: string;
  employerEmail: string;
  formId: ServicePanelId;
  formTitle: string;
  values: Record<string, string>;
  submittedAt: string;
  emailSent: boolean;
};

export type EmployerDashboard = {
  totalSubmissions: number;
  byFormId: Record<string, number>;
  recentSubmissions: Array<{
    id: string;
    formId: string;
    formTitle: string;
    submittedAt: string;
  }>;
  insights: Array<{
    formId: string;
    formTitle: string;
    count: number;
    message: string;
  }>;
};

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

function sessionTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function profileFromValues(values: Record<string, string>, email: string): EmployerProfile {
  return {
    employerName: values.employerName || '',
    contactName: values.contactName || '',
    contactEmail: normalizeEmail(email || values.contactEmail || ''),
    contactPhone: values.contactPhone || '',
    mailingAddress: values.mailingAddress || '',
    notes: values.notes || '',
    updatedAt: new Date().toISOString(),
  };
}

async function getEmployerAccounts(): Promise<EmployerAccount[]> {
  const result = await get(EMPLOYERS_PATHNAME, { access: 'private', useCache: false });
  if (!result) return [];
  const data = await new Response(result.stream).json();
  return Array.isArray(data) ? data : [];
}

async function saveEmployerAccounts(accounts: EmployerAccount[]): Promise<void> {
  await put(EMPLOYERS_PATHNAME, JSON.stringify(accounts), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

type EmployerSession = { tokenHash: string; email: string; expiresAt: number };

async function getEmployerSessions(): Promise<EmployerSession[]> {
  const result = await get(EMPLOYER_SESSIONS_PATHNAME, { access: 'private', useCache: false });
  if (!result) return [];
  const data = await new Response(result.stream).json();
  return Array.isArray(data) ? data : [];
}

async function saveEmployerSessions(sessions: EmployerSession[]): Promise<void> {
  await put(EMPLOYER_SESSIONS_PATHNAME, JSON.stringify(sessions), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function getAllSubmissions(): Promise<SubmissionRecord[]> {
  const result = await get(SUBMISSIONS_PATHNAME, { access: 'private', useCache: false });
  if (!result) return [];
  const data = await new Response(result.stream).json();
  return Array.isArray(data) ? data : [];
}

async function saveAllSubmissions(submissions: SubmissionRecord[]): Promise<void> {
  await put(SUBMISSIONS_PATHNAME, JSON.stringify(submissions), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getEmployerByEmail(email: string): Promise<EmployerAccount | null> {
  const normalized = normalizeEmail(email);
  const accounts = await getEmployerAccounts();
  return accounts.find(account => account.email === normalized) || null;
}

export async function createEmployerAccount(
  email: string,
  password: string,
  profile: EmployerProfile,
): Promise<EmployerAccount> {
  const normalized = normalizeEmail(email);
  const accounts = await getEmployerAccounts();
  if (accounts.some(account => account.email === normalized)) {
    throw new Error('An account already exists for this email address.');
  }
  const account: EmployerAccount = {
    email: normalized,
    passwordHash: hashPassword(password),
    profile: { ...profile, contactEmail: normalized, updatedAt: new Date().toISOString() },
    createdAt: new Date().toISOString(),
  };
  accounts.push(account);
  await saveEmployerAccounts(accounts);
  return account;
}

export async function authenticateEmployer(email: string, password: string): Promise<EmployerAccount | null> {
  const account = await getEmployerByEmail(email);
  if (!account) return null;
  return verifyPassword(password, account.passwordHash) ? account : null;
}

export async function updateEmployerPassword(email: string, password: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const accounts = await getEmployerAccounts();
  const index = accounts.findIndex(account => account.email === normalized);
  if (index === -1) {
    throw new Error('Account not found.');
  }
  accounts[index] = {
    ...accounts[index],
    passwordHash: hashPassword(password),
  };
  await saveEmployerAccounts(accounts);
}

type PasswordResetRecord = { tokenHash: string; email: string; expiresAt: number };

async function getPasswordResetRecords(): Promise<PasswordResetRecord[]> {
  const result = await get(EMPLOYER_PASSWORD_RESETS_PATHNAME, { access: 'private', useCache: false });
  if (!result) return [];
  const data = await new Response(result.stream).json();
  return Array.isArray(data) ? data : [];
}

async function savePasswordResetRecords(records: PasswordResetRecord[]): Promise<void> {
  await put(EMPLOYER_PASSWORD_RESETS_PATHNAME, JSON.stringify(records), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function resetTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const account = await getEmployerByEmail(email);
  if (!account) return null;

  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  const normalized = normalizeEmail(email);
  const records = (await getPasswordResetRecords())
    .filter(record => record.expiresAt > now && record.email !== normalized);
  records.push({
    tokenHash: resetTokenHash(token),
    email: normalized,
    expiresAt: now + PASSWORD_RESET_TTL_MS,
  });
  await savePasswordResetRecords(records);
  return token;
}

export async function getPasswordResetEmail(token: string): Promise<string | null> {
  const hash = resetTokenHash(token);
  const record = (await getPasswordResetRecords())
    .find(item => item.tokenHash === hash && item.expiresAt > Date.now());
  return record?.email || null;
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const hash = resetTokenHash(token);
  const records = await getPasswordResetRecords();
  const now = Date.now();
  const record = records.find(item => item.tokenHash === hash && item.expiresAt > now);
  if (!record) return null;
  await savePasswordResetRecords(records.filter(item => item.tokenHash !== hash));
  return record.email;
}

export async function updateEmployerProfile(email: string, profile: EmployerProfile): Promise<void> {
  const normalized = normalizeEmail(email);
  const accounts = await getEmployerAccounts();
  const index = accounts.findIndex(account => account.email === normalized);
  if (index === -1) return;
  accounts[index] = {
    ...accounts[index],
    profile: { ...profile, contactEmail: normalized, updatedAt: new Date().toISOString() },
  };
  await saveEmployerAccounts(accounts);
}

export async function createEmployerSessionToken(email: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  const sessions = (await getEmployerSessions()).filter(session => session.expiresAt > now);
  sessions.push({
    tokenHash: sessionTokenHash(token),
    email: normalizeEmail(email),
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
  });
  await saveEmployerSessions(sessions);
  return token;
}

export async function getEmployerSessionEmail(request: Request): Promise<string | null> {
  const cookie = request.headers.get('cookie') || '';
  const raw = cookie.split(';').map(item => item.trim()).find(item => item.startsWith(`${EMPLOYER_SESSION_COOKIE}=`));
  const token = raw ? decodeURIComponent(raw.slice(EMPLOYER_SESSION_COOKIE.length + 1)) : '';
  if (!token) return null;
  const hash = sessionTokenHash(token);
  const session = (await getEmployerSessions())
    .find(item => item.tokenHash === hash && item.expiresAt > Date.now());
  return session?.email || null;
}

export async function deleteEmployerSession(request: Request): Promise<void> {
  const cookie = request.headers.get('cookie') || '';
  const raw = cookie.split(';').map(item => item.trim()).find(item => item.startsWith(`${EMPLOYER_SESSION_COOKIE}=`));
  const token = raw ? decodeURIComponent(raw.slice(EMPLOYER_SESSION_COOKIE.length + 1)) : '';
  if (!token) return;
  const hash = sessionTokenHash(token);
  const sessions = (await getEmployerSessions()).filter(item => item.tokenHash !== hash);
  await saveEmployerSessions(sessions);
}

export async function addSubmission(record: Omit<SubmissionRecord, 'id' | 'submittedAt'>): Promise<SubmissionRecord> {
  const submissions = await getAllSubmissions();
  const entry: SubmissionRecord = {
    ...record,
    id: randomBytes(12).toString('hex'),
    submittedAt: new Date().toISOString(),
  };
  submissions.push(entry);
  await saveAllSubmissions(submissions);
  return entry;
}

export async function getEmployerSubmissions(email: string): Promise<SubmissionRecord[]> {
  const normalized = normalizeEmail(email);
  const submissions = await getAllSubmissions();
  return submissions
    .filter(item => item.employerEmail === normalized)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

const INSIGHT_MESSAGES: Record<string, (count: number) => string> = {
  'request-applicants': count => `You have made ${count} applicant request${count === 1 ? '' : 's'}. Need help finding more candidates?`,
  'submit-job-opening': count => `You have submitted ${count} job opening${count === 1 ? '' : 's'}. Want to reach more students?`,
  'employer-registration': count => `Your employer profile is active. Explore our services to connect with NCST talent.`,
  'report-a-hire': count => `Thank you for reporting ${count} hire${count === 1 ? '' : 's'}. Keep us updated on your hiring success.`,
  'pac-meeting-registration': count => `You have registered for ${count} PAC meeting${count === 1 ? '' : 's'}.`,
  'career-fair-registration': count => `You have registered for ${count} career fair${count === 1 ? '' : 's'}.`,
};

function insightMessage(formId: string, formTitle: string, count: number): string {
  const builder = INSIGHT_MESSAGES[formId];
  if (builder) return builder(count);
  return `You have submitted ${count} ${formTitle.toLowerCase()} request${count === 1 ? '' : 's'}.`;
}

export async function getEmployerDashboard(email: string): Promise<EmployerDashboard> {
  const submissions = await getEmployerSubmissions(email);
  const serviceSubmissions = submissions.filter(item => item.formId !== 'employer-registration');
  const byFormId: Record<string, number> = {};
  serviceSubmissions.forEach(item => {
    byFormId[item.formId] = (byFormId[item.formId] || 0) + 1;
  });

  const insights = Object.entries(byFormId)
    .map(([formId, count]) => {
      const latest = serviceSubmissions.find(item => item.formId === formId);
      return {
        formId,
        formTitle: latest?.formTitle || formId,
        count,
        message: insightMessage(formId, latest?.formTitle || formId, count),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    totalSubmissions: serviceSubmissions.length,
    byFormId,
    recentSubmissions: serviceSubmissions.slice(0, 5).map(item => ({
      id: item.id,
      formId: item.formId,
      formTitle: item.formTitle,
      submittedAt: item.submittedAt,
    })),
    insights,
  };
}
