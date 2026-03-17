
import mysql from "mysql2/promise";

export async function GET() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);

  const [rows] = await db.query(
    "SELECT * FROM JobBoard WHERE Active = 1 ORDER BY Position ASC"
  );

  await db.end();

  return Response.json(rows);
}