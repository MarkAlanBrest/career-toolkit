import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/lgaRoom';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (!isAdminAuthorized(password)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
