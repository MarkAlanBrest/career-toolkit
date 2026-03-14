

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


// -------------------------------
// Generate a clean course code
// Example: LAD-7F3C-2026
// -------------------------------
function generateCourseCode(folder: string) {
  const prefix = folder.slice(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${random}-${year}`;
}

// -------------------------------
// POST handler
// -------------------------------
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const body = await req.json();
    const { courseFolder, firstName, lastName, email } = body;

    // Validation
    const missing = [];
    if (!courseFolder) missing.push("courseFolder");
    if (!firstName) missing.push("firstName");
    if (!lastName) missing.push("lastName");
    if (!email) missing.push("email");

    if (missing.length > 0) {
      console.warn("[CREATE-COURSE-CODE] Missing fields", { requestId, missing });
      return NextResponse.json(
        { error: "Missing required fields", missing },
        { status: 400 }
      );
    }

    // Generate code
    const courseCode = generateCourseCode(courseFolder);

    // Save to DB
    const record = await prisma.courseRecords.create({
      data: {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        CourseName: courseFolder,
        Code: courseCode,
        StartDate: new Date(),
        Progress: 0,
      },
    });

    console.log("[CREATE-COURSE-CODE] Saved record", { requestId, record });

    // Return success
    return NextResponse.json({ courseCode });
  } catch (err: any) {
    console.error("[CREATE-COURSE-CODE] Server error", {
      requestId,
      error: err.message,
    });

    return NextResponse.json(
      { error: "Server error", requestId },
      { status: 500 }
    );
  }
}
