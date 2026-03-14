import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function GET() {
  const auth = cookies().get("admin-auth")?.value;

  if (auth !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Query total records
  const [rows] = await db.query("SELECT * FROM CourseRecords");

  return NextResponse.json({
    totalRecords: rows.length,
    records: rows,
  });
}
