import { get, put } from '@vercel/blob';
import type { OtesWorkspace } from './types';

const BLOB_PATHNAME = 'otes/workspace.json';

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isOtesBlobSyncEnabled(): boolean {
  return blobConfigured();
}

export async function loadOtesWorkspaceFromBlob(): Promise<OtesWorkspace | null> {
  if (!blobConfigured()) return null;

  const result = await get(BLOB_PATHNAME, { access: 'private', useCache: false });
  if (!result) return null;

  const data = await new Response(result.stream).json();
  if (!data || typeof data !== 'object') return null;
  return data as OtesWorkspace;
}

export async function saveOtesWorkspaceToBlob(workspace: OtesWorkspace): Promise<void> {
  if (!blobConfigured()) {
    throw new Error('Blob storage is not configured.');
  }

  await put(BLOB_PATHNAME, JSON.stringify(workspace), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}
