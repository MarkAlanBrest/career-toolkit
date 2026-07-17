import { NextRequest, NextResponse } from 'next/server';
import {
  getAllReservations,
  isAdminAuthorized,
  saveAllReservations,
  timesOverlap,
} from '@/lib/lgaRoom';
import { sendRequesterDecision } from '@/lib/lgaRoomEmail';

export const dynamic = 'force-dynamic';

function authorized(request: NextRequest) {
  return isAdminAuthorized(request.headers.get('x-admin-password'));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Admin password required.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  try {
    const reservations = await getAllReservations();
    const index = reservations.findIndex(r => r.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    }

    const current = reservations[index];
    const updated = {
      ...current,
      ...('status' in body ? { status: body.status } : {}),
      ...('date' in body ? { date: body.date } : {}),
      ...('startTime' in body ? { startTime: body.startTime } : {}),
      ...('endTime' in body ? { endTime: body.endTime } : {}),
      ...('name' in body ? { name: body.name } : {}),
      ...('email' in body ? { email: body.email } : {}),
      ...('purpose' in body ? { purpose: body.purpose } : {}),
      updatedAt: new Date().toISOString(),
    };

    if (updated.status === 'approved') {
      const hasConflict = reservations.some(
        r => r.id !== id && r.date === updated.date && r.status === 'approved' &&
          timesOverlap(r.startTime, r.endTime, updated.startTime, updated.endTime)
      );
      if (hasConflict) {
        return NextResponse.json({ error: 'Another approved reservation already covers that time.' }, { status: 409 });
      }
    }

    reservations[index] = updated;
    await saveAllReservations(reservations);

    if (updated.status !== current.status && (updated.status === 'approved' || updated.status === 'denied')) {
      await sendRequesterDecision(updated);
    }

    return NextResponse.json({ reservation: updated });
  } catch (error) {
    console.error('[lga-room] Could not update reservation:', error);
    return NextResponse.json({ error: 'Could not save this change. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Admin password required.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const reservations = await getAllReservations();
    const next = reservations.filter(r => r.id !== id);
    if (next.length === reservations.length) {
      return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    }

    await saveAllReservations(next);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[lga-room] Could not delete reservation:', error);
    return NextResponse.json({ error: 'Could not delete this reservation. Please try again.' }, { status: 500 });
  }
}
