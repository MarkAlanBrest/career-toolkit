import { mergeJobListings } from './normalize';
import { buildExternalJobSites } from './externalSites';
import type { JobSearchParams, JobSearchResponse, JobSourceId } from './types';
import { searchAdzuna, isAdzunaConfigured } from './sources/adzuna';
import { searchNcstEmployerJobs } from './sources/ncstEmployers';
import { searchRssFeeds, isRssConfigured } from './sources/rss';
import { searchUsajobs, isUsajobsConfigured } from './sources/usajobs';

const SOURCE_LABELS: Record<JobSourceId, string> = {
  'ncst-employers': 'NCST employer portal',
  usajobs: 'USAJobs (federal)',
  adzuna: 'Adzuna',
  rss: 'RSS feeds',
};

const DEFAULT_SOURCES: JobSourceId[] = ['ncst-employers', 'usajobs', 'adzuna', 'rss'];

export async function runJobSearch(params: JobSearchParams): Promise<JobSearchResponse> {
  const query = params.query.trim();
  const location = params.location.trim() || 'New Castle, PA';
  const sources = params.sources?.length ? params.sources : DEFAULT_SOURCES;

  const listings: Awaited<ReturnType<typeof searchNcstEmployerJobs>> = [];
  const sourceStatus: JobSearchResponse['sourceStatus'] = [];

  for (const source of sources) {
    const label = SOURCE_LABELS[source];
    let count = 0;
    let error: string | undefined;
    let configured = true;

    try {
      if (source === 'ncst-employers') {
        const results = await searchNcstEmployerJobs({ ...params, location });
        listings.push(...results);
        count = results.length;
      } else if (source === 'usajobs') {
        configured = isUsajobsConfigured();
        if (!configured) {
          error = 'Add USAJOBS_API_KEY and USAJOBS_USER_EMAIL to enable.';
        } else {
          const results = await searchUsajobs({ ...params, location });
          listings.push(...results);
          count = results.length;
        }
      } else if (source === 'adzuna') {
        configured = isAdzunaConfigured();
        if (!configured) {
          error = 'Add ADZUNA_APP_ID and ADZUNA_APP_KEY to enable.';
        } else {
          const results = await searchAdzuna({ ...params, location });
          listings.push(...results);
          count = results.length;
        }
      } else if (source === 'rss') {
        configured = isRssConfigured();
        if (!configured) {
          error = 'Add JOB_SEARCH_RSS_FEEDS to enable custom RSS sources.';
        } else {
          const results = await searchRssFeeds({ ...params, location });
          listings.push(...results);
          count = results.length;
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Search failed.';
    }

    sourceStatus.push({ source, label, count, error, configured });
  }

  const results = mergeJobListings(listings, query);

  return {
    query,
    location,
    results,
    externalSites: buildExternalJobSites(query || 'jobs', location),
    sourceStatus,
    searchedAt: new Date().toISOString(),
  };
}
