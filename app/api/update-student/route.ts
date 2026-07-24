export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const allowedFields = new Set([
  "FirstName",
  "LastName",
  "Email",
  "Code",
  "Test1",
  "Test2",
  "Test3",
  "Test4",
  "Test5",
  "Test6",
  "Test7",
  "Test8",
  "Progress",
]);

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    const updates = body.updates;

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !updates ||
      typeof updates !== "object" ||
      Array.isArray(updates)
    ) {
      return Response.json({ error: "Invalid learner update." }, { status: 400 });
    }

    const data = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedFields.has(key)),
    ) as Prisma.CourseRecordsUpdateInput;

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No valid fields to update." }, { status: 400 });
    }

    if (typeof data.Code === "string") {
      data.Code = data.Code.trim().toUpperCase();
    }

    const record = await prisma.courseRecords.update({ where: { id }, data });
    return Response.json({ success: true, record });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Learner not found." }, { status: 404 });
    }

    console.error("Learner update failed:", error);
    return Response.json({ error: "Database error." }, { status: 500 });
  }
}
