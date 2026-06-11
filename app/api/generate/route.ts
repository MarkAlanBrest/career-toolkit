import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    let body: { messages: unknown; max_tokens?: number; model?: string; licenseKey?: string };
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: CORS });
    }

    const { messages, max_tokens = 12000, model = 'claude-sonnet-4-6' } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 503, headers: CORS });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens, messages, stream: true }),
    });

    if (!anthropicRes.ok) {
      const data = await anthropicRes.json() as { error?: { message?: string } };
      return new Response(
        JSON.stringify({ error: data?.error?.message || `Anthropic error ${anthropicRes.status}` }),
        { status: anthropicRes.status, headers: CORS }
      );
    }

    // Pipe Anthropic's SSE stream straight to the client — no timeout issues
    return new Response(anthropicRes.body, {
      headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: CORS }
    );
  }
}
