import JSZip from 'jszip';

// ── OOXML relationship types we care about ──────────────────────────────────
const REL_TYPE_NOTES = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide';
const REL_TYPE_AUDIO = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio';
const REL_TYPE_MEDIA = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/media';
const REL_TYPE_IMAGE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';

// A 1x1 transparent PNG. PowerPoint's audio object is always a <p:pic> shape backed by an
// image relationship — the icon's appearance doesn't matter for narration to play back
// correctly during an automated "Export to Video," so a placeholder pixel is sufficient.
const PLACEHOLDER_ICON_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

interface Relationship { id: string; type: string; target: string; }

export interface EmbedResult {
  slideNumber: number;
  ok: boolean;
  warning?: string;
}

function decodeXmlEntities(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

async function readText(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path);
  if (!file) return null;
  return file.async('string');
}

export async function loadPptx(buffer: Buffer): Promise<JSZip> {
  return JSZip.loadAsync(buffer);
}

export async function getSlideSizeEmu(zip: JSZip): Promise<{ cx: number; cy: number }> {
  const xml = await readText(zip, 'ppt/presentation.xml');
  const m = xml && xml.match(/<p:sldSz\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
  if (m) return { cx: parseInt(m[1], 10), cy: parseInt(m[2], 10) };
  return { cx: 9144000, cy: 6858000 }; // 4:3 fallback, in EMUs
}

export async function listSlidePaths(zip: JSZip): Promise<string[]> {
  const paths: string[] = [];
  zip.forEach((relPath) => {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(relPath)) paths.push(relPath);
  });
  paths.sort((a, b) => {
    const na = parseInt(a.match(/slide(\d+)\.xml$/)![1], 10);
    const nb = parseInt(b.match(/slide(\d+)\.xml$/)![1], 10);
    return na - nb;
  });
  return paths;
}

export function slideNumberFromPath(slidePath: string): number {
  return parseInt(slidePath.match(/slide(\d+)\.xml$/)![1], 10);
}

function relsPathFor(slidePath: string): string {
  const parts = slidePath.split('/');
  const filename = parts.pop()!;
  return [...parts, '_rels', `${filename}.rels`].join('/');
}

async function getRelationships(zip: JSZip, relsPath: string): Promise<Relationship[]> {
  const xml = await readText(zip, relsPath);
  if (!xml) return [];
  const rels: Relationship[] = [];
  const re = /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bType="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>/g;
  let m;
  while ((m = re.exec(xml))) rels.push({ id: m[1], type: m[2], target: m[3] });
  return rels;
}

function resolveRelTarget(slidePath: string, target: string): string {
  const stack = slidePath.split('/').slice(0, -1); // e.g. ["ppt","slides"]
  for (const part of target.split('/')) {
    if (part === '..') stack.pop();
    else if (part !== '.') stack.push(part);
  }
  return stack.join('/');
}

// Speaker notes text lives in <a:t> runs inside the notes body placeholder. The only other
// shape on a notes slide is the slide-thumbnail placeholder, which never contains text runs,
// so extracting every <a:p> paragraph's text across the whole part correctly yields just the
// actual notes content without needing to identify the placeholder by type.
export async function getSlideNotesText(zip: JSZip, slidePath: string): Promise<string> {
  const rels = await getRelationships(zip, relsPathFor(slidePath));
  const notesRel = rels.find(r => r.type === REL_TYPE_NOTES);
  if (!notesRel) return '';
  const notesPath = resolveRelTarget(slidePath, notesRel.target);
  const xml = await readText(zip, notesPath);
  if (!xml) return '';
  const paragraphs = [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)].map(pMatch =>
    [...pMatch[1].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(t => decodeXmlEntities(t[1])).join('')
  );
  return paragraphs.filter(p => p.trim()).join('\n').trim();
}

