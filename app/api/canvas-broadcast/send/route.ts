import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { broadcastAuthError, isBroadcastAuthorized } from '@/lib/broadcastAuth';
import { addBroadcast } from '@/lib/broadcastStore';
import { buildRecipientSnapshot, CAMPUSES, sanitizeMessageHtml, sendCanvasAnnouncements, type CampusCode } from '@/lib/canvasBroadcast';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (!(await isBroadcastAuthorized(request))) return NextResponse.json(broadcastAuthError(), { status: 401 });
  const input = await request.json().catch(() => null);
  const campus = input?.campus as CampusCode | undefined;
  const subject = String(input?.subject || '').trim();
  const body = sanitizeMessageHtml(String(input?.body || '').trim());
  const idempotencyKey = String(input?.idempotencyKey || '');
  const expectedCourseIds = Array.isArray(input?.expectedCourseIds)
    ? input.expectedCourseIds.map(Number).filter(Number.isFinite).sort((a: number, b: number) => a - b)
    : [];
  const delivery = 'announcement' as const;
  if (!campus || !(campus in CAMPUSES) || !subject || !body || !idempotencyKey || !expectedCourseIds.length) {
    return NextResponse.json({ error: 'Campus, reviewed course list, subject, message, and confirmation token are required.' }, { status: 400 });
  }
  if (subject.length > 255 || body.length > 50000) {
    return NextResponse.json({ error: 'The subject or message is too long.' }, { status: 400 });
  }

  const lockKey = `canvas-broadcast:send:${idempotencyKey}`;
  const locked = await redis.set(lockKey, randomUUID(), { nx: true, ex: 600 });
  if (!locked) return NextResponse.json({ error: 'This broadcast has already been submitted.' }, { status: 409 });

  try {
    // Recalculate at send time so the confirmation is never used with a stale recipient list.
    const snapshot = await buildRecipientSnapshot(campus);
    const currentCourseIds = snapshot.courses.map(course => course.id).sort((a, b) => a - b);
    if (currentCourseIds.length !== expectedCourseIds.length
      || currentCourseIds.some((id, index) => id !== expectedCourseIds[index])) {
      return NextResponse.json({
        error: 'The eligible course list changed after your review. Refresh the campus data and review the courses again before posting.',
      }, { status: 409 });
    }
    if (!snapshot.studentCount) {
      const record = await addBroadcast({
        campus,
        campusName: snapshot.campusName,
        delivery,
        subject,
        body,
        recipientCount: 0,
        eligibleCourseCount: snapshot.courseCount,
        status: 'Failed',
        sentCount: 0,
        failedCount: 0,
        errors: ['No active students were eligible when the recipient list was recalculated.'],
      });
      return NextResponse.json({ error: 'No active students are eligible for this campus.', record }, { status: 400 });
    }
    const result = await sendCanvasAnnouncements(snapshot.courses, subject, body);
    const record = await addBroadcast({
      campus,
      campusName: snapshot.campusName,
      delivery,
      subject,
      body,
      recipientCount: snapshot.studentCount,
      eligibleCourseCount: snapshot.courseCount,
      status: result.status,
      sentCount: result.sent,
      failedCount: result.failed,
      errors: result.errors,
    });
    await redis.del(`canvas-broadcast:snapshot:created-6-months:${campus}`);
    return NextResponse.json({ result, record }, { status: result.status === 'Failed' ? 502 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Broadcast failed before Canvas accepted it.';
    const record = await addBroadcast({
      campus,
      campusName: CAMPUSES[campus],
      delivery,
      subject,
      body,
      recipientCount: 0,
      eligibleCourseCount: 0,
      status: 'Failed',
      sentCount: 0,
      failedCount: 0,
      errors: [message],
    });
    return NextResponse.json({ error: message, record }, { status: 502 });
  }
}
