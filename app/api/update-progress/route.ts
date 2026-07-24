export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    const slideNumber = Number(body.slideNumber);

    if (!code || !Number.isInteger(slideNumber) || slideNumber < 0) {
      return Response.json(
        { error: "A valid course code and slide number are required." },
        { status: 400 },
      );
    }

    const record = await prisma.courseRecords.findUnique({ where: { Code: code } });

    if (!record) {
      return Response.json({ error: "Invalid course code." }, { status: 404 });
    }

    const newProgress = Math.max(record.Progress, slideNumber);

    if (newProgress !== record.Progress) {
      await prisma.courseRecords.update({
        where: { id: record.id },
        data: { Progress: newProgress },
      });
    }

    return Response.json({
      success: true,
      previousProgress: record.Progress,
      newProgress,
    });
  } catch (error) {
    console.error("Progress update failed:", error);
    return Response.json({ error: "Database error." }, { status: 500 });
  }
}
