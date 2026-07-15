import { publicProcedure, router } from "@/trpc/init";

export const appRouter = router({
  ping: publicProcedure.query(() => ({ status: "ok" as const })),
});

export type AppRouter = typeof appRouter;
