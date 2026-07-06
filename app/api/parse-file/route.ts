import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const MAX_PARSED_CHARS = 70000;
const LARGE_FILE_HEAD_CHARS = 48000;
const LARGE_FILE_TAIL_CHARS = 18000;

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

// Use Mozilla's actively-maintained pdfjs-dist first. pdf-parse bundles a much older pdf.js
// engine that fails on some real-world PDFs, including files that newer pdfjs-dist can recover.
async function extractTextFromPdfDocument(doc: any): Promise<string> {
  let text = '';
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ') + '\n\n';
    }
  } finally {
    await doc.destroy?.();
  }
  return text;
}

async function extractPdfTextWithPdfjs(buffer: Buffer, withAssets: boolean): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const options: any = {
    data,
    stopAtErrors: false,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
    disableFontFace: true,
    useSystemFonts: false,
    useWorkerFetch: false,
  };

  if (withAssets) {
    const path = await import('path');
    const { pathToFileURL } = await import('url');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkgPath = require.resolve('pdfjs-dist/package.json');
    const pkgDir = path.dirname(pkgPath);
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(pkgDir, 'legacy/build/pdf.worker.mjs')).href;
    options.standardFontDataUrl = pathToFileURL(path.join(pkgDir, 'standard_fonts') + path.sep).href;
    options.cMapUrl = pathToFileURL(path.join(pkgDir, 'cmaps') + path.sep).href;
    options.cMapPacked = true;
  }

  const doc = await pdfjs.getDocument(options).promise;
  return extractTextFromPdfDocument(doc);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const errors: string[] = [];
  for (const withAssets of [false, true]) {
    try {
      return await extractPdfTextWithPdfjs(buffer, withAssets);
    } catch (err: any) {
      errors.push(err?.message || String(err));
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(Buffer.from(buffer));
    return data.text;
  } catch (err: any) {
    errors.push(err?.message || String(err));
  }

  throw new Error(`PDF text extraction failed after ${errors.length} attempts: ${errors.join(' | ')}`);
}

// Files named ".doc"/".docx" in the wild aren't always real Word documents — sniff the actual
// bytes rather than trusting the filename/mimetype, since each format needs a different reader.
function isZipFile(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}
function isOleFile(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
}
function isRtfFile(buffer: Buffer): boolean {
  return buffer.slice(0, 5).toString('latin1') === '{\\rtf';
}
function looksLikeHtml(buffer: Buffer): boolean {
  return /^\s*<(!doctype|html)/i.test(buffer.slice(0, 512).toString('utf8'));
}

// A best-effort flatten of an RTF document tree into plain text — good enough for feeding an
// AI prompt, even though rtf-parser doesn't support every RTF feature (e.g. tables).
async function extractRtfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const parseRTF = require('rtf-parser');
  const doc: any = await new Promise((resolve, reject) => {
    parseRTF.string(buffer.toString('binary'), (err: any, result: any) => (err ? reject(err) : resolve(result)));
  });
  return (doc.content || [])
    .map((paragraph: any) => (paragraph.content ? paragraph.content.map((span: any) => span.value || '').join('') : (paragraph.value || '')))
    .join('\n\n')
    .trim();
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function limitParsedText(text: string, filename: string): { text: string; originalChars: number; truncated: boolean } {
  const clean = text.trim();
  if (clean.length <= MAX_PARSED_CHARS) {
    return { text: clean, originalChars: clean.length, truncated: false };
  }

  const head = clean.slice(0, LARGE_FILE_HEAD_CHARS).trimEnd();
  const tail = clean.slice(-LARGE_FILE_TAIL_CHARS).trimStart();
  const omitted = clean.length - head.length - tail.length;
  const label = filename || 'submitted file';
  return {
    originalChars: clean.length,
    truncated: true,
    text: [
      `[Large file excerpt for ${label}]`,
      `The original parsed text was ${clean.length.toLocaleString()} characters. The middle ${Math.max(0, omitted).toLocaleString()} characters were omitted so the grader can process the submission reliably.`,
      '',
      '[Beginning of submission]',
      head,
      '',
      '[Middle omitted]',
      '',
      '[End of submission]',
      tail,
    ].join('\n'),
  };
}

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
      const fileRes = await fetch(incomingFileUrl, { headers, signal: AbortSignal.timeout(45000) });
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
      text = await extractPdfText(buffer);
    } else if (isDocx && isZipFile(buffer)) {
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
    } else if (isDocx && isOleFile(buffer)) {
      // Legacy Word 97-2003 .doc (OLE binary, not a ZIP) — mammoth can't read these at all.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const WordExtractor = require('word-extractor');
      const extractor = new WordExtractor();
      const doc = await extractor.extract(buffer);
      text = doc.getBody();
    } else if (isDocx && isRtfFile(buffer)) {
      // Files saved from web templates or older tools are often actually RTF despite the .doc name.
      text = await extractRtfText(buffer);
    } else if (isDocx && looksLikeHtml(buffer)) {
      // "Save as Word Document" from a web page frequently produces plain HTML with a .doc name.
      text = htmlToStructuredText(buffer.toString('utf8'));
    } else if (isDocx) {
      throw new Error("This file isn't a real Word document (or RTF/HTML export) — it may be corrupted or a different file type renamed to .doc/.docx. Try re-saving it from Word, or paste the text directly.");
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

  const limited = limitParsedText(text, filename);
  return NextResponse.json(limited, { headers: CORS });
}
