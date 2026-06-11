import { sql } from '@vercel/postgres';
import { NextRequest } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// Ensure the table exists — runs on first request, no-op after
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS text_alert_signups (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      phone      VARCHAR(20)  NOT NULL,
      class_name VARCHAR(255) NOT NULL,
      teacher    VARCHAR(255) NOT NULL,
      term       VARCHAR(100) NOT NULL,
      opted_in   BOOLEAN      NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;
}

export async function POST(req: NextRequest) {
  let body: { name?: string; phone?: string; className?: string; teacher?: string; term?: string; optIn?: boolean };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: CORS });
  }

  const { name, phone, className, teacher, term, optIn } = body;

  if (!name?.trim() || !phone || !className?.trim() || !teacher?.trim() || !term?.trim()) {
    return new Response(JSON.stringify({ error: 'All fields are required.' }), { status: 400, headers: CORS });
  }
  if (!/^\d{10}$/.test(phone)) {
    return new Response(JSON.stringify({ error: 'Phone must be a 10-digit number.' }), { status: 400, headers: CORS });
  }
  if (!optIn) {
    return new Response(JSON.stringify({ error: 'Opt-in consent is required.' }), { status: 400, headers: CORS });
  }

  try {
    await ensureTable();

    // Check for duplicate: same phone + class
    const existing = await sql`
      SELECT id FROM text_alert_signups
      WHERE phone = ${phone} AND class_name = ${className.trim()}
      LIMIT 1
    `;
    if (existing.rowCount && existing.rowCount > 0) {
      return new Response(
        JSON.stringify({ error: 'This phone number is already signed up for that class.' }),
        { status: 409, headers: CORS }
      );
    }

    await sql`
      INSERT INTO text_alert_signups (name, phone, class_name, teacher, term, opted_in)
      VALUES (${name.trim()}, ${phone}, ${className.trim()}, ${teacher.trim()}, ${term.trim()}, ${optIn})
    `;

    return new Response(JSON.stringify({ ok: true }), { status: 201, headers: CORS });
  } catch (err) {
    console.error('DB error:', err);
    return new Response(JSON.stringify({ error: 'Database error. Please try again.' }), { status: 500, headers: CORS });
  }
}

// GET — teacher view: /api/signup?class=Biology+101&teacher=Mr.+Smith
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const classFilter = searchParams.get('class');
  const teacherFilter = searchParams.get('teacher');

  try {
    await ensureTable();

    let rows;
    if (classFilter && teacherFilter) {
      rows = await sql`
        SELECT id, name, phone, class_name, teacher, term, created_at
        FROM text_alert_signups
        WHERE class_name = ${classFilter} AND teacher = ${teacherFilter}
        ORDER BY created_at DESC
      `;
    } else if (teacherFilter) {
      rows = await sql`
        SELECT id, name, phone, class_name, teacher, term, created_at
        FROM text_alert_signups
        WHERE teacher = ${teacherFilter}
        ORDER BY class_name, created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT id, name, phone, class_name, teacher, term, created_at
        FROM text_alert_signups
        ORDER BY created_at DESC
        LIMIT 500
      `;
    }

    return new Response(JSON.stringify({ signups: rows.rows }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('DB error:', err);
    return new Response(JSON.stringify({ error: 'Database error.' }), { status: 500, headers: CORS });
  }
}
