// App-only (client-credentials) Microsoft Graph access for "Save to SharePoint" — Document Creator.
// One shared Azure AD app + one shared SharePoint site for all schools; each teacher's folder
// is just a subfolder path within that site's default document library.

export class SharePointError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new SharePointError(`SharePoint is not configured on the server (missing ${name}).`, 503);
  return value;
}

async function getGraphToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;

  const tenantId = requiredEnv('AZURE_TENANT_ID');
  const clientId = requiredEnv('AZURE_CLIENT_ID');
  const clientSecret = requiredEnv('AZURE_CLIENT_SECRET');

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    console.error('SharePoint token error:', res.status, data);
    throw new SharePointError('Could not authenticate with Microsoft Graph.', 502);
  }

  const token = data.access_token as string;
  const expiresIn = Number(data.expires_in || 3600);
  cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

function encodePath(path: string): string {
  return path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

export async function uploadToSharePoint(
  folderPath: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<{ webUrl?: string }> {
  const siteId = requiredEnv('SHAREPOINT_SITE_ID');
  const token = await getGraphToken();

  const encodedFolder = encodePath(folderPath);
  const encodedFilename = encodeURIComponent(filename);
  const target = encodedFolder ? `${encodedFolder}/${encodedFilename}` : encodedFilename;

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${target}:/content`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
      body: new Uint8Array(buffer),
    }
  );
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    console.error('SharePoint upload error:', res.status, data);
    throw new SharePointError('Could not save the document to SharePoint.', 502);
  }

  return { webUrl: (data as { webUrl?: string }).webUrl };
}
