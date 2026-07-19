import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobOffer: {
      findMany: vi.fn(),
      count: vi.fn(),
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
    descriptionHash: "hash-current",
    gradedDescriptionHash: "hash-current",
    gradingLeaseUntil: null,
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

  it("returns paginated items with nextCursor and applies default order/limit", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    const result = await caller.jobs.list();

    expect(result).toMatchObject({ items: [], nextCursor: null });
    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: [{ aiAnalysis: { score: "desc" } }, { id: "desc" }],
      cursor: undefined,
      skip: undefined,
      take: 25,
    });
  });

  it("forwards cursor + skip when resuming after the first page", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await caller.jobs.list({ cursor: "abc123", limit: 12 });

    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: [{ aiAnalysis: { score: "desc" } }, { id: "desc" }],
      cursor: { id: "abc123" },
      skip: 1,
      take: 13,
    });
  });

  it("includes the title filter when query is present and trims whitespace", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await caller.jobs.list({ query: "  typescript  " });

    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          title: { contains: "typescript", mode: "insensitive" },
        },
      }),
    );
  });

  it("includes the format filter only when a non-trivial subset is selected", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await caller.jobs.list({ formats: ["Remote", "Hybrid"] });

    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { format: { in: ["Remote", "Hybrid"] } },
      }),
    );
  });

  it("drops the format filter when every format is selected", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await caller.jobs.list({ formats: ["Remote", "Hybrid", "On-site"] });

    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it("includes the tier filter for a single tier (excellent)", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await caller.jobs.list({ tiers: ["excellent"] });

    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { aiAnalysis: { is: { score: { gte: 85 } } } },
      }),
    );
  });

  it("ORs tier conditions when multiple tiers are selected", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await caller.jobs.list({ tiers: ["excellent", "worth"] });

    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { aiAnalysis: { is: { score: { gte: 85 } } } },
            { aiAnalysis: { is: { score: { gte: 65, lt: 85 } } } },
          ],
        },
      }),
    );
  });

  it("treats all four tiers as no-op (matches everything)", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await caller.jobs.list({
      tiers: ["pending", "excellent", "worth", "low"],
    });

    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it("treats 'pending' as aiAnalysis: { equals: null }", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await caller.jobs.list({ tiers: ["pending"] });

    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { aiAnalysis: { equals: null } },
      }),
    );
  });

  it("ANDs tier filter with format and query when all three are present", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await caller.jobs.list({
      query: "typescript",
      formats: ["Remote"],
      tiers: ["excellent"],
    });

    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { title: { contains: "typescript", mode: "insensitive" } },
            { format: { in: ["Remote"] } },
            { aiAnalysis: { is: { score: { gte: 85 } } } },
          ],
        },
      }),
    );
  });

  it("switches to createdAt order when requested", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await caller.jobs.list({ sortKey: "createdAt" });

    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });

  it("rejects limits outside the 1..48 range", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([]);

    const caller = createCaller(createTRPCContext());
    await expect(caller.jobs.list({ limit: 0 })).rejects.toThrow();
    await expect(caller.jobs.list({ limit: 100 })).rejects.toThrow();
    expect(prisma.jobOffer.findMany).not.toHaveBeenCalled();
  });

  it("maps a happy-path row through the mapper and exposes nextCursor when extras exist", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([
      makeRow({ id: "row-1" }) as unknown as Awaited<
        ReturnType<typeof prisma.jobOffer.findMany>
      >[number],
      makeRow({
        id: "row-2",
        jobId: "row-2",
      }) as unknown as Awaited<
        ReturnType<typeof prisma.jobOffer.findMany>
      >[number],
    ]);

    const caller = createCaller(createTRPCContext());
    const result = await caller.jobs.list({ limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "row-1",
      jobId: "3692563200",
      title: "Senior TypeScript Engineer",
      descriptionPreview: "Build cool things with TypeScript.",
      whyItFitsPreview: "Strong match.",
      requirements: ["TypeScript", "React"],
      requirementsOverflowCount: 0,
      hasAiAnalysis: true,
      score: 87,
      scoreTier: "excellent",
    });
    expect(result.nextCursor).toBe("row-1");
  });

  it("passes rows through the mapper in the order Prisma returned them", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([
      makeRow({
        id: "current",
        jobId: "current",
        aiAnalysis: { score: 50, whyItFits: "Current" },
      }) as unknown as Awaited<
        ReturnType<typeof prisma.jobOffer.findMany>
      >[number],
      makeRow({
        id: "stale",
        jobId: "stale",
        aiAnalysis: { score: 99, whyItFits: "Old" },
        gradedDescriptionHash: "hash-previous",
      }) as unknown as Awaited<
        ReturnType<typeof prisma.jobOffer.findMany>
      >[number],
    ]);

    const caller = createCaller(createTRPCContext());
    const result = await caller.jobs.list();

    expect(result.items.map((job) => job.id)).toEqual(["current", "stale"]);
    expect(result.items[1]?.scoreTier).toBe("pending");
  });

  it("returns nextCursor=null when the last page is smaller than the limit", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([
      makeRow({ id: "only" }) as unknown as Awaited<
        ReturnType<typeof prisma.jobOffer.findMany>
      >[number],
    ]);

    const caller = createCaller(createTRPCContext());
    const result = await caller.jobs.list({ limit: 24 });

    expect(result.items.map((j) => j.id)).toEqual(["only"]);
    expect(result.nextCursor).toBeNull();
  });

  it("maps a row with aiAnalysis=null to hasAiAnalysis=false and pending tier", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([
      makeRow({ aiAnalysis: null }) as unknown as Awaited<
        ReturnType<typeof prisma.jobOffer.findMany>
      >[number],
    ]);

    const caller = createCaller(createTRPCContext());
    const result = await caller.jobs.list();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      hasAiAnalysis: false,
      score: null,
      scoreTier: "pending",
      whyItFitsPreview: null,
    });
  });
});

describe("appRouter.jobs.summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts total, current excellent, and current pending offers", async () => {
    vi.mocked(prisma.jobOffer.count).mockResolvedValue(0);
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue([
      {
        descriptionHash: "h-current",
        gradedDescriptionHash: "h-current",
        aiAnalysis: { score: 92 },
      },
      {
        descriptionHash: "h-current",
        gradedDescriptionHash: "h-current",
        aiAnalysis: { score: 70 },
      },
      {
        descriptionHash: "h-current",
        gradedDescriptionHash: "h-previous",
        aiAnalysis: { score: 95 },
      },
      {
        descriptionHash: null,
        gradedDescriptionHash: null,
        aiAnalysis: null,
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.jobOffer.findMany>>);

    const caller = createCaller(createTRPCContext());
    const summary = await caller.jobs.summary();

    expect(summary).toEqual({ total: 4, excellent: 1, pending: 2 });
  });

  it("returns zeros when there are no offers at all", async () => {
    vi.mocked(prisma.jobOffer.findMany).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.jobOffer.findMany>>,
    );

    const caller = createCaller(createTRPCContext());
    const summary = await caller.jobs.summary();

    expect(summary).toEqual({ total: 0, excellent: 0, pending: 0 });
  });
});
