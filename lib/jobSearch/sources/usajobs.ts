import type { JobListing, JobSearchParams } from '../types';

const TIMEOUT_MS = 12000;

export function isUsajobsConfigured() {
  return Boolean(process.env.USAJOBS_API_KEY && process.env.USAJOBS_USER_EMAIL);
}

export async function searchUsajobs(params: JobSearchParams): Promise<JobListing[]> {
  const apiKey = process.env.USAJOBS_API_KEY;
  const userEmail = process.env.USAJOBS_USER_EMAIL;
  if (!apiKey || !userEmail) return [];

  const searchParams = new URLSearchParams({
    Keyword: params.query.trim() || 'technician',
    LocationName: params.location.trim() || 'New Castle, PA',
    ResultsPerPage: '25',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`https://data.usajobs.gov/api/search?${searchParams.toString()}`, {
      headers: {
        Host: 'data.usajobs.gov',
        'User-Agent': userEmail,
        'Authorization-Key': apiKey,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`USAJobs returned ${response.status}`);
    }

    const data = await response.json();
    const items = data?.SearchResult?.SearchResultItems || [];

    return items.map((item: Record<string, unknown>) => {
      const match = item.MatchedObjectDescriptor as Record<string, unknown> | undefined;
      const position = (match?.PositionLocationDisplay as string) || params.location;
      const org = (match?.OrganizationName as string) || 'Federal employer';
      const title = (match?.PositionTitle as string) || 'Federal job opening';
      const uri = (match?.PositionURI as string) || 'https://www.usajobs.gov/';
      const description = (match?.QualificationSummary as string) || '';
      const dates = match?.PublicationStartDate as string | undefined;

      return {
        id: `usajobs:${item.MatchedObjectId || uri}`,
        title,
        employer: org,
        location: position,
        url: uri,
        source: 'usajobs' as const,
        sourceLabel: 'USAJobs (federal)',
        postedAt: dates ? new Date(dates).toISOString() : null,
        snippet: description.replace(/<[^>]+>/g, ' ').slice(0, 280),
      };
    });
  } finally {
    clearTimeout(timer);
  }
}
