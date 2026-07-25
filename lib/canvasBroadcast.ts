import 'server-only';

export const CAMPUSES = {
  NCST: 'New Castle',
  ELPC: 'East Liverpool',
  NATS: 'Baltimore',
} as const;

export type CampusCode = keyof typeof CAMPUSES;

type CanvasCourse = {
  id: number;
  name?: string;
  course_code?: string;
  workflow_state?: string;
  start_at?: string | null;
  created_at?: string | null;
  term?: { start_at?: string | null };
};

type CanvasEnrollment = {
  user_id: number;
  type?: string;
  role?: string;
  enrollment_state?: string;
};

export type RecipientSnapshot = {
  campus: CampusCode;
  campusName: string;
  courseCount: number;
  studentCount: number;
  studentIds: number[];
  courses: Array<{ id: number; name: string }>;
  calculatedAt: string;
};

const MAX_RETRIES = 3;

function canvasConfig() {
  const baseUrl = process.env.CANVAS_BASE_URL?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  const token = process.env.CANVAS_API_TOKEN
    ?.trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  const accountId = process.env.CANVAS_ACCOUNT_ID || '1';
  if (!baseUrl || !token) {
    throw new Error('Canvas is not configured. Set CANVAS_BASE_URL and CANVAS_API_TOKEN.');
  }
  return { baseUrl, token, accountId };
}

function nextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match?.[2] === 'next') return match[1];
  }
  return null;
}

