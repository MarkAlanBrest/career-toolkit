import mysql from "mysql2/promise";

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates || typeof updates !== "object") {
      return new Response("Missing id or updates", { status: 400 });
    }

    const allowed = [
      "FirstName",
      "LastName",
      "Email",
      "Code",
      "Test1",
      "Test2",
      "Test3",
      "Test4",
      "Test5",
      "Test6",
      "Test7",
      "Test8",
    ];

    const setParts: string[] = [];
    const values: any[] = [];

    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) {
        setParts.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (setParts.length === 0) {
      return new Response("No valid fields to update", { status: 400 });
    }

    values.push(id);

    const conn = await getConnection();
    await conn.execute(
      `UPDATE CourseRecords SET ${setParts.join(", ")} WHERE ID = ?`,
      values
    );
    await conn.end();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Update error:", err);
    return new Response("Database error", { status: 500 });
  }
}
