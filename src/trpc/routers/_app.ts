import { publicProcedure, router } from "@/trpc/init";
import { jobsRouter } from "@/trpc/routers/jobs";

export const appRouter = router({
  ping: publicProcedure.query(() => ({ status: "ok" as const })),
  jobs: jobsRouter,
});

export type AppRouter = typeof appRouter;
