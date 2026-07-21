import type { Prisma, PrismaClient } from "@prisma/client";
import { loadCV } from "@/lib/cv";
import { gradeJob } from "@/lib/grader";
import type { JobSnapshot } from "@/lib/job";
import { log } from "@/lib/log";
import type { OpenRouterClient } from "@/lib/openrouter";
import { openRouterClient } from "@/lib/openrouter";
import { prisma as defaultPrisma } from "@/lib/prisma";

export const MAX_GRADE_LIMIT = 30;
export const MAX_GRADE_CONCURRENCY = 3;

export type GradePendingOptions = {
  limit?: number;
  concurrency?: number;
  now?: () => Date;
  prisma?: PrismaClient;
  client?: OpenRouterClient;
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
  skipped: number;
  errors: GradePendingError[];
};

const DEFAULT_LIMIT = MAX_GRADE_LIMIT;
const DEFAULT_CONCURRENCY = MAX_GRADE_CONCURRENCY;
const PAGE_SIZE = 100;
const LEASE_DURATION_MS = 5 * 60 * 1000;

type JobOfferRow = {
  id: string;
  jobId: string;
  title: string;
  linkedinUrl: string;
  description: string;
  descriptionHash: string | null;
  gradedDescriptionHash: string | null;
  gradingLeaseUntil: Date | null;
  salary: string | null;
  format: string;
  requirements: string[];
  aiAnalysis: { score: number; whyItFits: string } | null;
  updatedAt: Date;
};

type ClaimedJob = {
  row: JobOfferRow;
  leaseUntil: Date;
};

type ClaimSummary = {
  jobs: ClaimedJob[];
  considered: number;
  skipped: number;
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
): Promise<GradePendingResult> {
  const limit = Math.min(
    MAX_GRADE_LIMIT,
    Math.max(1, options.limit ?? DEFAULT_LIMIT),
  );
  const concurrency = Math.min(
    MAX_GRADE_CONCURRENCY,
    Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY),
  );
  const now = (options.now ?? (() => new Date()))();
  const prisma = options.prisma ?? defaultPrisma;
  const client = options.client ?? openRouterClient;

  log.info(`[grade-pending] ENTRY limit=${limit} concurrency=${concurrency}`);

  const cvText = await loadCV();
  const claims = await claimPendingJobs(prisma, limit, now);

  log.info(
    `[grade-pending] considered=${claims.considered} claimed=${claims.jobs.length} skipped=${claims.skipped}`,
  );

  if (claims.jobs.length === 0) {
    return {
      considered: claims.considered,
      succeeded: 0,
      failed: 0,
      skipped: claims.skipped,
      errors: [],
    };
  }

  const errors: GradePendingError[] = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = claims.skipped;

  for (let i = 0; i < claims.jobs.length; i += concurrency) {
    const batch = claims.jobs.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (claim) => {
        const result = await gradeJob({
          client,
          cvText,
          job: toJobSnapshot(claim.row),
        });
        return { claim, result };
      }),
    );

    for (const { claim, result } of results) {
      if (!result.ok) {
        errors.push({
          jobId: claim.row.jobId,
          reason: result.failure.reason,
          detail: result.failure.detail,
        });
        failed += 1;
        await releaseLease(prisma, claim);
        continue;
      }

      const persisted = await prisma.jobOffer.updateMany({
        where: {
          jobId: claim.row.jobId,
          descriptionHash: claim.row.descriptionHash,
          gradingLeaseUntil: claim.leaseUntil,
        },
        data: {
          aiAnalysis: result.value,
          gradedDescriptionHash: claim.row.descriptionHash,
          gradingLeaseUntil: null,
        },
      });

      if (persisted.count === 0) {
        skipped += 1;
        await releaseLease(prisma, claim);
        continue;
      }

      succeeded += 1;
    }
  }

  return {
    considered: claims.considered,
    succeeded,
    failed,
    skipped,
    errors,
  };
}

async function claimPendingJobs(
  prisma: PrismaClient,
  limit: number,
  now: Date,
): Promise<ClaimSummary> {
  const jobs: ClaimedJob[] = [];
  let considered = 0;
  let skipped = 0;
  let cursor: string | undefined;

  while (jobs.length < limit) {
    const page = (await prisma.jobOffer.findMany({
      take: PAGE_SIZE,
      ...(cursor === undefined ? {} : { skip: 1, cursor: { id: cursor } }),
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    })) as JobOfferRow[];

    if (page.length === 0) break;
    cursor = page.at(-1)?.id;

    for (const row of page) {
      if (!isEligibleForGrading(row, now)) continue;

      considered += 1;
      const leaseUntil = new Date(now.getTime() + LEASE_DURATION_MS);
      const claimed = await prisma.jobOffer.updateMany({
        where: {
          jobId: row.jobId,
          descriptionHash: row.descriptionHash,
          AND: [availableLeaseFilter(now), gradedHashFilter(row)],
        } satisfies Prisma.JobOfferWhereInput,
        data: { gradingLeaseUntil: leaseUntil },
      });

      if (claimed.count === 0) {
        skipped += 1;
        continue;
      }

      jobs.push({ row, leaseUntil });
      if (jobs.length === limit) break;
    }

    if (page.length < PAGE_SIZE || cursor === undefined) break;
  }

  return { jobs, considered, skipped };
}

function isEligibleForGrading(row: JobOfferRow, now: Date): boolean {
  if (row.descriptionHash === null) return false;
  if (row.gradingLeaseUntil !== null && row.gradingLeaseUntil > now) {
    return false;
  }
  return (
    row.aiAnalysis === null || row.gradedDescriptionHash !== row.descriptionHash
  );
}

function availableLeaseFilter(now: Date): Prisma.JobOfferWhereInput {
  return {
    OR: [
      { gradingLeaseUntil: null },
      { gradingLeaseUntil: { isSet: false } },
      { gradingLeaseUntil: { lte: now } },
    ],
  };
}

function gradedHashFilter(row: JobOfferRow): Prisma.JobOfferWhereInput {
  if (row.gradedDescriptionHash !== null) {
    return { gradedDescriptionHash: row.gradedDescriptionHash };
  }
  return {
    OR: [
      { gradedDescriptionHash: null },
      { gradedDescriptionHash: { isSet: false } },
    ],
  };
}

async function releaseLease(
  prisma: PrismaClient,
  claim: ClaimedJob,
): Promise<void> {
  await prisma.jobOffer.updateMany({
    where: {
      jobId: claim.row.jobId,
      gradingLeaseUntil: claim.leaseUntil,
    },
    data: { gradingLeaseUntil: null },
  });
}
