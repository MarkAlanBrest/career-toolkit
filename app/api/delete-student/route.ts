export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid learner id." }, { status: 400 });
  }

  try {
    await prisma.courseRecords.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Learner not found." }, { status: 404 });
    }

    console.error("Delete learner failed:", error);
    return Response.json({ error: "Database error." }, { status: 500 });
  }
}
