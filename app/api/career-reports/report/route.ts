import { NextRequest, NextResponse } from 'next/server';
import { evaluateAccscFlags } from '@/lib/careerReports/accscFlags';
import { runReport, REPORT_CATALOG } from '@/lib/careerReports/reports';
import type { CareerRecord, ReportType } from '@/lib/careerReports/types';

export async function GET() {
  return NextResponse.json({ reports: REPORT_CATALOG });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const reportType = body?.reportType as ReportType;
  if (!reportType) {
    return NextResponse.json({ error: 'reportType is required.' }, { status: 400 });
  }

  const records = (body.records || []) as CareerRecord[];
  const program = typeof body.program === 'string' ? body.program.trim() : '';
  const reportRecords = program ? records.filter(record => record.program === program) : records;
  const flags = body.flags || evaluateAccscFlags(reportRecords);
  const reportFlags = program
    ? flags.filter((flag: { recordId: string }) => reportRecords.some(record => record.id === flag.recordId))
    : flags;
  const result = runReport(reportType, reportRecords, reportFlags);

  return NextResponse.json({ result });
}
