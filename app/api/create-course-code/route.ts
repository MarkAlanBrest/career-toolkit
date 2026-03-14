export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// Generate course code
function generateCourseCode(folder: string) {
  const prefix = folder.slice(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${random}-${year}`;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const { prisma } = await import("@/lib/prisma");

    const body = await req.json();
    const { courseFolder, firstName, lastName, email } = body;

    if (!courseFolder || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const courseCode = generateCourseCode(courseFolder);

    // Auto dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    await prisma.courseRecords.create({
      data: {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        CourseName: courseFolder,
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

    return NextResponse.json({ courseCode });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      { error: err.message || "Server error", requestId },
      { status: 500 }
    );
  }
}