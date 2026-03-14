import type { Prisma } from "@prisma/client";

const config: Prisma.PrismaClientOptions = {
  datasourceUrl: "file:./dev.db",
};

export default config;
