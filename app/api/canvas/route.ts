import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ALLOWED_HOSTS = /(?:^|\.)(instructure|canvas|canvaslms)\.com$/i;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: CORS });
  }

  const { canvasBase, token, path, method = 'GET', body: canvasBody } = body;
  if (!canvasBase || !token || !path) {
    return NextResponse.json({ error: 'Canvas base URL, token, and path are required' }, { status: 400, headers: CORS });
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(canvasBase);
  } catch {
    return NextResponse.json({ error: 'Invalid Canvas base URL' }, { status: 400, headers: CORS });
  }

  if (!ALLOWED_HOSTS.test(baseUrl.hostname)) {
    return NextResponse.json({ error: 'Canvas host is not allowed' }, { status: 400, headers: CORS });
  }

  const canvasPath = String(path).startsWith('/') ? String(path) : `/${path}`;
  if (!canvasPath.startsWith('/api/v1/')) {
    return NextResponse.json({ error: 'Only Canvas API v1 paths are allowed' }, { status: 400, headers: CORS });
  }

  const url = new URL(canvasPath, baseUrl.origin);
  const verb = String(method).toUpperCase();
  const init: RequestInit = {
    method: verb,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  };

  if (verb !== 'GET' && verb !== 'HEAD' && canvasBody !== undefined) {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    init.body = JSON.stringify(canvasBody);
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      data = JSON.parse(text);
    }

    return NextResponse.json(data, { status: res.status, headers: CORS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Canvas request failed' }, { status: 500, headers: CORS });
  }
}
