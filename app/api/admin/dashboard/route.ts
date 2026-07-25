export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const records = await prisma.courseRecords.findMany({
      orderBy: { StartDate: "desc" },
    });

    return NextResponse.json({ totalRecords: records.length, records });
  } catch (error) {
    console.error("Admin dashboard database error:", error);
    return NextResponse.json(
      { error: "The training database is unavailable." },
      { status: 500 },
    );
  }
}
