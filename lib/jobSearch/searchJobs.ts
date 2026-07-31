import { mergeJobListings } from './normalize';
import { buildExternalJobSites } from './externalSites';
import type { JobListing, JobSearchParams, JobSearchResponse, JobSourceId } from './types';
import { searchAdzuna, isAdzunaConfigured } from './sources/adzuna';
import { searchJsearch, isJsearchConfigured } from './sources/jsearch';
import { searchJooble, isJoobleConfigured } from './sources/jooble';
import { searchNcstEmployerJobs } from './sources/ncstEmployers';
import { searchRssFeeds, isRssConfigured } from './sources/rss';
import { searchUsajobs, isUsajobsConfigured } from './sources/usajobs';

const SOURCE_LABELS: Record<JobSourceId, string> = {
  'ncst-employers': 'NCST employer portal',
  jsearch: 'Indeed, LinkedIn, Google Jobs, ZipRecruiter',
  jooble: 'Jooble',
  usajobs: 'USAJobs (federal)',
  adzuna: 'Adzuna',
  rss: 'RSS feeds',
};

const DEFAULT_SOURCES: JobSourceId[] = [
  'ncst-employers',
  'jsearch',
  'jooble',
  'adzuna',
  'usajobs',
  'rss',
];

type SourceRunner = {
  source: JobSourceId;
  configured: boolean;
  run: (params: JobSearchParams) => Promise<JobListing[]>;
  unconfiguredMessage?: string;
};

function sourceRunners(): SourceRunner[] {
  return [
    { source: 'ncst-employers', configured: true, run: searchNcstEmployerJobs },
    {
      source: 'jsearch',
      configured: isJsearchConfigured(),
      unconfiguredMessage: 'Add RAPIDAPI_KEY (JSearch on RapidAPI) to search all major boards.',
      run: searchJsearch,
    },
    {
      source: 'jooble',
      configured: isJoobleConfigured(),
      unconfiguredMessage: 'Add JOOBLE_API_KEY to include Jooble listings.',
      run: searchJooble,
    },
    {
      source: 'adzuna',
      configured: isAdzunaConfigured(),
      unconfiguredMessage: 'Add ADZUNA_APP_ID and ADZUNA_APP_KEY.',
      run: searchAdzuna,
    },
    {
      source: 'usajobs',
      configured: isUsajobsConfigured(),
      unconfiguredMessage: 'Add USAJOBS_API_KEY and USAJOBS_USER_EMAIL.',
      run: searchUsajobs,
    },
    {
      source: 'rss',
      configured: isRssConfigured(),
      unconfiguredMessage: 'Add JOB_SEARCH_RSS_FEEDS for custom feeds.',
      run: searchRssFeeds,
    },
  ];
}

async function runSource(
  runner: SourceRunner,
  params: JobSearchParams
): Promise<{ status: JobSearchResponse['sourceStatus'][number]; results: JobListing[] }> {
  const label = SOURCE_LABELS[runner.source];

  if (!runner.configured && runner.unconfiguredMessage) {
    return {
      status: {
        source: runner.source,
        label,
        count: 0,
        error: runner.unconfiguredMessage,
        configured: false,
      },
      results: [],
    };
  }

  try {
    const results = await runner.run(params);
    return {
      status: {
        source: runner.source,
        label,
        count: results.length,
        configured: runner.configured,
      },
      results,
    };
  } catch (err) {
    return {
      status: {
        source: runner.source,
        label,
        count: 0,
        error: err instanceof Error ? err.message : 'Search failed.',
        configured: runner.configured,
      },
      results: [],
    };
  }
}

export async function runJobSearch(params: JobSearchParams): Promise<JobSearchResponse> {
  const query = params.query.trim();
  const location = params.location.trim() || 'New Castle, PA';
  const activeSourceIds = params.sources?.length ? params.sources : DEFAULT_SOURCES;

  const runners = sourceRunners().filter(runner => activeSourceIds.includes(runner.source));
  const settled = await Promise.all(
    runners.map(runner => runSource(runner, { ...params, location }))
  );

  const listings = settled.flatMap(item => item.results);
  const sourceStatus = settled.map(item => item.status);
  const results = mergeJobListings(listings, query);
  const aggregatorConfigured =
    isJsearchConfigured() || isJoobleConfigured() || isAdzunaConfigured();

  return {
    query,
    location,
    results,
    externalSites: buildExternalJobSites(query || 'jobs', location),
    sourceStatus,
    aggregatorConfigured,
    searchedAt: new Date().toISOString(),
  };
}
