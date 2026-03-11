import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return Response.json({ error: "Missing code" }, { status: 400 });
  }

  const [rows]: any = await db.query(
    "SELECT * FROM CourseRecords WHERE Code = ?",
    [code]
  );

  if (rows.length === 0) {
    return Response.json({ error: "Invalid code" }, { status: 404 });
  }

  return Response.json(rows[0]);
}
