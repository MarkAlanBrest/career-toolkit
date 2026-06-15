import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type SearchResult = {
  query: string;
  title: string;
  url: string;
  snippet: string;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const queries = Array.isArray(body?.queries)
    ? body.queries.map((q: unknown) => String(q || '').trim()).filter(Boolean).slice(0, 20)
    : [];

  if (!queries.length) {
    return NextResponse.json({ results: [], provider: 'none' }, { headers: CORS });
  }

  const braveKey = process.env.BRAVE_SEARCH_API_KEY || '';
  const googleKey = process.env.GOOGLE_SEARCH_API_KEY || '';
  const googleCx = process.env.GOOGLE_SEARCH_ENGINE_ID || '';

  if (braveKey) {
    const results: SearchResult[] = [];
    for (const query of queries) {
      const url = new URL('https://api.search.brave.com/res/v1/web/search');
      url.searchParams.set('q', `"${query}"`);
      url.searchParams.set('count', '3');
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': braveKey },
      });
      if (!res.ok) throw new Error(`Brave Search HTTP ${res.status}`);
      const data = await res.json();
      for (const item of data?.web?.results || []) {
        results.push({
          query,
          title: item.title || '',
          url: item.url || '',
          snippet: item.description || '',
        });
      }
    }
    return NextResponse.json({ provider: 'brave', results }, { headers: CORS });
  }

  if (googleKey && googleCx) {
    const results: SearchResult[] = [];
    for (const query of queries) {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', googleKey);
      url.searchParams.set('cx', googleCx);
      url.searchParams.set('q', `"${query}"`);
      url.searchParams.set('num', '3');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Google Search HTTP ${res.status}`);
      const data = await res.json();
      for (const item of data?.items || []) {
        results.push({
          query,
          title: item.title || '',
          url: item.link || '',
          snippet: item.snippet || '',
        });
      }
    }
    return NextResponse.json({ provider: 'google', results }, { headers: CORS });
  }

  return NextResponse.json(
    { error: 'Web search is not configured. Add BRAVE_SEARCH_API_KEY or GOOGLE_SEARCH_API_KEY plus GOOGLE_SEARCH_ENGINE_ID.' },
    { status: 501, headers: CORS }
  );
}
