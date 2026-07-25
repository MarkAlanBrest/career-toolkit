import { NextRequest, NextResponse } from 'next/server';
import {
  getAllReservations,
  isAdminRequestAuthorized,
  saveAllReservations,
  timesOverlap,
} from '@/lib/lgaRoom';
import {
  EmailSendResult,
  sendBuildingManagerNotification,
  sendMaintenanceNotification,
  sendRequesterDecision,
  sendRequesterTimeChanged,
} from '@/lib/lgaRoomEmail';

export const dynamic = 'force-dynamic';

const EDITABLE_FIELDS = [
  'status', 'date', 'startTime', 'endTime', 'name', 'organization', 'email', 'phone',
  'eventName', 'purpose', 'numberOfPeople', 'setupRequirements', 'specialRequests',
] as const;

function authorized(request: NextRequest) {
  return isAdminRequestAuthorized(request);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
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
    const patch: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) patch[field] = body[field];
    }
    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };

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

    const emails: EmailSendResult[] = [];
    const justApproved = updated.status !== current.status && updated.status === 'approved';
    const justDenied = updated.status !== current.status && updated.status === 'denied';
    if (justApproved || justDenied) {
      emails.push(await sendRequesterDecision(updated));
    }
    if (justApproved) {
      const results = await Promise.all([
        sendBuildingManagerNotification(updated),
        sendMaintenanceNotification(updated),
      ]);
      emails.push(...results.filter((result): result is EmailSendResult => result !== null));
    }

    const timeChanged = body.notifyTimeChange === true &&
      (updated.date !== current.date || updated.startTime !== current.startTime || updated.endTime !== current.endTime);
    if (timeChanged) {
      emails.push(await sendRequesterTimeChanged(updated));
    }

    return NextResponse.json({ reservation: updated, emails });
  } catch (error) {
    console.error('[lga-room] Could not update reservation:', error);
    return NextResponse.json({ error: 'Could not save this change. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
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
