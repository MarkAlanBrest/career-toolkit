import * as XLSX from 'xlsx';
import type { EmploymentStatus, StudentRow, UnavailableGradReason, VerificationSource } from './types';

const HEADER_MAP: Record<string, keyof StudentRow | 'skip'> = {
  'student name': 'studentName',
  'program': 'program',
  'program length (months)': 'programLengthMonths',
  'program length months': 'programLengthMonths',
  'start date': 'startDate',
  'graduation date': 'graduationDate',
  'withdrawal date': 'withdrawalDate',
  'unavailable for graduation reason': 'unavailableGradReason',
  'transfer out': 'transferOut',
  'transfer in': 'transferIn',
  'employment status': 'employmentStatus',
  'employer name': 'employerName',
  'employer address': 'employerAddress',
  'employer contact': 'employerContact',
  'employer phone': 'employerPhone',
  'employer email': 'employerEmail',
  'job title': 'jobTitle',
  'job duties': 'jobDuties',
  'employment start date': 'employmentStartDate',
  'verification source': 'verificationSource',
};

function normalizeHeader(h: string): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseExcelDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const str = String(value).trim();
  if (!str) return null;
  const us = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (us) {
    const y = Number(us[3].length === 2 ? `20${us[3]}` : us[3]);
    return new Date(y, Number(us[1]) - 1, Number(us[2]));
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseBool(value: unknown): boolean {
  const s = String(value ?? '').trim().toLowerCase();
  return s === 'y' || s === 'yes' || s === 'true' || s === '1';
}

function parseUnavailableReason(value: unknown): UnavailableGradReason | '' {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('military')) return 'military';
  if (s.includes('medical')) return 'medical';
  if (s.includes('death')) return 'death';
  if (s.includes('incarcer')) return 'incarceration';
  return '';
}

function parseEmploymentStatus(value: unknown): EmploymentStatus | '' {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('employed') && s.includes('field')) return 'employed_in_field';
  if (s.includes('unrelated')) return 'unrelated';
  if (s.includes('unemployed')) return 'unemployed';
  if (s.includes('unknown')) return 'unknown';
  if (s.includes('further')) return 'further_education';
  if (s.includes('unavailable')) return 'unavailable_for_employment';
  return '';
}

function parseVerification(value: unknown): VerificationSource {
  const s = String(value ?? '').trim().toLowerCase();
  if (s.includes('employer')) return 'employer';
  if (s.includes('graduate')) return 'graduate';
  if (s.includes('verbal')) return 'verbal';
  return '';
}

export type ParseResult = {
  rows: StudentRow[];
  errors: string[];
};

export function parseStudentExcel(buffer: ArrayBuffer): ParseResult {
  const errors: string[] = [];
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: ['No worksheet found in file.'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (raw.length === 0) {
    return { rows: [], errors: ['No data rows found. Use the NCST template or matching column headers.'] };
  }

  const firstKeys = Object.keys(raw[0]);
  const columnMap: Record<string, keyof StudentRow> = {};
  for (const key of firstKeys) {
    const mapped = HEADER_MAP[normalizeHeader(key)];
    if (mapped && mapped !== 'skip') {
      columnMap[key] = mapped as keyof StudentRow;
    }
  }

  const required = ['studentName', 'program', 'startDate'] as const;
  const mappedFields = new Set(Object.values(columnMap));
  for (const req of required) {
    if (!mappedFields.has(req)) {
      errors.push(`Missing required column: ${req}`);
    }
  }

  const rows: StudentRow[] = [];

  raw.forEach((record, index) => {
    const rowNumber = index + 2;
    const studentName = String(
      record[Object.keys(columnMap).find((k) => columnMap[k] === 'studentName') ?? ''] ?? ''
    ).trim();
    if (!studentName) return;

    const get = (field: keyof StudentRow): unknown => {
      const key = Object.keys(columnMap).find((k) => columnMap[k] === field);
      return key ? record[key] : '';
    };

    const programLengthRaw = get('programLengthMonths');
    const programLengthMonths = Number(programLengthRaw) || 0;

    const row: StudentRow = {
      rowNumber,
      studentName,
      program: String(get('program') ?? '').trim(),
      programLengthMonths: programLengthMonths,
      startDate: parseExcelDate(get('startDate')),
      graduationDate: parseExcelDate(get('graduationDate')),
      withdrawalDate: parseExcelDate(get('withdrawalDate')),
      unavailableGradReason: parseUnavailableReason(get('unavailableGradReason')),
      transferOut: parseBool(get('transferOut')),
      transferIn: parseBool(get('transferIn')),
      employmentStatus: parseEmploymentStatus(get('employmentStatus')),
      employerName: String(get('employerName') ?? '').trim(),
      employerAddress: String(get('employerAddress') ?? '').trim(),
      employerContact: String(get('employerContact') ?? '').trim(),
      employerPhone: String(get('employerPhone') ?? '').trim(),
      employerEmail: String(get('employerEmail') ?? '').trim(),
      jobTitle: String(get('jobTitle') ?? '').trim(),
      jobDuties: String(get('jobDuties') ?? '').trim(),
      employmentStartDate: parseExcelDate(get('employmentStartDate')),
      verificationSource: parseVerification(get('verificationSource')),
    };

    if (!row.startDate) {
      errors.push(`Row ${rowNumber}: invalid or missing Start Date for ${studentName}`);
    }
    if (!row.programLengthMonths) {
      errors.push(`Row ${rowNumber}: missing Program Length (Months) for ${studentName}`);
    }

    rows.push(row);
  });

  return { rows, errors };
}

export const TEMPLATE_HEADERS = [
  'Student Name',
  'Program',
  'Program Length (Months)',
  'Start Date',
  'Graduation Date',
  'Withdrawal Date',
  'Unavailable for Graduation Reason',
  'Transfer Out',
  'Transfer In',
  'Employment Status',
  'Employer Name',
  'Employer Address',
  'Employer Contact',
  'Employer Phone',
  'Employer Email',
  'Job Title',
  'Job Duties',
  'Employment Start Date',
  'Verification Source',
];

export const TEMPLATE_SAMPLE_ROW = [
  'Jim Brown',
  'Welding Technology',
  '12',
  '10/01/2013',
  '10/01/2014',
  '',
  '',
  'N',
  'N',
  'Employed in Field',
  'BeSmart Welders',
  '2527 Wilson Blvd, New Castle PA',
  'Joe Davola',
  '724-555-2525',
  'jdavola@example.com',
  'Welder',
  'Identify faults; fitting, burning, and welding',
  '11/25/2014',
  'Employer',
];

export function buildTemplateWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const instructions = [
    ['NCST Career Services — G&E Chart Data Template'],
    [''],
    ['Employment Status options: Employed in Field | Unrelated | Unemployed | Unknown | Further Education | Unavailable for Employment'],
    ['Unavailable for Graduation Reason: military | medical | death | incarceration'],
    ['Transfer Out / Transfer In: Y or N'],
    ['Verification Source: Graduate | Employer | Verbal'],
    [''],
  ];
  const dataSheet = XLSX.utils.aoa_to_sheet([
    ...instructions,
    TEMPLATE_HEADERS,
    TEMPLATE_SAMPLE_ROW,
  ]);
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Students');
  return wb;
}

export function templateToArrayBuffer(): ArrayBuffer {
  const wb = buildTemplateWorkbook();
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return out;
}
