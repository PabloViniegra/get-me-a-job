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
import { gradeJob } from "@/lib/grader";
import { gradePendingJobs } from "./grade-pending";

type PendingRow = {
  jobId: string;
  title: string;
  linkedinUrl: string;
  description: string;
  salary: string | null;
  format: string;
  requirements: string[];
};

function makePending(
  jobId: string,
  description = "Some description",
): PendingRow {
  return {
    jobId,
    title: `Job ${jobId}`,
    linkedinUrl: `https://example.com/${jobId}`,
    description,
    salary: null,
    format: "Remote",
    requirements: [],
  };
}

function makePrismaMock(pending: PendingRow[]) {
  const findMany = vi
    .fn()
    .mockImplementation(async (args: { take?: number } = {}) => {
      if (args.take !== undefined) return pending.slice(0, args.take);
      return pending;
    });
  const update = vi.fn().mockResolvedValue({});
  return {
    jobOffer: {
      findMany,
      update,
    },
  } as unknown as PrismaClient;
}

describe("gradePendingJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero counts when there are no pending jobs", async () => {
    const prisma = makePrismaMock([]);
    vi.mocked(gradeJob).mockResolvedValue({ score: 80, whyItFits: "ok" });

    const result = await gradePendingJobs({}, prisma);

    expect(result).toEqual({
      considered: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    });
    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { aiAnalysis: null } }),
    );
    expect(gradeJob).not.toHaveBeenCalled();
  });

  it("grades every pending job and persists the result", async () => {
    const prisma = makePrismaMock([
      makePending("a"),
      makePending("b"),
      makePending("c"),
    ]);
    vi.mocked(gradeJob).mockImplementation(async () => ({
      score: 88,
      whyItFits: "Strong match.",
    }));

    const result = await gradePendingJobs({ concurrency: 2 }, prisma);

    expect(result.considered).toBe(3);
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
    expect(gradeJob).toHaveBeenCalledTimes(3);
    expect(prisma.jobOffer.update).toHaveBeenCalledTimes(3);
    expect(prisma.jobOffer.update).toHaveBeenCalledWith({
      where: { jobId: "a" },
      data: { aiAnalysis: { score: 88, whyItFits: "Strong match." } },
    });
  });

  it("records failures when gradeJob returns null", async () => {
    const prisma = makePrismaMock([makePending("ok"), makePending("fail")]);
    vi.mocked(gradeJob).mockImplementation(async ({ job }) => {
      if (job.jobId === "fail") return null;
      return { score: 70, whyItFits: "ok" };
    });

    const result = await gradePendingJobs({}, prisma);

    expect(result.considered).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual([
      { jobId: "fail", reason: "grade-returned-null" },
    ]);
    expect(prisma.jobOffer.update).toHaveBeenCalledTimes(1);
    expect(prisma.jobOffer.update).toHaveBeenCalledWith({
      where: { jobId: "ok" },
      data: { aiAnalysis: { score: 70, whyItFits: "ok" } },
    });
  });

  it("records failures when gradeJob throws", async () => {
    const prisma = makePrismaMock([makePending("ok"), makePending("boom")]);
    vi.mocked(gradeJob).mockImplementation(async ({ job }) => {
      if (job.jobId === "boom") throw new Error("network down");
      return { score: 60, whyItFits: "partial" };
    });

    const result = await gradePendingJobs({}, prisma);

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual([{ jobId: "boom", reason: "network down" }]);
  });

  it("honors the limit option", async () => {
    const prisma = makePrismaMock([
      makePending("a"),
      makePending("b"),
      makePending("c"),
    ]);
    vi.mocked(gradeJob).mockResolvedValue({ score: 50, whyItFits: "x" });

    const result = await gradePendingJobs({ limit: 2 }, prisma);

    expect(result.considered).toBe(2);
    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }),
    );
    expect(gradeJob).toHaveBeenCalledTimes(2);
  });

  it("uses the cvText from loadCV", async () => {
    const prisma = makePrismaMock([makePending("a")]);
    vi.mocked(gradeJob).mockResolvedValue({ score: 50, whyItFits: "x" });
    vi.mocked(loadCV).mockResolvedValue("the-cv-text");

    await gradePendingJobs({}, prisma);

    expect(gradeJob).toHaveBeenCalledWith(
      expect.objectContaining({ cvText: "the-cv-text" }),
    );
  });

  it("propagates loadCV errors to the caller", async () => {
    const prisma = makePrismaMock([makePending("a")]);
    vi.mocked(loadCV).mockRejectedValue(new Error("CV not available"));

    await expect(gradePendingJobs({}, prisma)).rejects.toThrow(
      "CV not available",
    );
    expect(prisma.jobOffer.findMany).not.toHaveBeenCalled();
  });
});
