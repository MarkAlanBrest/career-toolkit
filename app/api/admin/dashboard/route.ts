export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();

  if (cookieStore.get("admin-auth")?.value !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
