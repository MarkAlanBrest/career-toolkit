import type { SubmissionRecord } from '@/lib/employerPortalUsers';
import type { CareerRecord } from './types';

const FORM_EVENT_MAP: Record<string, string> = {
  'pac-meeting-registration': 'pac_meeting',
  'career-fair-registration': 'career_fair',
  'report-a-hire': 'hire',
  'employer-registration': 'employer_registration',
  'request-applicants': 'applicant_request',
  'submit-job-opening': 'job_posting',
};

export function submissionToRecords(submissions: SubmissionRecord[]): CareerRecord[] {
  return submissions.map(sub => {
    const v = sub.values;
    const eventType = FORM_EVENT_MAP[sub.formId] || sub.formId;
    const isHire = sub.formId === 'report-a-hire';
    const isPac = sub.formId === 'pac-meeting-registration';
    const isFair = sub.formId === 'career-fair-registration';

    return {
      id: `portal-${sub.id}`,
      sourceFile: 'Employer Portal',
      sourceRow: 0,
      recordType: isHire ? 'hire' : isPac || isFair ? 'event' : 'employer',
      studentName: v.candidateName || v.studentName || '',
      employerName: v.employerName || '',
      program: v.program || v.programInterest || '',
      programLengthMonths: 0,
      startDate: '',
      graduationDate: '',
      withdrawalDate: '',
      eventType,
      eventDate: v.meetingDate || v.startDate || sub.submittedAt.slice(0, 10),
      positionTitle: v.positionTitle || '',
      employmentStartDate: v.startDate || '',
      jobTitle: v.positionTitle || v.jobTitle || '',
      jobDuties: v.notes || v.details || v.jobDescription || '',
      employerContact: v.contactName || v.supervisorName || '',
      employerPhone: v.contactPhone || '',
      employerEmail: v.contactEmail || sub.employerEmail || '',
      employerAddress: v.mailingAddress || v.workLocation || '',
      employmentStatus: isHire ? 'employed_in_field' : '',
      verificationSource: 'employer_portal',
      notes: `Submitted ${sub.submittedAt} — ${sub.formTitle}`,
      raw: { ...v, formId: sub.formId, formTitle: sub.formTitle },
    };
  });
}
