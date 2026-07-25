export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

function normalizeCode(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

export async function GET(request: Request) {
  const code = normalizeCode(new URL(request.url).searchParams.get("code"));
  if (!code) {
    return Response.json({ error: "Enter an enrollment code." }, { status: 400 });
  }

  const accessCode = await prisma.enrollmentCode.findUnique({
    where: { code },
    include: {
      course: {
        select: {
          title: true,
          slug: true,
          description: true,
          published: true,
          theme: true,
          estimatedMinutes: true,
        },
      },
      enrollment: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          progress: true,
          status: true,
        },
      },
    },
  });

  if (!accessCode || !accessCode.course.published) {
    return Response.json({ error: "This enrollment code is not valid." }, { status: 404 });
  }
  if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
    return Response.json({ error: "This enrollment code has expired." }, { status: 410 });
  }

  return Response.json({
    valid: true,
    claimed: Boolean(accessCode.enrollment),
    course: accessCode.course,
    enrollment: accessCode.enrollment,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = normalizeCode(body.code);
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (!code || !firstName || !lastName || !email) {
      return Response.json(
        { error: "Code, first name, last name, and email are required." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const accessCode = await tx.enrollmentCode.findUnique({
        where: { code },
        include: { course: true, enrollment: true },
      });

      if (!accessCode || !accessCode.course.published) {
        throw new Error("INVALID_CODE");
      }
      if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
        throw new Error("EXPIRED_CODE");
      }
      if (accessCode.enrollment || accessCode.status !== "available") {
        throw new Error("CLAIMED_CODE");
      }

      const enrollment = await tx.courseEnrollment.create({
        data: {
          courseId: accessCode.courseId,
          codeId: accessCode.id,
          firstName,
          lastName,
          email,
        },
      });

      await tx.enrollmentCode.update({
        where: { id: accessCode.id },
        data: { status: "claimed", claimedAt: new Date() },
      });

      return { enrollment, course: accessCode.course };
    });

    return Response.json(
      {
        success: true,
        course: {
          title: result.course.title,
          slug: result.course.slug,
          theme: result.course.theme,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVALID_CODE") {
      return Response.json({ error: "This enrollment code is not valid." }, { status: 404 });
    }
    if (message === "EXPIRED_CODE") {
      return Response.json({ error: "This enrollment code has expired." }, { status: 410 });
    }
    if (message === "CLAIMED_CODE") {
      return Response.json(
        { error: "This enrollment code has already been claimed." },
        { status: 409 },
      );
    }
    console.error("Enrollment failed:", error);
    return Response.json({ error: "Enrollment could not be completed." }, { status: 500 });
  }
}
