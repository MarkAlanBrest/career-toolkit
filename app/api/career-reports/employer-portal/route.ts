import { NextRequest, NextResponse } from 'next/server';
import { listAllEmployerSubmissions } from '@/lib/employerPortalUsers';
import { submissionToRecords } from '@/lib/careerReports/employerPortalImport';

export async function GET() {
  try {
    const submissions = await listAllEmployerSubmissions();
    const records = submissionToRecords(submissions);
    return NextResponse.json({
      count: records.length,
      submissionCount: submissions.length,
      records,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
