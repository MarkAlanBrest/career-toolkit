import { NextRequest, NextResponse } from 'next/server';
import {
  STUDENT_OAUTH_STATE_COOKIE,
  STUDENT_SESSION_COOKIE,
  createStudentSessionToken,
  exchangeMicrosoftAuthCode,
  getAppUrl,
} from '@/lib/studentPortal';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') || '';
  const state = request.nextUrl.searchParams.get('state') || '';
  const oauthError = request.nextUrl.searchParams.get('error_description') || request.nextUrl.searchParams.get('error') || '';
  const cookieState = request.cookies.get(STUDENT_OAUTH_STATE_COOKIE)?.value || '';

  if (oauthError) {
    return NextResponse.redirect(`${getAppUrl()}/student-portal?auth=denied`);
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${getAppUrl()}/student-portal?auth=invalid`);
  }

  try {
    const profile = await exchangeMicrosoftAuthCode(code);
    const response = NextResponse.redirect(`${getAppUrl()}/student-portal`);
    response.cookies.set(STUDENT_SESSION_COOKIE, await createStudentSessionToken(profile), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60,
    });
    response.cookies.set(STUDENT_OAUTH_STATE_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Microsoft sign-in failed.';
    return NextResponse.redirect(`${getAppUrl()}/student-portal?auth=failed&reason=${encodeURIComponent(message)}`);
  }
}
