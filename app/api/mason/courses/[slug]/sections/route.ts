export const runtime = "nodejs";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateLessonPlan } from "@/lib/mason-generator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const course = await prisma.masonCourse.findUnique({
      where: { slug },
      include: { _count: { select: { sections: true } } },
    });
    if (!course) {
      return Response.json({ error: "Course not found." }, { status: 404 });
    }

    const form = await request.formData();
    const title = String(form.get("sectionTitle") || "").trim();
    const file = form.get("pdf");
    if (!title || !(file instanceof File) || file.type !== "application/pdf") {
      return Response.json(
        { error: "A section title and PDF are required." },
        { status: 400 },
      );
    }
    if (file.size > 25 * 1024 * 1024) {
      return Response.json({ error: "PDF files are limited to 25 MB." }, { status: 400 });
    }

    const pdf = Buffer.from(await file.arrayBuffer());
    const lessonPlan = await generateLessonPlan({
      pdf,
      fileName: file.name,
      courseTitle: course.title,
      sectionTitle: title,
    });

    const section = await prisma.masonSection.create({
      data: {
        courseId: course.id,
        title,
        position: course._count.sections + 1,
        estimatedMinutes: 15,
        fileName: file.name,
        mimeType: file.type,
        pdfData: pdf,
        lessonPlan: lessonPlan as unknown as Prisma.InputJsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        position: true,
        fileName: true,
        lessonPlan: true,
      },
    });

    return Response.json(section, { status: 201 });
  } catch (error) {
    console.error("Mason section creation failed:", error);
    const message =
      error instanceof Error ? error.message : "The section could not be created.";
    return Response.json({ error: message }, { status: 500 });
  }
}
