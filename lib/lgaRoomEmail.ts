import nodemailer from 'nodemailer';
import {
  Reservation,
  ROOM_NAME,
  ReservationNotificationRecipients,
  getSettings,
  saveSettings,
} from '@/lib/lgaRoom';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://career-toolkit-ruby.vercel.app';
const CALENDAR_URL = `${APP_URL}/lga-room/calendar`;
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SenderConfig = {
  provider: 'microsoft-graph' | 'smtp';
  host: string;
  authUser: string;
  authPass: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  microsoftTenantId?: string;
  microsoftClientId?: string;
  microsoftRefreshToken?: string;
};

// Once Microsoft setup has started, never fall back silently: a bad Graph setup must
// fail visibly rather than sending through Mailjet. Mailjet is used only when no
// Microsoft credentials have been saved at all.
async function getSenderConfig(): Promise<SenderConfig> {
  const settings = await getSettings();
  const microsoftSetupExists = Boolean(
    settings.microsoftTenantId ||
    settings.microsoftClientId ||
    settings.microsoftClientSecret ||
    settings.microsoftRefreshToken
  );
  if (microsoftSetupExists) {
    return {
      provider: 'microsoft-graph',
      host: '',
      authUser: '',
      authPass: '',
      fromEmail: settings.senderEmail,
      fromName: settings.senderName || `${ROOM_NAME} Reservations`,
      replyTo: settings.replyToEmail || undefined,
      microsoftTenantId: settings.microsoftTenantId,
      microsoftClientId: settings.microsoftClientId,
      microsoftRefreshToken: settings.microsoftRefreshToken,
    };
  }
  const mailjetApiKey = process.env.MAILJET_API_KEY || '';
  const mailjetSecretKey = process.env.MAILJET_SECRET_KEY || '';

  if (mailjetApiKey && mailjetSecretKey) {
    return {
      provider: 'smtp',
      host: 'in-v3.mailjet.com',
      authUser: mailjetApiKey,
      authPass: mailjetSecretKey,
      fromEmail: process.env.MAILJET_FROM_EMAIL || settings.senderEmail || '',
      fromName: process.env.MAILJET_FROM_NAME || settings.senderName || `${ROOM_NAME} Reservations`,
      replyTo: settings.replyToEmail || undefined,
    };
  }

  const user = settings.senderEmail || process.env.OUTLOOK_USER || '';
  return {
    provider: 'smtp',
    host: resolveSmtpHost(user),
    authUser: user,
    authPass: settings.senderAppPassword || process.env.OUTLOOK_APP_PASSWORD || '',
    fromEmail: user,
    fromName: settings.senderName || process.env.OUTLOOK_FROM_NAME || `${ROOM_NAME} Reservations`,
    replyTo: settings.replyToEmail || undefined,
  };
}

// Most personal/work email providers issue app passwords for SMTP AUTH; picking the host
// from the sender's own domain means each admin can bring whichever account they already have.
function resolveSmtpHost(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (domain === 'gmail.com') return 'smtp.gmail.com';
  if (domain === 'yahoo.com' || domain === 'ymail.com') return 'smtp.mail.yahoo.com';
  if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') return 'smtp.mail.me.com';
  return 'smtp.office365.com'; // outlook.com, hotmail.com, live.com, and Microsoft 365 custom domains
}

export type EmailSendResult = {
  sent: boolean;
  recipient: string;
  id?: string;
  error?: string;
};

function microsoftConfigurationError(config: SenderConfig): string | null {
  const problems: string[] = [];
  if (!config.fromEmail) problems.push('sender email is missing');
  if (!config.microsoftTenantId) {
    problems.push('tenant ID is missing');
  } else if (!GUID_RE.test(config.microsoftTenantId)) {
    problems.push('tenant ID is not a valid GUID');
  }
  if (!config.microsoftClientId) {
    problems.push('application ID is missing');
  } else if (!GUID_RE.test(config.microsoftClientId)) {
    problems.push('application ID is not a valid GUID');
  }
  if (!config.microsoftRefreshToken) problems.push('Microsoft account is not connected');
  return problems.length ? `Microsoft 365 setup problem: ${problems.join('; ')}.` : null;
}

