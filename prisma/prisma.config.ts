import type { Prisma } from "@prisma/client";

const config: Prisma.PrismaClientOptions = {
  adapter: {
    provider: "sqlite",
    url: "file:./dev.db",
  },
};

export default config;
