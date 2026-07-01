import { NextRequest, NextResponse } from 'next/server';
import { getUser, getSchool } from '@/lib/dcAuth';
import { redis } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== 'mb2026tc') return NextResponse.json({ error: 'no' }, { status: 401 });

  const email = req.nextUrl.searchParams.get('email') || 'markalanbrest@gmail.com';
  const amount = parseInt(req.nextUrl.searchParams.get('amount') || '1000', 10);

  const user = await getUser(email.toLowerCase());
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  const school = await getSchool(user.schoolId);
  if (!school) return NextResponse.json({ error: 'school not found' }, { status: 404 });

  const key = `ce:credits:${school.accountId}:ai`;
  const newBalance = await redis.incrby(key, amount);

  return NextResponse.json({ ok: true, email, school: school.name, added: amount, balance: newBalance });
}
