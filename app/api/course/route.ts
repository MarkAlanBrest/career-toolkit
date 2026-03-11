import mysql from "mysql2/promise";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    const db = await mysql.createPool({
      uri: process.env.DATABASE_URL!,   // Railway URL
      ssl: { rejectUnauthorized: false } // required on Vercel
    });

    const [rows]: any = await db.execute(
      "SELECT * FROM CourseRecords WHERE CourseName = ?",
      [code]
    );

    return Response.json(rows[0] || { error: "Not found" });

  } catch (e: any) {
    return Response.json({ error: e.message });
  }
}