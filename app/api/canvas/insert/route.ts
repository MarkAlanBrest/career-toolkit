import { NextRequest, NextResponse } from 'next/server';
import { cleanAccountId } from '@/lib/stripe';
import { validateAccountToken } from '@/lib/accountAuth';
import { getCanvasConnection } from '@/lib/canvasConnection';
import {
  CanvasApiError, createModule, createPage, createAssignment, createQuiz,
  createQuestionGroup, createQuizQuestion, addModuleItem, listModuleItems,
  QuizQuestion,
} from '@/lib/canvasApi';

export const dynamic = 'force-dynamic';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

type QuizGroupType = 'mc' | 'tf' | 'sa' | 'essay';
type BuilderQuizGroup = { type: QuizGroupType; concept?: string; questions: { question: string; answers?: { text: string; correct: boolean }[] }[] };
type BuilderItem = {
  type: 'page' | 'assignment' | 'quiz' | 'discussion';
  title: string;
  html?: string;
  pointValue?: number;
  quizGroups?: BuilderQuizGroup[];
};

const POINTS_FOR_GROUP: Record<QuizGroupType, number> = { mc: 1, tf: 1, sa: 5, essay: 10 };
const QUESTION_TYPE_FOR_GROUP: Record<QuizGroupType, QuizQuestion['type']> = {
  mc: 'multiple_choice_question', tf: 'true_false_question', sa: 'short_answer_question', essay: 'essay_question',
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const accountId = cleanAccountId(body?.accountId);
  if (!accountId) return NextResponse.json({ error: 'Missing account.' }, { status: 400, headers: CORS });

  const verified = await validateAccountToken(accountId, body?.accountToken);
  if (!verified) return NextResponse.json({ error: 'Could not verify this account.' }, { status: 403, headers: CORS });

  const connection = await getCanvasConnection(accountId);
  if (!connection) return NextResponse.json({ error: 'Connect your Canvas account first.' }, { status: 409, headers: CORS });

  const courseId = body?.courseId;
  const placement: 'top' | 'bottom' = body?.placement === 'top' ? 'top' : 'bottom';
  const items: BuilderItem[] = Array.isArray(body?.items) ? body.items : [];
  if (!courseId) return NextResponse.json({ error: 'Missing course.' }, { status: 400, headers: CORS });
  if (!items.length) return NextResponse.json({ error: 'Nothing to insert.' }, { status: 400, headers: CORS });

  const { domain, token } = connection;
  const results: { title: string; status: 'inserted' | 'error'; error?: string }[] = [];

  try {
    let moduleId: number = body?.moduleId;
    if (!moduleId) {
      const newModuleName = String(body?.newModuleName || 'New Module').slice(0, 200);
      const created = await createModule(domain, token, courseId, newModuleName);
      moduleId = created.id;
    }

    let nextPosition: number | undefined;
    if (placement === 'top') {
      nextPosition = 1;
    } else {
      const existing = await listModuleItems(domain, token, courseId, moduleId);
      nextPosition = existing.length + 1;
    }

    for (const item of items) {
      try {
        if (item.type === 'quiz') {
          const groups = item.quizGroups || [];
          const totalPoints = groups.reduce((sum, g) => sum + POINTS_FOR_GROUP[g.type], 0);
          const quiz = await createQuiz(domain, token, courseId, item.title, totalPoints);
          for (let gi = 0; gi < groups.length; gi++) {
            const group = groups[gi];
            const points = POINTS_FOR_GROUP[group.type];
            const groupId = await createQuestionGroup(domain, token, courseId, quiz.id, `Group ${gi + 1}: ${group.concept || group.type}`, 1, points);
            for (const q of group.questions) {
              await createQuizQuestion(domain, token, courseId, quiz.id, groupId, {
                question: q.question, type: QUESTION_TYPE_FOR_GROUP[group.type], points, answers: q.answers,
              });
            }
          }
          await addModuleItem(domain, token, courseId, moduleId, 'Quiz', quiz.id, item.title, nextPosition);
        } else if (item.type === 'assignment') {
          const assignment = await createAssignment(domain, token, courseId, item.title, item.html || '<p></p>', item.pointValue || 100);
          await addModuleItem(domain, token, courseId, moduleId, 'Assignment', assignment.id, item.title, nextPosition);
        } else {
          const page = await createPage(domain, token, courseId, item.title, item.html || '<p></p>');
          await addModuleItem(domain, token, courseId, moduleId, 'Page', page.url, item.title, nextPosition);
        }
        results.push({ title: item.title, status: 'inserted' });
        if (nextPosition != null) nextPosition += 1;
      } catch (err) {
        results.push({ title: item.title, status: 'error', error: err instanceof Error ? err.message : 'Insert failed.' });
      }
    }

    return NextResponse.json({ ok: true, moduleId, results }, { headers: CORS });
  } catch (error) {
    const status = error instanceof CanvasApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Could not insert into Canvas.';
    return NextResponse.json({ error: message, results }, { status: status === 401 ? 401 : 502, headers: CORS });
  }
}
