export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  isCourseIntensity,
  isCourseTheme,
} from "@/lib/course-options";
import { requireAdmin } from "@/lib/admin-session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  const course = await prisma.masonCourse.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          estimatedMinutes: true,
          fileName: true,
          lessonPlan: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      enrollmentCodes: {
        orderBy: { createdAt: "desc" },
        take: 250,
        include: {
          enrollment: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              progress: true,
              status: true,
            },
          },
        },
      },
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        include: { code: { select: { code: true } } },
      },
    },
  });

  if (!course) {
    return Response.json({ error: "Course not found." }, { status: 404 });
  }

  return Response.json(course);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { slug } = await params;
    const body = await request.json();
    const title = String(body.title || "").trim();
    const theme = String(body.theme || "heritage");
    const intensity = String(body.intensity || "standard");

    if (!title || !isCourseTheme(theme) || !isCourseIntensity(intensity)) {
      return Response.json(
        { error: "Title, theme, and intensity are required." },
        { status: 400 },
      );
    }

    const course = await prisma.masonCourse.update({
      where: { slug },
      data: {
        title,
        description: String(body.description || "").trim() || null,
        audience: String(body.audience || "").trim() || null,
        theme,
        intensity,
        estimatedMinutes: Math.max(
          10,
          Math.min(100000, Number(body.estimatedMinutes) || 60),
        ),
        published: Boolean(body.published),
      },
    });

    return Response.json(course);
  } catch (error) {
    console.error("Course update failed:", error);
    return Response.json(
      { error: "The course could not be updated." },
      { status: 500 },
    );
  }
}
