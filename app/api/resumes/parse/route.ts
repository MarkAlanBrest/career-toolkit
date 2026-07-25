import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import {
  extractResumeText,
  parseResumeText,
  type LocalResumeFields,
} from "@/lib/resume-local-parser";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const FALLBACK_PROGRAMS = [
  "Automotive Technology",
  "Building Technology",
  "Combination Welding",
  "Electrical Systems Technology",
  "HVAC/R Technology",
];

type OpenAIResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

type ParsedResume = LocalResumeFields & {
  extractionMethod: "local" | "ai-assisted";
};

function outputText(response: OpenAIResponse) {
  return (
    response.output
      ?.filter((item) => item.type === "message")
      .flatMap((item) => item.content || [])
      .find((item) => item.type === "output_text")?.text || ""
  );
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A resume file is required." }, { status: 400 });
  }

  const lowerName = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return NextResponse.json({ error: "Use a PDF, DOC, or DOCX resume." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "The resume must be 15 MB or smaller." }, { status: 400 });
  }

  const configuredPrograms = process.env.RESUME_PROGRAMS
    ?.split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  const programs = configuredPrograms?.length ? configuredPrograms : FALLBACK_PROGRAMS;
  let localResume: LocalResumeFields;

  try {
    const text = await extractResumeText(file);
    localResume = parseResumeText(text, programs);
  } catch (error) {
    console.error("Local resume extraction failed:", error);
    localResume = {
      studentName: "",
      address: "",
      program: "",
      skills: [],
      certifications: [],
      confidence: "low",
    };
  }

  const needsAi =
    localResume.confidence === "low" ||
    !localResume.studentName ||
    !localResume.program;

  if (!needsAi) {
    const resume: ParsedResume = { ...localResume, extractionMethod: "local" };
    return NextResponse.json({ resume, aiUsed: false });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const resume: ParsedResume = { ...localResume, extractionMethod: "local" };
    return NextResponse.json({
      resume,
      aiUsed: false,
      warning: "Some details need review because AI fallback is not configured.",
    });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const mimeType = file.type || "application/octet-stream";
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      studentName: { type: "string" },
      address: { type: "string" },
      program: { type: "string", enum: ["", ...programs] },
      skills: { type: "array", items: { type: "string" } },
      certifications: { type: "array", items: { type: "string" } },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["studentName", "address", "program", "skills", "certifications", "confidence"],
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_RESUME_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-sol",
      store: false,
      reasoning: { effort: "low" },
      instructions:
        `Complete a local resume extraction only where needed. Use only information explicitly present in the file. Preserve reliable local values and correct them only when the file clearly supports the correction. Local extraction: ${JSON.stringify(localResume)}. Map the student's program to exactly one of these configured choices when the resume supports it: ${programs.join(", ") || "no configured choices"}. Otherwise return an empty program. Return concise, deduplicated skills and certifications. Do not infer credentials, dates, locations, or a program. Use an empty string or empty array when a field is absent. Confidence is low if the document is unreadable or key identity details are uncertain.`,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: file.name,
              file_data: `data:${mimeType};base64,${base64}`,
            },
            {
              type: "input_text",
              text: "Extract the student's name, full address, program, skills, certifications, and overall extraction confidence from this resume.",
            },
          ],
        },
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "resume_details",
          strict: true,
          schema,
        },
      },
    }),
  });

  const data = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    const message = data.error?.message || "The AI service could not read this resume.";
    return NextResponse.json({ error: message }, { status: response.status });
  }

  try {
    const aiResume = JSON.parse(outputText(data)) as LocalResumeFields;
    const resume: ParsedResume = { ...aiResume, extractionMethod: "ai-assisted" };
    return NextResponse.json({ resume, aiUsed: true });
  } catch {
    return NextResponse.json(
      { error: "The resume was read, but its details could not be structured." },
      { status: 502 },
    );
  }
}
