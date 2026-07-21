import { PrismaClient } from "@prisma/client";
import { cachedClient } from "@/lib/cache";
import { env } from "@/lib/env";

export const prisma = cachedClient(
  "prisma",
  () =>
    new PrismaClient({
      datasourceUrl: env.DATABASE_URL,
    }),
);
