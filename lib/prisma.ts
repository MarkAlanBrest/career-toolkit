import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const configuredUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const databaseUrl = configuredUrl.startsWith("file:./")
  ? `file:./prisma/${configuredUrl.slice("file:./".length)}`
  : configuredUrl;
const adapter = new PrismaBetterSqlite3(
  { url: databaseUrl },
  { timestampFormat: "unixepoch-ms" },
);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
