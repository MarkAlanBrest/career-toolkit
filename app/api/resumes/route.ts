import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { listResumesFromSharePoint } from "@/lib/sharepoint-resumes";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const resumes = await listResumesFromSharePoint();
    return NextResponse.json({ resumes });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The saved resumes could not be loaded.",
      },
      { status: 500 },
    );
  }
}
