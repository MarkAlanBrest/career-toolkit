import type { JobListing } from './types';

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? decodeXmlEntities(match[1].trim()) : '';
}

export function parseRssJobListings(xml: string, sourceLabel: string, sourceId: JobListing['source']): JobListing[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  const output: JobListing[] = [];

  for (const block of items) {
    const title = readTag(block, 'title');
    const link = readTag(block, 'link');
    if (!title || !link) continue;

    const description = readTag(block, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const pubDate = readTag(block, 'pubDate');
    const postedAt = pubDate ? new Date(pubDate).toISOString() : null;

    output.push({
      id: `${sourceId}:${link}`,
      title,
      employer: sourceLabel,
      location: '',
      url: link,
      source: sourceId,
      sourceLabel,
      postedAt,
      snippet: description.slice(0, 280),
    });
  }

  return output;
}
