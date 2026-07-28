import { NextRequest, NextResponse } from 'next/server';
import { sendServiceFormEmails } from '@/lib/employerPortalEmail';
import { buildLabeledFieldValues, getServiceFormById } from '@/lib/employerPortalForms';
import {
  EMPLOYER_SESSION_COOKIE,
  addSubmission,
  createEmployerAccount,
  createEmployerSessionToken,
  getEmployerByEmail,
  getEmployerSessionEmail,
  profileFromValues,
  updateEmployerProfile,
} from '@/lib/employerPortalUsers';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeValues(values: Record<string, string>): Record<string, string> {
  const { password, confirmPassword, createAccount, ...rest } = values;
  return rest;
}

async function setSessionCookie(response: NextResponse, email: string) {
  response.cookies.set(EMPLOYER_SESSION_COOKIE, await createEmployerSessionToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const formId = typeof body.formId === 'string' ? body.formId : '';
  const rawValues = body.values && typeof body.values === 'object' && !Array.isArray(body.values)
    ? Object.fromEntries(
      Object.entries(body.values as Record<string, unknown>)
        .filter(([, value]) => typeof value === 'string')
        .map(([key, value]) => [key, (value as string).trim()]),
    )
    : null;
  const createAccount = Boolean(body.createAccount);
  const password = typeof body.password === 'string' ? body.password : '';

  const config = getServiceFormById(formId);
  if (!config || !rawValues) {
    return NextResponse.json({ error: 'Unknown employer service form.' }, { status: 400 });
  }

  const values = sanitizeValues(rawValues);
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

  if (createAccount) {
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Choose a password with at least 8 characters to create an account.' }, { status: 400 });
    }
    if (password !== rawValues.confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }
    const existing = await getEmployerByEmail(contactEmail);
    if (existing) {
      return NextResponse.json({ error: 'An account already exists for this email. Sign in instead.' }, { status: 409 });
    }
  }

  const rows = buildLabeledFieldValues(config, values);
  const sessionEmail = await getEmployerSessionEmail(request);
  const employerEmail = sessionEmail || contactEmail.toLowerCase();

  try {
    const emails = await sendServiceFormEmails({
      formId: config.id,
      recipientKey: config.recipientKey,
      formTitle: config.title,
      contactEmail,
      contactName,
      rows,
      values,
    });

    const allResults = [...emails.internal, emails.confirmation];
    const failed = allResults.filter(result => !result.sent);
    if (failed.length === allResults.length) {
      return NextResponse.json({
        error: failed[0]?.error || 'Could not send your request. Please try again later.',
      }, { status: 502 });
    }

    await addSubmission({
      employerEmail,
      formId: config.id,
      formTitle: config.title,
      values,
      emailSent: failed.length === 0,
    });

    if (sessionEmail) {
      await updateEmployerProfile(sessionEmail, profileFromValues(values, sessionEmail));
    } else if (createAccount) {
      await createEmployerAccount(contactEmail, password, profileFromValues(values, contactEmail));
    }

    const response = NextResponse.json({
      ok: true,
      email: { sent: failed.length === 0, failedCount: failed.length },
      accountCreated: createAccount && !sessionEmail,
    });

    if (createAccount && !sessionEmail) {
      await setSessionCookie(response, contactEmail);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes('account already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('[employer-portal] Service form submission failed:', error);
    return NextResponse.json({ error: 'Could not submit your request. Please try again.' }, { status: 500 });
  }
}
