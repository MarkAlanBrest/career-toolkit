import { NextRequest, NextResponse } from 'next/server';
import { getSettings, isAdminAuthorized, saveSettings } from '@/lib/lgaRoom';
import { getEmailStatus } from '@/lib/lgaRoomEmail';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get('x-admin-password'))) {
    return NextResponse.json({ error: 'Admin password required.' }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    return NextResponse.json({
      storage: {
        type: 'Vercel Blob (lga-room/reservations.json)',
        configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      },
      email: getEmailStatus(),
      notify: settings,
    });
  } catch (error) {
    console.error('[lga-room] Could not load settings:', error);
    return NextResponse.json({ error: 'Could not load settings.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get('x-admin-password'))) {
    return NextResponse.json({ error: 'Admin password required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { buildingManagerEmail, maintenanceEmail } = body as Record<string, string>;
  if (buildingManagerEmail && !EMAIL_RE.test(buildingManagerEmail)) {
    return NextResponse.json({ error: 'Building Manager email looks invalid.' }, { status: 400 });
  }
  if (maintenanceEmail && !EMAIL_RE.test(maintenanceEmail)) {
    return NextResponse.json({ error: 'Maintenance email looks invalid.' }, { status: 400 });
  }

  try {
    const settings = {
      buildingManagerEmail: (buildingManagerEmail || '').trim(),
      maintenanceEmail: (maintenanceEmail || '').trim(),
    };
    await saveSettings(settings);
    return NextResponse.json({ notify: settings });
  } catch (error) {
    console.error('[lga-room] Could not save settings:', error);
    return NextResponse.json({ error: 'Could not save settings. Please try again.' }, { status: 500 });
  }
}
