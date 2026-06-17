export async function GET() {
  return Response.json({
    FirstName: "Test",
    LastName: "User",
    CourseName: "Ladder Safety",
    Progress: 0,
    Email: "test@test.com"
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const code = body?.code ?? null;

    if (!code) {
      return Response.json({ error: "No code provided" }, { status: 400 });
    }

    // Replace with real lookup later
    if (code !== "TEST123") {
      return Response.json({ error: "Course not found" }, { status: 404 });
    }

    return Response.json({
      FirstName: "Test",
      LastName: "User",
      CourseName: "Business Law 25",
      Progress: 0,
      Email: "test@test.com"
    });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}