import type { OtesWorkspace } from './types';

export type SyncStatus = 'loading' | 'synced' | 'syncing' | 'offline' | 'disabled';

type CloudResponse = {
  enabled: boolean;
  workspace: OtesWorkspace | null;
  error?: string;
};

export async function fetchCloudWorkspace(): Promise<CloudResponse> {
  const res = await fetch('/api/otes/sync', { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not reach sync service.');
  return res.json() as Promise<CloudResponse>;
}

export async function saveCloudWorkspace(workspace: OtesWorkspace): Promise<void> {
  const res = await fetch('/api/otes/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace }),
  });
  if (!res.ok) throw new Error('Could not save to cloud.');
}

export function isRemoteNewer(local: OtesWorkspace, remote: OtesWorkspace): boolean {
  return new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime();
}