export async function getEmailStatus() {
  const config = await getSenderConfig();
  const { authUser, authPass, fromEmail, fromName } = config;
  const displayFrom = fromEmail ? `${fromName} <${fromEmail}>` : '';
  const microsoftError = config.provider === 'microsoft-graph'
    ? microsoftConfigurationError(config)
    : null;
  return {
    configured: config.provider === 'microsoft-graph'
      ? !microsoftError
      : Boolean(authUser && authPass && fromEmail),
    fromEmail: displayFrom || null,
    provider: config.provider === 'microsoft-graph' ? 'Microsoft 365' : 'Mailjet / SMTP',
    configurationError: microsoftError,
    fromEmailInvalid: false,
    usingTestSender: false,
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

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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
        <tr><td style="padding:4px 12px 4px 0;color:#6b7780;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:4px 0;font-weight:700;">${escapeHtml(value)}</td></tr>
      `).join('')}
    </table>`;
}

function buttonLink(label: string) {
  return `<a href="${CALENDAR_URL}" style="display:inline-block;background:#1e7d34;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:700;">${label}</a>`;
}

function emailErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'The email provider rejected the message.';
}

async function send(to: string, subject: string, html: string, replyTo?: string): Promise<EmailSendResult> {
  const config = await getSenderConfig();
  const { host, authUser, authPass, fromEmail, fromName, replyTo: defaultReplyTo } = config;
  const microsoftError = config.provider === 'microsoft-graph'
    ? microsoftConfigurationError(config)
    : null;
  const configured = config.provider === 'microsoft-graph'
    ? !microsoftError
    : Boolean(authUser && authPass && fromEmail);
  if (!configured) {
    return {
      sent: false,
      recipient: to,
      error: config.provider === 'microsoft-graph'
        ? `${microsoftError} Mailjet was not used.`
        : 'Email sending is not configured.',
    };
  }
  try {
    if (config.provider === 'microsoft-graph') {
      return await sendWithMicrosoftGraph(config, to, subject, html, replyTo || defaultReplyTo);
    }
    const transporter = nodemailer.createTransport({
      host,
      port: 587,
      secure: false,
      auth: { user: authUser, pass: authPass },
    });
    const info = await transporter.sendMail({ from: `${fromName} <${fromEmail}>`, to, replyTo: replyTo || defaultReplyTo, subject, html });
    return { sent: true, recipient: to, id: info.messageId };
  } catch (error) {
    console.error(`[lga-room] Email to ${to} failed:`, error);
    return { sent: false, recipient: to, error: emailErrorMessage(error) };
  }
}

async function sendWithMicrosoftGraph(
  config: SenderConfig,
  to: string,
  subject: string,
  html: string,
  replyTo?: string
): Promise<EmailSendResult> {
  if (!config.microsoftRefreshToken) {
    throw new Error('Microsoft account is not connected.');
  }
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(config.microsoftTenantId!)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.microsoftClientId!,
        refresh_token: config.microsoftRefreshToken,
        scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access openid profile',
        grant_type: 'refresh_token',
      }),
      cache: 'no-store',
    }
  );
  const tokenData = await tokenResponse.json().catch(() => ({})) as {
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
  };
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || 'Microsoft could not refresh the connected account.');
  }

  if (tokenData.refresh_token && tokenData.refresh_token !== config.microsoftRefreshToken) {
    const settings = await getSettings();
    if (settings.microsoftRefreshToken === config.microsoftRefreshToken) {
      await saveSettings({ ...settings, microsoftRefreshToken: tokenData.refresh_token });
    }
  }

  const message: Record<string, unknown> = {
    subject,
    body: { contentType: 'HTML', content: html },
    toRecipients: [{ emailAddress: { address: to } }],
  };
  if (replyTo) {
    message.replyTo = [{ emailAddress: { address: replyTo } }];
  }

  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/sendMail',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, saveToSentItems: true }),
      cache: 'no-store',
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(data.error?.message || `Microsoft rejected the message (${response.status}).`);
  }
  return { sent: true, recipient: to };
}

async function getInternalRecipients(event: keyof ReservationNotificationRecipients): Promise<string[]> {
  const settings = await getSettings();
  return settings.notificationRecipients[event];
}

async function sendInternalEmail(
  reservation: Reservation,
  event: keyof ReservationNotificationRecipients,
  subject: string,
  heading: string,
  message: string,
  buttonLabel = 'View reservation'
): Promise<EmailSendResult[]> {
  try {
    const recipients = await getInternalRecipients(event);
    if (!recipients.length) return [];
    return await Promise.all(recipients.map(recipient => send(
      recipient,
      subject,
      `<div style="font-family:sans-serif;color:#2d3b45;max-width:520px;">
        <h2 style="margin:0 0 8px;">${heading}</h2>
        <p style="margin:0 0 8px;">${message}</p>
        ${detailsTable(reservation)}
        ${buttonLink(buttonLabel)}
      </div>`,
      reservation.email
    )));
  } catch (error) {
    console.error('[lga-room] Internal notification failed:', error);
    return [{ sent: false, recipient: 'admin recipient list', error: emailErrorMessage(error) }];
  }
}

