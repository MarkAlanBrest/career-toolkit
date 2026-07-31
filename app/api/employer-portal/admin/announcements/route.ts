import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequestAuthorized } from '@/lib/employerPortal';
import {
  getEmployerPortalAnnouncements,
  sanitizeAnnouncementsPayload,
  saveEmployerPortalAnnouncements,
} from '@/lib/employerPortalAnnouncements';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  try {
    const content = await getEmployerPortalAnnouncements();
    return NextResponse.json(content);
  } catch (error) {
    console.error('[employer-portal] Could not load announcement admin data:', error);
    return NextResponse.json({ error: 'Could not load announcements.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  try {
    const content = sanitizeAnnouncementsPayload(body as Record<string, unknown>);
    await saveEmployerPortalAnnouncements(content);
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    console.error('[employer-portal] Could not save announcements:', error);
    return NextResponse.json({ error: 'Could not save announcements.' }, { status: 500 });
  }
}
