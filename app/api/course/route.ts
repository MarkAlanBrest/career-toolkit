import mysql from "mysql2/promise";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    const db = await mysql.createConnection(process.env.DATABASE_URL!);

    const [rows]: any = await db.execute(
      "SELECT * FROM CourseRecords WHERE CourseName = ?",
      [code]
    );

    await db.end();

    return Response.json(rows[0] || { error: "Not found" });

  } catch (err: any) {
    return Response.json({ error: err.message });
  }
}