// Server-side Canvas LMS REST API client using a teacher's personal access token
// (Bearer auth), as opposed to the session-cookie approach the browser userscripts use.
// Mirrors the same endpoints/payload shapes as extension/Canvas_AI_Module_Builder.user.js's
// canvasAPI()/create*() functions so behavior stays consistent across products.

export class CanvasApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function cleanDomain(domain: string): string {
  return String(domain || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

async function canvasRequest<T = unknown>(
  domain: string,
  token: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const host = cleanDomain(domain);
  if (!host) throw new CanvasApiError('Missing Canvas domain.', 400);

  const url = `https://${host}/api/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore */ }
    if (res.status === 401) throw new CanvasApiError('Canvas rejected this API token. It may be expired or revoked.', 401);
    throw new CanvasApiError(`Canvas API error ${res.status}: ${detail.slice(0, 300)}`, res.status);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export type CanvasUser = { id: number; name: string };
export type CanvasCourse = { id: number; name: string; course_code?: string };
export type CanvasModule = { id: number; name: string; position: number };

export async function verifyConnection(domain: string, token: string): Promise<CanvasUser> {
  return canvasRequest<CanvasUser>(domain, token, 'GET', '/users/self');
}

export async function listCourses(domain: string, token: string): Promise<CanvasCourse[]> {
  const courses = await canvasRequest<CanvasCourse[]>(
    domain, token, 'GET',
    '/courses?enrollment_type=teacher&per_page=100&state[]=available&state[]=unpublished'
  );
  return (courses || []).map(c => ({ id: c.id, name: c.name, course_code: c.course_code }));
}

export async function listModules(domain: string, token: string, courseId: number | string): Promise<CanvasModule[]> {
  const modules = await canvasRequest<CanvasModule[]>(domain, token, 'GET', `/courses/${courseId}/modules?per_page=100`);
  return (modules || []).map(m => ({ id: m.id, name: m.name, position: m.position }));
}

export async function listModuleItems(domain: string, token: string, courseId: number | string, moduleId: number | string): Promise<unknown[]> {
  const items = await canvasRequest<unknown[]>(domain, token, 'GET', `/courses/${courseId}/modules/${moduleId}/items?per_page=100`);
  return items || [];
}

export async function createModule(domain: string, token: string, courseId: number | string, name: string, position?: number) {
  return canvasRequest<{ id: number; name: string }>(domain, token, 'POST', `/courses/${courseId}/modules`, {
    module: { name, position, workflow_state: 'active' },
  });
}

export async function createPage(domain: string, token: string, courseId: number | string, title: string, html: string) {
  return canvasRequest<{ url: string; page_id: number }>(domain, token, 'POST', `/courses/${courseId}/pages`, {
    wiki_page: { title, body: html, editing_roles: 'teachers', published: false },
  });
}

export async function createAssignment(domain: string, token: string, courseId: number | string, title: string, html: string, points: number) {
  return canvasRequest<{ id: number }>(domain, token, 'POST', `/courses/${courseId}/assignments`, {
    assignment: {
      name: title,
      description: html,
      submission_types: ['online_text_entry', 'online_upload'],
      points_possible: Number(points) || 100,
      grading_type: 'points',
      published: false,
    },
  });
}

export async function createQuiz(domain: string, token: string, courseId: number | string, title: string, pointsPossible: number) {
  return canvasRequest<{ id: number }>(domain, token, 'POST', `/courses/${courseId}/quizzes`, {
    quiz: {
      title, quiz_type: 'assignment', points_possible: pointsPossible,
      shuffle_answers: true, show_correct_answers: true,
      allowed_attempts: -1, scoring_policy: 'keep_highest', published: false,
    },
  });
}

export type QuizQuestionType = 'multiple_choice_question' | 'true_false_question' | 'short_answer_question' | 'essay_question';
export type QuizQuestionAnswer = { text: string; correct: boolean };
export type QuizQuestion = { question: string; type: QuizQuestionType; points: number; answers?: QuizQuestionAnswer[] };

export async function createQuestionGroup(domain: string, token: string, courseId: number | string, quizId: number, name: string, pickCount: number, pointsPerQuestion: number) {
  const resp = await canvasRequest<{ quiz_groups?: { id: number }[]; id?: number }>(
    domain, token, 'POST', `/courses/${courseId}/quizzes/${quizId}/groups`,
    { quiz_groups: [{ name, pick_count: pickCount, question_points: pointsPerQuestion }] }
  );
  return resp.quiz_groups ? resp.quiz_groups[0].id : (resp.id as number);
}

export async function createQuizQuestion(domain: string, token: string, courseId: number | string, quizId: number, groupId: number, q: QuizQuestion) {
  const payload: Record<string, unknown> = {
    question_name: q.question.slice(0, 60),
    question_text: `<p>${escapeHtml(q.question)}</p>`,
    question_type: q.type,
    points_possible: q.points,
    quiz_group_id: groupId,
  };
  if (q.type === 'multiple_choice_question' || q.type === 'true_false_question') {
    payload.answers = (q.answers || []).map(a => ({ answer_text: a.text, answer_weight: a.correct ? 100 : 0 }));
  }
  if (q.type === 'short_answer_question' && q.answers?.length) {
    payload.answers = q.answers.filter(a => a.correct).map(a => ({ answer_text: a.text, answer_weight: 100 }));
  }
  return canvasRequest(domain, token, 'POST', `/courses/${courseId}/quizzes/${quizId}/questions`, { question: payload });
}

export async function addModuleItem(
  domain: string, token: string, courseId: number | string,
  moduleId: number, itemType: 'Page' | 'Assignment' | 'Quiz',
  contentIdOrUrl: string | number, title: string, position?: number
) {
  const module_item: Record<string, unknown> = { title, type: itemType, position };
  if (itemType === 'Page') module_item.page_url = contentIdOrUrl;
  else module_item.content_id = contentIdOrUrl;
  return canvasRequest(domain, token, 'POST', `/courses/${courseId}/modules/${moduleId}/items`, { module_item });
}

function escapeHtml(s: string): string {
  const div: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s || '').replace(/[&<>"']/g, c => div[c]);
}
