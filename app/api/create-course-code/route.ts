export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAllCourses } from "@/lib/courses";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function generateCourseCode(folder: string) {
  const prefix = folder.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${random}-${new Date().getFullYear()}`;
}

async function getUnusedCourseCode(folder: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateCourseCode(folder);
    const existing = await prisma.courseRecords.findUnique({ where: { Code: code } });
    if (!existing) return code;
  }

  throw new Error("Unable to generate a unique course code.");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const courseFolder = String(body.courseFolder ?? "").trim();
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!courseFolder || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Course, first name, last name, and email are required." },
        { status: 400 },
      );
    }

    const course = getAllCourses().find((item) => item.folder === courseFolder);

    if (!course) {
      return NextResponse.json({ error: "Unknown course." }, { status: 404 });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const courseCode = await getUnusedCourseCode(courseFolder);

    await prisma.courseRecords.create({
      data: {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        CourseName: course.courseName,
        Code: courseCode,
        StartDate: startDate,
        EndDate: endDate,
        Test1: 0,
        Test2: 0,
        Test3: 0,
        Test4: 0,
        Test5: 0,
        Test6: 0,
        Test7: 0,
        Test8: 0,
        Progress: 0,
        SlidesPath: courseFolder,
      },
    });

    return NextResponse.json({ success: true, courseCode });
  } catch (error) {
    console.error("Create course code failed:", error);
    return NextResponse.json(
      { error: "Unable to create the course code." },
      { status: 500 },
    );
  }
}
