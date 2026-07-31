import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_TIMEOUT_MS = 45000;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Deep scan is not configured on this server.' },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.content) {
    return NextResponse.json({ error: 'Resume content is required.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1200,
        temperature: 0.7,
        messages: [{ role: 'user', content: body.content }],
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();

    return NextResponse.json({
      status: response.status,
      responseText,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `Claude API request timed out after ${CLAUDE_TIMEOUT_MS / 1000} seconds.`
        : error instanceof Error
          ? error.message
          : 'Deep scan failed.';

    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
