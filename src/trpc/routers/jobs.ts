import { listJobs, summarizeJobs } from "@/server/jobs/list";
import { jobsListInputSchema } from "@/server/jobs/list-schema";
import { publicProcedure, router } from "@/trpc/init";

const DEFAULT_LIST_INPUT: {
  limit: number;
  sortKey: "score" | "createdAt";
} = { limit: 24, sortKey: "score" as const };

export const jobsRouter = router({
  list: publicProcedure
    .input(jobsListInputSchema.optional())
    .query(({ ctx, input }) =>
      listJobs(input ?? DEFAULT_LIST_INPUT, ctx.prisma),
    ),
  summary: publicProcedure.query(({ ctx }) => summarizeJobs(ctx.prisma)),
});
