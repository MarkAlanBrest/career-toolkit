import { NextRequest, NextResponse } from 'next/server';
import { buildGeocodeUrl } from '@/lib/resumeSearch/geocode';

const GEOCODE_TIMEOUT_MS = 10000;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json({ error: 'Location query is required.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const response = await fetch(buildGeocodeUrl(query), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NCST-Career-Services-ResumeTool/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Location lookup failed (${response.status}).` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Location lookup timed out.'
        : error instanceof Error
          ? error.message
          : 'Location lookup failed.';

    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
