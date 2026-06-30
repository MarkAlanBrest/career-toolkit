import { put } from '@vercel/blob';
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
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file || !file.name) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400, headers: CORS });
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathname = `class-builder/${Date.now()}-${safeName}`;
    const blob = await put(pathname, file, { access: 'public' });
    return NextResponse.json({ url: blob.url, filename: file.name }, { headers: CORS });
  } catch (err: unknown) {
    console.error('[build-a-class/upload]', err);
    return NextResponse.json({ error: (err as Error).message || 'Upload failed.' }, { status: 500, headers: CORS });
  }
}
