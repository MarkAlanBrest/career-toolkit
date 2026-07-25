export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/mason";
import {
  isCourseIntensity,
  isCourseTheme,
} from "@/lib/course-options";

export async function GET() {
  const courses = await prisma.masonCourse.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          sections: true,
          enrollmentCodes: true,
          enrollments: true,
        },
      },
      enrollmentCodes: {
        where: { status: "available" },
        select: { id: true },
      },
    },
  });

  return Response.json(
    courses.map(({ enrollmentCodes, ...course }) => ({
      ...course,
      availableCodes: enrollmentCodes.length,
    })),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const audience = String(body.audience || "").trim();
    const theme = String(body.theme || "heritage");
    const intensity = String(body.intensity || "standard");
    const estimatedMinutes = Math.max(
      10,
      Math.min(100000, Number(body.estimatedMinutes) || 60),
    );

    if (!title) {
      return Response.json({ error: "Course title is required." }, { status: 400 });
    }
    if (!isCourseTheme(theme) || !isCourseIntensity(intensity)) {
      return Response.json(
        { error: "Select a valid theme and intensity." },
        { status: 400 },
      );
    }

    const baseSlug = slugify(title) || "training-course";
    let slug = baseSlug;
    let suffix = 2;
    while (await prisma.masonCourse.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const course = await prisma.masonCourse.create({
      data: {
        title,
        slug,
        description: description || null,
        audience: audience || null,
        theme,
        intensity,
        estimatedMinutes,
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return Response.json({ course }, { status: 201 });
  } catch (error) {
    console.error("Course creation failed:", error);
    return Response.json(
      { error: "The course could not be created." },
      { status: 500 },
    );
  }
}
