import { get, put } from '@vercel/blob';

export type EmployerNotificationRecipients = {
  applicantRequest: string[];
  jobPosting: string[];
  general: string[];
};

export type EmployerPortalSettings = {
  notificationRecipients: EmployerNotificationRecipients;
  senderEmail: string;
  senderAppPassword: string;
  senderName: string;
  replyToEmail: string;
  microsoftTenantId: string;
  microsoftClientId: string;
  microsoftRefreshToken: string;
  microsoftConnectedAt: string;
};

const SETTINGS_PATHNAME = 'employer-portal/settings.json';

const EMPTY_SETTINGS: EmployerPortalSettings = {
  notificationRecipients: {
    applicantRequest: [],
    jobPosting: [],
    general: [],
  },
  senderEmail: '',
  senderAppPassword: '',
  senderName: '',
  replyToEmail: '',
  microsoftTenantId: '',
  microsoftClientId: '',
  microsoftRefreshToken: '',
  microsoftConnectedAt: '',
};

function cleanRecipientList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((email): email is string => typeof email === 'string')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean),
  ));
}

export async function getEmployerPortalSettings(): Promise<EmployerPortalSettings> {
  const result = await get(SETTINGS_PATHNAME, { access: 'private', useCache: false });
  if (!result) return { ...EMPTY_SETTINGS };
  const data = await new Response(result.stream).json();
  const recipients = data?.notificationRecipients;
  return {
    notificationRecipients: {
      applicantRequest: cleanRecipientList(recipients?.applicantRequest),
      jobPosting: cleanRecipientList(recipients?.jobPosting),
      general: cleanRecipientList(recipients?.general),
    },
    senderEmail: typeof data?.senderEmail === 'string' ? data.senderEmail : '',
    senderAppPassword: typeof data?.senderAppPassword === 'string' ? data.senderAppPassword : '',
    senderName: typeof data?.senderName === 'string' ? data.senderName : '',
    replyToEmail: typeof data?.replyToEmail === 'string' ? data.replyToEmail : '',
    microsoftTenantId: typeof data?.microsoftTenantId === 'string' ? data.microsoftTenantId : '',
    microsoftClientId: typeof data?.microsoftClientId === 'string' ? data.microsoftClientId : '',
    microsoftRefreshToken: typeof data?.microsoftRefreshToken === 'string' ? data.microsoftRefreshToken : '',
    microsoftConnectedAt: typeof data?.microsoftConnectedAt === 'string' ? data.microsoftConnectedAt : '',
  };
}

export async function saveEmployerPortalSettings(settings: EmployerPortalSettings): Promise<void> {
  await put(SETTINGS_PATHNAME, JSON.stringify(settings), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
