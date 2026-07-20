import type { Prisma, PrismaClient } from "@prisma/client";
import {
  type JobCardData,
  type JobOfferRow,
  toJobCardData,
} from "@/lib/jobs.dto";
import {
  JOB_FORMATS,
  type JobFormat,
  type JobsListParsed,
  type JobsSummary,
} from "@/lib/jobs.list.schema";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { type ScoreTier, TIER_VALUES } from "@/lib/score-tier";

type JobOrderBy = Prisma.JobOfferOrderByWithRelationInput[];

const DEFAULT_ORDER_BY: JobOrderBy = [
  { aiAnalysis: { score: "desc" } },
  { id: "desc" },
];

const CREATED_AT_ORDER_BY: JobOrderBy = [{ createdAt: "desc" }, { id: "desc" }];

export type ListJobsResult = {
  items: JobCardData[];
  nextCursor: string | null;
};

function buildOrderBy(sortKey: JobsListParsed["sortKey"]): JobOrderBy {
  return sortKey === "createdAt" ? CREATED_AT_ORDER_BY : DEFAULT_ORDER_BY;
}

function buildTierWhere(
  tiers: ReadonlyArray<ScoreTier>,
): Prisma.JobOfferWhereInput | undefined {
  if (tiers.length === 0 || tiers.length >= TIER_VALUES.length)
    return undefined;

  const clauses: Prisma.JobOfferWhereInput[] = [];
  for (const tier of tiers) {
    switch (tier) {
      case "pending":
        clauses.push({ aiAnalysis: { equals: null } });
        break;
      case "excellent":
        clauses.push({ aiAnalysis: { is: { score: { gte: 85 } } } });
        break;
      case "worth":
        clauses.push({ aiAnalysis: { is: { score: { gte: 65, lt: 85 } } } });
        break;
      case "low":
        clauses.push({ aiAnalysis: { is: { score: { lt: 65 } } } });
        break;
    }
  }

  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { OR: clauses };
}

function buildWhere(
  parsed: JobsListParsed,
): Prisma.JobOfferWhereInput | undefined {
  const clauses: Prisma.JobOfferWhereInput[] = [];
  const normalizedQuery = parsed.query?.trim();
  if (normalizedQuery && normalizedQuery.length > 0) {
    clauses.push({
      title: { contains: normalizedQuery, mode: "insensitive" },
    });
  }
  if (parsed.formats && parsed.formats.length > 0) {
    const allowed = parsed.formats.filter(
      (format): format is JobFormat => format !== undefined,
    );
    if (allowed.length > 0 && allowed.length < JOB_FORMATS.length) {
      clauses.push({ format: { in: allowed } });
    }
  }
  const tierWhere = buildTierWhere(parsed.tiers ?? []);
  if (tierWhere) clauses.push(tierWhere);
  if (parsed.withAnalysis === true) {
    clauses.push({ aiAnalysis: { is: { score: { gte: 0 } } } });
    clauses.push({ descriptionHash: { not: null } });
    clauses.push({ gradedDescriptionHash: { not: null } });
  }
  if (clauses.length === 0) return undefined;
  return clauses.length === 1
    ? (clauses[0] as Prisma.JobOfferWhereInput)
    : { AND: clauses };
}

export async function listJobs(
  input: JobsListParsed,
  prisma: PrismaClient = defaultPrisma,
): Promise<ListJobsResult> {
  const limit = input.limit;
  const where = buildWhere(input);
  const orderBy = buildOrderBy(input.sortKey);
  const fetchCount = limit + 1;

  const rows = (await prisma.jobOffer.findMany({
    where,
    orderBy,
    cursor: input.cursor ? { id: input.cursor } : undefined,
    skip: input.cursor ? 1 : undefined,
    take: fetchCount,
  })) as unknown as JobOfferRow[];

  const hasNextPage = rows.length > limit;
  const pagedRows = hasNextPage ? rows.slice(0, limit) : rows;
  const items = pagedRows.map((row) => toJobCardData(row));

  const nextCursor = hasNextPage
    ? (pagedRows[pagedRows.length - 1]?.id ?? null)
    : null;

  return { items, nextCursor };
}

export async function summarizeJobs(
  prisma: PrismaClient = defaultPrisma,
): Promise<JobsSummary> {
  const rows = await prisma.jobOffer.findMany({
    select: {
      descriptionHash: true,
      gradedDescriptionHash: true,
      aiAnalysis: { select: { score: true } },
    },
  });

  let excellent = 0;
  let pending = 0;
  for (const row of rows) {
    const isCurrent =
      row.descriptionHash !== null &&
      row.descriptionHash === row.gradedDescriptionHash;
    if (!isCurrent || row.aiAnalysis === null) {
      pending += 1;
      continue;
    }
    if (row.aiAnalysis.score >= 85) excellent += 1;
  }

  return { total: rows.length, excellent, pending };
}
