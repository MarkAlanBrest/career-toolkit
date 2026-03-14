import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

export const db = await mysql.createConnection(process.env.DATABASE_URL);
