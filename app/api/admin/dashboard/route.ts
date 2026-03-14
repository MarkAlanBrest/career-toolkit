import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function GET() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("admin-auth")?.value;

  if (auth !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rows] = await db.query("SELECT * FROM CourseRecords");
  const records = Array.isArray(rows) ? rows : [];

  return NextResponse.json({
    totalRecords: records.length,
    records,
  });
}
