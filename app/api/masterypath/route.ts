export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    { error: "Saved MasteryPath assignments were removed. Export SCORM packages from the builder." },
    { status: 410 }
  );
}

export async function POST() {
  return Response.json(
    { error: "Database saves were removed. Export a SCORM ZIP instead." },
    { status: 410 }
  );
}

export async function PATCH() {
  return Response.json(
    { error: "Database saves were removed. Export a SCORM ZIP instead." },
    { status: 410 }
  );
}

export async function DELETE() {
  return Response.json(
    { error: "Database saves were removed. Export a SCORM ZIP instead." },
    { status: 410 }
  );
}
