import { listAllEmployerSubmissions } from '@/lib/employerPortalUsers';
import type { JobListing, JobSearchParams } from '../types';

const JOB_FORM_IDS = new Set(['submit-job-opening', 'request-applicants']);

export async function searchNcstEmployerJobs(params: JobSearchParams): Promise<JobListing[]> {
  const submissions = await listAllEmployerSubmissions();
  const listings: JobListing[] = [];

  for (const submission of submissions) {
    if (!JOB_FORM_IDS.has(submission.formId)) continue;

    const values = submission.values;
    const title =
      values.jobTitle ||
      values.positionTitle ||
      submission.formTitle ||
      'Employer opportunity';
    const employer = values.employerName || 'NCST employer partner';
    const location = values.workLocation || 'Pennsylvania / Ohio region';
    const snippet =
      values.jobDescription ||
      values.details ||
      values.notes ||
      'Submitted through the NCST employer portal. Contact Career Services for details.';

    listings.push({
      id: `ncst:${submission.id}`,
      title,
      employer,
      location,
      url: '/employer-portal',
      source: 'ncst-employers',
      sourceLabel: 'NCST employer portal',
      postedAt: submission.submittedAt,
      snippet: snippet.slice(0, 320),
      employmentType: values.employmentType || undefined,
      compensation: values.compensation || undefined,
    });
  }

  if (!params.query.trim()) return listings;

  const query = params.query.trim().toLowerCase();
  return listings.filter(item => {
    const haystack = [item.title, item.employer, item.location, item.snippet]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}
