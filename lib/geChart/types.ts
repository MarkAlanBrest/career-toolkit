export type UnavailableGradReason = 'military' | 'medical' | 'death' | 'incarceration';

export type EmploymentStatus =
  | 'employed_in_field'
  | 'unrelated'
  | 'unemployed'
  | 'unknown'
  | 'further_education'
  | 'unavailable_for_employment';

export type VerificationSource = 'graduate' | 'employer' | 'verbal' | '';

export type StudentRow = {
  rowNumber: number;
  studentName: string;
  program: string;
  programLengthMonths: number;
  startDate: Date | null;
  graduationDate: Date | null;
  withdrawalDate: Date | null;
  unavailableGradReason: UnavailableGradReason | '';
  transferOut: boolean;
  transferIn: boolean;
  employmentStatus: EmploymentStatus | '';
  employerName: string;
  employerAddress: string;
  employerContact: string;
  employerPhone: string;
  employerEmail: string;
  jobTitle: string;
  jobDuties: string;
  employmentStartDate: Date | null;
  verificationSource: VerificationSource;
};

export type ReportConfig = {
  reportDate: Date;
  schoolName: string;
  programTitle: string;
  programLengthMonths: number;
};

export type CohortKey = string; // YYYY-MM

export type CohortCounts = {
  cohortKey: CohortKey;
  cohortLabel: string;
  started: number;
  transferOut: number;
  transferIn: number;
  totalStarts: number;
  unavailableGraduation: number;
  availableGraduation: number;
  withdrawnTerminated: number;
  graduatesWithin150: number;
  graduationRate: number | null;
  furtherEducation: number;
  unavailableEmployment: number;
  availableEmployment: number;
  employedInField: number;
  employmentRate: number | null;
  unrelatedOccupation: number;
  unemployed: number;
  unknown: number;
};

export type GeChartReport = {
  config: ReportConfig;
  reportingPeriodStart: Date;
  reportingPeriodEnd: Date;
  cohorts: CohortCounts[];
  totals: CohortCounts;
  graduationSummary: GraduationSummaryRow[];
  employmentSummary: EmploymentSummaryRow[];
  gaps: GapIssue[];
  studentsInScope: number;
  studentsOutOfScope: number;
};

export type GraduationSummaryRow = {
  studentName: string;
  programStart: string;
  graduationDate: string;
  withdrawalDate: string;
  classification: string;
  notes: string;
};

export type EmploymentSummaryRow = {
  studentName: string;
  programStart: string;
  employer: string;
  contact: string;
  employmentStart: string;
  jobTitle: string;
  jobDuties: string;
  verificationSource: string;
  gaps: string[];
};

export type GapIssue = {
  rowNumber: number;
  studentName: string;
  field: string;
  message: string;
};
