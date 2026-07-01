import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const CHECK_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  vocab: 'Vocabulary / Key Terms',
  discussion: 'Discussion post',
  written: 'Written / reflection assignment',
  group: 'Group project',
  reading: 'Reading / article activity',
  video: 'Video activity',
  midterm: 'Midterm exam',
};

type FileRef = { name: string; url: string };
type ModulePayload = {
  name: string;
  description: string;
  notes: string;
  checks: Record<string, boolean>;
  files: FileRef[];
};
type Payload = {
  teacherName: string;
  teacherEmail: string;
  classInfo: {
    className: string;
    subject?: string;
    gradeLevel?: string;
    description?: string;
    specialNotes?: string;
    syllabusUrl?: string;
  };
  modules: ModulePayload[];
};

function buildHtml(d: Payload): string {
  const { teacherName, teacherEmail, classInfo, modules } = d;

  const moduleRows = modules.map((mod, i) => {
    const included = Object.entries(mod.checks)
      .filter(([, v]) => v)
      .map(([k]) => CHECK_LABELS[k] || k);

    const filesBlock = mod.files.length
      ? `<p style="margin:8px 0 4px;"><strong>Files:</strong></p>
         <ul style="margin:0;padding-left:18px;">${mod.files.map(f => `<li><a href="${f.url}">${f.name}</a></li>`).join('')}</ul>`
      : '';

    const notesBlock = mod.notes
      ? `<p style="margin:8px 0 4px;"><strong>Notes:</strong></p>
         <pre style="margin:0;background:#F3F4F6;padding:10px 12px;border-radius:4px;font-size:13px;white-space:pre-wrap;font-family:inherit;">${mod.notes}</pre>`
      : '';

    return `<div style="margin-bottom:20px;padding:16px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;">
      <h3 style="margin:0 0 8px;font-size:15px;color:#1B303D;">Module ${i + 1}: ${mod.name}</h3>
      ${mod.description ? `<p style="margin:0 0 8px;color:#374151;">${mod.description}</p>` : ''}
      ${included.length ? `<p style="margin:0 0 8px;"><strong>Include:</strong> ${included.join(', ')}</p>` : ''}
      ${notesBlock}
      ${filesBlock}
    </div>`;
  }).join('');

  const syllabusRow = classInfo.syllabusUrl
    ? `<tr><td style="padding:5px 0;color:#6B7280;width:110px;">Syllabus</td><td style="padding:5px 0;"><a href="${classInfo.syllabusUrl}">Download</a></td></tr>`
    : '';

  const notesBox = classInfo.specialNotes
    ? `<div style="margin:16px 0;padding:12px;background:#FFF9C4;border:1px solid #FCD34D;border-radius:6px;">
        <strong>Special Notes:</strong>
        <p style="margin:6px 0;">${classInfo.specialNotes}</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;color:#1B303D;">
  <div style="background:#0770B8;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;">New Canvas Class Build Request</h1>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;">
    <h2 style="margin:0 0 14px;color:#0770B8;">${classInfo.className}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr><td style="padding:5px 0;color:#6B7280;width:110px;">Teacher</td><td style="padding:5px 0;font-weight:600;">${teacherName}</td></tr>
      <tr><td style="padding:5px 0;color:#6B7280;">Email</td><td style="padding:5px 0;"><a href="mailto:${teacherEmail}">${teacherEmail}</a></td></tr>
      ${classInfo.subject ? `<tr><td style="padding:5px 0;color:#6B7280;">Subject</td><td style="padding:5px 0;">${classInfo.subject}</td></tr>` : ''}
      ${classInfo.gradeLevel ? `<tr><td style="padding:5px 0;color:#6B7280;">Level</td><td style="padding:5px 0;">${classInfo.gradeLevel}</td></tr>` : ''}
      ${syllabusRow}
    </table>
    ${classInfo.description ? `<p style="margin:0 0 12px;"><strong>Description:</strong> ${classInfo.description}</p>` : ''}
    ${notesBox}
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0;">
    <h2 style="margin:0 0 16px;font-size:16px;">${modules.length} Module${modules.length !== 1 ? 's' : ''}</h2>
    ${moduleRows}
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  let data: Payload;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: CORS });
  }

  if (!data.teacherName || !data.teacherEmail || !data.classInfo?.className) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400, headers: CORS });
  }
  if (!data.modules?.length) {
    return NextResponse.json({ error: 'At least one module is required.' }, { status: 400, headers: CORS });
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Canvas Class Builder <onboarding@resend.dev>',
    to: 'markalanbrest@gmail.com',
    replyTo: data.teacherEmail,
    subject: `New Canvas Class Build — ${data.classInfo.className}`,
    html: buildHtml(data),
  });

  if (error) {
    console.error('[build-a-class/submit] Resend error:', error);
    return NextResponse.json({ error: 'Failed to send. Please try again.' }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ ok: true }, { headers: CORS });
}
