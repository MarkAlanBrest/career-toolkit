import { NextResponse } from 'next/server';
import {
  getEmployerPortalAnnouncements,
  getPublishedAnnouncements,
} from '@/lib/employerPortalAnnouncements';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const content = await getEmployerPortalAnnouncements();
    const items = getPublishedAnnouncements(content);

    return NextResponse.json({
      sectionKicker: content.sectionKicker,
      sectionTitle: content.sectionTitle,
      items,
    });
  } catch (error) {
    console.error('[employer-portal] Could not load announcements:', error);
    return NextResponse.json({ error: 'Could not load announcements.' }, { status: 500 });
  }
}
