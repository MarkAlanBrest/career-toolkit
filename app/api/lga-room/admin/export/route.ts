import { NextRequest, NextResponse } from 'next/server';
import { getAllReservations, isAdminRequestAuthorized, ReservationStatus } from '@/lib/lgaRoom';

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
  const authorized = await isAdminRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  try {
    const reservations = await getAllReservations();
    const header = [
      'Date', 'Start Time', 'End Time', 'Event Name', 'Name', 'Organization', 'Email', 'Phone',
      'Number of People', 'Purpose', 'Setup Requirements', 'Special Requests', 'Status', 'Requested At',
    ];
    const rows = reservations
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .map(r => [
        r.date, r.startTime, r.endTime, r.eventName, r.name, r.organization, r.email, r.phone,
        String(r.numberOfPeople), r.purpose, r.setupRequirements, r.specialRequests, STATUS_LABELS[r.status], r.createdAt,
      ]);

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
