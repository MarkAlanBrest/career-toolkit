export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import mysql from "mysql2/promise";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("admin-auth")?.value;

  if (auth !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const course = searchParams.get("course");

  if (!course) {
    return NextResponse.json({ error: "Missing course" }, { status: 400 });
  }

  const db = await mysql.createConnection(process.env.DATABASE_URL!);

  const [rows]: any = await db.query(
    "SELECT * FROM CourseRecords WHERE CourseName = ?",
    [course]
  );

  await db.end();

  return NextResponse.json({
    students: Array.isArray(rows) ? rows : [],
  });
}
