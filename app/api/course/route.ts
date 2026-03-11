import mysql from "mysql2/promise";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code"); // using course name as code

  const db = await mysql.createConnection(process.env.DATABASE_URL!);

  const [rows]: any = await db.execute(
    "SELECT * FROM CourseRecords WHERE CourseName = ?",
    [code]
  );

  await db.end();

  if (!rows.length) return Response.json({ error: "Not found" });

  return Response.json(rows[0]);
}