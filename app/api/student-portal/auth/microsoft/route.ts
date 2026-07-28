import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import {
  STUDENT_OAUTH_STATE_COOKIE,
  buildMicrosoftAuthorizeUrl,
  getAppUrl,
  getStudentPortalMicrosoftConfig,
} from '@/lib/studentPortal';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getStudentPortalMicrosoftConfig();
  if (!config.tenantId || !config.clientId) {
    return NextResponse.redirect(`${getAppUrl()}/student-portal?auth=not-configured`);
  }

  const state = randomBytes(24).toString('base64url');
  const response = NextResponse.redirect(buildMicrosoftAuthorizeUrl(state));
  response.cookies.set(STUDENT_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}
