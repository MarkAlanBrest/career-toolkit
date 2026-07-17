import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/lgaRoom';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email || null;
  const password = body?.password || null;

  if (!(await isAdminAuthorized(email, password))) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
