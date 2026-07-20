import { NextRequest, NextResponse } from 'next/server';
import {
  Reservation,
  ROOM_CLOSE_TIME,
  ROOM_OPEN_TIME,
  getAllReservations,
  saveAllReservations,
  timesOverlap,
} from '@/lib/lgaRoom';
import { sendAdminNotification } from '@/lib/lgaRoomEmail';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get('month'); // YYYY-MM
  try {
    const reservations = await getAllReservations();
    const filtered = month ? reservations.filter(r => r.date.startsWith(month)) : reservations;
    return NextResponse.json({ reservations: filtered });
  } catch (error) {
    console.error('[lga-room] Could not load reservations:', error);
    return NextResponse.json({ error: 'Could not load reservations. Storage is not configured correctly.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const {
    date, startTime, endTime, name, organization, email, phone, eventName, purpose, numberOfPeople, setupRequirements, specialRequests,
  } = body as Record<string, string>;

  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 });
  }
  if (!startTime || !TIME_RE.test(startTime) || !endTime || !TIME_RE.test(endTime)) {
    return NextResponse.json({ error: 'A valid start and end time are required.' }, { status: 400 });
  }
  if (startTime >= endTime) {
    return NextResponse.json({ error: 'Start time must be before end time.' }, { status: 400 });
  }
  if (startTime < ROOM_OPEN_TIME || endTime > ROOM_CLOSE_TIME) {
    return NextResponse.json({ error: `The room can only be booked between ${ROOM_OPEN_TIME} and ${ROOM_CLOSE_TIME}.` }, { status: 400 });
  }
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Your name is required.' }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (!eventName || !eventName.trim()) {
    return NextResponse.json({ error: 'An event name is required.' }, { status: 400 });
  }
  if (!purpose || !purpose.trim()) {
    return NextResponse.json({ error: 'A purpose for the reservation is required.' }, { status: 400 });
  }
  const peopleCount = Number(numberOfPeople);
  if (!Number.isInteger(peopleCount) || peopleCount < 1) {
    return NextResponse.json({ error: 'Number of people must be a whole number of at least 1.' }, { status: 400 });
  }

  try {
    const reservations = await getAllReservations();
    const hasApprovedConflict = reservations.some(
      r => r.date === date && r.status === 'approved' && timesOverlap(r.startTime, r.endTime, startTime, endTime)
    );
    if (hasApprovedConflict) {
      return NextResponse.json({ error: 'That time is already booked.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const reservation: Reservation = {
      id: crypto.randomUUID(),
      date,
      startTime,
      endTime,
      name: name.trim(),
      organization: (organization || '').trim(),
      email: email.trim(),
      phone: (phone || '').trim(),
      eventName: eventName.trim(),
      purpose: purpose.trim(),
      numberOfPeople: peopleCount,
      setupRequirements: (setupRequirements || '').trim(),
      specialRequests: (specialRequests || '').trim(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    reservations.push(reservation);
    await saveAllReservations(reservations);
    const emailResult = await sendAdminNotification(reservation);

    return NextResponse.json({
      reservation,
      email: emailResult ? { sent: emailResult.sent } : null,
    }, { status: 201 });
  } catch (error) {
    console.error('[lga-room] Could not submit reservation:', error);
    return NextResponse.json({ error: 'Could not submit your request. Please try again.' }, { status: 500 });
  }
}
