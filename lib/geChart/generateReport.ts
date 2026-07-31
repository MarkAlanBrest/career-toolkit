import {
  classifyStudent,
  cohortKeyFromDate,
  cohortKeysInPeriod,
  emptyCohortCounts,
  finalizeCohort,
  aggregateTotals,
  formatDate,
  formatMonthYear,
  isInReportingPeriod,
  reportingPeriod,
  EMPLOYMENT_STATUS_LABELS,
  UNAVAILABLE_GRAD_LABELS,
  graduatedWithin150,
} from './accscRules';
import type {
  EmploymentSummaryRow,
  GapIssue,
  GeChartReport,
  GraduationSummaryRow,
  ReportConfig,
  StudentRow,
} from './types';

function employmentGaps(row: StudentRow): string[] {
  const gaps: string[] = [];
  if (!row.employerName) gaps.push('Employer name');
  if (!row.employerAddress) gaps.push('Employer address');
  if (!row.employerContact) gaps.push('Employer contact');
  if (!row.employerPhone && !row.employerEmail) gaps.push('Employer phone or email');
  if (!row.jobTitle) gaps.push('Job title');
  if (!row.jobDuties) gaps.push('Job duties');
  if (!row.employmentStartDate) gaps.push('Employment start date');
  if (!row.verificationSource) gaps.push('Verification source');
  return gaps;
}

export function generateGeChartReport(
  students: StudentRow[],
  config: ReportConfig
): GeChartReport {
  const period = reportingPeriod(config);
  const cohortMap = new Map(
    cohortKeysInPeriod(period).map((key) => [key, emptyCohortCounts(key)])
  );

  const graduationSummary: GraduationSummaryRow[] = [];
  const employmentSummary: EmploymentSummaryRow[] = [];
  const gaps: GapIssue[] = [];
  let studentsInScope = 0;
  let studentsOutOfScope = 0;

  const programStudents = students.filter(
    (s) =>
      s.program.toLowerCase() === config.programTitle.toLowerCase() ||
      config.programTitle === '' ||
      s.program === config.programTitle
  );

  const length = config.programLengthMonths || programStudents[0]?.programLengthMonths || 12;

  for (const row of programStudents) {
    if (!row.startDate) continue;

    if (!isInReportingPeriod(row.startDate, period)) {
      studentsOutOfScope += 1;
      continue;
    }

    studentsInScope += 1;
    const key = cohortKeyFromDate(row.startDate);
    if (!cohortMap.has(key)) {
      cohortMap.set(key, emptyCohortCounts(key));
    }
    const cohort = cohortMap.get(key)!;

    cohort.started += 1;
    if (row.transferOut) cohort.transferOut += 1;
    if (row.transferIn) cohort.transferIn += 1;

    const classification = classifyStudent({ ...row, programLengthMonths: length });

    if (classification.unavailableGraduation) {
      cohort.unavailableGraduation += 1;
      graduationSummary.push({
        studentName: row.studentName,
        programStart: formatMonthYear(row.startDate),
        graduationDate: formatDate(row.graduationDate),
        withdrawalDate: formatDate(row.withdrawalDate),
        classification: 'Unavailable for Graduation',
        notes: classification.notes || UNAVAILABLE_GRAD_LABELS[row.unavailableGradReason as keyof typeof UNAVAILABLE_GRAD_LABELS] || '',
      });
      continue;
    }

    if (classification.withdrawnTerminated) {
      cohort.withdrawnTerminated += 1;
      graduationSummary.push({
        studentName: row.studentName,
        programStart: formatMonthYear(row.startDate),
        graduationDate: formatDate(row.graduationDate),
        withdrawalDate: formatDate(row.withdrawalDate),
        classification: 'Withdrawn / Terminated',
        notes: classification.notes,
      });
      continue;
    }

    if (classification.graduate) {
      cohort.graduatesWithin150 += 1;
      graduationSummary.push({
        studentName: row.studentName,
        programStart: formatMonthYear(row.startDate),
        graduationDate: formatDate(row.graduationDate),
        withdrawalDate: 'N/A',
        classification: 'Graduate (within 150%)',
        notes: '',
      });

      if (classification.furtherEducation) {
        cohort.furtherEducation += 1;
      } else if (classification.unavailableEmployment) {
        cohort.unavailableEmployment += 1;
      } else if (classification.employedInField) {
        cohort.employedInField += 1;
        const rowGaps = employmentGaps(row);
        employmentSummary.push({
          studentName: row.studentName,
          programStart: formatMonthYear(row.startDate),
          employer: row.employerName,
          contact: [row.employerContact, row.employerPhone, row.employerEmail].filter(Boolean).join(' · '),
          employmentStart: formatDate(row.employmentStartDate),
          jobTitle: row.jobTitle,
          jobDuties: row.jobDuties,
          verificationSource: row.verificationSource,
          gaps: rowGaps,
        });
        for (const g of rowGaps) {
          gaps.push({ rowNumber: row.rowNumber, studentName: row.studentName, field: g, message: `Missing ${g}` });
        }
      } else if (classification.unrelated) {
        cohort.unrelatedOccupation += 1;
      } else if (classification.unemployed) {
        cohort.unemployed += 1;
      } else {
        cohort.unknown += 1;
      }

      if (row.employmentStatus && !classification.employedInField) {
        if (!row.employmentStatus) {
          gaps.push({
            rowNumber: row.rowNumber,
            studentName: row.studentName,
            field: 'Employment Status',
            message: 'Graduate missing employment classification',
          });
        }
      }
    }
  }

  const cohorts = Array.from(cohortMap.values())
    .filter((c) => c.started > 0)
    .map((c) => finalizeCohort(c));

  const totals = aggregateTotals(cohorts);

  return {
    config: { ...config, programLengthMonths: length },
    reportingPeriodStart: period.start,
    reportingPeriodEnd: period.end,
    cohorts,
    totals,
    graduationSummary,
    employmentSummary,
    gaps,
    studentsInScope,
    studentsOutOfScope,
  };
}

export function listPrograms(students: StudentRow[]): string[] {
  const programs = new Set<string>();
  for (const s of students) {
    if (s.program) programs.add(s.program);
  }
  return Array.from(programs).sort();
}

export function programLengthFromStudents(students: StudentRow[], program: string): number {
  for (const s of students) {
    if (s.program === program && s.programLengthMonths > 0) return s.programLengthMonths;
  }
  return 12;
}
