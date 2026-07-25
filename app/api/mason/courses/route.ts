export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateLessonPlan } from "@/lib/mason-generator";
import { slugify } from "@/lib/mason";
import { requireAdmin } from "@/lib/admin-session";

export async function GET() {
  const courses = await prisma.masonCourse.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      sections: {
        orderBy: { position: "asc" },
        select: { id: true, title: true, position: true, fileName: true },
      },
    },
  });

  return Response.json(courses);
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const form = await request.formData();
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const sectionTitle = String(form.get("sectionTitle") || "").trim();
    const file = form.get("pdf");

    if (!title || !sectionTitle || !(file instanceof File)) {
      return Response.json(
        { error: "Course title, section title, and a PDF are required." },
        { status: 400 },
      );
    }
    if (file.type !== "application/pdf") {
      return Response.json({ error: "The uploaded file must be a PDF." }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return Response.json({ error: "PDF files are limited to 25 MB." }, { status: 400 });
    }

    const pdf = Buffer.from(await file.arrayBuffer());
    const lessonPlan = await generateLessonPlan({
      pdf,
      fileName: file.name,
      courseTitle: title,
      sectionTitle,
    });

    const baseSlug = slugify(title) || "mason-course";
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
        audience: null,
        theme: "heritage",
        intensity: "standard",
        estimatedMinutes: 60,
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: {
          create: {
            title: sectionTitle,
            position: 1,
            estimatedMinutes: 15,
            fileName: file.name,
            lessonPlan: lessonPlan as unknown as Prisma.InputJsonValue,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      },
      include: { sections: true },
    });

    return Response.json({ course }, { status: 201 });
  } catch (error) {
    console.error("Mason course creation failed:", error);
    const message =
      error instanceof Error ? error.message : "The course could not be created.";
    return Response.json({ error: message }, { status: 500 });
  }
}
