import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUser } from '@/lib/dcAuth';
import { uploadToSharePoint, SharePointError } from '@/lib/sharepoint';
import { cookies } from 'next/headers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
export const dynamic = 'force-dynamic';

function escapeHtml(s: string): string {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// Keep in sync with downloadWord() in extension/Document_Creator.html
function wrapAsWordDoc(html: string, title: string): Buffer {
  const wrapped = "<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' "
    + "xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>"
    + "<head><meta charset='utf-8'><title>" + escapeHtml(title) + "</title>"
    + "<style>body{font-family:Arial,sans-serif;font-size:11pt;}table{border-collapse:collapse;width:100%;}td,th{border:1pt solid #ccc;padding:6pt 10pt;}</style>"
    + "</head><body>" + html + "</body></html>";
  return Buffer.from(wrapped, 'utf-8');
}

// POST — save the currently generated document to the teacher's configured SharePoint folder
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  const session = token ? await getSession(token) : null;
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });

  const body = await req.json().catch(() => null);
  const html = String(body?.html || '');
  const docTypeLabel = String(body?.docTypeLabel || 'Document').trim() || 'Document';
  if (!html.trim()) return NextResponse.json({ error: 'No document content to save.' }, { status: 400, headers: CORS });

  const user = await getUser(session.email);
  if (!user || !user.sharepointFolderPath) {
    return NextResponse.json(
      { error: "Your school admin hasn't set up a SharePoint folder for you yet. Ask your admin to configure it in the Document Creator admin panel." },
      { status: 400, headers: CORS }
    );
  }

  const name = docTypeLabel.replace(/\s+/g, '_');
  const filename = `${name}_${Date.now()}.doc`;
  const buffer = wrapAsWordDoc(html, name);

  try {
    const result = await uploadToSharePoint(user.sharepointFolderPath, filename, buffer, 'application/msword');
    return NextResponse.json({ ok: true, webUrl: result.webUrl }, { headers: CORS });
  } catch (err) {
    const status = err instanceof SharePointError ? err.status : 500;
    const message = err instanceof SharePointError ? err.message : 'Could not save the document to SharePoint.';
    if (!(err instanceof SharePointError)) console.error('SharePoint upload failed:', err);
    return NextResponse.json({ error: message }, { status, headers: CORS });
  }
}
