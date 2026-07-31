import type { JobListing, JobSearchParams } from '../types';

const TIMEOUT_MS = 20000;
const JSEARCH_HOST = 'jsearch.p.rapidapi.com';

export function isJsearchConfigured() {
  return Boolean(process.env.RAPIDAPI_KEY?.trim());
}

function formatCompensation(min?: number | null, max?: number | null, period?: string | null) {
  if (!min && !max) return undefined;
  const low = min ? `$${Math.round(min).toLocaleString()}` : '';
  const high = max ? `$${Math.round(max).toLocaleString()}` : '';
  const range = low && high ? `${low}–${high}` : low || high;
  return period ? `${range} ${period}` : range;
}

export async function searchJsearch(params: JobSearchParams): Promise<JobListing[]> {
  const apiKey = process.env.RAPIDAPI_KEY?.trim();
  if (!apiKey) return [];

  const keywords = params.query.trim() || 'jobs';
  const location = params.location.trim() || 'New Castle, PA';
  const searchQuery = `${keywords} jobs in ${location}`;

  const searchParams = new URLSearchParams({
    query: searchQuery,
    page: '1',
    num_pages: '2',
    date_posted: 'month',
    country: 'us',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`https://${JSEARCH_HOST}/search?${searchParams.toString()}`, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': JSEARCH_HOST,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Job aggregator returned ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];

    return rows.map((job: Record<string, unknown>) => {
      const city = String(job.job_city || '').trim();
      const state = String(job.job_state || '').trim();
      const locationLabel = [city, state].filter(Boolean).join(', ') || location;
      const publisher = String(job.job_publisher || 'Job board').trim();

      return {
        id: `jsearch:${job.job_id || job.job_apply_link}`,
        title: String(job.job_title || 'Job opening'),
        employer: String(job.employer_name || 'Employer'),
        location: locationLabel,
        url: String(job.job_apply_link || job.job_google_link || 'https://www.google.com/search?q=jobs'),
        source: 'jsearch' as const,
        sourceLabel: publisher,
        postedAt: job.job_posted_at_datetime_utc
          ? new Date(String(job.job_posted_at_datetime_utc)).toISOString()
          : null,
        snippet: String(job.job_description || job.job_highlights || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 280),
        employmentType: job.job_employment_type ? String(job.job_employment_type) : undefined,
        compensation: formatCompensation(
          job.job_min_salary as number | null,
          job.job_max_salary as number | null,
          job.job_salary_period as string | null
        ),
      };
    });
  } finally {
    clearTimeout(timer);
  }
}
