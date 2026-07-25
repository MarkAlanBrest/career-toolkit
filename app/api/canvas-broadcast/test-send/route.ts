import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { broadcastAuthError, isBroadcastAuthorized } from '@/lib/broadcastAuth';
import { addBroadcast } from '@/lib/broadcastStore';
import { announcementExpiryDate, scheduleAnnouncementExpiry } from '@/lib/broadcastExpiry';
import {
  CAMPUSES,
  getCanvasTestCourse,
  sanitizeMessageHtml,
  sendCanvasAnnouncements,
  sendCanvasInboxMessages,
  type CampusCode,
  type SendResult,
} from '@/lib/canvasBroadcast';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!(await isBroadcastAuthorized(request))) return NextResponse.json(broadcastAuthError(), { status: 401 });
  const input = await request.json().catch(() => null);
  const campus = input?.campus as CampusCode;
  const subject = String(input?.subject || '').trim();
  const body = sanitizeMessageHtml(String(input?.body || '').trim());
  const courseUrl = String(input?.courseUrl || '').trim();
  const idempotencyKey = String(input?.idempotencyKey || '');
  const delivery = input?.delivery as 'inbox' | 'announcement' | 'both' | undefined;
  if (!(campus in CAMPUSES) || !['inbox', 'announcement', 'both'].includes(delivery || '')
    || !subject || !body || !courseUrl || !idempotencyKey) {
    return NextResponse.json({ error: 'Delivery method, test course URL, subject, message, and confirmation token are required.' }, { status: 400 });
  }

  const lockKey = `canvas-broadcast:test-send:${idempotencyKey}`;
  const locked = await redis.set(lockKey, randomUUID(), { nx: true, ex: 600 });
  if (!locked) return NextResponse.json({ error: 'This test has already been submitted.' }, { status: 409 });

  const testSubject = `[TEST] ${subject}`.slice(0, 255);
  const testBody = `<p><strong>TEST MESSAGE</strong></p>${body}`;
  let testCourse: Awaited<ReturnType<typeof getCanvasTestCourse>> | null = null;
  try {
    testCourse = await getCanvasTestCourse(courseUrl);
    if (testCourse.activeStudentCount > 1) {
      throw new Error(`Test blocked: “${testCourse.name}” has ${testCourse.activeStudentCount} active students. Use a course with no more than one active student.`);
    }
    if ((delivery === 'inbox' || delivery === 'both') && testCourse.activeStudentCount !== 1) {
      throw new Error(`Email test blocked: “${testCourse.name}” must have exactly one active student so Canvas has a private Inbox recipient.`);
    }
    const announcementResult = delivery === 'announcement' || delivery === 'both'
      ? await sendCanvasAnnouncements([{ id: testCourse.id, name: testCourse.name }], testSubject, testBody)
      : null;
    const inboxResult = delivery === 'inbox' || delivery === 'both'
      ? await sendCanvasInboxMessages(testCourse.studentIds, testSubject, testBody)
      : null;
    const results = [
      announcementResult && { label: 'Announcement', result: announcementResult },
      inboxResult && { label: 'Inbox', result: inboxResult },
    ].filter(Boolean) as Array<{ label: string; result: SendResult }>;
    const sent = results.reduce((total, item) => total + item.result.sent, 0);
    const failed = results.reduce((total, item) => total + item.result.failed, 0);
    const errors = results.flatMap(item => item.result.errors.map(error => `${item.label}: ${error}`));
    const result: SendResult = {
      status: failed === 0 && errors.length === 0 ? 'Sent' : sent > 0 ? 'Partial failure' : 'Failed',
      sent,
      failed,
      errors,
      announcementRefs: announcementResult?.announcementRefs || [],
    };
    const broadcastId = randomUUID();
    const expiresAt = result.announcementRefs?.length ? announcementExpiryDate() : undefined;
    if (result.announcementRefs?.length) {
      await scheduleAnnouncementExpiry(broadcastId, result.announcementRefs);
    }
    const record = await addBroadcast({
      campus,
      campusName: CAMPUSES[campus],
      delivery: 'test',
      subject: testSubject,
      body: testBody,
      recipientCount: testCourse.activeStudentCount,
      eligibleCourseCount: 1,
      status: result.status,
      sentCount: result.sent,
      failedCount: result.failed,
      errors: result.errors,
      announcementRefs: result.announcementRefs,
      expiresAt,
    }, broadcastId);
    return NextResponse.json({ result, record, course: testCourse }, { status: result.status === 'Failed' ? 502 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to post the test announcement.';
    const record = await addBroadcast({
      campus,
      campusName: CAMPUSES[campus],
      delivery: 'test',
      subject: testSubject,
      body: testBody,
      recipientCount: testCourse?.activeStudentCount || 0,
      eligibleCourseCount: testCourse ? 1 : 0,
      status: 'Failed',
      sentCount: 0,
      failedCount: 1,
      errors: [message],
    });
    return NextResponse.json({ error: message, record }, { status: 400 });
  }
}
