import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionEmail,
  getSettings,
  isAdminAuthorized,
  isMicrosoftAdminAllowed,
  saveSettings,
} from '@/lib/lgaRoom';

export const dynamic = 'force-dynamic';

const LOGIN_SCOPES =
  'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Send offline_access openid profile email';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function setSessionCookie(response: NextResponse, email: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  });
}

export async function GET(request: NextRequest) {
  const email = await getAdminSessionEmail(request);
  if (!email) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, email });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === 'string' ? body.action : '';

  if (action === 'startMicrosoftLogin') {
    const settings = await getSettings();
    if (!settings.microsoftTenantId || !settings.microsoftClientId) {
      return NextResponse.json({
        error: 'Configure the Microsoft tenant and application IDs in Admin Settings first.',
      }, { status: 400 });
    }
    const response = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(settings.microsoftTenantId)}/oauth2/v2.0/devicecode`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: settings.microsoftClientId, scope: LOGIN_SCOPES }),
        cache: 'no-store',
      }
    );
    const data = await response.json().catch(() => ({})) as {
      device_code?: string;
      user_code?: string;
      verification_uri?: string;
      verification_uri_complete?: string;
      expires_in?: number;
      interval?: number;
      error_description?: string;
    };
    if (!response.ok || !data.device_code || !data.user_code || !data.verification_uri) {
      return NextResponse.json({
        error: data.error_description || 'Microsoft could not start sign-in.',
      }, { status: 502 });
    }
    return NextResponse.json({
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      verificationUriComplete: data.verification_uri_complete || data.verification_uri,
      expiresIn: data.expires_in || 900,
      interval: data.interval || 5,
    });
  }

  if (action === 'pollMicrosoftLogin') {
    const deviceCode = typeof body?.deviceCode === 'string' ? body.deviceCode : '';
    const settings = await getSettings();
    if (!deviceCode || !settings.microsoftTenantId || !settings.microsoftClientId) {
      return NextResponse.json({ error: 'Microsoft sign-in request is invalid.' }, { status: 400 });
    }
    const response = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(settings.microsoftTenantId)}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          client_id: settings.microsoftClientId,
          device_code: deviceCode,
        }),
        cache: 'no-store',
      }
    );
    const data = await response.json().catch(() => ({})) as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!response.ok) {
      if (data.error === 'authorization_pending' || data.error === 'slow_down') {
        return NextResponse.json({ pending: true, slowDown: data.error === 'slow_down' }, { status: 202 });
      }
      return NextResponse.json({
        error: data.error_description || 'Microsoft sign-in failed.',
      }, { status: 502 });
    }
    if (!data.access_token) {
      return NextResponse.json({ error: 'Microsoft did not return a sign-in token.' }, { status: 502 });
    }
    const profileResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName',
      {
        headers: { Authorization: `Bearer ${data.access_token}` },
        cache: 'no-store',
      }
    );
    const profile = await profileResponse.json().catch(() => ({})) as {
      displayName?: string;
      mail?: string;
      userPrincipalName?: string;
      error?: { message?: string };
    };
    const email = (profile.mail || profile.userPrincipalName || '').trim().toLowerCase();
    if (!profileResponse.ok || !EMAIL_RE.test(email)) {
      return NextResponse.json({
        error: profile.error?.message || 'Microsoft account email could not be read.',
      }, { status: 502 });
    }
    if (!(await isMicrosoftAdminAllowed(email))) {
      return NextResponse.json({
        error: `${email} is not on the LG Room administrator list.`,
      }, { status: 403 });
    }
    const needsSenderConnection = !settings.microsoftRefreshToken || !settings.senderEmail;
    if (needsSenderConnection) {
      if (!data.refresh_token) {
        return NextResponse.json({
          error: 'Microsoft signed you in but did not provide permission to send mail. Sign in again and approve the requested permissions.',
        }, { status: 502 });
      }
      await saveSettings({
        ...settings,
        senderEmail: email,
        senderName: profile.displayName?.trim() || settings.senderName || 'LG Room Reservations',
        microsoftClientSecret: '',
        microsoftRefreshToken: data.refresh_token,
        microsoftConnectedAt: new Date().toISOString(),
      });
    }
    const result = NextResponse.json({
      authenticated: true,
      email,
      senderConnected: Boolean(settings.microsoftRefreshToken) || needsSenderConnection,
    });
    await setSessionCookie(result, email);
    return result;
  }

  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!(await isAdminAuthorized(email, password))) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }
  const sessionEmail = email.trim().toLowerCase() || 'emergency-admin';
  const result = NextResponse.json({ authenticated: true, email: sessionEmail });
  await setSessionCookie(result, sessionEmail);
  return result;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
