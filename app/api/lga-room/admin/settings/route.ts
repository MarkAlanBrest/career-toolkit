import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/lgaRoom';
import { getEmailStatus } from '@/lib/lgaRoomEmail';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get('x-admin-password'))) {
    return NextResponse.json({ error: 'Admin password required.' }, { status: 401 });
  }

  return NextResponse.json({
    storage: {
      type: 'Vercel Blob (lga-room/reservations.json)',
      configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    },
    email: getEmailStatus(),
  });
}
