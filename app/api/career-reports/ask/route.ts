import { NextRequest, NextResponse } from 'next/server';
import { evaluateAccscFlags } from '@/lib/careerReports/accscFlags';
import { askWithAi } from '@/lib/careerReports/ai';
import { answerLocally } from '@/lib/careerReports/reports';
import type { AccscFlag, CareerRecord, ParsedFile } from '@/lib/careerReports/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.question || typeof body.question !== 'string') {
    return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
  }

  const records = (body.records || []) as CareerRecord[];
  const files = (body.files || []) as ParsedFile[];
  const flags = (body.flags || evaluateAccscFlags(records)) as AccscFlag[];

  const localAnswer = answerLocally(body.question, records, flags);
  const answer = await askWithAi(body.question, records, files, localAnswer);

  return NextResponse.json({ answer, localHint: localAnswer });
}
