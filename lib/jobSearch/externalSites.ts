import type { ExternalJobSite } from './types';

type SiteTemplate = Omit<ExternalJobSite, 'url'> & {
  buildUrl: (query: string, location: string) => string;
};

const DEFAULT_LOCATION = 'New Castle, PA';

function encode(value: string) {
  return encodeURIComponent(value.trim());
}

const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: 'pa-careerlink',
    name: 'PA CareerLink',
    description: 'Pennsylvania state job bank — thousands of local openings statewide.',
    category: 'state',
    buildUrl: (query, location) =>
      `https://www.pacareerlink.pa.gov/jponline/JobSeeker/SearchJobs?keyword=${encode(query)}&location=${encode(location)}`,
  },
  {
    id: 'ohiomeansjobs',
    name: 'OhioMeansJobs',
    description: 'Ohio job bank — useful for NCST East Liverpool and regional employers.',
    category: 'state',
    buildUrl: (query, location) =>
      `https://jobs.ohiomeansjobs.monster.com/Search.aspx?sort=date&vw=d&query=${encode(query)}&location=${encode(location)}`,
  },
  {
    id: 'indeed',
    name: 'Indeed',
    description: 'National job board with strong local listings.',
    category: 'national',
    buildUrl: (query, location) =>
      `https://www.indeed.com/jobs?q=${encode(query)}&l=${encode(location)}`,
  },
  {
    id: 'google-jobs',
    name: 'Google Jobs',
    description: 'Aggregated listings from many sites in one Google search view.',
    category: 'national',
    buildUrl: (query, location) =>
      `https://www.google.com/search?q=${encode(`${query} jobs ${location}`)}&ibp=htl;jobs`,
  },
  {
    id: 'sentinel-cumberlink',
    name: 'The Sentinel (Cumberlink)',
    description: 'Cumberland Valley newspaper job board — Carlisle, Harrisburg region.',
    category: 'newspaper',
    buildUrl: (query, location) =>
      `https://jobs.cumberlink.com/search?q=${encode(query)}&l=${encode(location)}`,
  },
  {
    id: 'daily-item',
    name: 'The Daily Item',
    description: 'Northcentral PA newspaper jobs — Sunbury, Williamsport region.',
    category: 'newspaper',
    buildUrl: (query, location) =>
      `https://jobs.dailyitem.com/search?q=${encode(query)}&l=${encode(location)}`,
  },
  {
    id: 'observer-reporter',
    name: 'Observer-Reporter',
    description: 'Washington County PA newspaper employment listings.',
    category: 'newspaper',
    buildUrl: (query, location) =>
      `https://www.observer-reporter.com/search/?f=rss&t=article&l=25&s=start_time&sd=desc&q=${encode(`${query} jobs ${location}`)}`,
  },
  {
    id: 'trib-live',
    name: 'TribLIVE Jobs',
    description: 'Pittsburgh-area newspaper and regional job listings.',
    category: 'newspaper',
    buildUrl: (query, location) =>
      `https://www.google.com/search?q=${encode(`${query} jobs triblive ${location}`)}`,
  },
  {
    id: 'ziprecruiter',
    name: 'ZipRecruiter',
    description: 'National board often used by local trades employers.',
    category: 'national',
    buildUrl: (query, location) =>
      `https://www.ziprecruiter.com/jobs-search?search=${encode(query)}&location=${encode(location)}`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Jobs',
    description: 'Professional network job search with local filters.',
    category: 'national',
    buildUrl: (query, location) =>
      `https://www.linkedin.com/jobs/search?keywords=${encode(query)}&location=${encode(location)}`,
  },
];

export function buildExternalJobSites(query: string, location?: string): ExternalJobSite[] {
  const resolvedLocation = location?.trim() || DEFAULT_LOCATION;
  const resolvedQuery = query.trim() || 'jobs';

  return SITE_TEMPLATES.map(site => ({
    id: site.id,
    name: site.name,
    description: site.description,
    category: site.category,
    url: site.buildUrl(resolvedQuery, resolvedLocation),
  }));
}

export const DEFAULT_JOB_SEARCH_LOCATION = DEFAULT_LOCATION;
