import 'server-only';
import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export function isBroadcastAuthorized(request: NextRequest): boolean {
  const configured = process.env.CANVAS_BROADCAST_ADMIN_PASSWORD || process.env.OWNER_KEY;
  if (!configured) return false;
  const supplied = request.headers.get('x-broadcast-key') || '';
  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export function broadcastAuthError() {
  const configured = process.env.CANVAS_BROADCAST_ADMIN_PASSWORD || process.env.OWNER_KEY;
  return {
    error: configured
      ? 'The administrator access key is incorrect.'
      : 'Set CANVAS_BROADCAST_ADMIN_PASSWORD (or OWNER_KEY) on the server before using this tool.',
  };
}
