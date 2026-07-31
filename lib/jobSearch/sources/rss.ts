import { parseRssJobListings } from '../rss';
import type { JobListing, JobSearchParams } from '../types';

const TIMEOUT_MS = 10000;

type RssFeedConfig = {
  id: string;
  label: string;
  url: string;
};

function configuredFeeds(): RssFeedConfig[] {
  const raw = process.env.JOB_SEARCH_RSS_FEEDS?.trim();
  if (!raw) return [];

  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [id, label, url] = line.split('|').map(part => part.trim());
      if (!id || !url) return null;
      return { id, label: label || id, url };
    })
    .filter((item): item is RssFeedConfig => Boolean(item));
}

export function isRssConfigured() {
  return configuredFeeds().length > 0;
}

export async function searchRssFeeds(params: JobSearchParams): Promise<JobListing[]> {
  const feeds = configuredFeeds();
  if (!feeds.length) return [];

  const listings: JobListing[] = [];

  for (const feed of feeds) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(feed.url, {
        headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
        signal: controller.signal,
      });
      if (!response.ok) continue;

      const xml = await response.text();
      listings.push(...parseRssJobListings(xml, feed.label, 'rss'));
    } catch {
      // Skip failed feeds silently; status reported at search layer.
    } finally {
      clearTimeout(timer);
    }
  }

  if (!params.query.trim()) return listings;

  const query = params.query.trim().toLowerCase();
  return listings.filter(item => {
    const haystack = [item.title, item.employer, item.snippet].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}
