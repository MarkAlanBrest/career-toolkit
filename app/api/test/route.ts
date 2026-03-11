import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  const [rows]: any = await db.query(
    "SELECT * FROM CourseRecords WHERE Code = ?",
    [code]
  );

  if (!rows.length) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(rows[0]);
}
