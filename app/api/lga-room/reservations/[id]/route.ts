import { NextRequest, NextResponse } from 'next/server';
import {
  getAllReservations,
  isAdminRequestAuthorized,
  saveAllReservations,
  timesOverlap,
} from '@/lib/lgaRoom';
import {
  EmailSendResult,
  sendInternalCancellationEmail,
  sendInternalDecisionEmail,
  sendInternalUpdateEmail,
  sendRequesterCancellationEmail,
  sendRequesterDecision,
  sendRequesterUpdateEmail,
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
      const [internalEmails, requesterEmail] = await Promise.all([
        sendInternalDecisionEmail(updated),
        sendRequesterDecision(updated),
      ]);
      emails.push(...internalEmails, requesterEmail);
    } else {
      const changed = EDITABLE_FIELDS.some(field => field !== 'status' && field in body && updated[field] !== current[field]);
      if (changed) {
        const [internalEmails, requesterEmail] = await Promise.all([
          sendInternalUpdateEmail(updated),
          sendRequesterUpdateEmail(updated),
        ]);
        emails.push(...internalEmails, requesterEmail);
      }
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
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    }

    const next = reservations.filter(r => r.id !== id);
    await saveAllReservations(next);
    const [internalEmails, requesterEmail] = await Promise.all([
      sendInternalCancellationEmail(reservation),
      sendRequesterCancellationEmail(reservation),
    ]);
    return NextResponse.json({ ok: true, emails: [...internalEmails, requesterEmail] });
  } catch (error) {
    console.error('[lga-room] Could not delete reservation:', error);
    return NextResponse.json({ error: 'Could not delete this reservation. Please try again.' }, { status: 500 });
  }
}
