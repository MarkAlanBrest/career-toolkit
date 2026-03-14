import Prisma from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: Prisma.PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new Prisma.PrismaClient({
    log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
