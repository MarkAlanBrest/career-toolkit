import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";

const FALLBACK_PROGRAMS = [
  "Automotive Technology",
  "Building Technology",
  "Combination Welding",
  "Electrical Systems Technology",
  "HVAC/R Technology",
];

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const configuredPrograms = process.env.RESUME_PROGRAMS
    ?.split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  const programs = configuredPrograms?.length ? configuredPrograms : FALLBACK_PROGRAMS;

  const sharePointConnected = Boolean(
    process.env.MS_TENANT_ID &&
      process.env.MS_CLIENT_ID &&
      process.env.MS_CLIENT_SECRET &&
      process.env.SHAREPOINT_SITE_ID &&
      process.env.SHAREPOINT_DRIVE_ID,
  );

  return NextResponse.json({ programs, sharePointConnected });
}
