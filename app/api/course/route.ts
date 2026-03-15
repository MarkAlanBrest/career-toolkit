export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import mysql from "mysql2/promise";
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return Response.json({ error: "No code provided" }, { status: 400 });
    }

    // ⭐ Connect to DB
    const db = await mysql.createConnection(process.env.DATABASE_URL!);

    const [rows]: any = await db.query(
      "SELECT * FROM CourseRecords WHERE Code = ? COLLATE utf8mb4_general_ci",
      [code]
    );

    await db.end();

    if (!rows.length) {
      return Response.json({ error: "Invalid course code." }, { status: 404 });
    }

    const record = rows[0];

    // ⭐ Load module.json from data/courses/<SlidesPath>/module.json
    const folder = record.SlidesPath;
    let totalSlides = null;

    if (folder) {
      try {
        const jsonPath = path.join(
          process.cwd(),
          "data",
          "courses",
          folder,
          "module.json"
        );

        const file = await fs.readFile(jsonPath, "utf8");
        const json = JSON.parse(file);

        totalSlides = json.totalSlides ?? null;
      } catch (err) {
        console.error("Failed to read module JSON:", err);
      }
    }

    // ⭐ Return DB record + totalSlides
    return Response.json({
      ...record,
      TotalSlides: totalSlides
    });

  } catch (err: any) {
    return Response.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
