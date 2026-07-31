import { NextRequest, NextResponse } from 'next/server';
import {
  createOutlookHandoffToken,
  estimateHandoffBytes,
  loadOutlookHandoff,
  OUTLOOK_HANDOFF_MAX_ATTACHMENTS,
  OUTLOOK_HANDOFF_MAX_BYTES,
  OutlookHandoffAttachment,
  OutlookHandoffPayload,
  saveOutlookHandoff,
} from '@/lib/resumeSearch/outlookHandoff';

export const maxDuration = 60;

function isValidAttachment(value: unknown): value is OutlookHandoffAttachment {
  if (!value || typeof value !== 'object') return false;
  const attachment = value as OutlookHandoffAttachment;
  return (
    typeof attachment.name === 'string' &&
    attachment.name.trim().length > 0 &&
    typeof attachment.mimeType === 'string' &&
    attachment.mimeType.trim().length > 0 &&
    typeof attachment.dataBase64 === 'string' &&
    attachment.dataBase64.length > 0
  );
}

function normalizePayload(body: Record<string, unknown>): OutlookHandoffPayload | null {
  const html = typeof body.html === 'string' ? body.html : undefined;
  const subject = typeof body.subject === 'string' ? body.subject.trim() : undefined;
  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter(isValidAttachment)
    : [];

  if (!html && attachments.length === 0) {
    return null;
  }

  return {
    html,
    subject: subject || undefined,
    attachments,
    createdAt: Date.now(),
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid handoff payload.' }, { status: 400 });
  }

  const payload = normalizePayload(body as Record<string, unknown>);
  if (!payload) {
    return NextResponse.json(
      { error: 'Provide employer email HTML and/or at least one resume attachment.' },
      { status: 400 },
    );
  }

  if (payload.attachments.length > OUTLOOK_HANDOFF_MAX_ATTACHMENTS) {
    return NextResponse.json(
      { error: `Attach up to ${OUTLOOK_HANDOFF_MAX_ATTACHMENTS} resumes at a time.` },
      { status: 400 },
    );
  }

  const estimatedBytes = estimateHandoffBytes(payload);
  if (estimatedBytes > OUTLOOK_HANDOFF_MAX_BYTES) {
    return NextResponse.json(
      {
        error:
          'This handoff is too large for Outlook auto-insert. Try fewer resumes, or use the Outlook helper directly inside Outlook.',
      },
      { status: 413 },
    );
  }

  const token = createOutlookHandoffToken();
  await saveOutlookHandoff(token, payload);

  return NextResponse.json({
    token,
    expiresInSeconds: 15 * 60,
    outlookUrl: `https://outlook.office.com/mail/deeplink/compose#ncstHandoff=${encodeURIComponent(token)}`,
  });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: 'Handoff token is required.' }, { status: 400 });
  }

  const payload = await loadOutlookHandoff(token, true);
  if (!payload) {
    return NextResponse.json(
      { error: 'This Outlook handoff is missing or has expired.' },
      { status: 404 },
    );
  }

  return NextResponse.json(payload);
}
