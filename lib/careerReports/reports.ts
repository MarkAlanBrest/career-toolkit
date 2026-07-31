import type { AccscFlag, CareerRecord, ReportResult, ReportType } from './types';
import { rulesForReport } from './accreditationRules';

function recordMatchesPac(r: CareerRecord): boolean {
  return r.eventType.includes('pac') || /pac|advisory committee/i.test(r.notes) || /pac/i.test(r.sourceFile);
}

function recordMatchesFair(r: CareerRecord): boolean {
  return r.eventType.includes('career_fair') || /career fair/i.test(r.notes) || /fair/i.test(r.sourceFile);
}

function recordMatchesHire(r: CareerRecord): boolean {
  return r.recordType === 'hire' || r.employmentStatus === 'employed_in_field' || /report-a-hire/i.test(r.raw.formId || '');
}

export function runReport(
  reportType: ReportType,
  records: CareerRecord[],
  flags: AccscFlag[],
): ReportResult {
  switch (reportType) {
    case 'pac_attendees':
      const pac = records.filter(recordMatchesPac);
      return {
        reportType,
        title: 'PAC Meeting Attendees / Registrations',
        columns: ['Employer', 'Contact', 'Email', 'Program Interest', 'Event Date', 'Source'],
        rows: pac.map(r => ({
          Employer: r.employerName,
          Contact: r.employerContact,
          Email: r.employerEmail,
          'Program Interest': r.program,
          'Event Date': r.eventDate,
          Source: r.sourceFile,
        })),
        summary: `${pac.length} PAC-related record(s) found across uploaded files and portal data.`,
        accreditationRules: rulesForReport(reportType),
      };

    case 'career_fair_registrations':
      const fairs = records.filter(recordMatchesFair);
      return {
        reportType,
        title: 'Career Fair Registrations',
        columns: ['Employer', 'Contact', 'Email', 'Positions', 'Source', 'Notes'],
        rows: fairs.map(r => ({
          Employer: r.employerName,
          Contact: r.employerContact,
          Email: r.employerEmail,
          Positions: r.jobDuties || r.positionTitle,
          Source: r.sourceFile,
          Notes: r.notes,
        })),
        summary: `${fairs.length} career fair registration(s) found.`,
        accreditationRules: rulesForReport(reportType),
      };

    case 'hires':
      const hires = records.filter(recordMatchesHire);
      return {
        reportType,
        title: 'Reported Hires',
        columns: ['Student', 'Program', 'Employer', 'Position', 'Start Date', 'Source'],
        rows: hires.map(r => ({
          Student: r.studentName,
          Program: r.program,
          Employer: r.employerName,
          Position: r.jobTitle || r.positionTitle,
          'Start Date': r.employmentStartDate,
          Source: r.sourceFile,
        })),
        summary: `${hires.length} hire record(s) found.`,
        accreditationRules: rulesForReport(reportType),
      };

    case 'employer_directory':
      const employers = new Map<string, CareerRecord>();
      for (const r of records) {
        const key = (r.employerName || r.employerEmail).toLowerCase();
        if (!key) continue;
        if (!employers.has(key)) employers.set(key, r);
      }
      return {
        reportType,
        title: 'Employer Directory',
        columns: ['Employer', 'Contact', 'Phone', 'Email', 'Address'],
        rows: Array.from(employers.values()).map(r => ({
          Employer: r.employerName,
          Contact: r.employerContact,
          Phone: r.employerPhone,
          Email: r.employerEmail,
          Address: r.employerAddress,
        })),
        summary: `${employers.size} unique employer(s) across all sources.`,
        accreditationRules: rulesForReport(reportType),
      };

    case 'accreditation_gaps':
      return {
        reportType,
        title: 'ACCSC Data Gaps & Compliance Flags',
        columns: ['Severity', 'Student', 'Field', 'Issue', 'Rule'],
        rows: flags.map(f => ({
          Severity: f.severity,
          Student: f.studentName,
          Field: f.field,
          Issue: f.message,
          Rule: f.rule,
        })),
        summary: `${flags.filter(f => f.severity === 'error').length} error(s), ${flags.filter(f => f.severity === 'warning').length} warning(s).`,
        accreditationRules: rulesForReport(reportType),
      };

    default:
      return {
        reportType,
        title: 'Report',
        columns: [],
        rows: [],
        summary: 'Unknown report type.',
        accreditationRules: rulesForReport(reportType),
      };
  }
}

export const REPORT_CATALOG: Array<{ id: ReportType; label: string; description: string }> = [
  { id: 'pac_attendees', label: 'PAC attendees', description: 'Employers who registered for PAC meetings' },
  { id: 'career_fair_registrations', label: 'Career fair registrations', description: 'Companies registered for career fairs' },
  { id: 'hires', label: 'Reported hires', description: 'Students hired by employers' },
  { id: 'employer_directory', label: 'Employer directory', description: 'Unique employers across all files' },
  { id: 'accreditation_gaps', label: 'ACCSC gaps', description: 'Missing fields and compliance warnings' },
];

export function answerLocally(question: string, records: CareerRecord[], flags: AccscFlag[]): string {
  const q = question.toLowerCase();
  if (/pac|advisory/.test(q)) {
    const n = records.filter(recordMatchesPac).length;
    return `Found ${n} PAC-related record(s). Run the "PAC attendees" report for the full list with employer names and contacts.`;
  }
  if (/career fair|fair/.test(q)) {
    const n = records.filter(recordMatchesFair).length;
    return `Found ${n} career fair registration(s). Run the "Career fair registrations" report for details.`;
  }
  if (/hire|hired|placement/.test(q)) {
    const n = records.filter(recordMatchesHire).length;
    return `Found ${n} hire record(s). Run the "Reported hires" report for student and employer details.`;
  }
  if (/gap|missing|audit|accsc|accreditation/.test(q)) {
    const errors = flags.filter(f => f.severity === 'error').length;
    const warnings = flags.filter(f => f.severity === 'warning').length;
    return `ACCSC flags: ${errors} error(s) and ${warnings} warning(s). Run the "ACCSC gaps" report for the full checklist.`;
  }
  if (/employer/.test(q)) {
    const employers = new Set(records.map(r => r.employerName.toLowerCase()).filter(Boolean));
    return `${employers.size} unique employer name(s) in the current workspace. Run "Employer directory" for contacts.`;
  }
  return `Workspace has ${records.length} normalized record(s) from your uploads. Try a report from the menu, or ask about PAC, hires, career fair, employers, or accreditation gaps.`;
}
