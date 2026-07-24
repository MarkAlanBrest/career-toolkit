import { NextRequest, NextResponse } from 'next/server';
import { broadcastAuthError, isBroadcastAuthorized } from '@/lib/broadcastAuth';
import { buildRecipientSnapshot, CAMPUSES, type CampusCode } from '@/lib/canvasBroadcast';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await isBroadcastAuthorized(request))) return NextResponse.json(broadcastAuthError(), { status: 401 });
  const campus = request.nextUrl.searchParams.get('campus') as CampusCode | null;
  if (!campus || !(campus in CAMPUSES)) return NextResponse.json({ error: 'Choose a valid campus.' }, { status: 400 });

  try {
    const cacheKey = `canvas-broadcast:snapshot:${campus}`;
    if (request.nextUrl.searchParams.has('refresh')) await redis.del(cacheKey);
    const cached = await redis.get<Awaited<ReturnType<typeof buildRecipientSnapshot>>>(cacheKey);
    if (cached) return NextResponse.json({ ...cached, studentIds: undefined, cached: true });
    const snapshot = await buildRecipientSnapshot(campus);
    await redis.set(cacheKey, snapshot, { ex: 300 });
    return NextResponse.json({ ...snapshot, studentIds: undefined, cached: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load recipients.' }, { status: 502 });
  }
}
