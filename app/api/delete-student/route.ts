import mysql from "mysql2/promise";

async function getConnection() {
  return mysql.createConnection(process.env.DATABASE_URL!);

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
      `DELETE FROM CourseRecords WHERE id = ?`,
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
