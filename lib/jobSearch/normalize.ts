import type { JobListing } from './types';

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function filterJobListings(listings: JobListing[], query: string): JobListing[] {
  const terms = normalizeText(query)
    .split(/\s+/)
    .filter(Boolean);
  if (!terms.length) return listings;

  return listings.filter(item => {
    const haystack = normalizeText(
      [item.title, item.employer, item.location, item.snippet].join(' ')
    );
    return terms.every(term => haystack.includes(term));
  });
}

export function dedupeJobListings(listings: JobListing[]): JobListing[] {
  const seen = new Set<string>();
  const output: JobListing[] = [];

  for (const item of listings) {
    const urlKey = normalizeText(item.url);
    const key = urlKey || normalizeText(`${item.title}|${item.employer}|${item.location}`);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

export function sortJobListings(listings: JobListing[]): JobListing[] {
  return [...listings].sort((a, b) => {
    if (a.postedAt && b.postedAt) {
      return b.postedAt.localeCompare(a.postedAt);
    }
    if (a.postedAt) return -1;
    if (b.postedAt) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function mergeJobListings(
  listings: JobListing[],
  query: string
): JobListing[] {
  return sortJobListings(dedupeJobListings(filterJobListings(listings, query)));
}
