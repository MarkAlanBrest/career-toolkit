export type JobSourceId =
  | 'ncst-employers'
  | 'jsearch'
  | 'jooble'
  | 'usajobs'
  | 'adzuna'
  | 'rss';

export type JobListing = {
  id: string;
  title: string;
  employer: string;
  location: string;
  url: string;
  source: JobSourceId;
  sourceLabel: string;
  postedAt: string | null;
  snippet: string;
  employmentType?: string;
  compensation?: string;
};

export type ExternalJobSite = {
  id: string;
  name: string;
  description: string;
  category: 'state' | 'newspaper' | 'national' | 'regional';
  url: string;
};

export type JobSearchParams = {
  query: string;
  location: string;
  radiusMiles?: number;
  sources?: JobSourceId[];
};

export type JobSearchResponse = {
  query: string;
  location: string;
  results: JobListing[];
  externalSites: ExternalJobSite[];
  sourceStatus: Array<{
    source: JobSourceId;
    label: string;
    count: number;
    error?: string;
    configured: boolean;
  }>;
  aggregatorConfigured: boolean;
  searchedAt: string;
};
