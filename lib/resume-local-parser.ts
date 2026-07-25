import mammoth from "mammoth";

export type LocalResumeFields = {
  studentName: string;
  address: string;
  program: string;
  skills: string[];
  certifications: string[];
  confidence: "high" | "medium" | "low";
};

const SECTION_HEADING =
  /^(education|experience|work experience|employment|skills|technical skills|core competencies|certifications?|licenses?|training|projects?|references|summary|objective|profile)$/i;

const STREET =
  /\b\d{1,6}\s+[\w.'-]+(?:\s+[\w.'-]+){0,5}\s+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|circle|cir|way|highway|hwy|route|rt|parkway|pkwy)\b/i;

const CITY_STATE_ZIP =
  /^[A-Za-z .'-]+,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?$/;

const NAME_EXCLUSIONS =
  /\b(resume|curriculum|address|phone|email|objective|summary|student|skills|experience|education|certification)\b/i;

function cleanLine(value: string) {
  return value
    .replace(/^[\s•●▪◦·*\-–—|]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(items: string[]) {
  return [...new Set(items.map(cleanLine).filter(Boolean))];
}

async function extractPdfText(buffer: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(buffer) });
  const document = await task.promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines: string[] = [];
      let current = "";

      for (const item of content.items) {
        if (!("str" in item)) continue;
        const value = item.str.trim();
        if (value) current += `${current ? " " : ""}${value}`;
        if ("hasEOL" in item && item.hasEOL && current) {
          lines.push(current);
          current = "";
        }
      }
      if (current) lines.push(current);
      pages.push(lines.join("\n"));
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }

  return pages.join("\n");
}

export async function extractResumeText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".pdf")) return extractPdfText(buffer);
  if (lowerName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // The old binary .doc format needs a separate conversion service. Returning
  // no text intentionally routes it to the AI file reader.
  return "";
}

function findName(lines: string[]) {
  for (const line of lines.slice(0, 12)) {
    const words = line.split(/\s+/);
    if (
      words.length >= 2 &&
      words.length <= 5 &&
      line.length <= 60 &&
      /^[A-Za-zÀ-ÖØ-öø-ÿ.' -]+$/.test(line) &&
      !NAME_EXCLUSIONS.test(line)
    ) {
      return line;
    }
  }
  return "";
}

function findAddress(lines: string[]) {
  const index = lines.findIndex((line) => STREET.test(line));
  if (index < 0) return "";
  const next = lines[index + 1];
  return next && CITY_STATE_ZIP.test(next) ? `${lines[index]}, ${next}` : lines[index];
}

function meaningfulProgramTokens(program: string) {
  const ignored = new Set(["and", "the", "technology", "technologies", "program", "systems"]);
  return program
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !ignored.has(token));
}

function findProgram(text: string, programs: string[]) {
  const lowerText = text.toLowerCase();
  const exact = programs.find((program) => lowerText.includes(program.toLowerCase()));
  if (exact) return exact;

  const scored = programs
    .map((program) => {
      const tokens = meaningfulProgramTokens(program);
      const matches = tokens.filter((token) => lowerText.includes(token)).length;
      return { program, matches, total: tokens.length };
    })
    .filter((candidate) => candidate.matches > 0)
    .sort((a, b) => b.matches / Math.max(b.total, 1) - a.matches / Math.max(a.total, 1));

  if (!scored.length) return "";
  const best = scored[0];
  const tied = scored[1] && scored[1].matches === best.matches && scored[1].total === best.total;
  return tied ? "" : best.program;
}

function sectionItems(lines: string[], headings: RegExp) {
  const start = lines.findIndex((line) => headings.test(line.replace(/:$/, "")));
  if (start < 0) return [];

  const items: string[] = [];
  for (const line of lines.slice(start + 1, start + 13)) {
    if (SECTION_HEADING.test(line.replace(/:$/, ""))) break;
    items.push(
      ...line
        .split(/[•●▪◦|;,]/)
        .map(cleanLine)
        .filter((item) => item.length > 1 && item.length < 100),
    );
  }
  return unique(items).slice(0, 30);
}

function findCertifications(lines: string[]) {
  const section = sectionItems(lines, /^(certifications?|licenses?|training)$/i);
  const credentialTerms =
    /\b(certified|certification|certificate|license|licensed|OSHA|CPR|AED|first aid|forklift|EPA|NCCER|ASE)\b/i;
  return unique([
    ...section,
    ...lines.filter((line) => credentialTerms.test(line) && line.length < 120),
  ]).slice(0, 20);
}

export function parseResumeText(text: string, programs: string[]): LocalResumeFields {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const studentName = findName(lines);
  const address = findAddress(lines);
  const program = findProgram(text, programs);
  const skills = sectionItems(lines, /^(skills|technical skills|core competencies)$/i);
  const certifications = findCertifications(lines);
  const confidence =
    text.trim().length < 120 || !studentName || !program
      ? "low"
      : address || skills.length
        ? "high"
        : "medium";

  return { studentName, address, program, skills, certifications, confidence };
}
