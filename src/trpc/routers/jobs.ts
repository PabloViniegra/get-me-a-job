import { listJobs } from "@/lib/jobs.list";
import { publicProcedure, router } from "@/trpc/init";

export const jobsRouter = router({
  list: publicProcedure.query(({ ctx }) => listJobs(ctx.prisma)),
});
