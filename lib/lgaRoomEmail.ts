import { Resend } from 'resend';
import { Reservation, ROOM_NAME } from '@/lib/lgaRoom';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');

const FROM = process.env.RESEND_FROM_EMAIL || `${ROOM_NAME} Reservations <onboarding@resend.dev>`;
const ADMIN_EMAIL = process.env.LGA_ROOM_ADMIN_EMAIL || 'markalanbrest@gmail.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://career-toolkit-ruby.vercel.app';
const CALENDAR_URL = `${APP_URL}/lga-room`;

function formatTimeLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDateLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function detailsTable(reservation: Reservation) {
  return `
    <table style="border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7780;">Date</td><td style="padding:4px 0;font-weight:700;">${formatDateLabel(reservation.date)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7780;">Time</td><td style="padding:4px 0;font-weight:700;">${formatTimeLabel(reservation.startTime)} – ${formatTimeLabel(reservation.endTime)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7780;">Requested by</td><td style="padding:4px 0;">${reservation.name}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7780;">Purpose</td><td style="padding:4px 0;">${reservation.purpose}</td></tr>
    </table>`;
}

export async function sendAdminNotification(reservation: Reservation): Promise<void> {
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      replyTo: reservation.email,
      subject: `New ${ROOM_NAME} request — ${formatDateLabel(reservation.date)}`,
      html: `
        <div style="font-family:sans-serif;color:#2d3b45;max-width:480px;">
          <h2 style="margin:0 0 8px;">New reservation request</h2>
          <p style="margin:0 0 8px;">A new ${ROOM_NAME} request is pending your approval.</p>
          ${detailsTable(reservation)}
          <a href="${CALENDAR_URL}" style="display:inline-block;background:#1e7d34;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:700;">Review request</a>
        </div>`,
    });
    if (error) console.error('[lga-room] Admin notification failed:', error);
  } catch (error) {
    console.error('[lga-room] Admin notification failed:', error);
  }
}

export async function sendRequesterDecision(reservation: Reservation): Promise<void> {
  const approved = reservation.status === 'approved';
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: reservation.email,
      subject: `Your ${ROOM_NAME} request was ${approved ? 'approved' : 'not approved'}`,
      html: `
        <div style="font-family:sans-serif;color:#2d3b45;max-width:480px;">
          <h2 style="margin:0 0 8px;">Reservation ${approved ? 'approved' : 'not approved'}</h2>
          <p style="margin:0 0 8px;">
            Your request for the ${ROOM_NAME} has been <strong>${approved ? 'approved' : 'not approved'}</strong>.
          </p>
          ${detailsTable(reservation)}
          <a href="${CALENDAR_URL}" style="display:inline-block;background:#1e7d34;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:700;">View calendar</a>
        </div>`,
    });
    if (error) console.error('[lga-room] Requester notification failed:', error);
  } catch (error) {
    console.error('[lga-room] Requester notification failed:', error);
  }
}
