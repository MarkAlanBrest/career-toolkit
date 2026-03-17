export async function GET() {
  return Response.json({
    ok: true,
    db: process.env.DATABASE_URL ? "exists" : "missing"
  });
}