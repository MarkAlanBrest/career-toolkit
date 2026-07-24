import { NextRequest, NextResponse } from 'next/server';
import { broadcastAuthError, isBroadcastAuthorized } from '@/lib/broadcastAuth';
import { listBroadcasts } from '@/lib/broadcastStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isBroadcastAuthorized(request)) return NextResponse.json(broadcastAuthError(), { status: 401 });
  return NextResponse.json({ broadcasts: await listBroadcasts() });
}
