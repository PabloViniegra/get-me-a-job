import { initTRPC } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export function createTRPCContext() {
  return { prisma };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
