import { NextRequest, NextResponse } from "next/server";
import { uploadResumeToSharePoint } from "@/lib/sharepoint-resumes";
import { requireAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";
export const maxDuration = 60;

type ResumeMetadata = {
  studentName: string;
  address: string;
  program: string;
  graduationDate: string;
  skills: string[];
  certifications: string[];
};

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const formData = await request.formData();
    const file = formData.get("file");
    const rawMetadata = formData.get("metadata");
    if (!(file instanceof File) || typeof rawMetadata !== "string") {
      return NextResponse.json({ error: "A resume and its details are required." }, { status: 400 });
    }

    const metadata = JSON.parse(rawMetadata) as ResumeMetadata;
    if (
      !metadata.studentName?.trim()
      || !metadata.program
      || !/^\d{4}-(0[1-9]|1[0-2])$/.test(metadata.graduationDate)
    ) {
      return NextResponse.json(
        { error: "Student name, program, and a valid graduation month are required." },
        { status: 400 },
      );
    }

    const result = await uploadResumeToSharePoint(file, metadata);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The resume could not be filed." },
      { status: 500 },
    );
  }
}
