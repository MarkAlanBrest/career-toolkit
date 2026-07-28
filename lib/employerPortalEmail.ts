import { getEmployerPortalSettings, saveEmployerPortalSettings } from '@/lib/employerPortal';
import nodemailer from 'nodemailer';

const SENDER_NAME = 'NCST Employer Portal';
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

export type EmailSendResult = {
  sent: boolean;
  recipient: string;
  id?: string;
  error?: string;
};

function resolveSmtpHost(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (domain === 'gmail.com') return 'smtp.gmail.com';
  if (domain === 'yahoo.com' || domain === 'ymail.com') return 'smtp.mail.yahoo.com';
  if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') return 'smtp.mail.me.com';
  return 'smtp.office365.com';
}

async function getSenderConfig(): Promise<SenderConfig> {
  const settings = await getEmployerPortalSettings();
  const microsoftSetupExists = Boolean(
    settings.microsoftTenantId ||
    settings.microsoftClientId ||
    settings.microsoftRefreshToken,
  );
  if (microsoftSetupExists) {
    return {
      provider: 'microsoft-graph',
      host: '',
      authUser: '',
      authPass: '',
      fromEmail: settings.senderEmail,
      fromName: settings.senderName || SENDER_NAME,
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
      fromName: process.env.MAILJET_FROM_NAME || settings.senderName || SENDER_NAME,
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
    fromName: settings.senderName || process.env.OUTLOOK_FROM_NAME || SENDER_NAME,
    replyTo: settings.replyToEmail || undefined,
  };
}

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

function emailErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'The email provider rejected the message.';
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

async function sendWithMicrosoftGraph(
  config: SenderConfig,
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
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
    },
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
    const settings = await getEmployerPortalSettings();
    if (settings.microsoftRefreshToken === config.microsoftRefreshToken) {
      await saveEmployerPortalSettings({ ...settings, microsoftRefreshToken: tokenData.refresh_token });
    }
  }

  const message: Record<string, unknown> = {
    subject,
    body: { contentType: 'HTML', content: html },
    from: {
      emailAddress: {
        name: config.fromName,
        address: config.fromEmail,
      },
    },
    toRecipients: [{ emailAddress: { address: to } }],
  };
  if (replyTo && replyTo.toLowerCase() !== config.fromEmail.toLowerCase()) {
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
    },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(data.error?.message || `Microsoft rejected the message (${response.status}).`);
  }
  return { sent: true, recipient: to };
}

async function send(to: string, subject: string, html: string, replyTo?: string): Promise<EmailSendResult> {
  const config = await getSenderConfig();
  const { host, authUser, authPass, fromEmail, fromName } = config;
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
      return await sendWithMicrosoftGraph(config, to, subject, html, replyTo);
    }
    const transporter = nodemailer.createTransport({
      host,
      port: 587,
      secure: false,
      auth: { user: authUser, pass: authPass },
    });
    const mail: { from: string; to: string; subject: string; html: string; replyTo?: string } = {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    };
    if (replyTo && replyTo.toLowerCase() !== fromEmail.toLowerCase()) {
      mail.replyTo = replyTo;
    }
    const info = await transporter.sendMail(mail);
    return { sent: true, recipient: to, id: info.messageId };
  } catch (error) {
    console.error(`[employer-portal] Email to ${to} failed:`, error);
    return { sent: false, recipient: to, error: emailErrorMessage(error) };
  }
}

export async function sendTestEmail(to: string): Promise<EmailSendResult> {
  return send(
    to,
    'NCST Employer Portal email test',
    `<div style="font-family:sans-serif;color:#2d3b45;max-width:480px;">
      <h2 style="margin:0 0 8px;">Email test successful</h2>
      <p style="margin:0;">The NCST Employer Portal can send email to this address.</p>
    </div>`,
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function detailsTable(rows: Array<{ label: string; value: string }>): string {
  if (!rows.length) return '';
  const body = rows.map(row => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #dbe2ec;background:#f7f9fc;font-weight:600;width:38%;vertical-align:top;">${escapeHtml(row.label)}</td>
      <td style="padding:8px 12px;border:1px solid #dbe2ec;vertical-align:top;white-space:pre-wrap;">${escapeHtml(row.value)}</td>
    </tr>`).join('');
  return `<table style="border-collapse:collapse;width:100%;margin-top:12px;font-size:14px;">${body}</table>`;
}

async function getNotificationRecipients(key: 'applicantRequest' | 'jobPosting' | 'general'): Promise<string[]> {
  const settings = await getEmployerPortalSettings();
  const recipients = settings.notificationRecipients[key];
  return recipients.length > 0 ? recipients : ['careerservices@ncstrades.edu'];
}

export async function sendServiceFormEmails({
  recipientKey,
  formTitle,
  contactEmail,
  contactName,
  rows,
}: {
  recipientKey: 'applicantRequest' | 'jobPosting' | 'general';
  formTitle: string;
  contactEmail: string;
  contactName: string;
  rows: Array<{ label: string; value: string }>;
}): Promise<{ internal: EmailSendResult[]; confirmation: EmailSendResult }> {
  const recipients = await getNotificationRecipients(recipientKey);
  const subject = `NCST Employer Portal — ${formTitle}`;
  const table = detailsTable(rows);
  const internalHtml = `<div style="font-family:sans-serif;color:#2d3b45;max-width:560px;">
    <h2 style="margin:0 0 8px;">New employer portal submission</h2>
    <p style="margin:0 0 8px;">A new <strong>${escapeHtml(formTitle)}</strong> request was submitted through the NCST Employer Portal.</p>
    ${table}
  </div>`;
  const confirmationHtml = `<div style="font-family:sans-serif;color:#2d3b45;max-width:560px;">
    <h2 style="margin:0 0 8px;">We received your request</h2>
    <p style="margin:0 0 8px;">Thank you, ${escapeHtml(contactName)}. Career Services received your <strong>${escapeHtml(formTitle)}</strong> submission and someone will be reaching out to you soon.</p>
    ${table}
  </div>`;

  const [internal, confirmation] = await Promise.all([
    Promise.all(recipients.map(recipient => send(recipient, subject, internalHtml, contactEmail))),
    send(contactEmail, `We received your ${formTitle} request`, confirmationHtml),
  ]);

  return { internal, confirmation };
}