async function canvasFetch(urlOrPath: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const { baseUrl, token } = canvasConfig();
  const url = urlOrPath.startsWith('http') ? urlOrPath : `${baseUrl}${urlOrPath}`;
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...init.headers,
    },
  });

  if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
    const retryAfter = Number(response.headers.get('retry-after') || 0);
    const waitMs = retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt;
    await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 8000)));
    return canvasFetch(urlOrPath, init, attempt + 1);
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Canvas API ${response.status}: ${detail || response.statusText}`);
  }
  return response;
}

async function getAll<T>(path: string): Promise<T[]> {
  const { baseUrl } = canvasConfig();
  let url: string | null = `${baseUrl}${path}`;
  const rows: T[] = [];
  while (url) {
    const response = await canvasFetch(url);
    const page = (await response.json()) as T[];
    rows.push(...page);
    url = nextLink(response.headers.get('link'));
  }
  return rows;
}

export function courseCampus(course: Pick<CanvasCourse, 'name' | 'course_code'>): CampusCode | null {
  const searchable = `${course.name || ''}:${course.course_code || ''}`.toUpperCase();
  const tokens = searchable.split(':').map(token => token.trim());
  return (Object.keys(CAMPUSES) as CampusCode[]).find(code => tokens.includes(code)) || null;
}

function isRecent(course: CanvasCourse): boolean {
  const source = course.created_at;
  if (!source) return false;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  return date >= cutoff;
}

function isPublished(course: CanvasCourse): boolean {
  return course.workflow_state === 'available';
}

function isActiveStudent(enrollment: CanvasEnrollment): boolean {
  return enrollment.enrollment_state === 'active'
    && (enrollment.type === 'StudentEnrollment' || enrollment.role === 'StudentEnrollment' || enrollment.role === 'Student');
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export async function buildRecipientSnapshot(campus: CampusCode): Promise<RecipientSnapshot> {
  const { accountId } = canvasConfig();
  const courses = await getAll<CanvasCourse>(
    `/api/v1/accounts/${encodeURIComponent(accountId)}/courses?per_page=100&state[]=available&include[]=term`,
  );
  const candidates = courses.filter(course =>
    courseCampus(course) === campus && isPublished(course) && isRecent(course),
  );

  const enrollments = await mapWithConcurrency(candidates, 5, course =>
    getAll<CanvasEnrollment>(
      `/api/v1/courses/${course.id}/enrollments?per_page=100&type[]=StudentEnrollment&state[]=active`,
    ),
  );

  const studentIds = new Set<number>();
  const eligibleCourses: Array<{ id: number; name: string }> = [];
  let courseCount = 0;
  enrollments.forEach((rows, index) => {
    const active = rows.filter(isActiveStudent);
    if (!active.length) return;
    courseCount += 1;
    eligibleCourses.push({ id: candidates[index].id, name: candidates[index].name || candidates[index].course_code || `Course ${candidates[index].id}` });
    active.forEach(row => studentIds.add(row.user_id));
  });

  return {
    campus,
    campusName: CAMPUSES[campus],
    courseCount,
    studentCount: studentIds.size,
    studentIds: Array.from(studentIds),
    courses: eligibleCourses,
    calculatedAt: new Date().toISOString(),
  };
}

export type SendResult = {
  status: 'Sent' | 'Partial failure' | 'Failed';
  sent: number;
  failed: number;
  errors: string[];
  announcementRefs?: AnnouncementRef[];
};

export type AnnouncementRef = {
  courseId: number;
  topicId: number;
};

function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|h[1-6]|li|ul|ol)\s*>/gi, '\n')
    .replace(/<\s*li\b[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function sendCanvasInboxMessages(
  studentIds: number[],
  subject: string,
  message: string,
): Promise<SendResult> {
  const batches: number[][] = [];
  for (let index = 0; index < studentIds.length; index += 90) {
    batches.push(studentIds.slice(index, index + 90));
  }
  const body = htmlToPlainText(message);
  const outcomes = await mapWithConcurrency(batches, 3, async batch => {
    const form = new URLSearchParams();
    batch.forEach(id => form.append('recipients[]', String(id)));
    form.set('subject', subject);
    form.set('body', body);
    form.set('force_new', 'true');
    form.set('group_conversation', 'false');
    form.set('bulk_message', 'true');
    form.set('mode', 'async');
    try {
      await canvasFetch('/api/v1/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      return { sent: batch.length, error: '' };
    } catch (error) {
      return {
        sent: 0,
        error: `Inbox message failed for a batch of ${batch.length} students: ${error instanceof Error ? error.message : 'Unknown Canvas error'}`,
      };
    }
  });
  const sent = outcomes.reduce((total, outcome) => total + outcome.sent, 0);
  const errors = outcomes.filter(outcome => outcome.error).map(outcome => outcome.error);
  const failed = studentIds.length - sent;
  return {
    status: sent === studentIds.length ? 'Sent' : sent > 0 ? 'Partial failure' : 'Failed',
    sent,
    failed,
    errors,
  };
}

export async function getCanvasTestCourse(courseUrl: string): Promise<{ id: number; name: string; activeStudentCount: number; studentIds: number[] }> {
  const { baseUrl } = canvasConfig();
  let supplied: URL;
  try {
    supplied = new URL(courseUrl.trim());
  } catch {
    throw new Error('Enter a complete Canvas course URL.');
  }
  if (supplied.origin !== new URL(baseUrl).origin) {
    throw new Error('The test course URL must use the configured Canvas site.');
  }
  const match = supplied.pathname.match(/\/courses\/(\d+)(?:\/|$)/);
  if (!match) throw new Error('The URL does not contain a valid Canvas course ID.');
  const id = Number(match[1]);
  const courseResponse = await canvasFetch(`/api/v1/courses/${id}`);
  const course = await courseResponse.json() as CanvasCourse;
  const enrollments = await getAll<CanvasEnrollment>(
    `/api/v1/courses/${id}/enrollments?per_page=100&type[]=StudentEnrollment&state[]=active`,
  );
  const studentIds = Array.from(new Set(enrollments.filter(isActiveStudent).map(item => item.user_id)));
  return {
    id,
    name: course.name || course.course_code || `Course ${id}`,
    activeStudentCount: studentIds.length,
    studentIds,
  };
}

export function sanitizeMessageHtml(input: string): string {
  return input
    .replace(/<\s*(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form)\b[^>]*\/?\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*(["'])\s*(?:javascript|data):[\s\S]*?\2/gi, ' $1="#"');
}

export async function sendCanvasAnnouncements(
  courses: Array<{ id: number; name: string }>,
  title: string,
  message: string,
): Promise<SendResult> {
  const outcomes = await mapWithConcurrency(courses, 4, async course => {
    const warnings: string[] = [];
    try {
      const tab = new URLSearchParams();
      tab.set('hidden', 'false');
      await canvasFetch(`/api/v1/courses/${course.id}/tabs/announcements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tab.toString(),
      });
    } catch (error) {
      warnings.push(`navigation could not be enabled: ${error instanceof Error ? error.message : 'unknown Canvas error'}`);
    }

    try {
      const settings = new URLSearchParams();
      settings.set('show_announcements_on_home_page', 'true');
      settings.set('home_page_announcement_limit', '3');
      await canvasFetch(`/api/v1/courses/${course.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: settings.toString(),
      });
    } catch (error) {
      warnings.push(`homepage announcements could not be enabled: ${error instanceof Error ? error.message : 'unknown Canvas error'}`);
    }

    const form = new URLSearchParams();
    form.set('title', title);
    form.set('message', message);
    form.set('is_announcement', 'true');
    form.set('published', 'true');
    form.set('lock_comment', 'true');
    try {
      const response = await canvasFetch(`/api/v1/courses/${course.id}/discussion_topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const topic = await response.json() as { id?: number };
      if (!Number.isFinite(topic.id)) throw new Error('Canvas did not return the new announcement ID.');
      return {
        ok: true,
        ref: { courseId: course.id, topicId: Number(topic.id) },
        error: warnings.length ? `${course.name} (${course.id}) — announcement posted, but ${warnings.join('; ')}` : '',
      };
    } catch (error) {
      return {
        ok: false,
        ref: null,
        error: `${course.name} (${course.id}) — announcement failed: ${error instanceof Error ? error.message : 'Unknown Canvas error'}${warnings.length ? `; ${warnings.join('; ')}` : ''}`,
      };
    }
  });
  const sent = outcomes.filter(item => item.ok).length;
  const errors = outcomes.filter(item => item.error).map(item => item.error);
  const failed = courses.length - sent;
  return {
    status: sent === courses.length && !errors.length ? 'Sent' : sent > 0 ? 'Partial failure' : 'Failed',
    sent,
    failed,
    errors,
    announcementRefs: outcomes.flatMap(item => item.ref ? [item.ref] : []),
  };
}

export async function deleteCanvasAnnouncements(refs: AnnouncementRef[]): Promise<SendResult> {
  const outcomes = await mapWithConcurrency(refs, 4, async ref => {
    try {
      await canvasFetch(`/api/v1/courses/${ref.courseId}/discussion_topics/${ref.topicId}`, {
        method: 'DELETE',
      });
      return { ok: true, ref, error: '' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Canvas error';
      if (message.includes('Canvas API 404')) return { ok: true, ref, error: '' };
      return { ok: false, ref, error: `Course ${ref.courseId}, announcement ${ref.topicId}: ${message}` };
    }
  });
  const succeededRefs = outcomes.filter(item => item.ok).map(item => item.ref);
  const sent = succeededRefs.length;
  const errors = outcomes.filter(item => item.error).map(item => item.error);
  const failed = refs.length - sent;
  return {
    status: failed === 0 ? 'Sent' : sent > 0 ? 'Partial failure' : 'Failed',
    sent,
    failed,
    errors,
    announcementRefs: succeededRefs,
  };
}
