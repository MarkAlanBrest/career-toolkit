// Calls this project's own /api/generate endpoint (SSE) and buffers it into a single string.
// Reused so credit deduction, refunds-on-failure, and model selection stay defined in exactly
// one place (app/api/generate/route.ts) instead of being duplicated per feature.

export class GenerateError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function callGenerate(origin: string, params: {
  accountId: string;
  accountToken: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  model?: string;
  usageType?: 'teaching' | 'creation';
  max_tokens?: number;
}): Promise<string> {
  const res = await fetch(`${origin}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new GenerateError((errData as { error?: string })?.error || `Generate failed (${res.status})`, res.status);
  }

  const rawBody = await res.text();
  let fullText = '';
  let gotChunks = false;
  for (const line of rawBody.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const raw = line.slice(6).trim();
    if (raw === '[DONE]') continue;
    try {
      const evt = JSON.parse(raw);
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
        fullText += evt.delta.text;
        gotChunks = true;
      }
    } catch { /* ignore malformed SSE line */ }
  }
  if (!gotChunks) {
    try {
      const data = JSON.parse(rawBody.trim());
      fullText = data?.content?.[0]?.text || '';
    } catch { /* ignore */ }
  }
  return fullText;
}
