import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { broadcastAuthError, isBroadcastAuthorized } from '@/lib/broadcastAuth';
import { addBroadcast } from '@/lib/broadcastStore';
import { CAMPUSES, getCanvasTestCourse, sanitizeMessageHtml, sendCanvasAnnouncements, type CampusCode } from '@/lib/canvasBroadcast';
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
  if (!(campus in CAMPUSES) || !subject || !body || !courseUrl || !idempotencyKey) {
    return NextResponse.json({ error: 'Test course URL, subject, message, and confirmation token are required.' }, { status: 400 });
  }

  const lockKey = `canvas-broadcast:test-send:${idempotencyKey}`;
  const locked = await redis.set(lockKey, randomUUID(), { nx: true, ex: 600 });
  if (!locked) return NextResponse.json({ error: 'This test has already been submitted.' }, { status: 409 });

  const testSubject = `[TEST] ${subject}`.slice(0, 255);
  const testBody = `<p><strong>TEST ANNOUNCEMENT</strong></p>${body}`;
  let testCourse: Awaited<ReturnType<typeof getCanvasTestCourse>> | null = null;
  try {
    testCourse = await getCanvasTestCourse(courseUrl);
    if (testCourse.activeStudentCount > 1) {
      throw new Error(`Test blocked: “${testCourse.name}” has ${testCourse.activeStudentCount} active students. Use a course with no more than one active student.`);
    }
    const result = await sendCanvasAnnouncements(
      [{ id: testCourse.id, name: testCourse.name }],
      testSubject,
      testBody,
    );
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
    });
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
