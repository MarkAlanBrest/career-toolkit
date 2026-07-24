import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { broadcastAuthError, isBroadcastAuthorized } from '@/lib/broadcastAuth';
import { addBroadcast } from '@/lib/broadcastStore';
import { CAMPUSES, getCanvasSelfProfile, sanitizeMessageHtml, sendCanvasConversation, type CampusCode } from '@/lib/canvasBroadcast';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!(await isBroadcastAuthorized(request))) return NextResponse.json(broadcastAuthError(), { status: 401 });
  const input = await request.json().catch(() => null);
  const campus = input?.campus as CampusCode;
  const subject = String(input?.subject || '').trim();
  const body = sanitizeMessageHtml(String(input?.body || '').trim());
  const idempotencyKey = String(input?.idempotencyKey || '');
  if (!(campus in CAMPUSES) || !subject || !body || !idempotencyKey) {
    return NextResponse.json({ error: 'Campus, subject, message, and confirmation token are required.' }, { status: 400 });
  }

  const lockKey = `canvas-broadcast:test-send:${idempotencyKey}`;
  const locked = await redis.set(lockKey, randomUUID(), { nx: true, ex: 600 });
  if (!locked) return NextResponse.json({ error: 'This test has already been submitted.' }, { status: 409 });

  const testSubject = `[TEST] ${subject}`.slice(0, 255);
  const testBody = `<p><strong>TEST MESSAGE — no students received this.</strong></p>${body}`;
  try {
    const recipient = await getCanvasSelfProfile();
    const result = await sendCanvasConversation([recipient.id], testSubject, testBody);
    const record = await addBroadcast({
      campus,
      campusName: CAMPUSES[campus],
      delivery: 'test',
      subject: testSubject,
      body: testBody,
      recipientCount: 1,
      eligibleCourseCount: 0,
      status: result.status,
      sentCount: result.sent,
      failedCount: result.failed,
      errors: result.errors,
    });
    return NextResponse.json({ result, record, recipient }, { status: result.status === 'Failed' ? 502 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send the test message.';
    const record = await addBroadcast({
      campus,
      campusName: CAMPUSES[campus],
      delivery: 'test',
      subject: testSubject,
      body: testBody,
      recipientCount: 1,
      eligibleCourseCount: 0,
      status: 'Failed',
      sentCount: 0,
      failedCount: 1,
      errors: [message],
    });
    return NextResponse.json({ error: message, record }, { status: 502 });
  }
}
