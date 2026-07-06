import { NextRequest, NextResponse } from 'next/server';
import { parseBuffer } from 'music-metadata';
import { loadPptx, listSlidePaths, slideNumberFromPath, getSlideNotesText, getSlideSizeEmu, embedAutoplayAudio } from '@/lib/pptxNarration';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

async function polishNarration(rawNotes: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return rawNotes;
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: 'Rewrite these presentation speaker notes into natural, spoken narration for a slide, as if a presenter were reading them aloud. Keep the same information, facts, and order — do not add anything new, and do not add a greeting or sign-off. Return ONLY the narration text, no preamble, no quotes around it.\n\nSpeaker notes:\n' + rawNotes,
        }],
      }),
    });
    if (!resp.ok) return rawNotes;
    const data = await resp.json();
    const text = data?.content?.[0]?.text;
    return typeof text === 'string' && text.trim() ? text.trim() : rawNotes;
  } catch {
    return rawNotes;
  }
}

async function generateTTS(text: string, voice: string, userApiKey: string): Promise<Buffer> {
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No OpenAI API key provided — enter one on the page, or configure OPENAI_API_KEY on the server.');
  const resp = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'tts-1', voice, input: text, response_format: 'mp3' }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`OpenAI TTS failed (HTTP ${resp.status}): ${errText.slice(0, 300)}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.b64) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

  const voice = OPENAI_VOICES.includes(body.voice) ? body.voice : 'alloy';
  const polish = body.polish !== false;
  const openaiKey = typeof body.openaiKey === 'string' ? body.openaiKey.trim() : '';

  let zip;
  try {
    zip = await loadPptx(Buffer.from(body.b64, 'base64'));
  } catch {
    return NextResponse.json({ error: 'Could not read this file — is it a valid .pptx?' }, { status: 400 });
  }

  const slidePaths = await listSlidePaths(zip);
  if (!slidePaths.length) {
    return NextResponse.json({ error: 'No slides found in this file.' }, { status: 400 });
  }

  const slideSize = await getSlideSizeEmu(zip);

  // Phase 1 — generate narration text + audio for every slide in parallel (the slow, I/O-bound
  // part). Nothing here touches the zip yet, so it's safe to run concurrently.
  const perSlide = await Promise.all(slidePaths.map(async (slidePath) => {
    const slideNumber = slideNumberFromPath(slidePath);
    const rawNotes = (await getSlideNotesText(zip, slidePath)).trim();
    if (!rawNotes) return { slidePath, slideNumber, status: 'skipped — no speaker notes' as const };
    try {
      const narration = polish ? await polishNarration(rawNotes) : rawNotes;
      const audioBuffer = await generateTTS(narration, voice, openaiKey);
      const meta = await parseBuffer(audioBuffer, 'audio/mpeg');
      const duration = meta.format.duration || Math.max(3, narration.split(/\s+/).length / 2.5);
      return { slidePath, slideNumber, status: 'ok' as const, audioBuffer, duration };
    } catch (err: any) {
      return { slidePath, slideNumber, status: `failed — ${err.message}` as const };
    }
  }));

  // Phase 2 — embed into the shared zip one at a time (fast, in-memory, and mutates shared state
  // so it isn't parallelized).
  const results: { slide: number; status: string }[] = [];
  for (const item of perSlide) {
    if (item.status !== 'ok') { results.push({ slide: item.slideNumber, status: item.status }); continue; }
    const embed = await embedAutoplayAudio(zip, item.slidePath, item.audioBuffer!, item.duration!, slideSize);
    results.push({ slide: item.slideNumber, status: embed.ok ? 'narrated (auto-play)' : (embed.warning || 'embedded') });
  }

  const outBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return new NextResponse(new Uint8Array(outBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': 'attachment; filename="narrated-presentation.pptx"',
      'X-Narration-Results': encodeURIComponent(JSON.stringify(results)),
      'Access-Control-Expose-Headers': 'X-Narration-Results',
    },
  });
}
