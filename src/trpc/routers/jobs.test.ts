import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobOffer: {
      findMany: vi.fn(),
    },
  },
}));

import type { JobOfferRow } from "@/lib/jobs.dto";
import { prisma } from "@/lib/prisma";
import { createCallerFactory, createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

function makeRow(overrides: Partial<JobOfferRow> = {}): JobOfferRow {
  return {
    id: "mongo-id-1",
    jobId: "3692563200",
    title: "Senior TypeScript Engineer",
    linkedinUrl: "https://linkedin.com/jobs/view/3692563200",
    description: "Build cool things with TypeScript.",
    salary: "EUR 60k-80k",
    format: "Remote",
    requirements: ["TypeScript", "React"],
    descriptionHash: null,
    aiAnalysis: { score: 87, whyItFits: "Strong match." },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    ...overrides,
  };
}

const createCaller = createCallerFactory(appRouter);

describe("appRouter.jobs.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls findMany with the documented orderBy (score desc, updatedAt desc)", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await caller.jobs.list();

    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith({
      orderBy: [{ aiAnalysis: { score: "desc" } }, { updatedAt: "desc" }],
    });
  });

  it("maps a happy-path row through the mapper and returns JobCardData", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([
      makeRow() as unknown as Awaited<
        ReturnType<typeof prisma.jobOffer.findMany>
      >[number],
    ]);

    const caller = createCaller(createTRPCContext());
    const result = await caller.jobs.list();

    expect(result).toMatchObject([
      {
        id: "mongo-id-1",
        jobId: "3692563200",
        title: "Senior TypeScript Engineer",
        descriptionPreview: "Build cool things with TypeScript.",
        whyItFitsPreview: "Strong match.",
        requirements: ["TypeScript", "React"],
        requirementsOverflowCount: 0,
        hasAiAnalysis: true,
        score: 87,
        scoreTier: "excellent",
      },
    ]);
  });

  it("returns an empty array when findMany yields no rows", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    const result = await caller.jobs.list();

    expect(result).toEqual([]);
  });

  it("maps a row with aiAnalysis=null to hasAiAnalysis=false and pending tier", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([
      makeRow({ aiAnalysis: null }) as unknown as Awaited<
        ReturnType<typeof prisma.jobOffer.findMany>
      >[number],
    ]);

    const caller = createCaller(createTRPCContext());
    const result = await caller.jobs.list();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      hasAiAnalysis: false,
      score: null,
      scoreTier: "pending",
      whyItFitsPreview: null,
    });
  });
});
