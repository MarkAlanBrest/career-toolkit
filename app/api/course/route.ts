import mysql from "mysql2/promise";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return Response.json({ error: "No code provided" }, { status: 400 });
    }

    const db = await mysql.createConnection(process.env.DATABASE_URL!);

    const [rows]: any = await db.query(
      "SELECT * FROM CourseRecords WHERE Code = ?",
      [code]
    );

    await db.end();

    if (!rows || rows.length === 0) {
      return Response.json({ error: "Invalid course code." }, { status: 404 });
    }

    return Response.json(rows[0]);
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}