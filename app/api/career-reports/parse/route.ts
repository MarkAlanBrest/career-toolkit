import { NextRequest, NextResponse } from 'next/server';
import { extractUploadedFile } from '@/lib/careerReports/extractFile';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll('files');
  if (!files.length) {
    return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });
  }

  const parsed = [];
  const errors: string[] = [];

  for (const entry of files) {
    if (!(entry instanceof File)) continue;
    try {
      const buffer = Buffer.from(await entry.arrayBuffer());
      const result = await extractUploadedFile(buffer, entry.name, entry.type || '');
      if (result.parseWarning) errors.push(`${entry.name}: ${result.parseWarning}`);
      parsed.push(result);
    } catch (err) {
      errors.push(`${entry.name}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({ files: parsed, errors });
}
