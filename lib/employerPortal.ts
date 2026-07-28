import { get } from '@vercel/blob';
import { put } from '@vercel/blob';

export type EmployerNotificationRecipients = {
  applicantRequest: string[];
  jobPosting: string[];
  general: string[];
};

export type EmployerPortalSettings = {
  notificationRecipients: EmployerNotificationRecipients;
};

const SETTINGS_PATHNAME = 'employer-portal/settings.json';

const EMPTY_SETTINGS: EmployerPortalSettings = {
  notificationRecipients: {
    applicantRequest: [],
    jobPosting: [],
    general: [],
  },
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
