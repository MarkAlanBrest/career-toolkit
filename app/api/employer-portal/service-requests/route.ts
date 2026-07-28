import { NextRequest, NextResponse } from 'next/server';
import { buildLabeledFieldValues, getServiceFormById } from '@/lib/employerPortalForms';
import { sendServiceFormEmails } from '@/lib/employerPortalEmail';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const formId = typeof body.formId === 'string' ? body.formId : '';
  const values = body.values && typeof body.values === 'object' && !Array.isArray(body.values)
    ? Object.fromEntries(
      Object.entries(body.values as Record<string, unknown>)
        .filter(([, value]) => typeof value === 'string')
        .map(([key, value]) => [key, (value as string).trim()]),
    )
    : null;

  const config = getServiceFormById(formId);
  if (!config || !values) {
    return NextResponse.json({ error: 'Unknown employer service form.' }, { status: 400 });
  }

  const employerName = values.employerName || '';
  const contactName = values.contactName || '';
  const contactEmail = values.contactEmail || '';

  if (!employerName) {
    return NextResponse.json({ error: 'Employer name is required.' }, { status: 400 });
  }
  if (!contactName) {
    return NextResponse.json({ error: 'Contact name is required.' }, { status: 400 });
  }
  if (!contactEmail || !EMAIL_RE.test(contactEmail)) {
    return NextResponse.json({ error: 'A valid contact email is required.' }, { status: 400 });
  }

  const rows = buildLabeledFieldValues(config, values);

  try {
    const emails = await sendServiceFormEmails({
      recipientKey: config.recipientKey,
      formTitle: config.title,
      contactEmail,
      contactName,
      rows,
    });

    const allResults = [...emails.internal, emails.confirmation];
    const failed = allResults.filter(result => !result.sent);
    if (failed.length === allResults.length) {
      return NextResponse.json({
        error: failed[0]?.error || 'Could not send your request. Please try again later.',
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      email: { sent: failed.length === 0, failedCount: failed.length },
    });
  } catch (error) {
    console.error('[employer-portal] Service form submission failed:', error);
    return NextResponse.json({ error: 'Could not submit your request. Please try again.' }, { status: 500 });
  }
}
