export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import mysql from "mysql2/promise";

export async function GET() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("admin-auth")?.value;

  if (auth !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await mysql.createConnection(process.env.DATABASE_URL!);

  const [rows]: any = await db.query("SELECT * FROM CourseRecords");

  await db.end();

  const records = Array.isArray(rows) ? rows : [];

  return NextResponse.json({
    totalRecords: records.length,
    records,
  });
}