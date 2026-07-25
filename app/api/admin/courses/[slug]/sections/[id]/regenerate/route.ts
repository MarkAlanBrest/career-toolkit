export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-session";
import { generateLessonPlan } from "@/lib/mason-generator";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { slug, id } = await params;
    const sectionId = Number(id);
    if (!Number.isInteger(sectionId)) {
      return Response.json({ error: "Invalid section." }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("pdf");
    if (!(file instanceof File) || file.type !== "application/pdf") {
      return Response.json(
        { error: "Choose a new source PDF to rebuild this section." },
        { status: 400 },
      );
    }
    if (file.size > 25 * 1024 * 1024) {
      return Response.json({ error: "PDF files are limited to 25 MB." }, { status: 400 });
    }

    const section = await prisma.masonSection.findFirst({
      where: { id: sectionId, course: { slug } },
      include: {
        course: {
          select: { title: true, intensity: true },
        },
      },
    });
    if (!section) {
      return Response.json({ error: "Section not found." }, { status: 404 });
    }

    const pdf = Buffer.from(await file.arrayBuffer());
    const lessonPlan = await generateLessonPlan({
      pdf,
      fileName: file.name,
      courseTitle: section.course.title,
      sectionTitle: section.title,
      intensity: section.course.intensity,
      estimatedMinutes: section.estimatedMinutes,
    });

    const updated = await prisma.masonSection.update({
      where: { id: section.id },
      data: {
        fileName: file.name,
        lessonPlan: lessonPlan as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        position: true,
        estimatedMinutes: true,
        fileName: true,
        lessonPlan: true,
        updatedAt: true,
      },
    });

    return Response.json(updated);
  } catch (error) {
    console.error("Course section regeneration failed:", error);
    const message =
      error instanceof Error ? error.message : "The section could not be regenerated.";
    return Response.json({ error: message }, { status: 500 });
  }
}
