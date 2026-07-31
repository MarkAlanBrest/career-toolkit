import type {
  CohortCounts,
  CohortKey,
  EmploymentStatus,
  ReportConfig,
  StudentRow,
  UnavailableGradReason,
} from './types';

export function cohortKeyFromDate(date: Date): CohortKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function cohortLabel(key: CohortKey): string {
  const [y, m] = key.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = Number(m) - 1;
  return `${monthNames[idx] ?? m}-${y.slice(2)}`;
}

export function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setMonth(d.getMonth() - Math.round(months));
  return d;
}

/** ACCSC: end = report date minus (program length × 1.5 + 3 months); start = end minus 12 months. */
export function reportingPeriod(config: ReportConfig): { start: Date; end: Date } {
  const monthsBack = config.programLengthMonths * 1.5 + 3;
  const end = subtractMonths(config.reportDate, monthsBack);
  const start = subtractMonths(end, 12);
  return { start, end };
}

export function isInReportingPeriod(startDate: Date, period: { start: Date; end: Date }): boolean {
  const cohort = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const pStart = new Date(period.start.getFullYear(), period.start.getMonth(), 1);
  const pEnd = new Date(period.end.getFullYear(), period.end.getMonth(), 1);
  return cohort >= pStart && cohort <= pEnd;
}

export function maxGraduationDate(startDate: Date, programLengthMonths: number): Date {
  const months = programLengthMonths * 1.5;
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + Math.ceil(months));
  return d;
}

export function graduatedWithin150(row: StudentRow): boolean {
  if (!row.startDate || !row.graduationDate) return false;
  return row.graduationDate <= maxGraduationDate(row.startDate, row.programLengthMonths);
}

export function formatDate(d: Date | null): string {
  if (!d) return 'N/A';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = d.getFullYear();
  return `${mm}/${dd}/${yy}`;
}

export function formatMonthYear(d: Date | null): string {
  if (!d) return 'N/A';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${mm}/${d.getFullYear()}`;
}

type StudentClassification = {
  unavailableGraduation: boolean;
  withdrawnTerminated: boolean;
  graduate: boolean;
  furtherEducation: boolean;
  unavailableEmployment: boolean;
  employedInField: boolean;
  unrelated: boolean;
  unemployed: boolean;
  unknown: boolean;
  notes: string;
};

export function classifyStudent(row: StudentRow): StudentClassification {
  const result: StudentClassification = {
    unavailableGraduation: false,
    withdrawnTerminated: false,
    graduate: false,
    furtherEducation: false,
    unavailableEmployment: false,
    employedInField: false,
    unrelated: false,
    unemployed: false,
    unknown: false,
    notes: '',
  };

  if (row.unavailableGradReason) {
    result.unavailableGraduation = true;
    result.notes = `Unavailable for graduation: ${row.unavailableGradReason}`;
    return result;
  }

  const within150 = graduatedWithin150(row);

  if (row.graduationDate && within150) {
    result.graduate = true;
    classifyEmployment(row, result);
    return result;
  }

  if (row.graduationDate && !within150) {
    result.withdrawnTerminated = true;
    result.notes = 'Graduated beyond 150% of program length — counts as withdrawal on G&E Chart';
    return result;
  }

  if (row.withdrawalDate) {
    result.withdrawnTerminated = true;
    return result;
  }

  result.withdrawnTerminated = true;
  result.notes = 'No graduation within 150% — classified as withdrawn/terminated';
  return result;
}

function classifyEmployment(row: StudentRow, result: StudentClassification): void {
  const status: EmploymentStatus | '' = row.employmentStatus;
  switch (status) {
    case 'further_education':
      result.furtherEducation = true;
      break;
    case 'unavailable_for_employment':
      result.unavailableEmployment = true;
      break;
    case 'employed_in_field':
      result.employedInField = true;
      break;
    case 'unrelated':
      result.unrelated = true;
      break;
    case 'unemployed':
      result.unemployed = true;
      break;
    case 'unknown':
      result.unknown = true;
      break;
    default:
      result.unknown = true;
      result.notes = 'Graduate missing employment status';
  }
}

export function emptyCohortCounts(key: CohortKey): CohortCounts {
  return {
    cohortKey: key,
    cohortLabel: cohortLabel(key),
    started: 0,
    transferOut: 0,
    transferIn: 0,
    totalStarts: 0,
    unavailableGraduation: 0,
    availableGraduation: 0,
    withdrawnTerminated: 0,
    graduatesWithin150: 0,
    graduationRate: null,
    furtherEducation: 0,
    unavailableEmployment: 0,
    availableEmployment: 0,
    employedInField: 0,
    employmentRate: null,
    unrelatedOccupation: 0,
    unemployed: 0,
    unknown: 0,
  };
}

export function finalizeCohort(c: CohortCounts): CohortCounts {
  c.totalStarts = c.started - c.transferOut + c.transferIn;
  c.availableGraduation = c.totalStarts - c.unavailableGraduation;
  c.graduationRate =
    c.availableGraduation > 0 ? Math.round((c.graduatesWithin150 / c.availableGraduation) * 100) : null;
  const graduates = c.graduatesWithin150;
  c.availableEmployment = graduates - c.furtherEducation - c.unavailableEmployment;
  c.employmentRate =
    c.availableEmployment > 0 ? Math.round((c.employedInField / c.availableEmployment) * 100) : null;
  return c;
}

export function aggregateTotals(cohorts: CohortCounts[]): CohortCounts {
  const total = emptyCohortCounts('TOTAL');
  total.cohortLabel = 'TOTAL';
  for (const c of cohorts) {
    total.started += c.started;
    total.transferOut += c.transferOut;
    total.transferIn += c.transferIn;
    total.unavailableGraduation += c.unavailableGraduation;
    total.withdrawnTerminated += c.withdrawnTerminated;
    total.graduatesWithin150 += c.graduatesWithin150;
    total.furtherEducation += c.furtherEducation;
    total.unavailableEmployment += c.unavailableEmployment;
    total.employedInField += c.employedInField;
    total.unrelatedOccupation += c.unrelatedOccupation;
    total.unemployed += c.unemployed;
    total.unknown += c.unknown;
  }
  return finalizeCohort(total);
}

export function cohortKeysInPeriod(period: { start: Date; end: Date }): CohortKey[] {
  const keys: CohortKey[] = [];
  const cursor = new Date(period.start.getFullYear(), period.start.getMonth(), 1);
  const end = new Date(period.end.getFullYear(), period.end.getMonth(), 1);
  while (cursor <= end) {
    keys.push(cohortKeyFromDate(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  employed_in_field: 'Employed in Field',
  unrelated: 'Unrelated Occupation',
  unemployed: 'Unemployed',
  unknown: 'Unknown',
  further_education: 'Further Education',
  unavailable_for_employment: 'Unavailable for Employment',
};

export const UNAVAILABLE_GRAD_LABELS: Record<UnavailableGradReason, string> = {
  military: 'Military Deployment',
  medical: 'Medical Condition',
  death: 'Death',
  incarceration: 'Incarceration',
};
