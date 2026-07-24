import { NextRequest, NextResponse } from 'next/server';
import { broadcastAuthError, isBroadcastAuthorized } from '@/lib/broadcastAuth';
import { deleteTemplate, listTemplates, saveTemplate } from '@/lib/broadcastStore';
import { sanitizeMessageHtml } from '@/lib/canvasBroadcast';

export const dynamic = 'force-dynamic';

function invalid(input: any) {
  return !input || !String(input.name || '').trim() || !String(input.subject || '').trim() || !String(input.body || '').trim();
}

export async function GET(request: NextRequest) {
  if (!isBroadcastAuthorized(request)) return NextResponse.json(broadcastAuthError(), { status: 401 });
  return NextResponse.json({ templates: await listTemplates() });
}

export async function POST(request: NextRequest) {
  if (!isBroadcastAuthorized(request)) return NextResponse.json(broadcastAuthError(), { status: 401 });
  const input = await request.json().catch(() => null);
  if (invalid(input)) return NextResponse.json({ error: 'Template name, subject, and message are required.' }, { status: 400 });
  const template = await saveTemplate({
    id: input.id ? String(input.id) : undefined,
    name: String(input.name).trim().slice(0, 100),
    subject: String(input.subject).trim().slice(0, 255),
    body: sanitizeMessageHtml(String(input.body).slice(0, 50000)),
  });
  return NextResponse.json({ template });
}

export async function DELETE(request: NextRequest) {
  if (!isBroadcastAuthorized(request)) return NextResponse.json(broadcastAuthError(), { status: 401 });
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Template ID is required.' }, { status: 400 });
  const deleted = await deleteTemplate(id);
  return NextResponse.json({ deleted }, { status: deleted ? 200 : 404 });
}
