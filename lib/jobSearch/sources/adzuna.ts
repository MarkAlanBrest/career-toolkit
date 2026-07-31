import type { JobListing, JobSearchParams } from '../types';

const TIMEOUT_MS = 12000;

export function isAdzunaConfigured() {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

export async function searchAdzuna(params: JobSearchParams): Promise<JobListing[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const searchParams = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: '25',
    what: params.query.trim() || 'technician',
    where: params.location.trim() || 'New Castle, PA',
    'content-type': 'application/json',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.adzuna.com/v1/api/jobs/us/search/1?${searchParams.toString()}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(`Adzuna returned ${response.status}`);
    }

    const data = await response.json();
    const results = data?.results || [];

    return results.map((item: Record<string, unknown>) => {
      const company = item.company as Record<string, unknown> | undefined;
      const location = item.location as Record<string, unknown> | undefined;
      const area = location?.area as string[] | undefined;
      const locationLabel = area?.slice(-2).join(', ') || params.location;

      return {
        id: `adzuna:${item.id}`,
        title: String(item.title || 'Job opening'),
        employer: String(company?.display_name || 'Employer'),
        location: locationLabel,
        url: String(item.redirect_url || item.url || 'https://www.adzuna.com'),
        source: 'adzuna' as const,
        sourceLabel: 'Adzuna',
        postedAt: item.created ? new Date(String(item.created)).toISOString() : null,
        snippet: String(item.description || '').replace(/<[^>]+>/g, ' ').slice(0, 280),
      };
    });
  } finally {
    clearTimeout(timer);
  }
}
