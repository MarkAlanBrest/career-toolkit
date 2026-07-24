export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const cookieStore = await cookies();

  if (cookieStore.get("admin-auth")?.value !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = new URL(req.url).searchParams.get("course")?.trim();

  if (!course) {
    return NextResponse.json({ error: "Missing course" }, { status: 400 });
  }

  try {
    const students = await prisma.courseRecords.findMany({
      where: { SlidesPath: course },
      orderBy: [{ LastName: "asc" }, { FirstName: "asc" }],
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("Roster database error:", error);
    return NextResponse.json(
      { error: "The training database is unavailable." },
      { status: 500 },
    );
  }
}
