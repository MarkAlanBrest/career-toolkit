export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomChunk(length: number) {
  return Array.from(
    { length },
    () => alphabet[randomInt(0, alphabet.length)],
  ).join("");
}

function createCode(slug: string) {
  const prefix = slug.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "TRN";
  return `${prefix}-${randomChunk(4)}-${randomChunk(4)}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const quantity = Math.max(1, Math.min(100, Number(body.quantity) || 1));
    const batchName = String(body.batchName || "").trim() || null;
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return Response.json({ error: "Expiration date is invalid." }, { status: 400 });
    }

    const course = await prisma.masonCourse.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!course) {
      return Response.json({ error: "Course not found." }, { status: 404 });
    }

    const created: string[] = [];
    while (created.length < quantity) {
      const code = createCode(slug);
      try {
        await prisma.enrollmentCode.create({
          data: {
            code,
            courseId: course.id,
            batchName,
            expiresAt,
          },
        });
        created.push(code);
      } catch {
        // A collision is extremely unlikely; generate another code.
      }
    }

    return Response.json({ codes: created }, { status: 201 });
  } catch (error) {
    console.error("Enrollment code generation failed:", error);
    return Response.json(
      { error: "Enrollment codes could not be generated." },
      { status: 500 },
    );
  }
}