export async function sendReservationRequestEmail(reservation: Reservation): Promise<EmailSendResult[]> {
  return sendInternalEmail(
    reservation,
    'request',
    `Reservation Request Email — ${ROOM_NAME} — ${formatDateLabel(reservation.date)}`,
    'Reservation Request Email',
    `A new ${ROOM_NAME} request is pending review.`,
    'Review request'
  );
}

export async function sendReservationRequestReceived(reservation: Reservation): Promise<EmailSendResult> {
  return send(
    reservation.email,
    `Reservation Request Received — ${ROOM_NAME}`,
    `<div style="font-family:sans-serif;color:#2d3b45;max-width:520px;">
      <h2 style="margin:0 0 8px;">Reservation Request Received</h2>
      <p style="margin:0 0 8px;">We received your request for the ${ROOM_NAME}. It is pending review, and you will receive another email when a decision is made.</p>
      ${detailsTable(reservation)}
      ${buttonLink('View calendar')}
    </div>`
  );
}

export async function sendInternalDecisionEmail(reservation: Reservation): Promise<EmailSendResult[]> {
  const approved = reservation.status === 'approved';
  return sendInternalEmail(
    reservation,
    approved ? 'approved' : 'declined',
    approved
      ? `Confirmation Email — ${ROOM_NAME} approved — ${formatDateLabel(reservation.date)}`
      : `${ROOM_NAME} reservation declined — ${formatDateLabel(reservation.date)}`,
    approved ? 'Confirmation Email' : 'Reservation declined',
    approved
      ? `The following ${ROOM_NAME} reservation has been approved.`
      : `The following ${ROOM_NAME} reservation request has been declined.`
  );
}

export async function sendRequesterDecision(reservation: Reservation): Promise<EmailSendResult> {
  const approved = reservation.status === 'approved';
  return send(
    reservation.email,
    approved ? `Your ${ROOM_NAME} reservation is confirmed` : `Your ${ROOM_NAME} reservation request was declined`,
    `<div style="font-family:sans-serif;color:#2d3b45;max-width:520px;">
      <h2 style="margin:0 0 8px;">${approved ? 'Reservation confirmed' : 'Reservation declined'}</h2>
      <p style="margin:0 0 8px;">Your request for the ${ROOM_NAME} has been <strong>${approved ? 'approved' : 'declined'}</strong>.</p>
      ${detailsTable(reservation)}
      ${buttonLink('View calendar')}
    </div>`
  );
}

export async function sendInternalUpdateEmail(reservation: Reservation): Promise<EmailSendResult[]> {
  return sendInternalEmail(
    reservation,
    'updated',
    `${ROOM_NAME} reservation updated — ${formatDateLabel(reservation.date)}`,
    'Reservation updated',
    `An administrator changed the following ${ROOM_NAME} reservation. The current details are below.`
  );
}

export async function sendRequesterUpdateEmail(reservation: Reservation): Promise<EmailSendResult> {
  return send(
    reservation.email,
    `Your ${ROOM_NAME} reservation was updated`,
    `<div style="font-family:sans-serif;color:#2d3b45;max-width:520px;">
      <h2 style="margin:0 0 8px;">Reservation updated</h2>
      <p style="margin:0 0 8px;">Details for your ${ROOM_NAME} reservation have changed. The current information is below.</p>
      ${detailsTable(reservation)}
      ${buttonLink('View calendar')}
    </div>`
  );
}

export async function sendInternalCancellationEmail(reservation: Reservation): Promise<EmailSendResult[]> {
  return sendInternalEmail(
    reservation,
    'cancelled',
    `${ROOM_NAME} reservation cancelled — ${formatDateLabel(reservation.date)}`,
    'Reservation cancelled',
    `An administrator cancelled and removed the following ${ROOM_NAME} reservation.`
  );
}

export async function sendRequesterCancellationEmail(reservation: Reservation): Promise<EmailSendResult> {
  return send(
    reservation.email,
    `Your ${ROOM_NAME} reservation was cancelled`,
    `<div style="font-family:sans-serif;color:#2d3b45;max-width:520px;">
      <h2 style="margin:0 0 8px;">Reservation cancelled</h2>
      <p style="margin:0 0 8px;">Your ${ROOM_NAME} reservation has been cancelled. The cancelled reservation details are below.</p>
      ${detailsTable(reservation)}
    </div>`
  );
}

export async function sendTestEmail(to: string): Promise<EmailSendResult> {
  return send(
    to,
    `${ROOM_NAME} email test`,
    `<div style="font-family:sans-serif;color:#2d3b45;max-width:480px;">
      <h2 style="margin:0 0 8px;">Email test successful</h2>
      <p style="margin:0;">The ${ROOM_NAME} reservation system can send email to this address.</p>
    </div>`
  );
}
