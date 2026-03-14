export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
const cookieStore = cookies();
  const auth = cookieStore.get("admin-auth")?.value;

  if (auth !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await prisma.courseRecords.findMany({
    orderBy: { id: "desc" },
  });

  return NextResponse.json({
    totalRecords: records.length,
    records,
  });
}