import { randomBytes } from 'crypto';
import { get, put } from '@vercel/blob';

export type EmployerPortalAnnouncement = {
  id: string;
  title: string;
  message: string;
  eventDate: string;
  linkUrl: string;
  linkLabel: string;
  enabled: boolean;
  updatedAt: string;
};

export type EmployerPortalAnnouncementsContent = {
  sectionKicker: string;
  sectionTitle: string;
  items: EmployerPortalAnnouncement[];
};

const ANNOUNCEMENTS_PATHNAME = 'employer-portal/announcements.json';

const DEFAULT_CONTENT: EmployerPortalAnnouncementsContent = {
  sectionKicker: 'Upcoming events',
  sectionTitle: 'What\'s happening at NCST',
  items: [],
};

function cleanString(value: unknown, max = 2000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function normalizeItem(raw: unknown, fallbackId?: string): EmployerPortalAnnouncement | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const title = cleanString(data.title, 160);
  const message = cleanString(data.message, 2000);
  if (!title && !message) return null;

  return {
    id: cleanString(data.id, 80) || fallbackId || randomBytes(8).toString('hex'),
    title,
    message,
    eventDate: cleanString(data.eventDate, 80),
    linkUrl: cleanString(data.linkUrl, 500),
    linkLabel: cleanString(data.linkLabel, 80),
    enabled: data.enabled !== false,
    updatedAt: cleanString(data.updatedAt, 40) || new Date().toISOString(),
  };
}

export async function getEmployerPortalAnnouncements(): Promise<EmployerPortalAnnouncementsContent> {
  const result = await get(ANNOUNCEMENTS_PATHNAME, { access: 'private', useCache: false });
  if (!result) return { ...DEFAULT_CONTENT, items: [] };

  const data = await new Response(result.stream).json();
  const items = Array.isArray(data?.items)
    ? data.items
        .map((item: unknown) => normalizeItem(item))
        .filter((item): item is EmployerPortalAnnouncement => item !== null)
    : [];

  return {
    sectionKicker: cleanString(data?.sectionKicker, 80) || DEFAULT_CONTENT.sectionKicker,
    sectionTitle: cleanString(data?.sectionTitle, 160) || DEFAULT_CONTENT.sectionTitle,
    items,
  };
}

export async function saveEmployerPortalAnnouncements(
  content: EmployerPortalAnnouncementsContent
): Promise<void> {
  await put(ANNOUNCEMENTS_PATHNAME, JSON.stringify(content), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export function sanitizeAnnouncementsPayload(
  body: Record<string, unknown>
): EmployerPortalAnnouncementsContent {
  const sectionKicker =
    cleanString(body.sectionKicker, 80) || DEFAULT_CONTENT.sectionKicker;
  const sectionTitle =
    cleanString(body.sectionTitle, 160) || DEFAULT_CONTENT.sectionTitle;

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((item, index) =>
      normalizeItem(item, `announcement-${index + 1}-${randomBytes(4).toString('hex')}`)
    )
    .filter((item): item is EmployerPortalAnnouncement => item !== null)
    .map(item => ({
      ...item,
      updatedAt: new Date().toISOString(),
    }));

  return { sectionKicker, sectionTitle, items };
}

export function getPublishedAnnouncements(content: EmployerPortalAnnouncementsContent) {
  return content.items.filter(item => item.enabled && (item.title || item.message));
}
