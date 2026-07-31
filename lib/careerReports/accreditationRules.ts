import type { ReportType } from './types';

export type AccreditationRule = {
  id: string;
  title: string;
  citation: string;
  summary: string;
  sourceUrl: string;
  appliesTo: Array<ReportType | 'all' | 'questions'>;
};

export const ACCREDITATION_RULESET = {
  accreditor: 'Accrediting Commission of Career Schools and Colleges (ACCSC)',
  standardsEffectiveDate: 'July 1, 2026',
  annualReportYear: 2026,
  verifiedDate: 'July 31, 2026',
  standardsUrl: 'https://www.accsc.org/seeking-accreditation/the-standards-of-accreditation/',
  annualReportUrl: 'https://www.accsc.org/forms-and-reports/annual-report/',
  employmentVerificationUrl: 'https://www.accsc.org/training-and-resources/resources/employment-verification/',
} as const;

export const ACCREDITATION_RULES: AccreditationRule[] = [
  {
    id: 'ge-separate-charts',
    title: 'Separate G&E charts',
    citation: '2026 Annual Report Instructions — Graduation and Employment Chart',
    summary: 'Prepare a G&E Chart for each approved program and separate charts for differing normal program lengths, 100% distance education offerings, and qualifying satellite-location offerings.',
    sourceUrl: ACCREDITATION_RULESET.annualReportUrl,
    appliesTo: ['accreditation_gaps', 'questions'],
  },
  {
    id: 'ge-reporting-period',
    title: 'Cohort reporting period',
    citation: '2026 Annual Report Instructions — G&E Reporting Period',
    summary: 'The G&E cohort window depends on actual program length. ACCSC calculates the ending date by counting back 150% of program length plus three employment months from July 2026, then counts back 12 additional months for the beginning date.',
    sourceUrl: ACCREDITATION_RULESET.annualReportUrl,
    appliesTo: ['accreditation_gaps', 'questions'],
  },
  {
    id: 'ge-lines-5-15',
    title: 'Graduation and employment calculations',
    citation: '2026 Annual Report Instructions — G&E Lines 5–15',
    summary: 'Graduation rate is Line 9 divided by Line 7. Available for employment is Line 9 minus Lines 11 and 12. The official employment rate is Line 14 divided by Line 13.',
    sourceUrl: ACCREDITATION_RULESET.annualReportUrl,
    appliesTo: ['accreditation_gaps', 'hires', 'questions'],
  },
  {
    id: 'employment-classification',
    title: 'Employed-in-field classification',
    citation: 'ACCSC Standards Appendix VII — Guidelines for Employment Classification',
    summary: 'An employed-in-field classification must be reasonable, sustainable, paid, directly related to the program, aligned with a majority of its training objectives, and verifiable by the school and third parties.',
    sourceUrl: ACCREDITATION_RULESET.employmentVerificationUrl,
    appliesTo: ['hires', 'accreditation_gaps', 'questions'],
  },
  {
    id: 'employment-documentation',
    title: 'Employment documentation',
    citation: '2026 Annual Report Instructions — G&E Line 14; ACCSC Standards Appendix VII',
    summary: 'Each reported employed graduate needs supporting documentation for the position, employment date, employer, employer contact person, address, and phone, along with verification supporting the training-related classification.',
    sourceUrl: ACCREDITATION_RULESET.employmentVerificationUrl,
    appliesTo: ['hires', 'employer_directory', 'accreditation_gaps', 'questions'],
  },
  {
    id: 'employment-verification',
    title: 'Employment verification method',
    citation: 'ACCSC Standards Appendix VII — Written, Verbal, Self-Employment, and Career Advancement Verification',
    summary: 'Maintain the verification method and evidence. Verbal verification requires documented diligent efforts and staff attestations; self-employment requires written documentation and cannot use verbal verification.',
    sourceUrl: ACCREDITATION_RULESET.employmentVerificationUrl,
    appliesTo: ['hires', 'accreditation_gaps', 'questions'],
  },
  {
    id: 'source-documentation',
    title: 'Supporting records and human certification',
    citation: '2026 Annual Report Instructions — Submission Certification',
    summary: 'The school must retain documentation supporting submitted classifications and certify that Annual Report information is truthful, accurate, and prepared in good-faith compliance. Automated results require qualified human review before submission.',
    sourceUrl: ACCREDITATION_RULESET.annualReportUrl,
    appliesTo: ['all'],
  },
];

export function rulesForReport(reportType: ReportType): AccreditationRule[] {
  return ACCREDITATION_RULES.filter(rule => rule.appliesTo.includes('all') || rule.appliesTo.includes(reportType));
}

export function rulesForQuestion(question: string): AccreditationRule[] {
  const text = question.toLowerCase();
  let reportType: ReportType = 'accreditation_gaps';
  if (/hire|employ|placement|job/.test(text)) reportType = 'hires';
  else if (/employer|contact|directory/.test(text)) reportType = 'employer_directory';
  else if (/pac|advisory/.test(text)) reportType = 'pac_attendees';
  else if (/career fair/.test(text)) reportType = 'career_fair_registrations';

  const matched = ACCREDITATION_RULES.filter(rule =>
    rule.appliesTo.includes('all') || rule.appliesTo.includes('questions') || rule.appliesTo.includes(reportType)
  );
  return Array.from(new Map(matched.map(rule => [rule.id, rule])).values());
}

export function accreditationPromptContext(): string {
  return [
    `Mandatory accreditation authority: ${ACCREDITATION_RULESET.accreditor}.`,
    `Standards effective: ${ACCREDITATION_RULESET.standardsEffectiveDate}. Annual Report instructions: ${ACCREDITATION_RULESET.annualReportYear}.`,
    ...ACCREDITATION_RULES.map(rule => `- ${rule.citation}: ${rule.summary}`),
  ].join('\n');
}
