import { NextRequest, NextResponse } from 'next/server';
import { runJobSearch } from '@/lib/jobSearch/searchJobs';
import type { JobSourceId } from '@/lib/jobSearch/types';

const VALID_SOURCES = new Set<JobSourceId>(['ncst-employers', 'usajobs', 'adzuna', 'rss']);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query : '';
    const location = typeof body.location === 'string' ? body.location : 'New Castle, PA';
    const sources =
      Array.isArray(body.sources)
        ? body.sources.filter((item: string) => VALID_SOURCES.has(item as JobSourceId))
        : undefined;

    const result = await runJobSearch({ query, location, sources });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Job search failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
