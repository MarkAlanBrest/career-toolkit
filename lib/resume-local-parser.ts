import mammoth from "mammoth";

export type LocalResumeFields = {
  studentName: string;
  address: string;
  program: string;
  graduationDate: string;
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
  /\b(resume|curriculum|program|address|phone|email|objective|summary|student|skills|experience|education|certification)\b/i;

const PROGRAM_CODES: Record<string, string[]> = {
  AT: ["Automotive Technology"],
  BT: ["Building Technology"],
  CW: ["Combination Welding"],
  ET: ["Electrical Technology"],
  EIM: ["Industrial Electro-Mechanical Technology"],
  MT: ["Machinist & CNC Manufacturing"],
  MPE: ["Motorcycle & Power Equipment Technology"],
  RT: ["Refrigeration & A/C Technology"],
  CT: ["Commercial Truck Driving"],
  DT: ["Diesel & Heavy Equipment Repair"],
  HEC: ["Heavy Equipment Operations with CDL Training"],
  ELPCW: ["East Liverpool, Combination Welding"],
  ELPCIM: ["East Liverpool, Electrical & Industrial Maintenance"],
  ELPRT: ["East, Liverpool, Refrigeration & Climate Control"],
};

type FilenameFields = {
  studentName: string;
  address: string;
  program: string;
  graduationDate: string;
};

const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

const MONTH_YEAR =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(20\d{2})\b/i;

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

function findName(lines: string[], programs: string[]) {
  for (const line of lines.slice(0, 12)) {
    const words = line.split(/\s+/);
    const isProgram = programs.some(
      (program) => program.toLowerCase() === line.replace(/^program\s*:?\s*/i, "").toLowerCase(),
    );
    if (
      words.length >= 2 &&
      words.length <= 5 &&
      line.length <= 60 &&
      /^[A-Za-zÀ-ÖØ-öø-ÿ.', -]+$/.test(line) &&
      !isProgram &&
      !NAME_EXCLUSIONS.test(line)
    ) {
      const lastFirst = line.match(/^([^,]+),\s*([^,]+)$/);
      return lastFirst ? `${lastFirst[2]} ${lastFirst[1]}`.trim() : line;
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

function normalizedMonthYear(value: string) {
  const match = value.match(MONTH_YEAR);
  if (match) return `${match[2]}-${MONTHS[match[1].toLowerCase()]}`;

  const numeric = value.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])\b/);
  return numeric ? `${numeric[1]}-${numeric[2].padStart(2, "0")}` : "";
}

function findGraduationDate(lines: string[]) {
  const labeled = lines.find(
    (line) => /\b(?:grad(?:uation)?|completion)\s*(?:date|month|year)?\b/i.test(line)
      && normalizedMonthYear(line),
  );
  if (labeled) return normalizedMonthYear(labeled);

  // The standard cover block places a standalone "Month, Year" in its first
  // few lines, after program, student name, and city/state.
  const coverDate = lines
    .slice(0, 8)
    .find((line) => /^\(?[A-Za-z]+,?\s+20\d{2}(?:\s*\(grad(?:uation)? date\))?\)?$/i.test(line));
  return coverDate ? normalizedMonthYear(coverDate) : "";
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

function configuredProgram(value: string, programs: string[]) {
  return programs.find((program) => program.toLowerCase() === value.toLowerCase()) || value;
}

function programFromCode(code: string, programs: string[]) {
  const choices = PROGRAM_CODES[code] || [];
  if (choices.length === 1) return configuredProgram(choices[0], programs);
  return "";
}

function parseResumeFilename(fileName: string, programs: string[]): FilenameFields {
  const stem = fileName.replace(/\.(pdf|docx?|rtf)$/i, "").trim();
  const graduationDate = normalizedMonthYear(stem);
  const codeMatch = stem.match(
    /^(ELPCIM|ELPCW|ELPRT|EIM|HEC|MPE|AT|BT|CW|ET|MT|RT|CT|DT)(?=$|[\s,_-])/i,
  );
  if (!codeMatch) return { studentName: "", address: "", program: "", graduationDate };

  const code = codeMatch[1].toUpperCase();
  const remainder = stem.slice(codeMatch[0].length).replace(/^[\s,_-]+/, "");
  let parts = remainder
    .split(/\s*,\s*|\s+[-|]\s+|_+/)
    .map(cleanLine)
    .filter(Boolean);

  // A standardized whitespace-only name still provides last and first name.
  // City is intentionally not guessed because it may contain multiple words.
  if (parts.length < 2) parts = remainder.split(/\s+/).map(cleanLine).filter(Boolean);

  const [lastName = "", firstName = ""] = parts;
  const state = parts.length >= 4 ? parts.at(-1) || "" : "";
  const city = parts.length >= 4 ? parts.slice(2, -1).join(" ") : "";
  const validState = /^[A-Za-z]{2}$/.test(state) ? state.toUpperCase() : "";

  return {
    studentName: firstName && lastName ? `${firstName} ${lastName}` : "",
    address: city && validState ? `${city}, ${validState}` : "",
    program: programFromCode(code, programs),
    graduationDate,
  };
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

export function parseResumeText(
  text: string,
  programs: string[],
  fileName = "",
): LocalResumeFields {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const filenameFields = parseResumeFilename(fileName, programs);
  const studentName = filenameFields.studentName || findName(lines, programs);
  const extractedAddress = findAddress(lines);
  const address =
    extractedAddress && filenameFields.address && !extractedAddress.includes(",")
      ? `${extractedAddress}, ${filenameFields.address}`
      : extractedAddress || filenameFields.address;
  const program = filenameFields.program || findProgram(text, programs);
  const graduationDate = filenameFields.graduationDate || findGraduationDate(lines);
  const skills = sectionItems(lines, /^(skills|technical skills|core competencies)$/i);
  const certifications = findCertifications(lines);
  const confidence =
    text.trim().length < 120 || !studentName || !program
      ? "low"
      : address || skills.length
        ? "high"
        : "medium";

  return {
    studentName,
    address,
    program,
    graduationDate,
    skills,
    certifications,
    confidence,
  };
}
