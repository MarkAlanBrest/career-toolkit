import { NextRequest, NextResponse } from 'next/server';
import {
  STUDENT_SESSION_COOKIE,
  deleteStudentSession,
  getStudentSession,
} from '@/lib/studentPortal';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const profile = await getStudentSession(request);
  if (!profile) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, profile });
}

export async function DELETE(request: NextRequest) {
  await deleteStudentSession(request);
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(STUDENT_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
