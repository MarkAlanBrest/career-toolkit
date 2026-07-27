import { NextRequest, NextResponse } from 'next/server';
import {
  ReservationNotificationRecipients,
  getSettings,
  isAdminRequestAuthorized,
  saveSettings,
} from '@/lib/lgaRoom';
import { getEmailStatus, sendTestEmail } from '@/lib/lgaRoomEmail';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MICROSOFT_SCOPES = 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access openid profile';

async function authorized(request: NextRequest) {
  return isAdminRequestAuthorized(request);
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    // Reaching this line proves storage actually works — Vercel's Blob integration can
    // authenticate via OIDC without BLOB_READ_WRITE_TOKEN being set, so checking for that
    // env var directly was misleading (it could read false while storage worked fine).
    return NextResponse.json({
      storage: { configured: true },
      email: await getEmailStatus(),
      notify: {
        recipients: settings.notificationRecipients,
        adminNotifyEmail: settings.adminNotifyEmail,
        buildingManagerEmail: settings.buildingManagerEmail,
        maintenanceEmail: settings.maintenanceEmail,
      },
      sender: {
        email: settings.senderEmail,
        name: settings.senderName,
        replyToEmail: settings.replyToEmail,
        microsoftTenantId: GUID_RE.test(settings.microsoftTenantId) ? settings.microsoftTenantId : '',
        microsoftClientId: GUID_RE.test(settings.microsoftClientId) ? settings.microsoftClientId : '',
        microsoftConnected: Boolean(settings.microsoftRefreshToken),
        microsoftConnectedAt: settings.microsoftConnectedAt || null,
      },
    });
  } catch (error) {
    console.error('[lga-room] Could not load settings:', error);
    return NextResponse.json({ error: 'Could not load settings.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const stringValue = (key: string) => typeof payload[key] === 'string' ? String(payload[key]) : '';
  const senderEmail = stringValue('senderEmail');
  const senderName = stringValue('senderName');
  const replyToEmail = stringValue('replyToEmail');
  const microsoftTenantId = stringValue('microsoftTenantId');
  const microsoftClientId = stringValue('microsoftClientId');
  if (senderEmail && !EMAIL_RE.test(senderEmail)) {
    return NextResponse.json({ error: 'Sender email looks invalid.' }, { status: 400 });
  }
  if (replyToEmail && !EMAIL_RE.test(replyToEmail)) {
    return NextResponse.json({ error: 'Reply-to email looks invalid.' }, { status: 400 });
  }
  if (microsoftTenantId && !GUID_RE.test(microsoftTenantId.trim())) {
    return NextResponse.json({
      error: 'Microsoft tenant ID must be the Directory (tenant) ID in GUID format.',
    }, { status: 400 });
  }
  if (microsoftClientId && !GUID_RE.test(microsoftClientId.trim())) {
    return NextResponse.json({
      error: 'Application ID must be the Application (client) ID in GUID format, not a client secret.',
    }, { status: 400 });
  }

  try {
    const current = await getSettings();
    let notificationRecipients = current.notificationRecipients;
    if (payload.notificationRecipients !== undefined) {
      if (!payload.notificationRecipients || typeof payload.notificationRecipients !== 'object' || Array.isArray(payload.notificationRecipients)) {
        return NextResponse.json({ error: 'Notification recipient lists are invalid.' }, { status: 400 });
      }
      const raw = payload.notificationRecipients as Record<string, unknown>;
      const keys: Array<keyof ReservationNotificationRecipients> = ['request', 'approved', 'declined', 'updated', 'cancelled'];
      const next = {} as ReservationNotificationRecipients;
      for (const key of keys) {
        if (!Array.isArray(raw[key])) {
          return NextResponse.json({ error: `The ${key} recipient list is invalid.` }, { status: 400 });
        }
        const recipients = raw[key] as unknown[];
        if (recipients.some(email => typeof email !== 'string' || !EMAIL_RE.test(email.trim()))) {
          return NextResponse.json({ error: `The ${key} recipient list contains an invalid email address.` }, { status: 400 });
        }
        next[key] = Array.from(new Set(recipients.map(email => String(email).trim().toLowerCase())));
      }
      notificationRecipients = next;
    }
    const nextTenantId = (microsoftTenantId || '').trim();
    const nextClientId = (microsoftClientId || '').trim();
    const microsoftAppChanged =
      nextTenantId !== current.microsoftTenantId || nextClientId !== current.microsoftClientId;
    const settings = {
      notificationRecipients,
      adminNotifyEmail: current.adminNotifyEmail,
      buildingManagerEmail: current.buildingManagerEmail,
      maintenanceEmail: current.maintenanceEmail,
      senderEmail: microsoftAppChanged ? '' : current.senderEmail || (senderEmail || '').trim(),
      senderAppPassword: current.senderAppPassword,
      senderName: microsoftAppChanged ? '' : current.senderName || (senderName || '').trim(),
      replyToEmail: (replyToEmail || '').trim(),
      microsoftTenantId: nextTenantId,
      microsoftClientId: nextClientId,
      microsoftClientSecret: '',
      microsoftRefreshToken: microsoftAppChanged ? '' : current.microsoftRefreshToken,
      microsoftConnectedAt: microsoftAppChanged ? '' : current.microsoftConnectedAt,
    };
    await saveSettings(settings);
    return NextResponse.json({
      notify: {
        recipients: settings.notificationRecipients,
        adminNotifyEmail: settings.adminNotifyEmail,
        buildingManagerEmail: settings.buildingManagerEmail,
        maintenanceEmail: settings.maintenanceEmail,
      },
      sender: {
        email: settings.senderEmail,
        name: settings.senderName,
        replyToEmail: settings.replyToEmail,
        microsoftTenantId: settings.microsoftTenantId,
        microsoftClientId: settings.microsoftClientId,
        microsoftConnected: Boolean(settings.microsoftRefreshToken),
        microsoftConnectedAt: settings.microsoftConnectedAt || null,
      },
    });
  } catch (error) {
    console.error('[lga-room] Could not save settings:', error);
    return NextResponse.json({ error: 'Could not save settings. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === 'string' ? body.action : '';

  if (action === 'startMicrosoftConnection') {
    const tenantId = typeof body?.tenantId === 'string' ? body.tenantId.trim() : '';
    const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : '';
    if (!GUID_RE.test(tenantId) || !GUID_RE.test(clientId)) {
      return NextResponse.json({ error: 'Enter valid Microsoft tenant and application IDs.' }, { status: 400 });
    }
    const response = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/devicecode`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, scope: MICROSOFT_SCOPES }),
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
        error: data.error_description || 'Microsoft could not start account connection.',
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

  if (action === 'pollMicrosoftConnection') {
    const tenantId = typeof body?.tenantId === 'string' ? body.tenantId.trim() : '';
    const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : '';
    const deviceCode = typeof body?.deviceCode === 'string' ? body.deviceCode : '';
    if (!GUID_RE.test(tenantId) || !GUID_RE.test(clientId) || !deviceCode) {
      return NextResponse.json({ error: 'Microsoft connection request is invalid.' }, { status: 400 });
    }
    const response = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          client_id: clientId,
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
        error: data.error_description || 'Microsoft account connection failed.',
      }, { status: 502 });
    }
    if (!data.access_token || !data.refresh_token) {
      return NextResponse.json({ error: 'Microsoft did not return a reusable sign-in.' }, { status: 502 });
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
    if (!profileResponse.ok) {
      return NextResponse.json({
        error: profile.error?.message || 'Microsoft connected, but the mailbox profile could not be read.',
      }, { status: 502 });
    }
    const email = (profile.mail || profile.userPrincipalName || '').trim();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'The connected Microsoft account has no usable email address.' }, { status: 502 });
    }

    const current = await getSettings();
    await saveSettings({
      ...current,
      senderEmail: email,
      senderName: (profile.displayName || `${email} Reservations`).trim(),
      microsoftTenantId: tenantId,
      microsoftClientId: clientId,
      microsoftClientSecret: '',
      microsoftRefreshToken: data.refresh_token,
      microsoftConnectedAt: new Date().toISOString(),
    });
    return NextResponse.json({
      connected: true,
      email,
      name: profile.displayName || '',
    });
  }

  if (action === 'disconnectMicrosoft') {
    const current = await getSettings();
    await saveSettings({
      ...current,
      senderEmail: '',
      senderName: '',
      microsoftClientSecret: '',
      microsoftRefreshToken: '',
      microsoftConnectedAt: '',
    });
    return NextResponse.json({ connected: false });
  }

  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid test email address.' }, { status: 400 });
  }

  const result = await sendTestEmail(email);
  if (!result.sent) {
    return NextResponse.json({ error: result.error || 'The test email failed.' }, { status: 502 });
  }
  return NextResponse.json({ result });
}
