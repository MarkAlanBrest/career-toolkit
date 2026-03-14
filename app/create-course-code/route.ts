import { NextResponse } from "next/server";

// ---- helpers --------------------------------------------------

function validateBody(body: any) {
  const errors: string[] = [];

  if (!body.courseFolder || typeof body.courseFolder !== "string") {
    errors.push("courseFolder is required");
  }
  if (!body.firstName || typeof body.firstName !== "string") {
    errors.push("firstName is required");
  }
  if (!body.lastName || typeof body.lastName !== "string") {
    errors.push("lastName is required");
  }
  if (!body.email || typeof body.email !== "string") {
    errors.push("email is required");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

// Example: LAD-2025-7F3C
function generateCourseCode(courseFolder: string) {
  const prefix = courseFolder
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase();

  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `${prefix}-${year}-${random}`;
}

// TODO: replace with real DB call
async function saveCourseCodeToDatabase(input: {
  courseFolder: string;
  firstName: string;
  lastName: string;
  email: string;
  courseCode: string;
}) {
  // Plug in Prisma / SQL / whatever here
  console.log("[DB] Saving course code record:", input);
}

// TODO: replace with real email provider
async function sendCourseCodeEmail(input: {
  email: string;
  firstName: string;
  lastName: string;
  courseCode: string;
  courseFolder: string;
}) {
  // Plug in Resend / SendGrid / SES / etc here
  console.log("[EMAIL] Sending course code email:", input);
}

// ---- handler --------------------------------------------------

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const body = await req.json();

    console.log("[CREATE-COURSE-CODE] Incoming request", {
      requestId,
      body,
    });

    const validation = validateBody(body);
    if (!validation.ok) {
      console.warn("[CREATE-COURSE-CODE] Validation failed", {
        requestId,
        errors: validation.errors,
      });

      return NextResponse.json(
        { error: "Invalid request", details: validation.errors },
        { status: 400 }
      );
    }

    const { courseFolder, firstName, lastName, email } = body;

    const courseCode = generateCourseCode(courseFolder);

    await saveCourseCodeToDatabase({
      courseFolder,
      firstName,
      lastName,
      email,
      courseCode,
    });

    await sendCourseCodeEmail({
      email,
      firstName,
      lastName,
      courseCode,
      courseFolder,
    });

    console.log("[CREATE-COURSE-CODE] Success", {
      requestId,
      courseCode,
      courseFolder,
      email,
    });

    return NextResponse.json({ courseCode });
  } catch (err) {
    console.error("[CREATE-COURSE-CODE] Server error", {
      requestId,
      error: String(err),
    });

    return NextResponse.json(
      { error: "Server error", requestId },
      { status: 500 }
    );
  }
}
