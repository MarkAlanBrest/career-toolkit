import { NextRequest, NextResponse } from 'next/server';
import { getSettings, isAdminAuthorized, saveSettings } from '@/lib/lgaRoom';
import { getEmailStatus, sendTestEmail } from '@/lib/lgaRoomEmail';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function authorized(request: NextRequest) {
  return isAdminAuthorized(request.headers.get('x-admin-email'), request.headers.get('x-admin-password'));
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
        adminNotifyEmail: settings.adminNotifyEmail,
        buildingManagerEmail: settings.buildingManagerEmail,
        maintenanceEmail: settings.maintenanceEmail,
      },
      // Never echo senderAppPassword back — the admin re-enters it only to change it.
      sender: {
        email: settings.senderEmail,
        name: settings.senderName,
        passwordSet: Boolean(settings.senderAppPassword),
        replyToEmail: settings.replyToEmail,
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

  const { adminNotifyEmail, buildingManagerEmail, maintenanceEmail, senderEmail, senderAppPassword, senderName, replyToEmail } = body as Record<string, string>;
  if (adminNotifyEmail && !EMAIL_RE.test(adminNotifyEmail)) {
    return NextResponse.json({ error: 'That new-request notification email looks invalid.' }, { status: 400 });
  }
  if (buildingManagerEmail && !EMAIL_RE.test(buildingManagerEmail)) {
    return NextResponse.json({ error: 'Building Manager email looks invalid.' }, { status: 400 });
  }
  if (maintenanceEmail && !EMAIL_RE.test(maintenanceEmail)) {
    return NextResponse.json({ error: 'Maintenance email looks invalid.' }, { status: 400 });
  }
  if (senderEmail && !EMAIL_RE.test(senderEmail)) {
    return NextResponse.json({ error: 'Sender email looks invalid.' }, { status: 400 });
  }
  if (replyToEmail && !EMAIL_RE.test(replyToEmail)) {
    return NextResponse.json({ error: 'Reply-to email looks invalid.' }, { status: 400 });
  }

  try {
    // A blank senderAppPassword means "keep the existing one" — the field is never
    // pre-filled with the real value, so an admin saving other fields shouldn't wipe it.
    const current = await getSettings();
    const settings = {
      adminNotifyEmail: (adminNotifyEmail || '').trim(),
      buildingManagerEmail: (buildingManagerEmail || '').trim(),
      maintenanceEmail: (maintenanceEmail || '').trim(),
      senderEmail: (senderEmail || '').trim(),
      senderAppPassword: typeof senderAppPassword === 'string' && senderAppPassword.trim()
        ? senderAppPassword.trim()
        : current.senderAppPassword,
      senderName: (senderName || '').trim(),
    };
    await saveSettings(settings);
    return NextResponse.json({
      notify: {
        adminNotifyEmail: settings.adminNotifyEmail,
        buildingManagerEmail: settings.buildingManagerEmail,
        maintenanceEmail: settings.maintenanceEmail,
      },
      sender: {
        email: settings.senderEmail,
        name: settings.senderName,
        passwordSet: Boolean(settings.senderAppPassword),
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
