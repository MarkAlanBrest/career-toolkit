export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import mysql from "mysql2/promise";

export async function GET() {
  try {
    const db = await mysql.createConnection(process.env.DATABASE_URL!);

    const [rows] = await db.query(
      "SELECT id, Title, Description, Link FROM JobBoard WHERE Active = 1 ORDER BY Position"
    );

    await db.end();

    return Response.json(rows);

  } catch (err: any) {
    return Response.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}