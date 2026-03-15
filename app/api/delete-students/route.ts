import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
    return res.status(405).send("Method not allowed");
  }

  const { id } = req.query;
  const numericId = Number(id);

  if (!numericId || Number.isNaN(numericId)) {
    return res.status(400).send("Invalid id");
  }

  try {
    const conn = await getConnection();
    await conn.execute("DELETE FROM CourseRecords WHERE ID = ?", [numericId]);
    await conn.end();
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Delete error:", err);
    return res.status(500).send("Database error");
  }
}
