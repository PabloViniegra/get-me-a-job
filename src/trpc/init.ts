import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "@/lib/prisma";

export function createTRPCContext() {
  return { prisma };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
