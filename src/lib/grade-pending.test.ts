import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cv", () => ({
  loadCV: vi.fn().mockResolvedValue("test-cv-text"),
}));

vi.mock("@/lib/grader", () => ({
  gradeJob: vi.fn(),
}));

vi.mock("@/lib/openrouter", () => ({
  openRouterClient: { complete: vi.fn() },
}));

import { loadCV } from "@/lib/cv";
import { type GraderFailureReason, gradeJob } from "@/lib/grader";
import { gradePendingJobs } from "./grade-pending";

const NOW = new Date("2026-07-18T10:00:00.000Z");
const LEASE_UNTIL = new Date("2026-07-18T10:05:00.000Z");

type TestRow = {
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

function makeRow(jobId: string, overrides: Partial<TestRow> = {}): TestRow {
  return {
    id: `mongo-${jobId}`,
    jobId,
    title: `Job ${jobId}`,
    linkedinUrl: `https://example.com/${jobId}`,
    description: `Description ${jobId}`,
    descriptionHash: `hash-${jobId}`,
    gradedDescriptionHash: null,
    gradingLeaseUntil: null,
    salary: null,
    format: "Remote",
    requirements: [],
    aiAnalysis: null,
    updatedAt: new Date("2026-07-18T09:00:00.000Z"),
    ...overrides,
  };
}

function makeCurrentRow(jobId: string): TestRow {
  const row = makeRow(jobId);
  return {
    ...row,
    gradedDescriptionHash: row.descriptionHash,
    aiAnalysis: { score: 80, whyItFits: "Current analysis" },
  };
}

function makePrismaMock(pages: TestRow[][], updateCounts: number[] = []) {
  const findMany = vi.fn();
  for (const page of pages) findMany.mockResolvedValueOnce(page);
  findMany.mockResolvedValue([]);

  const updateMany = vi.fn();
  for (const count of updateCounts) {
    updateMany.mockResolvedValueOnce({ count });
  }
  updateMany.mockResolvedValue({ count: 1 });

  const prisma = {
    jobOffer: {
      findMany,
      updateMany,
    },
  } as unknown as PrismaClient;

  return { prisma, findMany, updateMany };
}

function gradeOk(value: { score: number; whyItFits: string }) {
  return { ok: true as const, value };
}

function gradeFail(reason: GraderFailureReason, detail?: string) {
  return {
    ok: false as const,
    failure: { reason, ...(detail !== undefined ? { detail } : {}) },
  };
}

describe("gradePendingJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadCV).mockResolvedValue("test-cv-text");
  });

  it("returns zero counts when there are no candidates", async () => {
    const { prisma, findMany, updateMany } = makePrismaMock([[]]);
    vi.mocked(gradeJob).mockResolvedValue(
      gradeOk({ score: 80, whyItFits: "ok" }),
    );

    const result = await gradePendingJobs({ now: () => NOW }, prisma);

    expect(result).toEqual({
      considered: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    });
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(updateMany).not.toHaveBeenCalled();
    expect(gradeJob).not.toHaveBeenCalled();
  });

  it("does not claim a job whose analysis matches the current description", async () => {
    const { prisma, updateMany } = makePrismaMock([[makeCurrentRow("a")]]);

    const result = await gradePendingJobs({ now: () => NOW }, prisma);

    expect(result.considered).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
    expect(gradeJob).not.toHaveBeenCalled();
  });

  it("does not claim a job with an active lease", async () => {
    const { prisma, updateMany } = makePrismaMock([
      [
        makeRow("a", {
          gradingLeaseUntil: new Date("2026-07-18T10:00:01.000Z"),
        }),
      ],
    ]);

    const result = await gradePendingJobs({ now: () => NOW }, prisma);

    expect(result.considered).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("claims and grades a job with no analysis", async () => {
    const { prisma, updateMany } = makePrismaMock([[makeRow("a")]], [1, 1]);
    vi.mocked(gradeJob).mockResolvedValue(
      gradeOk({ score: 88, whyItFits: "Strong match." }),
    );

    const result = await gradePendingJobs(
      { concurrency: 1, now: () => NOW },
      prisma,
    );

    expect(result).toEqual({
      considered: 1,
      succeeded: 1,
      failed: 0,
      skipped: 0,
      errors: [],
    });
    expect(updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          jobId: "a",
          descriptionHash: "hash-a",
        }),
        data: { gradingLeaseUntil: LEASE_UNTIL },
      }),
    );
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        jobId: "a",
        descriptionHash: "hash-a",
        gradingLeaseUntil: LEASE_UNTIL,
      },
      data: {
        aiAnalysis: { score: 88, whyItFits: "Strong match." },
        gradedDescriptionHash: "hash-a",
        gradingLeaseUntil: null,
      },
    });
  });

  it("regrades a stale analysis", async () => {
    const stale = makeRow("a", {
      aiAnalysis: { score: 30, whyItFits: "Old analysis" },
      gradedDescriptionHash: "old-hash",
    });
    const { prisma } = makePrismaMock([[stale]], [1, 1]);
    vi.mocked(gradeJob).mockResolvedValue(
      gradeOk({ score: 90, whyItFits: "Updated analysis" }),
    );

    const result = await gradePendingJobs({ now: () => NOW }, prisma);

    expect(result.succeeded).toBe(1);
    expect(gradeJob).toHaveBeenCalledTimes(1);
  });

  it("treats a lost claim as skipped and keeps scanning", async () => {
    const { prisma } = makePrismaMock(
      [[makeRow("a"), makeRow("b")]],
      [0, 1, 1],
    );
    vi.mocked(gradeJob).mockResolvedValue(
      gradeOk({ score: 70, whyItFits: "ok" }),
    );

    const result = await gradePendingJobs({ limit: 1, now: () => NOW }, prisma);

    expect(result).toEqual({
      considered: 2,
      succeeded: 1,
      failed: 0,
      skipped: 1,
      errors: [],
    });
    expect(gradeJob).toHaveBeenCalledTimes(1);
    expect(vi.mocked(gradeJob).mock.calls[0]?.[0].job.jobId).toBe("b");
  });

  it("discards a result when the description changes before persistence", async () => {
    const { prisma, updateMany } = makePrismaMock([[makeRow("a")]], [1, 0, 1]);
    vi.mocked(gradeJob).mockResolvedValue(
      gradeOk({ score: 88, whyItFits: "Stale result" }),
    );

    const result = await gradePendingJobs({ now: () => NOW }, prisma);

    expect(result).toEqual({
      considered: 1,
      succeeded: 0,
      failed: 0,
      skipped: 1,
      errors: [],
    });
    expect(updateMany).toHaveBeenNthCalledWith(3, {
      where: { jobId: "a", gradingLeaseUntil: LEASE_UNTIL },
      data: { gradingLeaseUntil: null },
    });
  });

  it("records a grading failure and releases the lease", async () => {
    const { prisma, updateMany } = makePrismaMock([[makeRow("a")]], [1, 1]);
    vi.mocked(gradeJob).mockResolvedValue(gradeFail("parse", "raw garbage"));

    const result = await gradePendingJobs({ now: () => NOW }, prisma);

    expect(result).toEqual({
      considered: 1,
      succeeded: 0,
      failed: 1,
      skipped: 0,
      errors: [{ jobId: "a", reason: "parse", detail: "raw garbage" }],
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { jobId: "a", gradingLeaseUntil: LEASE_UNTIL },
      data: { gradingLeaseUntil: null },
    });
  });

  it("reclaims an expired lease", async () => {
    const { prisma, updateMany } = makePrismaMock(
      [
        [
          makeRow("a", {
            gradingLeaseUntil: new Date("2026-07-18T09:59:59.000Z"),
          }),
        ],
      ],
      [1, 1],
    );
    vi.mocked(gradeJob).mockResolvedValue(
      gradeOk({ score: 60, whyItFits: "ok" }),
    );

    const result = await gradePendingJobs({ now: () => NOW }, prisma);

    expect(result.succeeded).toBe(1);
    expect(updateMany).toHaveBeenCalledTimes(2);
  });

  it("paginates until it finds a pending job", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      makeCurrentRow(`current-${index}`),
    );
    const pending = makeRow("pending");
    const { prisma, findMany } = makePrismaMock([firstPage, [pending]], [1, 1]);
    vi.mocked(gradeJob).mockResolvedValue(
      gradeOk({ score: 75, whyItFits: "ok" }),
    );

    const result = await gradePendingJobs({ limit: 1, now: () => NOW }, prisma);

    expect(result.succeeded).toBe(1);
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenNthCalledWith(2, {
      take: 100,
      skip: 1,
      cursor: { id: "mongo-current-99" },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    });
  });

  it("caps grading at the requested limit", async () => {
    const { prisma } = makePrismaMock(
      [[makeRow("a"), makeRow("b"), makeRow("c")]],
      [1, 1, 1, 1],
    );
    vi.mocked(gradeJob).mockResolvedValue(
      gradeOk({ score: 50, whyItFits: "x" }),
    );

    const result = await gradePendingJobs({ limit: 2, now: () => NOW }, prisma);

    expect(result.considered).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(gradeJob).toHaveBeenCalledTimes(2);
  });

  it("uses the cvText from loadCV", async () => {
    const { prisma } = makePrismaMock([[makeRow("a")]], [1, 1]);
    vi.mocked(gradeJob).mockResolvedValue(
      gradeOk({ score: 50, whyItFits: "x" }),
    );
    vi.mocked(loadCV).mockResolvedValue("the-cv-text");

    await gradePendingJobs({ now: () => NOW }, prisma);

    expect(gradeJob).toHaveBeenCalledWith(
      expect.objectContaining({ cvText: "the-cv-text" }),
    );
  });

  it("propagates loadCV errors before claiming jobs", async () => {
    const { prisma, findMany, updateMany } = makePrismaMock([[makeRow("a")]]);
    vi.mocked(loadCV).mockRejectedValue(new Error("CV not available"));

    await expect(gradePendingJobs({ now: () => NOW }, prisma)).rejects.toThrow(
      "CV not available",
    );
    expect(findMany).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });
});
