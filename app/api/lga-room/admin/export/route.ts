import { NextRequest, NextResponse } from 'next/server';
import { getAllReservations, isAdminAuthorized, ReservationStatus } from '@/lib/lgaRoom';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Not approved',
};

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get('x-admin-password'))) {
    return NextResponse.json({ error: 'Admin password required.' }, { status: 401 });
  }

  try {
    const reservations = await getAllReservations();
    const header = ['Date', 'Start Time', 'End Time', 'Name', 'Email', 'Purpose', 'Status', 'Requested At'];
    const rows = reservations
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .map(r => [r.date, r.startTime, r.endTime, r.name, r.email, r.purpose, STATUS_LABELS[r.status], r.createdAt]);

    const csv = [header, ...rows].map(row => row.map(csvField).join(',')).join('\r\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="lga-room-reservations.csv"`,
      },
    });
  } catch (error) {
    console.error('[lga-room] Could not export reservations:', error);
    return NextResponse.json({ error: 'Could not export reservations.' }, { status: 500 });
  }
}
