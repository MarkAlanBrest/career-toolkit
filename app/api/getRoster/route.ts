export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const course = searchParams.get("course");

  if (!course) {
    return Response.json({ error: "Missing course param" }, { status: 400 });
  }

  const students = await prisma.courseRecords.findMany({
    where: { CourseName: course },
  });

  return Response.json(students);
}
