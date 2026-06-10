import { NextRequest, NextResponse } from 'next/server';

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

  const { b64, filename = '', mimeType = '' } = body;

  if (!b64) return NextResponse.json({ error: 'No file data provided' }, { status: 400, headers: CORS });

  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, 'base64');
  } catch {
    return NextResponse.json({ error: 'Invalid base64 data' }, { status: 400, headers: CORS });
  }

  const isPdf  = mimeType.includes('pdf')  || filename.toLowerCase().endsWith('.pdf');
  const isDocx = mimeType.includes('word') || mimeType.includes('officedocument') ||
                 filename.toLowerCase().endsWith('.docx') || filename.toLowerCase().endsWith('.doc');
  const isXlsx = mimeType.includes('spreadsheet') || mimeType.includes('excel') ||
                 filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls');

  let text = '';
  try {
    if (isPdf) {
      // Use lib path directly to avoid pdf-parse test-file access issue in serverless
      const pdfParse = (await import('pdf-parse/lib/pdf-parse.js' as any)).default;
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (isDocx) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (isXlsx) {
      const xlsx = await import('xlsx');
      const workbook = xlsx.read(buffer);
      text = workbook.SheetNames
        .map((name: string) => xlsx.utils.sheet_to_csv(workbook.Sheets[name]))
        .join('\n\n');
    } else {
      text = buffer.toString('utf-8');
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Could not parse file: ${err.message}` }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ text: text.trim() }, { headers: CORS });
}
