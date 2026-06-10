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
    return NextResponse.json({ error: 'Invalid file data' }, { status: 400, headers: CORS });
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
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
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
