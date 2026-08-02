import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GAS_URL = process.env.OTES_GAS_SYNC_URL;
const SYNC_SECRET = process.env.OTES_SYNC_SECRET ?? '';

async function callGas(body: Record<string, unknown>) {
  if (!GAS_URL) return null;

  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, secret: SYNC_SECRET }),
    cache: 'no-store',
    redirect: 'follow',
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid response from sync service.');
  }
}

export async function GET() {
  if (!GAS_URL) {
    return NextResponse.json({ enabled: false, workspace: null });
  }

  try {
    const data = await callGas({ action: 'load' });
    return NextResponse.json({
      enabled: true,
      workspace: data?.workspace ?? null,
    });
  } catch {
    return NextResponse.json({
      enabled: true,
      workspace: null,
      error: 'sync_failed',
    });
  }
}

export async function POST(request: NextRequest) {
  if (!GAS_URL) {
    return NextResponse.json({ error: 'Sync not configured' }, { status: 503 });
  }

  try {
    const { workspace } = await request.json();
    if (!workspace || typeof workspace !== 'object') {
      return NextResponse.json({ error: 'Missing workspace' }, { status: 400 });
    }

    const data = await callGas({ action: 'save', workspace });
    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Sync failed' }, { status: 502 });
  }
}
