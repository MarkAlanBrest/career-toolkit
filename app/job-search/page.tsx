'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_JOB_SEARCH_LOCATION } from '@/lib/jobSearch/externalSites';
import type { JobListing, JobSearchResponse } from '@/lib/jobSearch/types';
import { useDashboardEmbed } from '@/lib/useDashboardEmbed';
import styles from './job-search.module.css';

function formatDate(value: string | null) {
  if (!value) return 'Date unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unknown';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LocalJobSearchPage() {
  const embedded = useDashboardEmbed();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState(DEFAULT_JOB_SEARCH_LOCATION);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<JobSearchResponse | null>(null);

  const runSearch = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/job-search/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed.');

      setResponse(data as JobSearchResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [query, location]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    runSearch();
  };

  const results = response?.results ?? [];

  return (
    <div className={`${styles.jobSearch} ${embedded ? styles.embedded : ''}`}>
      <div className={styles.shell}>
        {!embedded && (
          <header className={styles.header}>
            <h1>Local job search</h1>
            <p>
              One search across NCST employer postings, Indeed, LinkedIn, Google Jobs,
              ZipRecruiter, and more — all results in one list.
            </p>
            <Link href="/job-search" className={styles.headerLink}>
              Open full job search page
            </Link>
          </header>
        )}

        <form className={styles.searchCard} onSubmit={onSubmit}>
          <h2>Search everywhere</h2>
          <p className={styles.meta}>
            Enter keywords and location once. We search every connected source at the same time
            and combine the results below.
          </p>
          <div className={styles.searchRow}>
            <label className={styles.field}>
              <span>Keywords</span>
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. HVAC technician, diesel mechanic"
              />
            </label>
            <label className={styles.field}>
              <span>Location</span>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="City, State"
              />
            </label>
            <button type="submit" className={styles.btnPrimary} disabled={busy}>
              {busy ? 'Searching all sources…' : 'Search everywhere'}
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </form>

        {response && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>All results ({results.length})</h2>
              <p className={styles.meta}>
                {response.location} · searched {formatDate(response.searchedAt)}
              </p>
            </div>

            {!response.aggregatorConfigured && (
              <div className={styles.setupNotice}>
                <strong>Job board search needs an API key.</strong>
                <p>
                  NCST employer postings are included. To search Indeed, LinkedIn, Google Jobs,
                  and ZipRecruiter in one shot, add <code>RAPIDAPI_KEY</code> in Vercel (free tier
                  on RapidAPI → JSearch). Optional: <code>JOOBLE_API_KEY</code>, Adzuna, or USAJobs
                  keys for more coverage.
                </p>
              </div>
            )}

            <div className={styles.sourceGrid}>
              {response.sourceStatus.map(item => (
                <div key={item.source} className={styles.sourceChip}>
                  <strong>{item.label}</strong>
                  <span>
                    {item.configured
                      ? `${item.count} result${item.count === 1 ? '' : 's'}`
                      : 'Not configured'}
                    {item.error && item.configured && ` · ${item.error}`}
                  </span>
                </div>
              ))}
            </div>

            {results.length === 0 ? (
              <p className={styles.empty}>
                No listings matched this search. Try broader keywords, check spelling, or widen
                the location.
              </p>
            ) : (
              <ul className={styles.resultsList}>
                {results.map((job: JobListing) => (
                  <li key={job.id} className={styles.resultItem}>
                    <div className={styles.resultTop}>
                      <a href={job.url} target="_blank" rel="noopener noreferrer">
                        {job.title}
                      </a>
                      <span className={styles.badge}>{job.sourceLabel}</span>
                    </div>
                    <p className={styles.resultMeta}>
                      {job.employer} · {job.location || response.location} ·{' '}
                      {formatDate(job.postedAt)}
                      {job.employmentType && ` · ${job.employmentType}`}
                      {job.compensation && ` · ${job.compensation}`}
                    </p>
                    {job.snippet && <p className={styles.resultSnippet}>{job.snippet}</p>}
                  </li>
                ))}
              </ul>
            )}

            {response.externalSites.length > 0 && (
              <p className={styles.fallbackLinks}>
                Also try state and newspaper sites:{' '}
                {response.externalSites.slice(0, 4).map((site, index) => (
                  <span key={site.id}>
                    {index > 0 && ' · '}
                    <a href={site.url} target="_blank" rel="noopener noreferrer">
                      {site.name}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
