import mysql from "mysql2/promise";

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

export async function DELETE(req: Request) {
  let conn;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response("Missing id", { status: 400 });
    }

    conn = await getConnection();

    const [result]: any = await conn.execute(
      `DELETE FROM CourseRecords WHERE ID = ?`,
      [id]
    );

    return new Response(
      JSON.stringify({
        success: true,
        affectedRows: result?.affectedRows ?? 0,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Delete error:", err);
    return new Response("Database error", { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
