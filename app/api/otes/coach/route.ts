import { NextRequest, NextResponse } from 'next/server';
import { getComponentById, getDomainById } from '@/lib/otes/rubric';
import { getCategoryGuidance } from '@/lib/otes/categoryGuidance';
import type { PerformanceLevel } from '@/lib/otes/types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

type CoachRequest = {
  question?: string;
  componentId?: string;
  categoryId?: string;
  currentLevel?: PerformanceLevel | null;
  context?: string;
  teacherProfile?: {
    name?: string;
    subject?: string;
    gradeLevel?: string;
    school?: string;
  };
};

function fallbackCoach(body: CoachRequest) {
  const domain = body.categoryId ? getDomainById(body.categoryId) : null;
  if (domain) {
    const guidance = getCategoryGuidance(domain.id);
    return {
      answer: `For **${domain.name}**, here are recommendations toward Accomplished:\n\n**Daily habits:**\n${guidance.dailyHabits.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n**Strategies:**\n${guidance.strategies.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n**This week:** Pick one daily habit and one strategy. Log what you did — it becomes evidence for your report.`,
      actions: [...guidance.dailyHabits, ...guidance.strategies],
    };
  }

  const match = body.componentId ? getComponentById(body.componentId) : null;
  if (match) {
    return {
      answer: `To move toward Accomplished in **${match.component.name}** (${match.domain.name}):\n\n${match.component.accomplishedActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`,
      actions: match.component.accomplishedActions,
    };
  }

  return {
    answer: 'Open a rubric category on your dashboard, set a goal and strategy, then log one action this week. Your coach works best when tied to a specific domain.',
    actions: [],
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as CoachRequest | null;
  if (!body?.question?.trim() && !body?.componentId && !body?.categoryId) {
    return NextResponse.json({ error: 'A question or category is required.' }, { status: 400, headers: CORS });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const domain = body.categoryId ? getDomainById(body.categoryId) : null;
  const match = body.componentId ? getComponentById(body.componentId) : null;

  if (!apiKey) {
    return NextResponse.json(fallbackCoach(body), { headers: CORS });
  }

  const categoryGuidance = domain ? getCategoryGuidance(domain.id) : null;
  const rubricBlock = domain
    ? `Rubric category: ${domain.name}
Current teacher self-rating: ${body.currentLevel || 'not rated'}
Accomplished summary: ${categoryGuidance?.accomplishedSummary || ''}
Daily habits: ${categoryGuidance?.dailyHabits.join('; ') || ''}
Strategies: ${categoryGuidance?.strategies.join('; ') || ''}
Components: ${domain.components.map(c => c.name).join(', ')}`
    : match
      ? `Rubric component: ${match.component.name} (${match.domain.name})
Current teacher self-rating: ${body.currentLevel || 'not rated'}
Accomplished: ${match.component.levels.accomplished}`
      : 'General OTES 2.0 coaching';

  const prompt = `You are an expert Ohio teacher evaluation coach specializing in OTES 2.0.

Teacher profile:
- Name: ${body.teacherProfile?.name || 'Ohio teacher'}
- Subject: ${body.teacherProfile?.subject || 'unspecified'}
- Grade: ${body.teacherProfile?.gradeLevel || 'unspecified'}
- School: ${body.teacherProfile?.school || 'unspecified'}

${rubricBlock}

Additional context: ${body.context || 'None'}

Teacher question: ${body.question || `How do I move from ${body.currentLevel || 'my current level'} to Accomplished on this component?`}

Provide practical, specific coaching advice for an Ohio teacher working toward an Accomplished rating. Be encouraging but concrete. Reference OTES 2.0 language. Include 3-5 actionable steps they can take this week. Keep the response under 400 words. Use markdown formatting.`;

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
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(fallbackCoach(body), { headers: CORS });
    }

    const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
    const answer = data.content?.find(c => c.type === 'text')?.text?.trim();
    if (!answer) {
      return NextResponse.json(fallbackCoach(body), { headers: CORS });
    }

    return NextResponse.json({
      answer,
      actions: match?.component.accomplishedActions ?? [],
    }, { headers: CORS });
  } catch {
    return NextResponse.json(fallbackCoach(body), { headers: CORS });
  }
}
