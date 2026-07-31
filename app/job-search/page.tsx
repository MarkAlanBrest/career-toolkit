'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_JOB_SEARCH_LOCATION } from '@/lib/jobSearch/externalSites';
import type { ExternalJobSite, JobListing, JobSearchResponse } from '@/lib/jobSearch/types';
import { useDashboardEmbed } from '@/lib/useDashboardEmbed';
import styles from './job-search.module.css';

function formatDate(value: string | null) {
  if (!value) return 'Date unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unknown';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function openExternalSites(sites: ExternalJobSite[], selectedIds?: Set<string>) {
  const targets = selectedIds
    ? sites.filter(site => selectedIds.has(site.id))
    : sites;

  if (!targets.length) return;

  const first = window.open(targets[0].url, '_blank', 'noopener,noreferrer');
  if (!first && targets[0]) {
    window.location.href = targets[0].url;
  }

  targets.slice(1).forEach((site, index) => {
    window.setTimeout(() => {
      window.open(site.url, '_blank', 'noopener,noreferrer');
    }, (index + 1) * 400);
  });
}

export default function LocalJobSearchPage() {
  const embedded = useDashboardEmbed();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState(DEFAULT_JOB_SEARCH_LOCATION);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<JobSearchResponse | null>(null);
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());

  const toggleSite = (id: string) => {
    setSelectedSites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllSites = (sites: ExternalJobSite[]) => {
    setSelectedSites(new Set(sites.map(site => site.id)));
  };

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

      const payload = data as JobSearchResponse;
      setResponse(payload);
      selectAllSites(payload.externalSites);
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
              Search NCST employer postings and open local job boards, state sites, and newspaper
              classifieds with one search — all from one workspace.
            </p>
            <Link href="/dashboard?tool=local-job-search" className={styles.headerLink}>
              Open in Career Services dashboard
            </Link>
          </header>
        )}

        <form className={styles.searchCard} onSubmit={onSubmit}>
          <h2>Search jobs</h2>
          <p className={styles.meta}>
            Enter a job title or keyword. We pull NCST employer postings here, then open local
            newspapers and job boards in your browser with the same search.
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
              {busy ? 'Searching…' : 'Search all sources'}
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </form>

        {response && (
          <>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>NCST &amp; API results ({results.length})</h2>
                <p className={styles.meta}>
                  Searched {formatDate(response.searchedAt)} — {response.location}
                </p>
              </div>

              <div className={styles.sourceGrid}>
                {response.sourceStatus.map(item => (
                  <div key={item.source} className={styles.sourceChip}>
                    <strong>{item.label}</strong>
                    <span>
                      {item.count} result{item.count === 1 ? '' : 's'}
                      {!item.configured && ' · not configured'}
                      {item.error && ` · ${item.error}`}
                    </span>
                  </div>
                ))}
              </div>

              {results.length === 0 ? (
                <p className={styles.empty}>
                  No direct results yet. Use the local sites below — many newspapers and job boards
                  only allow searches from your browser.
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
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Local newspapers &amp; job boards</h2>
                <p className={styles.meta}>
                  These sites block automated searches. Open them in your browser with your keywords
                  pre-filled — use <strong>Open selected</strong> or <strong>Open all</strong>.
                </p>
              </div>

              <div className={styles.externalActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() =>
                    openExternalSites(
                      response.externalSites,
                      selectedSites.size ? selectedSites : undefined
                    )
                  }
                >
                  Open {selectedSites.size || response.externalSites.length} selected sites
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => selectAllSites(response.externalSites)}
                >
                  Select all
                </button>
              </div>

              <ul className={styles.externalList}>
                {response.externalSites.map(site => (
                  <li key={site.id} className={styles.externalItem}>
                    <label className={styles.externalLabel}>
                      <input
                        type="checkbox"
                        checked={selectedSites.has(site.id)}
                        onChange={() => toggleSite(site.id)}
                      />
                      <span>
                        <strong>{site.name}</strong>
                        <span className={styles.externalCategory}>{site.category}</span>
                      </span>
                    </label>
                    <p>{site.description}</p>
                    <a href={site.url} target="_blank" rel="noopener noreferrer">
                      Open search ↗
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
