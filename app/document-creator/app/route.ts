import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/dcAuth';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return NextResponse.redirect(new URL('/document-creator/login', process.env.NEXT_PUBLIC_APP_URL || 'https://career-toolkit-ruby.vercel.app'));

  const session = await getSession(token);
  if (!session) return NextResponse.redirect(new URL('/document-creator/login', process.env.NEXT_PUBLIC_APP_URL || 'https://career-toolkit-ruby.vercel.app'));

  try {
    const html = readFileSync(join(process.cwd(), 'extension', 'Document_Creator.html'), 'utf8');
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new NextResponse('<h1>Document Creator not found.</h1>', { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}
