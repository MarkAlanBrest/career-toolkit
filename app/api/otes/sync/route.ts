import { NextRequest, NextResponse } from 'next/server';
import {
  isOtesBlobSyncEnabled,
  loadOtesWorkspaceFromBlob,
  saveOtesWorkspaceToBlob,
} from '@/lib/otes/blobStorage';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isOtesBlobSyncEnabled()) {
    return NextResponse.json({ enabled: false, workspace: null });
  }

  try {
    const workspace = await loadOtesWorkspaceFromBlob();
    return NextResponse.json({ enabled: true, workspace });
  } catch {
    return NextResponse.json({
      enabled: true,
      workspace: null,
      error: 'sync_failed',
    });
  }
}

export async function POST(request: NextRequest) {
  if (!isOtesBlobSyncEnabled()) {
    return NextResponse.json({ error: 'Sync not configured' }, { status: 503 });
  }

  try {
    const { workspace } = await request.json();
    if (!workspace || typeof workspace !== 'object') {
      return NextResponse.json({ error: 'Missing workspace' }, { status: 400 });
    }

    await saveOtesWorkspaceToBlob(workspace);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Sync failed' }, { status: 502 });
  }
}
