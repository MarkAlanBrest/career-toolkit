import { createHash, randomBytes } from 'crypto';
import { get, put } from '@vercel/blob';

export const STUDENT_SESSION_COOKIE = 'student_portal_session';
export const STUDENT_OAUTH_STATE_COOKIE = 'student_portal_oauth_state';

const SESSIONS_PATHNAME = 'student-portal/sessions.json';

export type StudentProfile = {
  email: string;
  displayName: string;
};

type StudentSession = {
  tokenHash: string;
  email: string;
  displayName: string;
  expiresAt: number;
};

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://career-toolkit-ruby.vercel.app';
}

export function getStudentPortalMicrosoftConfig() {
  return {
    tenantId: process.env.STUDENT_PORTAL_AZURE_TENANT_ID || process.env.AZURE_TENANT_ID || '',
    clientId: process.env.STUDENT_PORTAL_AZURE_CLIENT_ID || '',
    clientSecret: process.env.STUDENT_PORTAL_AZURE_CLIENT_SECRET || '',
  };
}

export function getAllowedStudentEmailDomain(): string {
  return (process.env.STUDENT_PORTAL_ALLOWED_EMAIL_DOMAIN || 'ncstrades.edu').toLowerCase().replace(/^@/, '');
}

export function isStudentEmailAllowed(email: string): boolean {
  const domain = getAllowedStudentEmailDomain();
  return email.trim().toLowerCase().endsWith(`@${domain}`);
}

function sessionTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function getStudentSessions(): Promise<StudentSession[]> {
  const result = await get(SESSIONS_PATHNAME, { access: 'private', useCache: false });
  if (!result) return [];
  const data = await new Response(result.stream).json();
  return Array.isArray(data) ? data : [];
}

async function saveStudentSessions(sessions: StudentSession[]): Promise<void> {
  await put(SESSIONS_PATHNAME, JSON.stringify(sessions), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function createStudentSessionToken(profile: StudentProfile): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  const sessions = (await getStudentSessions()).filter(session => session.expiresAt > now);
  sessions.push({
    tokenHash: sessionTokenHash(token),
    email: profile.email.trim().toLowerCase(),
    displayName: profile.displayName.trim() || profile.email,
    expiresAt: now + SESSION_TTL_MS,
  });
  await saveStudentSessions(sessions);
  return token;
}

export async function getStudentSession(request: Request): Promise<StudentProfile | null> {
  const cookie = request.headers.get('cookie') || '';
  const raw = cookie.split(';').map(item => item.trim()).find(item => item.startsWith(`${STUDENT_SESSION_COOKIE}=`));
  const token = raw ? decodeURIComponent(raw.slice(STUDENT_SESSION_COOKIE.length + 1)) : '';
  if (!token) return null;

  const hash = sessionTokenHash(token);
  const session = (await getStudentSessions())
    .find(item => item.tokenHash === hash && item.expiresAt > Date.now());
  if (!session) return null;

  return {
    email: session.email,
    displayName: session.displayName,
  };
}

export async function deleteStudentSession(request: Request): Promise<void> {
  const cookie = request.headers.get('cookie') || '';
  const raw = cookie.split(';').map(item => item.trim()).find(item => item.startsWith(`${STUDENT_SESSION_COOKIE}=`));
  const token = raw ? decodeURIComponent(raw.slice(STUDENT_SESSION_COOKIE.length + 1)) : '';
  if (!token) return;
  const hash = sessionTokenHash(token);
  const sessions = (await getStudentSessions()).filter(item => item.tokenHash !== hash);
  await saveStudentSessions(sessions);
}

export function buildMicrosoftAuthorizeUrl(state: string): string {
  const { tenantId, clientId } = getStudentPortalMicrosoftConfig();
  const redirectUri = `${getAppUrl()}/api/student-portal/auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email User.Read offline_access',
    state,
  });
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeMicrosoftAuthCode(code: string): Promise<StudentProfile> {
  const { tenantId, clientId, clientSecret } = getStudentPortalMicrosoftConfig();
  const redirectUri = `${getAppUrl()}/api/student-portal/auth/callback`;
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    scope: 'openid profile email User.Read offline_access',
  });
  if (clientSecret) body.set('client_secret', clientSecret);

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    },
  );
  const tokenData = await tokenResponse.json().catch(() => ({})) as {
    access_token?: string;
    error_description?: string;
  };
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || 'Microsoft sign-in failed.');
  }

  const profileResponse = await fetch(
    'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName',
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      cache: 'no-store',
    },
  );
  const profile = await profileResponse.json().catch(() => ({})) as {
    displayName?: string;
    mail?: string;
    userPrincipalName?: string;
    error?: { message?: string };
  };
  const email = (profile.mail || profile.userPrincipalName || '').trim().toLowerCase();
  if (!profileResponse.ok || !email.includes('@')) {
    throw new Error(profile.error?.message || 'Microsoft account email could not be read.');
  }
  if (!isStudentEmailAllowed(email)) {
    throw new Error(`Only school Microsoft accounts (@${getAllowedStudentEmailDomain()}) can sign in.`);
  }

  return {
    email,
    displayName: profile.displayName?.trim() || email.split('@')[0],
  };
}
