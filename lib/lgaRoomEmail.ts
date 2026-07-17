import { Resend } from 'resend';
import { Reservation, ROOM_NAME, getSettings } from '@/lib/lgaRoom';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');

const FROM = process.env.RESEND_FROM_EMAIL || `${ROOM_NAME} Reservations <onboarding@resend.dev>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://career-toolkit-ruby.vercel.app';
const CALENDAR_URL = `${APP_URL}/lga-room/calendar`;

export function getEmailStatus() {
  // Never echo RESEND_FROM_EMAIL verbatim — if someone mis-pastes a secret into that
  // variable, this status endpoint must not become a way to read it back out.
  const fromLooksLikeAddress = FROM.includes('@');
  return {
    configured: Boolean(process.env.RESEND_API_KEY),
    fromEmail: fromLooksLikeAddress ? FROM : null,
    fromEmailInvalid: !fromLooksLikeAddress,
  };
}

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
  const rows: [string, string][] = [
    ['Event', reservation.eventName],
    ['Date', formatDateLabel(reservation.date)],
    ['Time', `${formatTimeLabel(reservation.startTime)} – ${formatTimeLabel(reservation.endTime)}`],
    ['Requested by', reservation.name],
  ];
  if (reservation.organization) rows.push(['Organization', reservation.organization]);
  if (reservation.phone) rows.push(['Phone', reservation.phone]);
  rows.push(['Number of people', String(reservation.numberOfPeople)]);
  rows.push(['Purpose', reservation.purpose]);
  if (reservation.setupRequirements) rows.push(['Setup requirements', reservation.setupRequirements]);
  if (reservation.specialRequests) rows.push(['Special requests', reservation.specialRequests]);

  return `
    <table style="border-collapse:collapse;margin:16px 0;">
      ${rows.map(([label, value]) => `
        <tr><td style="padding:4px 12px 4px 0;color:#6b7780;vertical-align:top;">${label}</td><td style="padding:4px 0;font-weight:700;">${value}</td></tr>
      `).join('')}
    </table>`;
}

function buttonLink(label: string) {
  return `<a href="${CALENDAR_URL}" style="display:inline-block;background:#1e7d34;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:700;">${label}</a>`;
}

async function send(to: string, subject: string, html: string, replyTo?: string) {
  try {
    const { error } = await resend.emails.send({ from: FROM, to, replyTo, subject, html });
    if (error) console.error(`[lga-room] Email to ${to} failed:`, error);
  } catch (error) {
    console.error(`[lga-room] Email to ${to} failed:`, error);
  }
}

export async function sendAdminNotification(reservation: Reservation): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.adminNotifyEmail) return;
    await send(
      settings.adminNotifyEmail,
      `New ${ROOM_NAME} request — ${formatDateLabel(reservation.date)}`,
      `<div style="font-family:sans-serif;color:#2d3b45;max-width:480px;">
        <h2 style="margin:0 0 8px;">New reservation request</h2>
        <p style="margin:0 0 8px;">A new ${ROOM_NAME} request is pending your approval.</p>
        ${detailsTable(reservation)}
        ${buttonLink('Review request')}
      </div>`,
      reservation.email
    );
  } catch (error) {
    console.error('[lga-room] Admin notification failed:', error);
  }
}

export async function sendRequesterDecision(reservation: Reservation): Promise<void> {
  const approved = reservation.status === 'approved';
  await send(
    reservation.email,
    `Your ${ROOM_NAME} request was ${approved ? 'approved' : 'not approved'}`,
    `<div style="font-family:sans-serif;color:#2d3b45;max-width:480px;">
      <h2 style="margin:0 0 8px;">Reservation ${approved ? 'approved' : 'not approved'}</h2>
      <p style="margin:0 0 8px;">Your request for the ${ROOM_NAME} has been <strong>${approved ? 'approved' : 'not approved'}</strong>.</p>
      ${detailsTable(reservation)}
      ${buttonLink('View calendar')}
    </div>`
  );
}

export async function sendRequesterTimeChanged(reservation: Reservation): Promise<void> {
  await send(
    reservation.email,
    `Your ${ROOM_NAME} reservation was rescheduled`,
    `<div style="font-family:sans-serif;color:#2d3b45;max-width:480px;">
      <h2 style="margin:0 0 8px;">Reservation rescheduled</h2>
      <p style="margin:0 0 8px;">The date or time of your ${ROOM_NAME} reservation was changed by an admin. The new details:</p>
      ${detailsTable(reservation)}
      ${buttonLink('View calendar')}
    </div>`
  );
}

export async function sendBuildingManagerNotification(reservation: Reservation): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.buildingManagerEmail) return;
    await send(
      settings.buildingManagerEmail,
      `${ROOM_NAME} approved — ${formatDateLabel(reservation.date)}`,
      `<div style="font-family:sans-serif;color:#2d3b45;max-width:480px;">
        <h2 style="margin:0 0 8px;">Reservation approved</h2>
        <p style="margin:0 0 8px;">The following ${ROOM_NAME} reservation has been approved.</p>
        ${detailsTable(reservation)}
        ${buttonLink('View calendar')}
      </div>`
    );
  } catch (error) {
    console.error('[lga-room] Building Manager notification failed:', error);
  }
}

export async function sendMaintenanceNotification(reservation: Reservation): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.maintenanceEmail) return;
    await send(
      settings.maintenanceEmail,
      `${ROOM_NAME} approved — ${formatDateLabel(reservation.date)}`,
      `<div style="font-family:sans-serif;color:#2d3b45;max-width:480px;">
        <h2 style="margin:0 0 8px;">Reservation approved</h2>
        <p style="margin:0 0 8px;">The following ${ROOM_NAME} reservation has been approved. Setup and special requests are included below if any were requested.</p>
        ${detailsTable(reservation)}
        ${buttonLink('View calendar')}
      </div>`
    );
  } catch (error) {
    console.error('[lga-room] Maintenance notification failed:', error);
  }
}
