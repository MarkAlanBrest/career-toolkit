import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export const BROADCAST_SESSION_COOKIE = 'canvas_broadcast_session';
export const BROADCAST_SESSION_SECONDS = 60 * 60 * 8;

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function credentials() {
  return {
    email: process.env.CANVAS_BROADCAST_ADMIN_EMAIL?.trim().toLowerCase() || '',
    password: process.env.CANVAS_BROADCAST_ADMIN_PASSWORD || '',
  };
}

function signature(payload: string, password: string) {
  return createHmac('sha256', password).update(payload).digest('base64url');
}

export function validateBroadcastLogin(email: string, password: string): boolean {
  const configured = credentials();
  if (!configured.email || !configured.password) return false;
  return safeEqual(email.trim().toLowerCase(), configured.email) && safeEqual(password, configured.password);
}

export function createBroadcastSession(): string {
  const configured = credentials();
  const payload = Buffer.from(JSON.stringify({
    email: configured.email,
    expiresAt: Date.now() + BROADCAST_SESSION_SECONDS * 1000,
  })).toString('base64url');
  return `${payload}.${signature(payload, configured.password)}`;
}

export function isBroadcastAuthorized(request: NextRequest): boolean {
  const configured = credentials();
  if (!configured.email || !configured.password) return false;
  const token = request.cookies.get(BROADCAST_SESSION_COOKIE)?.value || '';
  const separator = token.lastIndexOf('.');
  if (separator < 1) return false;
  const payload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  if (!safeEqual(suppliedSignature, signature(payload, configured.password))) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: string; expiresAt?: number };
    return safeEqual(session.email || '', configured.email) && Number(session.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export function broadcastAuthError() {
  const configured = credentials();
  return {
    error: configured.email && configured.password
      ? 'Please sign in to continue.'
      : 'Set CANVAS_BROADCAST_ADMIN_EMAIL and CANVAS_BROADCAST_ADMIN_PASSWORD on the server.',
  };
}
