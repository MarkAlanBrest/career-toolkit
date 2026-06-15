import { NextRequest, NextResponse } from 'next/server';

function htmlToStructuredText(html: string): string {
  // Process ordered lists first — give each <li> inside <ol> a number
  let result = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, inner) => {
    let n = 0;
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_li, content) => {
      n++;
      return `\n[NUMBERED LIST ITEM ${n}] ${content}`;
    });
  });
  // Process unordered lists
  result = result.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, inner) =>
    inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_li: string, content: string) => `\n• ${content}`)
  );
  // Any remaining bare <li> (e.g. List Paragraph style mapped to li)
  result = result.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1');

  return result
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n[HEADING 1] $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n[HEADING 2] $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n[HEADING 3] $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n[HEADING 4] $1\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n\n[HEADING 5] $1\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n\n[HEADING 6] $1\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n[QUOTE] $1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
    .replace(/<p[^>]*class="[^"]*caption[^"]*"[^>]*>(.*?)<\/p>/gi, '\n[Caption: $1]\n')
    .replace(/<p[^>]*class="[^"]*indent[^"]*"[^>]*>(.*?)<\/p>/gi, '\n  $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<th[^>]*>(.*?)<\/th>/gi, ' | **$1** |')
    .replace(/<td[^>]*>(.*?)<\/td>/gi, ' | $1')
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: CORS });

  const { b64, fileUrl: incomingFileUrl, filename = '', mimeType = '', token = '' } = body;

  if (!b64 && !incomingFileUrl) return NextResponse.json({ error: 'No file data provided' }, { status: 400, headers: CORS });

  let buffer: Buffer;
  try {
    if (incomingFileUrl) {
      // Vercel fetches file directly (e.g. S3 signed URL) — avoids large base64 body → 413
      const fileUrl = new URL(incomingFileUrl);
      const isCanvasHost = /(?:^|\.)(instructure|canvas|canvaslms)\.com$/i.test(fileUrl.hostname);
      const headers = token && isCanvasHost ? { Authorization: `Bearer ${token}` } : undefined;
      const fileRes = await fetch(incomingFileUrl, { headers });
      if (!fileRes.ok) throw new Error(`Could not fetch file: HTTP ${fileRes.status}`);
      buffer = Buffer.from(await fileRes.arrayBuffer());
    } else {
      buffer = Buffer.from(b64, 'base64');
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid file data' }, { status: 400, headers: CORS });
  }

  const fname = filename.toLowerCase();
  const mime  = mimeType.toLowerCase();
  const isPdf  = mime.includes('pdf')  || fname.endsWith('.pdf');
  const isDocx = mime.includes('word') || mime.includes('officedocument') || fname.endsWith('.docx') || fname.endsWith('.doc');
  const isXlsx = mime.includes('spreadsheet') || mime.includes('excel') || fname.endsWith('.xlsx') || fname.endsWith('.xls');

  let text = '';
  try {
    if (isPdf) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (isDocx) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      const styleMap = [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "p[style-name='List Paragraph'] => li:fresh",
        "p[style-name='Quote'] => blockquote:fresh",
        "p[style-name='Intense Quote'] => blockquote:fresh",
        "p[style-name='Caption'] => p.caption:fresh",
        "p[style-name='Normal Indent'] => p.indent:fresh",
        "p[style-name='Body Text Indent'] => p.indent:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
      ];
      const result = await mammoth.convertToHtml({ buffer }, { styleMap });
      text = htmlToStructuredText(result.value);
    } else if (isXlsx) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const xlsx = require('xlsx');
      const workbook = xlsx.read(buffer);
      text = (workbook.SheetNames as string[])
        .map((name: string) => xlsx.utils.sheet_to_csv(workbook.Sheets[name]))
        .join('\n\n');
    } else {
      text = buffer.toString('utf-8');
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Could not parse ${fname || 'file'}: ${err.message}` },
      { status: 500, headers: CORS }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: 'File parsed but no text could be extracted. Try copying and pasting the rubric text instead.' },
      { status: 422, headers: CORS }
    );
  }

  return NextResponse.json({ text: text.trim() }, { headers: CORS });
}
