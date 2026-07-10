import { NextRequest, NextResponse } from 'next/server';
import { cleanAccountId } from '@/lib/stripe';
import { callGenerate, GenerateError } from '@/lib/aiGenerate';
import { THEMES, ThemeDef } from '@/lib/pageComponents';

export const dynamic = 'force-dynamic';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

const PAGE_TYPE_EXTRAS: Record<string, string> = {
  'Video Page': `VIDEO PLACEHOLDER (include once, where the video belongs): <div style="background:#f1f5f9;border:1px dashed #cbd5e1;padding:24px;text-align:center;font-size:13px;color:#64748B;margin:0 0 14px;">🎬 Video goes here — paste an embed link in Canvas after inserting</div>\nInclude 2-3 sentences of "before you watch" framing above the video, and a short "after watching" reflection prompt below it.`,
  'Flashcard Tile Page': `FLASHCARD TILE GRID (the main content — no free-form paragraphs needed): a 2-column table of term/definition tiles, one row per term:\n<table style="width:100%;border-collapse:separate;border-spacing:10px;margin:1em 0;"><tr><td style="width:50%;background:#fff;border:1px solid #cbd5e1;border-top:3px solid #1e3a5f;border-radius:6px;padding:14px;"><strong style="color:#1e3a5f;">[Term]</strong></td><td style="width:50%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;font-size:13px;color:#334155;">[Definition]</td></tr></table>\nRepeat the row markup once per term (6-10 terms). No JavaScript flip effects — Canvas strips scripts.`,
  'Content Page with Inline Questions': `INLINE CHECK QUESTIONS — after roughly every 2nd paragraph, insert a check-for-understanding callout:\n<div style="background:#EDF5FF;border-left:5px solid #0770B8;padding:12px 16px;margin:14px 0;border-radius:0 4px 4px 0;"><strong style="color:#0770B8;">🤔 Check your understanding</strong><br><span style="font-size:13px;color:#334155;">[a short question testing the paragraph just read]</span></div>\nInclude 2-3 of these spaced through the page, not all at the end.`,
};

function buildPagePrompt(pageType: string, title: string, instructions: string, theme: ThemeDef, sourceText: string) {
  let p = `Generate a clean, simple Canvas LMS page. Follow the fixed template below exactly — do not redesign it, add decorative elements, or invent new styles. Consistency matters more than creativity here.\n\n`;
  p += `PAGE TYPE: ${pageType}\nTITLE: ${title}\n\n`;
  p += `FIXED TEMPLATE (use these exact inline styles, fill in the bracketed content):\n\n`;
  p += `HEADER (once, at the top):\n<div style="background:${theme.primary};padding:28px 32px;border-bottom:3px solid ${theme.secondary};"><h1 style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#FFFFFF;margin:0 0 6px;">${title}</h1><p style="font-family:Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.75);margin:0;">[ONE-SENTENCE SUBTITLE]</p></div>\n\n`;
  p += `BODY WRAPPER (holds every section below):\n<div style="max-width:860px;margin:0 auto;padding:32px 28px;font-family:Arial,sans-serif;">...sections...</div>\n\n`;
  p += `PER SECTION (use 1-3 sections, as many as the content needs):\n<h2 style="font-family:Georgia,serif;font-size:19px;font-weight:700;color:${theme.primary};border-bottom:1px solid #cbd5e1;padding-bottom:6px;margin:24px 0 10px;">[SECTION TITLE]</h2>\n<p style="font-size:14px;line-height:1.7;color:${theme.text};margin:0 0 14px;">[1-2 paragraphs, 2-4 sentences each]</p>\n\n`;
  p += `BULLET LIST (use whenever you'd otherwise list several related items inside a paragraph):\n<ul style="margin:0 0 14px;padding-left:20px;font-size:14px;line-height:1.7;color:${theme.text};"><li style="margin-bottom:4px;">[item]</li></ul>\n\n`;
  if (PAGE_TYPE_EXTRAS[pageType]) p += `${pageType.toUpperCase()} ELEMENT (required for this page type)\n${PAGE_TYPE_EXTRAS[pageType]}\n\n`;
  p += `RULES\n- Use ONLY the elements above — no hero images, stat panels, gradients, or extra decorative blocks\n- Write 2-5 paragraphs of real content total, organized into 1-3 sections as needed\n- Do not invent new colors, fonts, or layout structures\n\n`;
  p += `WHAT THE TEACHER ASKED FOR\n${instructions || '(no extra instructions given — use your best judgment for this page type)'}\n\n`;
  if (sourceText) p += `SOURCE MATERIAL (uploaded by the teacher — base the content on this)\n${sourceText}\n\n`;
  p += `HTML REQUIREMENTS\n- Return ONLY the HTML body content, no explanations, no markdown\n- Do NOT include <html>, <head>, or <body> tags\n- Use ONLY inline CSS styles — no <style> tags, no external stylesheets\n- Web-safe fonts only: Georgia (headings), Arial (body)\n- No JavaScript\n- Every HTML tag you open must be closed before the response ends\n- Ready to paste directly into the Canvas Rich Content Editor`;
  return p;
}

