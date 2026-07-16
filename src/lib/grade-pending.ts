import type { PrismaClient } from "@prisma/client";
import { loadCV } from "./cv";
import type { AiAnalysis, JobSnapshot } from "./grader";
import { gradeJob } from "./grader";
import { openRouterClient } from "./openrouter";
import { prisma as defaultPrisma } from "./prisma";

export type GradePendingOptions = {
  limit?: number;
  concurrency?: number;
};

export type GradePendingError = {
  jobId: string;
  reason: string;
  detail?: string;
};

export type GradePendingResult = {
  considered: number;
  succeeded: number;
  failed: number;
  errors: GradePendingError[];
};

const DEFAULT_LIMIT = 30;
const DEFAULT_CONCURRENCY = 3;

type JobOfferRow = {
  jobId: string;
  title: string;
  linkedinUrl: string;
  description: string;
  salary: string | null;
  format: string;
  requirements: string[];
};

function toJobSnapshot(row: JobOfferRow): JobSnapshot {
  return {
    jobId: row.jobId,
    title: row.title,
    linkedinUrl: row.linkedinUrl,
    description: row.description,
    salary: row.salary,
    format: row.format,
    requirements: row.requirements,
  };
}

export async function gradePendingJobs(
  options: GradePendingOptions = {},
  prismaOverride: PrismaClient = defaultPrisma,
): Promise<GradePendingResult> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);

  console.info(
    `[grade-pending] ENTRY limit=${limit} concurrency=${concurrency}`,
  );

  const cvText = await loadCV();

  // ponytail: Prisma MongoDB null-query on optional embedded fields is flaky
  // across versions — fetch a window and filter in JS. We have < 1k jobs, so
  // a single take(500) is cheap.
  const candidates = await prismaOverride.jobOffer.findMany({
    take: 500,
    orderBy: { updatedAt: "asc" },
  });

  const pending = candidates
    .filter((row) => row.aiAnalysis === null || row.aiAnalysis === undefined)
    .slice(0, limit);

  console.info(
    `[grade-pending] candidates=${candidates.length} pending=${pending.length}`,
  );

  if (pending.length === 0) {
    return { considered: 0, succeeded: 0, failed: 0, errors: [] };
  }

  const errors: GradePendingError[] = [];
  let succeeded = 0;

  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (row) => {
        const failure: { reason?: string; detail?: string } = {};
        const result = await gradeJob({
          client: openRouterClient,
          cvText,
          job: toJobSnapshot(row),
          onFailure: (reason, detail) => {
            failure.reason = reason;
            failure.detail = detail;
          },
        });
        if (!result) {
          const err = new Error(failure.reason ?? "grade-returned-null");
          (err as Error & { detail?: string }).detail = failure.detail;
          throw err;
        }
        return result;
      }),
    );

    for (let j = 0; j < results.length; j++) {
      const settled = results[j];
      const row = batch[j];
      if (settled.status === "fulfilled") {
        const analysis: AiAnalysis = settled.value;
        await prismaOverride.jobOffer.update({
          where: { jobId: row.jobId },
          data: { aiAnalysis: analysis },
        });
        succeeded += 1;
      } else {
        const e = settled.reason as Error & { detail?: string };
        const reason = e?.message ?? "grade-returned-null";
        errors.push({
          jobId: row.jobId,
          reason,
          detail: e?.detail,
        });
      }
    }
  }

  return {
    considered: pending.length,
    succeeded,
    failed: pending.length - succeeded,
    errors,
  };
}
