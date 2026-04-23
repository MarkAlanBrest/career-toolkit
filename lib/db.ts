import mysql, { type Pool } from "mysql2/promise";

let pool: Pool | null = null;

function getConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.MYSQL_URL ||
    process.env.MYSQL_PUBLIC_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    ""
  );
}

export function hasDatabaseConfig() {
  return Boolean(getConnectionString());
}

export function getDbPool() {
  if (pool) {
    return pool;
  }

  const connectionString = getConnectionString();

  if (!connectionString) {
    throw new Error(
      "Missing Railway MySQL connection string. Set DATABASE_URL or MYSQL_URL."
    );
  }

  pool = mysql.createPool(connectionString);
  return pool;
}
