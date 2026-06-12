import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

const redis = Redis.fromEnv();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type Signup = {
  id: number;
  name: string;
  phone: string;
  className: string;
  courseId: string;
  optIn: boolean;
};

type TextMessage = {
  studentName?: string;
  subject?: string;
  body?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function parseSignup(raw: string | Signup): Signup {
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function normalizeName(name: string | undefined) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function compactText(msg: TextMessage) {
  const subject = msg.subject?.trim();
  const body = msg.body?.trim() || '';
  const text = subject ? `${subject}\n${body}` : body;
  return text.replace(/\n{3,}/g, '\n\n').slice(0, 1000);
}

async function sendTwilioSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    throw new Error('Text messaging is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.');
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: from,
      To: `+1${to.replace(/\D/g, '')}`,
      Body: body,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`SMS provider error: ${res.status} ${detail}`);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: { courseId?: string; messages?: TextMessage[] };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  const courseId = body.courseId?.trim();
  const messages = body.messages || [];
  if (!courseId) return json({ error: 'Missing courseId.' }, 400);
  if (!messages.length) return json({ error: 'No text messages provided.' }, 400);

  const raw = await redis.lrange<string | Signup>('text-signups', 0, -1);
  const signups = raw
    .map(parseSignup)
    .filter(s => s.optIn && String(s.courseId || '') === courseId && /^\d{10}$/.test(String(s.phone || '')));

  let sent = 0;
  let skipped = 0;
  const failures: Array<{ name: string; error: string }> = [];

  for (const msg of messages) {
    const name = normalizeName(msg.studentName);
    const signup = signups.find(s => normalizeName(s.name) === name);
    if (!signup) { skipped++; continue; }
    try {
      await sendTwilioSms(signup.phone, compactText(msg));
      sent++;
    } catch (err) {
      failures.push({ name: msg.studentName || signup.name || 'Student', error: err instanceof Error ? err.message : String(err) });
    }
  }

  const status = failures.length && !sent ? 500 : 200;
  return json({ sent, skipped, failed: failures.length, failures }, status);
}
