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
  "Electrical Technology",
  "Industrial Electro-Mechanical Technology",
  "Machinist & CNC Manufacturing",
  "Refrigeration & A/C Technology",
  "Commercial Truck Driving",
  "Diesel & Heavy Equipment Repair",
  "Heavy Equipment Operations with CDL Training",
  "Motorcycle & Power Equipment Technology",
  "East Liverpool, Combination Welding",
  "East Liverpool, Electrical & Industrial Maintenance",
  "East, Liverpool, Refrigeration & Climate Control",
];

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

  try {
    const text = await extractResumeText(file);
    const resume: LocalResumeFields = parseResumeText(text, programs, file.name);
    return NextResponse.json({ resume });
  } catch (error) {
    console.error("Resume extraction failed:", error);
    return NextResponse.json(
      {
        error:
          "This file could not be read automatically. Enter its details manually or upload a PDF or DOCX file.",
      },
      { status: 422 },
    );
  }
}
