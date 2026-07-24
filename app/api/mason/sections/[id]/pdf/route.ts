export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sectionId = Number(id);
  if (!Number.isInteger(sectionId)) {
    return Response.json({ error: "Invalid section." }, { status: 400 });
  }

  const section = await prisma.masonSection.findUnique({
    where: { id: sectionId },
    select: { pdfData: true, fileName: true, mimeType: true },
  });
  if (!section) {
    return Response.json({ error: "PDF not found." }, { status: 404 });
  }

  return new Response(Buffer.from(section.pdfData), {
    headers: {
      "Content-Type": section.mimeType,
      "Content-Disposition": `inline; filename="${section.fileName.replaceAll('"', "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
