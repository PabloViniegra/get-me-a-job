import { PrismaClient } from "@prisma/client";
import { env } from "@/env";
import { cachedClient } from "@/lib/cache";

export const prisma = cachedClient(
  "prisma",
  () =>
    new PrismaClient({
      datasourceUrl: env.DATABASE_URL,
    }),
);
