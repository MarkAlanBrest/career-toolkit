import type { AccscFlag, CareerRecord } from './types';

const EMPLOYMENT_DOC_FIELDS: Array<{ field: keyof CareerRecord; label: string; rule: string }> = [
  { field: 'employerName', label: 'Employer name', rule: 'ACCSC Appendix VII — place of employment' },
  { field: 'employerAddress', label: 'Employer address', rule: 'ACCSC Appendix VII — employer address' },
  { field: 'employerContact', label: 'Employer contact person', rule: 'ACCSC Appendix VII — supervisor contact' },
  { field: 'employerPhone', label: 'Employer phone', rule: 'ACCSC G&E Line 14 — employer phone' },
  { field: 'jobTitle', label: 'Job title', rule: 'ACCSC Appendix VII — descriptive job title' },
  { field: 'jobDuties', label: 'Job duties', rule: 'ACCSC Appendix VII — duties if title insufficient' },
  { field: 'employmentStartDate', label: 'Employment start date', rule: 'ACCSC G&E Line 14 — date of initial employment' },
  { field: 'verificationSource', label: 'Verification source', rule: 'ACCSC — employer or graduate verification' },
];

function isGraduateRecord(r: CareerRecord): boolean {
  return r.recordType === 'student' || r.recordType === 'hire' || Boolean(r.graduationDate);
}

function isEmployedInField(r: CareerRecord): boolean {
  const s = r.employmentStatus.toLowerCase();
  return s === 'employed_in_field' || r.recordType === 'hire';
}

export function evaluateAccscFlags(records: CareerRecord[]): AccscFlag[] {
  const flags: AccscFlag[] = [];

  for (const record of records) {
    if (isGraduateRecord(record) && record.graduationDate && !record.employmentStatus && record.recordType !== 'hire') {
      flags.push({
        severity: 'warning',
        recordId: record.id,
        studentName: record.studentName || record.employerName || 'Unknown',
        field: 'employmentStatus',
        message: 'Graduate has no employment classification for G&E Chart.',
        rule: 'ACCSC G&E — Lines 11–18',
      });
    }

    if (isEmployedInField(record)) {
      for (const { field, label, rule } of EMPLOYMENT_DOC_FIELDS) {
        const value = record[field];
        if (typeof value === 'string' && !value.trim()) {
          flags.push({
            severity: field === 'jobDuties' ? 'warning' : 'error',
            recordId: record.id,
            studentName: record.studentName || record.employerName,
            field,
            message: `Missing ${label} — required for audit backup.`,
            rule,
          });
        }
      }

      if (record.graduationDate && record.employmentStartDate) {
        const grad = new Date(record.graduationDate);
        const emp = new Date(record.employmentStartDate);
        if (!Number.isNaN(grad.getTime()) && !Number.isNaN(emp.getTime()) && emp < grad) {
          flags.push({
            severity: 'warning',
            recordId: record.id,
            studentName: record.studentName,
            field: 'employmentStartDate',
            message: 'Employment start is before graduation — needs Career Advancement documentation.',
            rule: 'ACCSC Appendix VII — Career Advancement',
          });
        }
      }
    }

    if (record.recordType === 'student' && record.graduationDate && !record.program) {
      flags.push({
        severity: 'warning',
        recordId: record.id,
        studentName: record.studentName,
        field: 'program',
        message: 'Graduate missing program name for G&E Chart.',
        rule: 'ACCSC G&E Chart',
      });
    }

    if (record.recordType === 'student' && !record.startDate) {
      flags.push({
        severity: 'error',
        recordId: record.id,
        studentName: record.studentName,
        field: 'startDate',
        message: 'Student record missing program start date (cohort).',
        rule: 'ACCSC G&E — Class Start Date',
      });
    }

    if (record.recordType === 'student' && !record.programLengthMonths) {
      flags.push({
        severity: 'error',
        recordId: record.id,
        studentName: record.studentName,
        field: 'programLengthMonths',
        message: 'Student record is missing actual program length in months, which is required to determine the G&E cohort reporting period.',
        rule: '2026 ACCSC Annual Report Instructions — G&E Reporting Period',
      });
    }
  }

  return flags;
}
