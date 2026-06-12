import type {
  CanvasAssignment,
  CanvasCourse,
  CanvasDiscussionTopic,
  CanvasEnrollment,
  CanvasId,
  CanvasPageView,
  CanvasSubmission,
  CanvasUser,
} from '../types/canvas';

type QueryValue = string | number | boolean | undefined | null;

export class CanvasClient {
  readonly baseUrl: string;

  constructor(baseUrl = window.location.origin) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getCurrentCourse(courseId: CanvasId): Promise<CanvasCourse> {
    return this.get(`/courses/${courseId}`, { 'include[]': 'term' });
  }

  async getTeacherCourses(): Promise<CanvasCourse[]> {
    return this.getPaginated('/courses', {
      enrollment_type: 'teacher',
      state: ['available'],
      'include[]': 'term',
      per_page: 100,
    });
  }

  async getStudents(courseId: CanvasId): Promise<CanvasUser[]> {
    return this.getPaginated(`/courses/${courseId}/users`, {
      'enrollment_type[]': 'student',
      'include[]': ['email', 'enrollments'],
      per_page: 100,
    });
  }

  async getEnrollments(courseId: CanvasId): Promise<CanvasEnrollment[]> {
    return this.getPaginated(`/courses/${courseId}/enrollments`, {
      'type[]': 'StudentEnrollment',
      'state[]': 'active',
      'include[]': ['grades', 'user'],
      per_page: 100,
    });
  }

  async getAssignments(courseId: CanvasId): Promise<CanvasAssignment[]> {
    return this.getPaginated(`/courses/${courseId}/assignments`, {
      order_by: 'due_at',
      bucket: 'all',
      per_page: 100,
    });
  }

  async getSubmissions(courseId: CanvasId, studentIds: 'all' | CanvasId[] = 'all'): Promise<CanvasSubmission[]> {
    const ids = studentIds === 'all' ? ['all'] : studentIds.map(String);
    return this.getPaginated(`/courses/${courseId}/students/submissions`, {
      'student_ids[]': ids,
      'include[]': ['assignment', 'submission_comments', 'rubric_assessment', 'read_status'],
      grouped: false,
      per_page: 100,
    });
  }

  async getDiscussionTopics(courseId: CanvasId): Promise<CanvasDiscussionTopic[]> {
    return this.getPaginated(`/courses/${courseId}/discussion_topics`, {
      'include[]': ['all_dates'],
      per_page: 100,
    });
  }

  async getUserPageViews(userId: CanvasId, startTime?: string, endTime?: string): Promise<CanvasPageView[]> {
    return this.getPaginated(`/users/${userId}/page_views`, {
      start_time: startTime,
      end_time: endTime,
      per_page: 100,
    });
  }

  async get<T>(path: string, query: Record<string, QueryValue | QueryValue[]> = {}): Promise<T> {
    const response = await fetch(this.url(path, query), {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Canvas API error ${response.status}: ${await response.text()}`);
    return response.json();
  }

  async getPaginated<T>(path: string, query: Record<string, QueryValue | QueryValue[]> = {}): Promise<T[]> {
    const results: T[] = [];
    let nextUrl: string | null = this.url(path, query);
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Canvas API error ${response.status}: ${await response.text()}`);
      results.push(...(await response.json()));
      nextUrl = parseNextLink(response.headers.get('Link'));
    }
    return results;
  }

  private url(path: string, query: Record<string, QueryValue | QueryValue[]> = {}) {
    const url = new URL(`${this.baseUrl}/api/v1${path.startsWith('/') ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        value.filter(isPresent).forEach(item => url.searchParams.append(key, String(item)));
      } else if (isPresent(value)) {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }
}

function isPresent(value: QueryValue): value is string | number | boolean {
  return value !== undefined && value !== null && value !== '';
}

function parseNextLink(link: string | null) {
  if (!link) return null;
  const next = link.split(',').find(part => /rel="next"/.test(part));
  return next?.match(/<([^>]+)>/)?.[1] || null;
}