function buildQuizPrompt(title: string, instructions: string, counts: { mc: number; tf: number; sa: number; essay: number }, sourceText: string) {
  let p = `You are an expert educator creating a Canvas LMS quiz.\n\nQUIZ TITLE: ${title}\n\nQUESTIONS NEEDED:\n`;
  if (counts.mc) p += `- ${counts.mc} Multiple Choice\n`;
  if (counts.tf) p += `- ${counts.tf} True/False\n`;
  if (counts.sa) p += `- ${counts.sa} Short Answer\n`;
  if (counts.essay) p += `- ${counts.essay} Essay\n`;
  p += `\nTOPIC / SOURCE MATERIAL\n${instructions || title}\n\n`;
  if (sourceText) p += `UPLOADED SOURCE MATERIAL (base questions on this)\n${sourceText}\n\n`;
  p += `RESPONSE FORMAT\nReturn ONLY a valid JSON object, no explanations, no markdown.\n\n`;
  p += `{"groups":[{"type":"mc","concept":"short description","questions":[{"question":"Q?","answers":[{"text":"A","correct":true},{"text":"B","correct":false},{"text":"C","correct":false},{"text":"D","correct":false}]}]}]}\n\n`;
  p += `RULES\n- type is one of "mc", "tf", "sa", "essay"\n- mc: exactly 4 answers, exactly 1 correct\n- tf: exactly 2 answers, "True" and "False"\n- sa: include a small answers array with the accepted correct answer(s), each marked correct:true\n- essay: no answers array\n- One group per question (don't batch multiple questions into one group)\n- Valid JSON only, no trailing commas`;
  return p;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const accountId = cleanAccountId(body?.accountId);
  const accountToken = String(body?.accountToken || '');
  if (!accountId) return NextResponse.json({ error: 'Missing account.' }, { status: 400, headers: CORS });

  const kind = body?.kind === 'quiz' ? 'quiz' : 'page';
  const title = String(body?.title || 'Untitled').slice(0, 200);
  const instructions = String(body?.instructions || '').slice(0, 6000);
  const sourceText = String(body?.sourceText || '').slice(0, 20000);
  const theme = THEMES[String(body?.theme || '')] || THEMES.ocean;
  const origin = request.nextUrl.origin;

  try {
    if (kind === 'quiz') {
      const counts = {
        mc: Math.max(0, Math.min(20, Number(body?.quiz?.mcCount) || 0)),
        tf: Math.max(0, Math.min(20, Number(body?.quiz?.tfCount) || 0)),
        sa: Math.max(0, Math.min(20, Number(body?.quiz?.saCount) || 0)),
        essay: Math.max(0, Math.min(20, Number(body?.quiz?.essayCount) || 0)),
      };
      if (!counts.mc && !counts.tf && !counts.sa && !counts.essay) {
        return NextResponse.json({ error: 'Choose at least one question type.' }, { status: 400, headers: CORS });
      }
      const prompt = buildQuizPrompt(title, instructions, counts, sourceText);
      const text = await callGenerate(origin, {
        accountId, accountToken, usageType: 'creation', max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      });
      const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      let parsed: { groups?: unknown[] };
      try { parsed = JSON.parse(cleaned); } catch {
        return NextResponse.json({ error: 'AI response was not valid quiz JSON — try again.' }, { status: 502, headers: CORS });
      }
      return NextResponse.json({ groups: parsed.groups || [] }, { headers: CORS });
    }

    const pageType = String(body?.pageType || 'Content Page').slice(0, 60);
    const prompt = buildPagePrompt(pageType, title, instructions, theme, sourceText);
    const html = await callGenerate(origin, {
      accountId, accountToken, usageType: 'creation', max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    });
    return NextResponse.json({ html: html.trim() }, { headers: CORS });
  } catch (error) {
    const status = error instanceof GenerateError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Generation failed.';
    return NextResponse.json({ error: message }, { status, headers: CORS });
  }
}
