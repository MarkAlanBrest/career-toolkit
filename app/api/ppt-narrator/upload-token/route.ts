import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

// Large .pptx files (often 10s of MB with embedded images) blow past Vercel's ~4.5MB serverless
// function request body limit if sent through an API route directly. This route only issues a
// short-lived client upload token — the actual file bytes go straight from the browser to Vercel
// Blob, bypassing that limit entirely. The generate route then fetches the file by URL.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/octet-stream',
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: 150 * 1024 * 1024,
      }),
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
