import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/dcAuth';
import { cookies } from 'next/headers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
export const dynamic = 'force-dynamic';

const APP_NAME = 'career_toolkit_document_creator';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });
  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401, headers: CORS });

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: 'Photo search is not configured for this deployment.' }, { status: 503, headers: CORS });
  }

  const body = await req.json().catch(() => null);
  const query = String(body?.query || '').trim().slice(0, 200);
  if (!query) return NextResponse.json({ error: 'A search query is required.' }, { status: 400, headers: CORS });

  try {
    const searchUrl = new URL('https://api.unsplash.com/search/photos');
    searchUrl.searchParams.set('query', query);
    searchUrl.searchParams.set('per_page', '1');
    searchUrl.searchParams.set('orientation', 'landscape');
    searchUrl.searchParams.set('content_filter', 'high');

    const searchResp = await fetch(searchUrl, {
      headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
      signal: AbortSignal.timeout(10000),
    });
    if (!searchResp.ok) {
      return NextResponse.json({ error: `Unsplash search failed (HTTP ${searchResp.status}).` }, { status: 502, headers: CORS });
    }
    const searchData = await searchResp.json();
    const photo = searchData?.results?.[0];
    if (!photo) {
      return NextResponse.json({ error: 'No photo found for that query.' }, { status: 404, headers: CORS });
    }

    // Unsplash's API guidelines require pinging this endpoint whenever a photo is actually used,
    // separately from the search call itself. Fire-and-forget — a failure here shouldn't block
    // the document from rendering with the photo.
    if (photo.links?.download_location) {
      fetch(photo.links.download_location, {
        headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
      }).catch(() => {});
    }

    return NextResponse.json({
      url: photo.urls?.regular || photo.urls?.small,
      photographerName: photo.user?.name || 'Unknown',
      photographerUrl: `${photo.user?.links?.html || 'https://unsplash.com'}?utm_source=${APP_NAME}&utm_medium=referral`,
      unsplashUrl: `https://unsplash.com/?utm_source=${APP_NAME}&utm_medium=referral`,
    }, { headers: CORS });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Photo search failed.' }, { status: 500, headers: CORS });
  }
}
