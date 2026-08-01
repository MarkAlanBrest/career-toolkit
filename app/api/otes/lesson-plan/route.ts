import { NextRequest, NextResponse } from 'next/server';
import { OTES_RUBRIC, getComponentById } from '@/lib/otes/rubric';
import type { PerformanceLevel } from '@/lib/otes/types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

type LessonPlanRequest = {
  subject?: string;
  gradeLevel?: string;
  topic?: string;
  duration?: string;
  targetComponentIds?: string[];
  targetDomainIds?: string[];
  standards?: string;
  additionalNotes?: string;
  teacherName?: string;
};

function buildComponentContext(componentIds: string[]) {
  return componentIds.map(id => {
    const match = getComponentById(id);
    if (!match) return '';
    return `Component: ${match.component.name} (${match.domain.name})
Accomplished descriptor: ${match.component.levels.accomplished}
Key actions: ${match.component.accomplishedActions.join('; ')}`;
  }).filter(Boolean).join('\n\n');
}

function fallbackLessonPlan(body: LessonPlanRequest) {
  const topic = body.topic?.trim() || 'Core lesson topic';
  const subject = body.subject?.trim() || 'your subject';
  const grade = body.gradeLevel?.trim() || 'your grade level';
  return {
    title: `${topic} — Observation Lesson`,
    subject,
    gradeLevel: grade,
    duration: body.duration || '45 minutes',
    objective: `Students will demonstrate understanding of ${topic} through differentiated tasks aligned to Ohio Learning Standards.`,
    standards: body.standards || 'Ohio Learning Standards (specify standard codes)',
    materials: ['Anchor chart', 'Student handouts', 'Formative exit tickets', 'Differentiated task cards'],
    hook: `Activate prior knowledge with a 3-minute "think-pair-share" connecting ${topic} to a real-world Ohio context.`,
    instruction: [
      'Post learning targets in student-friendly language and reference them throughout.',
      'Model exemplar work before releasing students to practice.',
      'Use formative checks every 10–15 minutes (whiteboards or digital poll).',
      'Facilitate student-to-student discourse using accountable talk stems.',
    ],
    differentiation: [
      'Offer choice in how students demonstrate mastery (written, oral, visual).',
      'Provide scaffolded supports for students who need them and extension tasks for advanced learners.',
      'Use flexible grouping based on formative data, not fixed ability groups.',
    ],
    assessment: [
      'Diagnostic: brief pre-assessment at lesson start.',
      'Formative: mid-lesson check for understanding with planned re-teaching moves.',
      'Summative: exit ticket aligned to the learning target with success criteria rubric.',
    ],
    closure: 'Students reflect on progress toward their personal learning goal and complete a self-assessment against success criteria.',
    otesEvidence: [
      'Differentiated learning goals communicated to students',
      'HQSD formative check data used to adjust instruction',
      'Student-to-student discourse and higher-order questioning',
      'Timely, specific feedback with peer/self-assessment opportunity',
    ],
    reflection: 'After teaching, note which Accomplished descriptors were visible and what evidence to collect for your evaluator.',
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as LessonPlanRequest | null;
  if (!body?.topic?.trim()) {
    return NextResponse.json({ error: 'A lesson topic is required.' }, { status: 400, headers: CORS });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const componentIds = body.targetComponentIds?.length
    ? body.targetComponentIds
    : body.targetDomainIds?.length
      ? OTES_RUBRIC.filter(d => body.targetDomainIds!.includes(d.id)).flatMap(d => d.components.map(c => c.id))
      : [];

  const rubricContext = componentIds.length
    ? buildComponentContext(componentIds)
    : OTES_RUBRIC.map(d => `${d.name}: focus on Accomplished-level practices`).join('\n');

  if (!apiKey) {
    return NextResponse.json(fallbackLessonPlan(body), { headers: CORS });
  }

  const prompt = `You are an expert Ohio teacher coach helping a teacher prepare an OTES 2.0 observation lesson.

Teacher: ${body.teacherName || 'Ohio teacher'}
Subject: ${body.subject || 'general'}
Grade: ${body.gradeLevel || 'unspecified'}
Topic: ${body.topic}
Duration: ${body.duration || '45 minutes'}
Ohio/district standards: ${body.standards || 'Ohio Learning Standards'}
Additional notes: ${body.additionalNotes || 'None'}

OTES 2.0 rubric focus (design the lesson to produce observable evidence at the Accomplished level):
${rubricContext}

Create a detailed, practical observation-ready lesson plan. The lesson must intentionally showcase Accomplished-level teaching practices that an evaluator could observe in a 30-minute formal observation.

Respond with valid JSON only (no markdown fences) using this exact structure:
{
  "title": "string",
  "subject": "string",
  "gradeLevel": "string",
  "duration": "string",
  "objective": "string",
  "standards": "string with specific standard references",
  "materials": ["string"],
  "hook": "string - opening 5 min",
  "instruction": ["string - step by step teaching moves"],
  "differentiation": ["string"],
  "assessment": ["string - diagnostic, formative, summative"],
  "closure": "string",
  "otesEvidence": ["string - specific observable Accomplished behaviors evaluator will see"],
  "reflection": "string - post-lesson reflection prompts for the teacher"
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(fallbackLessonPlan(body), { headers: CORS });
    }

    const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find(c => c.type === 'text')?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(fallbackLessonPlan(body), { headers: CORS });
    }

    const plan = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      ...fallbackLessonPlan(body),
      ...plan,
      subject: plan.subject || body.subject,
      gradeLevel: plan.gradeLevel || body.gradeLevel,
      duration: plan.duration || body.duration || '45 minutes',
    }, { headers: CORS });
  } catch {
    return NextResponse.json(fallbackLessonPlan(body), { headers: CORS });
  }
}
