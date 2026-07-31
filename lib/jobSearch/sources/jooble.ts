import type { JobListing, JobSearchParams } from '../types';

const TIMEOUT_MS = 15000;

export function isJoobleConfigured() {
  return Boolean(process.env.JOOBLE_API_KEY?.trim());
}

export async function searchJooble(params: JobSearchParams): Promise<JobListing[]> {
  const apiKey = process.env.JOOBLE_API_KEY?.trim();
  if (!apiKey) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`https://jooble.org/api/${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        keywords: params.query.trim() || 'technician',
        location: params.location.trim() || 'New Castle, PA',
        page: 1,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Jooble returned ${response.status}`);
    }

    const data = await response.json();
    const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

    return jobs.map((job: Record<string, unknown>, index: number) => ({
      id: `jooble:${job.id || index}`,
      title: String(job.title || 'Job opening'),
      employer: String(job.company || 'Employer'),
      location: String(job.location || params.location),
      url: String(job.link || 'https://jooble.org'),
      source: 'jooble' as const,
      sourceLabel: 'Jooble',
      postedAt: job.updated ? new Date(String(job.updated)).toISOString() : null,
      snippet: String(job.snippet || '').replace(/<[^>]+>/g, ' ').slice(0, 280),
      compensation: job.salary ? String(job.salary) : undefined,
    }));
  } finally {
    clearTimeout(timer);
  }
}
