import type { CareerRecord, ParsedTable } from './types';

type FieldKey = keyof Omit<CareerRecord, 'id' | 'sourceFile' | 'sourceRow' | 'recordType' | 'raw'>;

const COLUMN_PATTERNS: Array<{ field: FieldKey; patterns: RegExp[] }> = [
  { field: 'studentName', patterns: [/student\s*name/i, /candidate/i, /graduate/i, /^name$/i, /hired\s*candidate/i] },
  { field: 'employerName', patterns: [/employer/i, /company/i, /organization/i, /place\s*of\s*employment/i] },
  { field: 'program', patterns: [/program/i, /trade/i, /major/i, /ncst\s*program/i] },
  { field: 'programLengthMonths', patterns: [/program\s*length/i, /length\s*\(months\)/i] },
  { field: 'startDate', patterns: [/start\s*date/i, /program\s*start/i, /class\s*start/i, /enroll/i] },
  { field: 'graduationDate', patterns: [/grad(uation)?\s*date/i, /completed/i, /finish/i] },
  { field: 'withdrawalDate', patterns: [/withdraw/i, /termination/i, /drop/i] },
  { field: 'eventType', patterns: [/event\s*type/i, /form\s*type/i, /registration/i] },
  { field: 'eventDate', patterns: [/meeting\s*date/i, /event\s*date/i, /fair\s*date/i, /preferred\s*meeting/i] },
  { field: 'positionTitle', patterns: [/position/i, /job\s*title/i, /role/i] },
  { field: 'employmentStartDate', patterns: [/employment\s*start/i, /hire\s*date/i, /date\s*employed/i] },
  { field: 'jobTitle', patterns: [/job\s*title/i, /^title$/i, /descriptive\s*job/i] },
  { field: 'jobDuties', patterns: [/duties/i, /responsibilit/i, /job\s*description/i, /work\s*summary/i] },
  { field: 'employerContact', patterns: [/contact\s*name/i, /supervisor/i, /contact\s*person/i] },
  { field: 'employerPhone', patterns: [/phone/i, /tel/i, /dial/i] },
  { field: 'employerEmail', patterns: [/email/i, /e-mail/i] },
  { field: 'employerAddress', patterns: [/address/i, /mailing/i, /location/i, /work\s*location/i] },
  { field: 'employmentStatus', patterns: [/employment\s*status/i, /employed/i, /placement/i] },
  { field: 'verificationSource', patterns: [/verification/i, /verified\s*by/i, /source/i] },
  { field: 'notes', patterns: [/notes/i, /comments/i, /details/i, /additional/i] },
];

export function inferColumnMap(headers: string[]): Record<string, FieldKey> {
  const map: Record<string, FieldKey> = {};
  for (const header of headers) {
    const h = header.trim();
    if (!h) continue;
    for (const { field, patterns } of COLUMN_PATTERNS) {
      if (patterns.some(p => p.test(h))) {
        if (!map[h]) map[h] = field;
        break;
      }
    }
  }
  return map;
}

function detectRecordType(row: Pick<CareerRecord, 'studentName' | 'graduationDate' | 'startDate' | 'employerName' | 'jobTitle' | 'raw'>, filename: string): CareerRecord['recordType'] {
  const blob = `${filename} ${Object.values(row).join(' ')}`.toLowerCase();
  if (/pac|advisory|committee/.test(blob)) return 'event';
  if (/career\s*fair/.test(blob)) return 'event';
  if (/report\s*a\s*hire|hired|hire/.test(blob)) return 'hire';
  if (/employer\s*regist|company/.test(blob) && !row.studentName) return 'employer';
  if (row.studentName || row.graduationDate || row.startDate) return 'student';
  if (row.employerName && row.jobTitle) return 'hire';
  return 'unknown';
}

function parseEmploymentStatus(value: string): string {
  const s = value.toLowerCase();
  if (s.includes('employed') && s.includes('field')) return 'employed_in_field';
  if (s.includes('unrelated')) return 'unrelated';
  if (s.includes('unemployed')) return 'unemployed';
  if (s.includes('further')) return 'further_education';
  if (s.includes('unavailable')) return 'unavailable_for_employment';
  if (s.includes('unknown')) return 'unknown';
  return value;
}

export function tableToRecords(
  table: ParsedTable,
  sourceFile: string,
  columnMap?: Record<string, FieldKey>
): CareerRecord[] {
  const map = columnMap || inferColumnMap(table.headers);
  const records: CareerRecord[] = [];

  table.rows.forEach((row, rowIndex) => {
    const raw: Record<string, string> = {};
    table.headers.forEach((header, i) => {
      if (header) raw[header] = row[i] || '';
    });

    const empty: CareerRecord = {
      id: `${sourceFile}-${table.sheetName}-${rowIndex}`,
      sourceFile,
      sourceRow: rowIndex + 2,
      recordType: 'unknown',
      studentName: '',
      employerName: '',
      program: '',
      programLengthMonths: 0,
      startDate: '',
      graduationDate: '',
      withdrawalDate: '',
      eventType: '',
      eventDate: '',
      positionTitle: '',
      employmentStartDate: '',
      jobTitle: '',
      jobDuties: '',
      employerContact: '',
      employerPhone: '',
      employerEmail: '',
      employerAddress: '',
      employmentStatus: '',
      verificationSource: '',
      notes: '',
      raw,
    };

    for (const [header, field] of Object.entries(map)) {
      const val = raw[header] || '';
      if (field === 'programLengthMonths') {
        empty.programLengthMonths = Number(val) || 0;
      } else if (field === 'employmentStatus') {
        empty.employmentStatus = parseEmploymentStatus(val);
      } else if (field === 'studentName') empty.studentName = val;
      else if (field === 'employerName') empty.employerName = val;
      else if (field === 'program') empty.program = val;
      else if (field === 'startDate') empty.startDate = val;
      else if (field === 'graduationDate') empty.graduationDate = val;
      else if (field === 'withdrawalDate') empty.withdrawalDate = val;
      else if (field === 'eventType') empty.eventType = val;
      else if (field === 'eventDate') empty.eventDate = val;
      else if (field === 'positionTitle') empty.positionTitle = val;
      else if (field === 'employmentStartDate') empty.employmentStartDate = val;
      else if (field === 'jobTitle') empty.jobTitle = val;
      else if (field === 'jobDuties') empty.jobDuties = val;
      else if (field === 'employerContact') empty.employerContact = val;
      else if (field === 'employerPhone') empty.employerPhone = val;
      else if (field === 'employerEmail') empty.employerEmail = val;
      else if (field === 'employerAddress') empty.employerAddress = val;
      else if (field === 'verificationSource') empty.verificationSource = val;
      else if (field === 'notes') empty.notes = val;
    }

    empty.recordType = detectRecordType(empty, sourceFile);
    if (empty.recordType === 'event' && !empty.eventType) {
      empty.eventType = /pac|advisory/i.test(sourceFile) ? 'pac_meeting' : /fair/i.test(sourceFile) ? 'career_fair' : 'event';
    }

    if (Object.values(empty.raw).some(v => v) || empty.studentName || empty.employerName) {
      records.push(empty);
    }
  });

  return records;
}

export function mergeColumnMaps(maps: Record<string, FieldKey>[]): Record<string, FieldKey> {
  const merged: Record<string, FieldKey> = {};
  for (const map of maps) Object.assign(merged, map);
  return merged;
}
