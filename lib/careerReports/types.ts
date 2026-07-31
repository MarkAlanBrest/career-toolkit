export type RecordType = 'student' | 'employer' | 'hire' | 'event' | 'unknown';

export type ParsedTable = {
  sheetName: string;
  headers: string[];
  rows: string[][];
};

export type ParsedFile = {
  id: string;
  filename: string;
  mimeType: string;
  kind: 'spreadsheet' | 'document' | 'text';
  tables: ParsedTable[];
  textPreview: string;
  parseWarning?: string;
};

export type CareerRecord = {
  id: string;
  sourceFile: string;
  sourceRow: number;
  recordType: RecordType;
  studentName: string;
  employerName: string;
  program: string;
  programLengthMonths: number;
  startDate: string;
  graduationDate: string;
  withdrawalDate: string;
  eventType: string;
  eventDate: string;
  positionTitle: string;
  employmentStartDate: string;
  jobTitle: string;
  jobDuties: string;
  employerContact: string;
  employerPhone: string;
  employerEmail: string;
  employerAddress: string;
  employmentStatus: string;
  verificationSource: string;
  notes: string;
  raw: Record<string, string>;
};

export type AccscFlag = {
  severity: 'error' | 'warning' | 'info';
  recordId: string;
  studentName: string;
  field: string;
  message: string;
  rule: string;
};

export type ReportType =
  | 'pac_attendees'
  | 'career_fair_registrations'
  | 'hires'
  | 'employer_directory'
  | 'accreditation_gaps'
  | 'ge_chart_summary';

export type ReportResult = {
  reportType: ReportType;
  title: string;
  columns: string[];
  rows: Record<string, string>[];
  summary: string;
};

export type WorkspaceSnapshot = {
  files: ParsedFile[];
  records: CareerRecord[];
  flags: AccscFlag[];
};