function nextRelId(rels: Relationship[]): string {
  let max = 0;
  for (const r of rels) {
    const m = r.id.match(/^rId(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `rId${max + 1}`;
}

function nextShapeId(slideXml: string): number {
  let max = 1;
  const re = /<p:cNvPr\b[^>]*\bid="(\d+)"/g;
  let m;
  while ((m = re.exec(slideXml))) max = Math.max(max, parseInt(m[1], 10));
  return max + 1;
}

async function ensureContentTypeDefault(zip: JSZip, extension: string, contentType: string): Promise<void> {
  const path = '[Content_Types].xml';
  const xml = (await readText(zip, path)) || '';
  if (new RegExp(`<Default\\b[^>]*Extension="${extension}"`, 'i').test(xml)) return;
  zip.file(path, xml.replace('</Types>', `<Default Extension="${extension}" ContentType="${contentType}"/></Types>`));
}

// Embeds an MP3 into the given slide as an audio object set to play automatically when the
// slide starts, and sets the slide's automatic-advance time to the audio's duration — the
// combination PowerPoint's own "Export to Video" reads to bake narration into the output.
//
// Slides that already have custom animation timing are left alone (audio is still added, but
// as click-to-play) rather than risk corrupting an existing <p:timing> tree by trying to merge
// into it.
export async function embedAutoplayAudio(
  zip: JSZip,
  slidePath: string,
  audioBuffer: Buffer,
  durationSeconds: number,
  slideSize: { cx: number; cy: number }
): Promise<EmbedResult> {
  const slideNumber = slideNumberFromPath(slidePath);
  const relsPath = relsPathFor(slidePath);
  let slideXml = (await readText(zip, slidePath)) || '';
  let relsXml = (await readText(zip, relsPath)) || '';
  const rels = await getRelationships(zip, relsPath);

  const hasExistingTiming = /<p:timing>/.test(slideXml);

  await ensureContentTypeDefault(zip, 'mp3', 'audio/mpeg');
  await ensureContentTypeDefault(zip, 'png', 'image/png');

  const iconMediaPath = 'ppt/media/ce-narration-icon.png';
  if (!zip.file(iconMediaPath)) {
    zip.file(iconMediaPath, Buffer.from(PLACEHOLDER_ICON_PNG_BASE64, 'base64'));
  }
  const audioMediaPath = `ppt/media/ce-narration-audio${slideNumber}.mp3`;
  zip.file(audioMediaPath, audioBuffer);

  const rIdAudio = nextRelId(rels);
  const audioNum = parseInt(rIdAudio.slice(3), 10);
  const rIdMedia = `rId${audioNum + 1}`;
  const rIdIcon = `rId${audioNum + 2}`;

  const newRels = [
    `<Relationship Id="${rIdAudio}" Type="${REL_TYPE_AUDIO}" Target="../media/ce-narration-audio${slideNumber}.mp3"/>`,
    `<Relationship Id="${rIdMedia}" Type="${REL_TYPE_MEDIA}" Target="../media/ce-narration-audio${slideNumber}.mp3"/>`,
    `<Relationship Id="${rIdIcon}" Type="${REL_TYPE_IMAGE}" Target="../media/ce-narration-icon.png"/>`,
  ].join('');
  relsXml = relsXml.replace('</Relationships>', `${newRels}</Relationships>`);

  const shapeId = nextShapeId(slideXml);
  const iconSize = 457200; // 0.5in in EMUs — kept small since the icon's look isn't the point
  const margin = 91440; // 0.1in
  const x = Math.max(0, slideSize.cx - iconSize - margin);
  const y = Math.max(0, slideSize.cy - iconSize - margin);
  const durMs = Math.max(1, Math.round(durationSeconds * 1000));

  const picXml = '<p:pic>'
    + '<p:nvPicPr>'
    + `<p:cNvPr id="${shapeId}" name="Narration Audio ${slideNumber}"/>`
    + '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>'
    + '<p:nvPr>'
    + `<a:audioFile r:link="${rIdAudio}"/>`
    + '<p:extLst><p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}">'
    + `<p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="${rIdMedia}"/>`
    + '</p:ext></p:extLst>'
    + '</p:nvPr>'
    + '</p:nvPicPr>'
    + `<p:blipFill><a:blip r:embed="${rIdIcon}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>`
    + '<p:spPr>'
    + `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${iconSize}" cy="${iconSize}"/></a:xfrm>`
    + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
    + '</p:spPr>'
    + '</p:pic>';

  slideXml = slideXml.replace('</p:spTree>', `${picXml}</p:spTree>`);

  if (hasExistingTiming) {
    zip.file(slidePath, slideXml);
    zip.file(relsPath, relsXml);
    return { slideNumber, ok: false, warning: 'Slide already had animation timing — narration added as click-to-play instead of automatic.' };
  }

  // "Play automatically at slide start" timing tree. This mirrors the structure PowerPoint
  // itself generates for a media object with the "Start: Automatically" option.
  const timingXml = '<p:timing><p:tnLst><p:par>'
    + '<p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">'
    + '<p:childTnLst><p:seq concurrent="1" nextAc="seek">'
    + '<p:cTn id="2" dur="indefinite" nodeType="mainSeq">'
    + '<p:childTnLst><p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst>'
    + '<p:childTnLst><p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst>'
    + `<p:childTnLst><p:par><p:cTn id="5" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="clickEffect">`
    + '<p:stCondLst><p:cond delay="0"/></p:stCondLst>'
    + '<p:childTnLst><p:cmd type="call" cmd="playFrom(0.0)">'
    + `<p:cBhvr><p:cTn id="6" dur="${durMs}" fill="hold"/><p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl></p:cBhvr>`
    + '</p:cmd></p:childTnLst>'
    + '</p:cTn></p:par></p:childTnLst>'
    + '</p:cTn></p:par></p:childTnLst>'
    + '</p:cTn></p:par></p:childTnLst>'
    + '</p:cTn></p:seq></p:childTnLst>'
    + '</p:cTn>'
    + '</p:par></p:tnLst><p:bldLst/></p:timing>';

  const transitionXml = `<p:transition advClick="0" advTm="${durMs}"/>`;

  // Schema order for <p:sld> is: cSld, clrMapOvr?, transition?, timing?, extLst? — replace an
  // existing <p:transition> in place if present, otherwise insert right after </p:cSld>.
  const transitionRe = /<p:transition\b[^>]*\/>|<p:transition\b[^>]*>[\s\S]*?<\/p:transition>/;
  if (transitionRe.test(slideXml)) {
    slideXml = slideXml.replace(transitionRe, transitionXml);
  } else {
    slideXml = slideXml.replace('</p:cSld>', `</p:cSld>${transitionXml}`);
  }
  slideXml = slideXml.replace(transitionXml, `${transitionXml}${timingXml}`);

  zip.file(slidePath, slideXml);
  zip.file(relsPath, relsXml);

  return { slideNumber, ok: true };
}
