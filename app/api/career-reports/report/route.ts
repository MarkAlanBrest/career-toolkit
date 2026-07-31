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
  const flags = body.flags || evaluateAccscFlags(records);
  const result = runReport(reportType, records, flags);

  return NextResponse.json({ result });
}
