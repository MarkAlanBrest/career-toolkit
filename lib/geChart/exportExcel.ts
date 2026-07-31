import * as XLSX from 'xlsx';
import { cohortLabel, formatDate } from './accscRules';
import type { GeChartReport } from './types';

export function exportReportWorkbook(report: GeChartReport): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const { config, cohorts, totals } = report;

  const geRows: unknown[][] = [
    ['Graduation and Employment Chart'],
    ['School', config.schoolName || ''],
    ['Program', config.programTitle],
    ['Report Date', formatDate(config.reportDate)],
    ['Program Length (Months)', config.programLengthMonths],
    ['Reporting Period Start', formatDate(report.reportingPeriodStart)],
    ['Reporting Period End', formatDate(report.reportingPeriodEnd)],
    [],
    ['Line', 'Description', ...cohorts.map((c) => c.cohortLabel), 'TOTAL'],
    ['1', 'Class Start Date', ...cohorts.map((c) => c.cohortLabel), ''],
    ['2', 'Number Started', ...cohorts.map((c) => c.started), totals.started],
    ['3', 'Transfers to Another Program', ...cohorts.map((c) => c.transferOut), totals.transferOut],
    ['4', 'Transfers from Another Program', ...cohorts.map((c) => c.transferIn), totals.transferIn],
    ['5', 'Total Starts +/- Transfers', ...cohorts.map((c) => c.totalStarts), totals.totalStarts],
    ['6', 'Unavailable for Graduation', ...cohorts.map((c) => c.unavailableGraduation), totals.unavailableGraduation],
    ['7', 'Available for Graduation', ...cohorts.map((c) => c.availableGraduation), totals.availableGraduation],
    ['8', 'Withdrawn/Terminated', ...cohorts.map((c) => c.withdrawnTerminated), totals.withdrawnTerminated],
    ['9', 'Graduates within 150%', ...cohorts.map((c) => c.graduatesWithin150), totals.graduatesWithin150],
    ['10', 'GRADUATION RATE %', ...cohorts.map((c) => c.graduationRate ?? ''), totals.graduationRate ?? ''],
    ['11', 'Further Education', ...cohorts.map((c) => c.furtherEducation), totals.furtherEducation],
    ['12', 'Unavailable for Employment', ...cohorts.map((c) => c.unavailableEmployment), totals.unavailableEmployment],
    ['13', 'Available for Employment', ...cohorts.map((c) => c.availableEmployment), totals.availableEmployment],
    ['14', 'Employed in Field', ...cohorts.map((c) => c.employedInField), totals.employedInField],
    ['15', 'EMPLOYMENT RATE %', ...cohorts.map((c) => c.employmentRate ?? ''), totals.employmentRate ?? ''],
    ['16', 'Unrelated Occupations', ...cohorts.map((c) => c.unrelatedOccupation), totals.unrelatedOccupation],
    ['17', 'Unemployed', ...cohorts.map((c) => c.unemployed), totals.unemployed],
    ['18', 'Unknown', ...cohorts.map((c) => c.unknown), totals.unknown],
  ];

  const geSheet = XLSX.utils.aoa_to_sheet(geRows);
  XLSX.utils.book_append_sheet(wb, geSheet, 'G&E Chart');

  const gradSheet = XLSX.utils.json_to_sheet(
    report.graduationSummary.map((r) => ({
      'Student Name': r.studentName,
      'Program Start': r.programStart,
      'Graduation Date': r.graduationDate,
      'Withdrawal Date': r.withdrawalDate,
      Classification: r.classification,
      Notes: r.notes,
    }))
  );
  XLSX.utils.book_append_sheet(wb, gradSheet, 'Graduation Summary');

  const empSheet = XLSX.utils.json_to_sheet(
    report.employmentSummary.map((r) => ({
      'Student Name': r.studentName,
      'Program Start': r.programStart,
      Employer: r.employer,
      Contact: r.contact,
      'Employment Start': r.employmentStart,
      'Job Title': r.jobTitle,
      'Job Duties': r.jobDuties,
      'Verification Source': r.verificationSource,
      'Missing Fields': r.gaps.join(', '),
    }))
  );
  XLSX.utils.book_append_sheet(wb, empSheet, 'Employment Summary');

  const gapSheet = XLSX.utils.json_to_sheet(
    report.gaps.map((g) => ({
      Row: g.rowNumber,
      'Student Name': g.studentName,
      Field: g.field,
      Issue: g.message,
    }))
  );
  XLSX.utils.book_append_sheet(wb, gapSheet, 'Data Gaps');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

export function downloadBuffer(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
