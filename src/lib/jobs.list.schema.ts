import { z } from "zod";
import { TIER_VALUES } from "@/lib/score-tier";

export const JOB_FORMATS = ["Remote", "Hybrid", "On-site"] as const;
export type JobFormat = (typeof JOB_FORMATS)[number];

export const JOB_SORT_KEYS = ["score", "createdAt"] as const;
export type JobSortKey = (typeof JOB_SORT_KEYS)[number];

export const JOBS_PAGE_LIMIT_DEFAULT = 24;
export const JOBS_PAGE_LIMIT_MIN = 1;
export const JOBS_PAGE_LIMIT_MAX = 48;

export const jobsListInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z
    .number()
    .int()
    .min(JOBS_PAGE_LIMIT_MIN)
    .max(JOBS_PAGE_LIMIT_MAX)
    .default(JOBS_PAGE_LIMIT_DEFAULT),
  query: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().max(120))
    .optional(),
  formats: z.array(z.enum(JOB_FORMATS)).max(JOB_FORMATS.length).optional(),
  sortKey: z.enum(JOB_SORT_KEYS).default("score"),
  tiers: z.array(z.enum(TIER_VALUES)).max(TIER_VALUES.length).optional(),
});

export type JobsListInput = z.input<typeof jobsListInputSchema>;
export type JobsListParsed = z.output<typeof jobsListInputSchema>;

export type JobsListPage = {
  items: ReadonlyArray<{ id: string }>;
  nextCursor: string | null;
};

export const jobsSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  excellent: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
});
export type JobsSummary = z.output<typeof jobsSummarySchema>;
