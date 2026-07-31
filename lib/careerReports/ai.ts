import type { CareerRecord, ParsedFile } from './types';

const SYSTEM_PROMPT = `You are an assistant for NCST Career Services accreditation reporting (ACCSC).
You help interpret messy spreadsheet data and answer questions about employers, students, PAC meetings, career fairs, and job placements.
Be accurate. Cite record counts. If data is insufficient, say what is missing.
Do not invent student names, employers, or placement statistics not present in the provided data.
For accreditation classifications, remind the user that human review is required before official ACCSC submission.`;

export async function askWithAi(
  question: string,
  records: CareerRecord[],
  files: ParsedFile[],
  localHint: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return localHint;

  const sample = records.slice(0, 40).map(r => ({
    type: r.recordType,
    student: r.studentName,
    employer: r.employerName,
    program: r.program,
    event: r.eventType,
    grad: r.graduationDate,
    hire: r.employmentStartDate,
    source: r.sourceFile,
  }));

  const fileSummaries = files.map(f => ({
    filename: f.filename,
    tables: f.tables.length,
    preview: f.textPreview.slice(0, 2000),
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Question: ${question}

Local analysis hint: ${localHint}

Total records: ${records.length}
Sample records JSON:
${JSON.stringify(sample, null, 2)}

File summaries:
${JSON.stringify(fileSummaries, null, 2)}

Answer the question based only on this data. Be concise.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return localHint;
  }

  const data = await response.json();
  const text = data.content?.find((c: { type: string }) => c.type === 'text')?.text;
  return text?.trim() || localHint;
}

export async function suggestColumnMappings(headers: string[]): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return {};

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Map these spreadsheet column headers to career services fields.
Return ONLY valid JSON object: header -> fieldName.

Allowed field names:
studentName, employerName, program, programLengthMonths, startDate, graduationDate, withdrawalDate,
eventType, eventDate, positionTitle, employmentStartDate, jobTitle, jobDuties,
employerContact, employerPhone, employerEmail, employerAddress, employmentStatus, verificationSource, notes

Headers:
${JSON.stringify(headers)}`,
        },
      ],
    }),
  });

  if (!response.ok) return {};

  const data = await response.json();
  const text = data.content?.find((c: { type: string }) => c.type === 'text')?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]) as Record<string, string>;
  } catch {
    return {};
  }
}
