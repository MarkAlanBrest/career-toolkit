export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import fs from "fs/promises";

// Generate course code
function generateCourseCode(folder: string) {
  const prefix = folder.slice(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${random}-${year}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { courseFolder, firstName, lastName, email } = body;

    if (!courseFolder || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ FIXED PATH — Vercel needs the full app/ prefix
    const raw = await fs.readFile(
      `app/data/courses/${courseFolder}/module.json`,
      "utf8"
    );

    const json = JSON.parse(raw);
    const realCourseName = json.courseName;

    const courseCode = generateCourseCode(courseFolder);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const db = await mysql.createConnection(process.env.DATABASE_URL!);

    try {
      const [result] = await db.query(
        `INSERT INTO CourseRecords
         (FirstName, LastName, Email, CourseName, Code,
          StartDate, EndDate,
          Test1, Test2, Test3, Test4, Test5, Test6, Test7, Test8,
          Progress, SlidesPath)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          firstName,
          lastName,
          email,
          realCourseName,
          courseCode,
          startDate,
          endDate,
          0, 0, 0, 0, 0, 0, 0, 0,
          0,
          courseFolder
        ]
      );

      await db.end();
      return NextResponse.json({ success: true, courseCode });

    } catch (e: any) {
      await db.end();
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: 500 }
      );
    }

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
