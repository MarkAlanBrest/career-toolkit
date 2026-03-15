export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import mysql from "mysql2/promise";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, slideNumber } = body;

    if (!code || slideNumber === undefined) {
      return Response.json({ error: "Missing code or slideNumber" }, { status: 400 });
    }

    // ⭐ Connect to DB
    const db = await mysql.createConnection(process.env.DATABASE_URL!);

    // ⭐ Get current progress
    const [rows]: any = await db.query(
      "SELECT Progress FROM CourseRecords WHERE Code = ? COLLATE utf8mb4_general_ci",
      [code]
    );

    if (!rows.length) {
      await db.end();
      return Response.json({ error: "Invalid course code" }, { status: 404 });
    }

    const currentProgress = rows[0].Progress ?? 0;

    // ⭐ Only update if slideNumber is GREATER than current progress
    if (slideNumber > currentProgress) {
      await db.query(
        "UPDATE CourseRecords SET Progress = ? WHERE Code = ?",
        [slideNumber, code]
      );
    }

    await db.end();

    return Response.json({
      success: true,
      previousProgress: currentProgress,
      newProgress: Math.max(currentProgress, slideNumber)
    });

  } catch (err: any) {
    return Response.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
