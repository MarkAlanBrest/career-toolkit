// Generates a real, downloadable PDF of the Drive Profile report — drawn
// natively with pdf-lib (vector text/shapes, not a screenshot), entirely
// client-side. Imported dynamically from the Download button so pdf-lib
// never bloats the initial page bundle.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { STYLES, STYLE_ORDER, blendInsight, type ScoreResult, type StyleKey } from './data';

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

function hexToRgb01(hex: string) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

// pdf-lib's standard fonts only support the WinAnsi codepage — emoji and
// most symbol glyphs aren't in it and throw an encoding error if drawn
// directly, so every string that reaches the PDF is scrubbed first.
function stripUnsupported(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[←-⯿]/gu, '')
    .replace(/[☀-➿]/gu, '')
    .replace(/[️‍]/gu, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Cursor {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  fontBold: PDFFont;
}

function newPage(cursor: Cursor) {
  cursor.page = cursor.doc.addPage([PAGE_W, PAGE_H]);
  cursor.y = PAGE_H - MARGIN;
}

function ensureRoom(cursor: Cursor, needed: number) {
  if (cursor.y - needed < MARGIN) newPage(cursor);
}

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach(word => {
    const trial = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawParagraph(cursor: Cursor, text: string, opts: { size?: number; color?: ReturnType<typeof rgb>; bold?: boolean; lineHeight?: number; indent?: number } = {}) {
  const size = opts.size ?? 11;
  const color = opts.color ?? rgb(0.2, 0.22, 0.27);
  const font = opts.bold ? cursor.font : cursor.font; // both regular/bold passed via cursor.fontBold if needed
  const lineHeight = opts.lineHeight ?? size * 1.5;
  const indent = opts.indent ?? 0;
  const lines = wrapLines(stripUnsupported(text), font, size, CONTENT_W - indent);
  lines.forEach(line => {
    ensureRoom(cursor, lineHeight);
    cursor.page.drawText(line, { x: MARGIN + indent, y: cursor.y - size, size, font, color });
    cursor.y -= lineHeight;
  });
}

function drawHeading(cursor: Cursor, text: string, color: ReturnType<typeof rgb>) {
  ensureRoom(cursor, 40);
  cursor.page.drawRectangle({ x: MARGIN, y: cursor.y - 20, width: 4, height: 18, color });
  cursor.page.drawText(stripUnsupported(text), { x: MARGIN + 12, y: cursor.y - 16, size: 14, font: cursor.fontBold, color: rgb(0.1, 0.12, 0.16) });
  cursor.y -= 32;
}

function drawBullets(cursor: Cursor, items: string[], color: ReturnType<typeof rgb>) {
  items.forEach(item => {
    ensureRoom(cursor, 20);
    const lines = wrapLines(stripUnsupported(item), cursor.font, 10.5, CONTENT_W - 16);
    lines.forEach((line, i) => {
      ensureRoom(cursor, 16);
      if (i === 0) cursor.page.drawCircle({ x: MARGIN + 3, y: cursor.y - 6, size: 2, color });
      cursor.page.drawText(line, { x: MARGIN + 14, y: cursor.y - 9, size: 10.5, font: cursor.font, color: rgb(0.22, 0.25, 0.3) });
      cursor.y -= 15;
    });
    cursor.y -= 6;
  });
}

export async function generateReportPdf(result: ScoreResult): Promise<Uint8Array> {
  const [primaryKey, secondaryKey] = result.ranked;
  const primary = STYLES[primaryKey];
  const secondary = STYLES[secondaryKey];

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const cursor: Cursor = { doc, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN, font, fontBold };

  const primaryColor = hexToRgb01(primary.color);
  const secondaryColor = hexToRgb01(secondary.color);

  // ── Header banner ──
  const bannerH = 130;
  cursor.page.drawRectangle({ x: 0, y: PAGE_H - bannerH, width: PAGE_W, height: bannerH, color: primaryColor });
  cursor.page.drawText('DRIVE PROFILE', { x: MARGIN, y: PAGE_H - 34, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  cursor.page.drawText(stripUnsupported(`You're a ${primary.label}`), { x: MARGIN, y: PAGE_H - 70, size: 26, font: fontBold, color: rgb(1, 1, 1) });
  cursor.page.drawText(stripUnsupported(`"${primary.affirmation}"`), { x: MARGIN, y: PAGE_H - 96, size: 12, font: fontItalic, color: rgb(1, 1, 1) });
  cursor.y = PAGE_H - bannerH - 26;
  drawParagraph(cursor, primary.tagline, { size: 11.5, color: rgb(0.25, 0.28, 0.32) });
  cursor.y -= 10;

  // ── Score breakdown ──
  drawHeading(cursor, 'Your Full Breakdown', primaryColor);
  const ranked = [...STYLE_ORDER].sort((a, b) => result.percent[b] - result.percent[a]);
  ranked.forEach((key, i) => {
    const st = STYLES[key];
    const stColor = hexToRgb01(st.color);
    ensureRoom(cursor, 30);
    const tag = key === primaryKey ? '  (Primary)' : key === secondaryKey ? '  (Secondary)' : '';
    cursor.page.drawText(stripUnsupported(`${st.label}${tag}`), { x: MARGIN, y: cursor.y - 10, size: 11, font: fontBold, color: rgb(0.15, 0.17, 0.2) });
    cursor.page.drawText(`${result.percent[key]}%`, { x: PAGE_W - MARGIN - 30, y: cursor.y - 10, size: 11, font: fontBold, color: stColor });
    cursor.y -= 16;
    const barW = CONTENT_W;
    cursor.page.drawRectangle({ x: MARGIN, y: cursor.y - 8, width: barW, height: 8, color: rgb(0.9, 0.91, 0.93) });
    cursor.page.drawRectangle({ x: MARGIN, y: cursor.y - 8, width: barW * (result.percent[key] / 100), height: 8, color: stColor });
    cursor.y -= 22;
  });
  cursor.y -= 8;

  // ── Secondary blend ──
  ensureRoom(cursor, 70);
  const blendText = blendInsight(primaryKey, secondaryKey);
  const blendLines = wrapLines(stripUnsupported(blendText), font, 10.5, CONTENT_W - 20);
  const blendBoxH = 34 + blendLines.length * 15;
  ensureRoom(cursor, blendBoxH);
  cursor.page.drawRectangle({ x: MARGIN, y: cursor.y - blendBoxH, width: CONTENT_W, height: blendBoxH, color: secondaryColor, opacity: 0.12 });
  cursor.page.drawText(stripUnsupported(`Your Secondary Style: ${secondary.label}`), { x: MARGIN + 12, y: cursor.y - 18, size: 11, font: fontBold, color: secondaryColor });
  let by = cursor.y - 34;
  blendLines.forEach(line => {
    cursor.page.drawText(line, { x: MARGIN + 12, y: by, size: 10.5, font, color: rgb(0.25, 0.28, 0.32) });
    by -= 15;
  });
  cursor.y -= blendBoxH + 20;

  // ── Primary deep dive ──
  drawHeading(cursor, 'What Motivates You', primaryColor);
  drawBullets(cursor, primary.coreMotivators, primaryColor);
  cursor.y -= 6;

  drawHeading(cursor, 'How To Make It Work For You', primaryColor);
  drawBullets(cursor, primary.howToMakeItWork, primaryColor);
  cursor.y -= 6;

  drawHeading(cursor, 'Watch For', primaryColor);
  drawBullets(cursor, primary.watchFor, primaryColor);
  cursor.y -= 6;

  const infoBlocks: [string, string][] = [
    ['Ideal Environment', primary.idealEnvironment],
    ['Under Pressure', primary.underPressure],
    ['How To Talk To You', primary.communicationTips],
  ];
  infoBlocks.forEach(([title, text]) => {
    ensureRoom(cursor, 50);
    cursor.page.drawText(stripUnsupported(title), { x: MARGIN, y: cursor.y - 12, size: 11.5, font: fontBold, color: rgb(0.1, 0.12, 0.16) });
    cursor.y -= 20;
    drawParagraph(cursor, text, { size: 10.5, color: rgb(0.32, 0.35, 0.4) });
    cursor.y -= 12;
  });

  // ── Footer on every page ──
  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    pg.drawText(`Drive Profile - Page ${i + 1} of ${pages.length}`, {
      x: MARGIN,
      y: 24,
      size: 8,
      font,
      color: rgb(0.6, 0.63, 0.68),
    });
  });

  return doc.save();
}
