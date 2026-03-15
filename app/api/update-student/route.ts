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
  if (req.method !== "PATCH") {
    return res.status(405).send("Method not allowed");
  }

  const { id, updates } = req.body || {};
  if (!id || !updates || typeof updates !== "object") {
    return res.status(400).send("Missing id or updates");
  }

  const allowedFields = [
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
    "Progress",
  ];

  const setParts: string[] = [];
  const values: any[] = [];

  for (const key of Object.keys(updates)) {
    if (!allowedFields.includes(key)) continue;
    setParts.push(`${key} = ?`);
    values.push(updates[key]);
  }

  if (setParts.length === 0) {
    return res.status(400).send("No valid fields to update");
  }

  values.push(id);

  try {
    const conn = await getConnection();
    await conn.execute(
      `UPDATE CourseRecords SET ${setParts.join(", ")} WHERE ID = ?`,
      values
    );
    await conn.end();
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Update error:", err);
    return res.status(500).send("Database error");
  }
}
