export const runtime = "nodejs";

function ok(method) {
  return Response.json({ success: true, method });
}

export async function GET() { return ok("GET"); }
export async function POST() { return ok("POST"); }
export async function PATCH() { return ok("PATCH"); }
export async function DELETE() { return ok("DELETE"); }
export async function OPTIONS() { return ok("OPTIONS"); }