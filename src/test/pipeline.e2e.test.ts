import type { JobOffer } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const store = new Map<string, JobOffer>();

  const jobOffer = {
    upsert: vi.fn(
      async (args: {
        where: { jobId: string };
        create: Omit<JobOffer, "id">;
        update: Partial<JobOffer>;
      }) => {
        const existing = store.get(args.where.jobId);
        if (existing) {
          const merged = { ...existing, ...args.update };
          store.set(args.where.jobId, merged);
          return merged;
        }
        const created = {
          id: `mongo-${args.where.jobId}`,
          ...args.create,
          aiAnalysis: args.create.aiAnalysis ?? null,
          descriptionHash: args.create.descriptionHash ?? null,
          gradedDescriptionHash: args.create.gradedDescriptionHash ?? null,
          gradingLeaseUntil: args.create.gradingLeaseUntil ?? null,
          salary: args.create.salary ?? null,
          requirements: args.create.requirements ?? [],
          createdAt: args.create.createdAt ?? new Date(),
          updatedAt: args.create.updatedAt ?? new Date(),
        } as JobOffer;
        store.set(args.where.jobId, created);
        return created;
      },
    ),
    findMany: vi.fn(async () => Array.from(store.values())),
    findUnique: vi.fn(
      async (args: { where: { jobId: string } }) =>
        store.get(args.where.jobId) ?? null,
    ),
    updateMany: vi.fn(
      async (args: {
        where: {
          jobId?: string;
          descriptionHash?: string | null;
          gradingLeaseUntil?: Date | null;
        };
        data: Partial<JobOffer>;
      }) => {
        let count = 0;
        for (const [jobId, row] of store) {
          const leaseMatches =
            args.where.gradingLeaseUntil === undefined ||
            row.gradingLeaseUntil?.getTime() ===
              args.where.gradingLeaseUntil?.getTime();
          if (
            (args.where.jobId === undefined ||
              row.jobId === args.where.jobId) &&
            (args.where.descriptionHash === undefined ||
              row.descriptionHash === args.where.descriptionHash) &&
            leaseMatches
          ) {
            store.set(jobId, { ...row, ...args.data });
            count += 1;
          }
        }
        return { count };
      },
    ),
    deleteMany: vi.fn(async (args?: { where?: { jobId?: string } }) => {
      if (args?.where?.jobId) {
        let n = 0;
        for (const [k, v] of store) {
          if (v.jobId === args.where.jobId) {
            store.delete(k);
            n += 1;
          }
        }
        return { count: n };
      }
      const n = store.size;
      store.clear();
      return { count: n };
    }),
  };

  const openRouterComplete = vi.fn();

  return { store, jobOffer, openRouterComplete };
});

vi.mock("@/server/apify/client", () => ({
  apifyClient: {
    dataset: vi.fn().mockReturnValue({
      listItems: vi.fn().mockResolvedValue({ items: [] }),
    }),
  },
}));

vi.mock("@/lib/cv", () => ({
  loadCV: vi.fn().mockResolvedValue("E2E test CV — Pablo Viniegra"),
}));

vi.mock("@/lib/openrouter", () => ({
  openRouterClient: { complete: mocks.openRouterComplete },
}));

vi.mock("@/lib/prisma", () => ({ prisma: { jobOffer: mocks.jobOffer } }));

vi.mock("@/app/api/webhooks/apify/trigger-grade", () => ({
  fireGradingTrigger: vi.fn(),
}));

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: vi.fn(),
  };
});

const { appRouter } = await import("@/trpc/routers/_app");
const { createCallerFactory, createTRPCContext } = await import("@/trpc/init");
const { POST: webhookPOST } = await import("@/app/api/webhooks/apify/route");
const { gradePendingJobs } = await import("@/server/jobs/grading-runner");
const { apifyClient } = await import("@/server/apify/client");

const VALID_DATASET_ITEMS = [
  {
    jobId: "e2e-job-1",
    jobUrl: "https://www.linkedin.com/jobs/view/e2e-job-1",
    jobTitle: "Senior TypeScript Engineer",
    jobDescription: "Build cool things with TypeScript.",
  },
  {
    jobId: "e2e-job-2",
    jobUrl: "https://www.linkedin.com/jobs/view/e2e-job-2",
    jobTitle: "Mid Python Developer",
    jobDescription: "Tame pandas and ship notebooks.",
  },
];

const VALID_BODY: string = JSON.stringify({
  eventType: "ACTOR.RUN.SUCCEEDED",
  resource: { defaultDatasetId: "dataset-e2e" },
});

function makeWebhookRequest(body: string, bearer?: string): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (bearer !== undefined) headers.Authorization = bearer;
  return new Request("http://localhost/api/webhooks/apify", {
    method: "POST",
    headers,
    body,
  });
}

const createCaller = createCallerFactory(appRouter);

describe("E2E pipeline — webhook → upsert → grade → dashboard", () => {
  beforeEach(() => {
    mocks.store.clear();
    mocks.jobOffer.upsert.mockClear();
    mocks.jobOffer.findMany.mockClear();
    mocks.jobOffer.updateMany.mockClear();
    mocks.openRouterComplete.mockReset();
    (
      apifyClient.dataset as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      listItems: vi.fn().mockResolvedValue({ items: [] }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("walks the full pipeline end-to-end and the dashboard returns the graded rows sorted by score", async () => {
    (
      apifyClient.dataset as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValueOnce({
      listItems: vi.fn().mockResolvedValueOnce({ items: VALID_DATASET_ITEMS }),
    });
    mocks.openRouterComplete
      .mockResolvedValueOnce(
        JSON.stringify({ score: 92, whyItFits: "Strong TS match." }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ score: 71, whyItFits: "Decent Python fit." }),
      );

    const webhook = await webhookPOST(
      makeWebhookRequest(VALID_BODY, "Bearer test-webhook-secret"),
    );
    expect(webhook.status).toBe(200);
    expect(mocks.store.size).toBe(2);
    expect(mocks.jobOffer.upsert).toHaveBeenCalledTimes(2);

    const gradeResult = await gradePendingJobs({ limit: 10, concurrency: 2 });
    expect(gradeResult.considered).toBe(2);
    expect(gradeResult.succeeded).toBe(2);
    expect(gradeResult.failed).toBe(0);

    for (const [jobId, row] of mocks.store) {
      expect(row.aiAnalysis, `aiAnalysis missing for ${jobId}`).not.toBeNull();
      expect(row.aiAnalysis?.score).toBeGreaterThanOrEqual(1);
      expect(row.aiAnalysis?.score).toBeLessThanOrEqual(100);
    }

    const caller = createCaller(createTRPCContext());
    const list = await caller.jobs.list();

    expect(list.items).toHaveLength(2);
    expect(list.items[0]?.score).toBe(92);
    expect(list.items[1]?.score).toBe(71);
    expect(list.items[0]?.scoreTier).toBe("excellent");
    expect(list.items[1]?.scoreTier).toBe("worth");
  });

  it("rejects the webhook with 401 when the bearer token is wrong", async () => {
    (
      apifyClient.dataset as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      listItems: vi.fn().mockResolvedValue({ items: VALID_DATASET_ITEMS }),
    });

    const webhook = await webhookPOST(
      makeWebhookRequest(VALID_BODY, "Bearer wrong-secret"),
    );

    expect(webhook.status).toBe(401);
    expect(mocks.store.size).toBe(0);
  });

  it("ignores the webhook gracefully when the payload is not ACTOR.RUN.SUCCEEDED", async () => {
    const body = JSON.stringify({
      eventType: "ACTOR.RUN.FAILED",
      resource: { defaultDatasetId: "dataset-e2e" },
    });
    const webhook = await webhookPOST(
      makeWebhookRequest(body, "Bearer test-webhook-secret"),
    );

    expect(webhook.status).toBe(200);
    expect(mocks.store.size).toBe(0);
  });

  it("skips grading when the LLM responds with garbage — the bad row stays pending instead of crashing the batch", async () => {
    (
      apifyClient.dataset as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValueOnce({
      listItems: vi.fn().mockResolvedValueOnce({ items: VALID_DATASET_ITEMS }),
    });
    mocks.openRouterComplete
      .mockResolvedValueOnce("totally not JSON — simulating broken LLM")
      .mockResolvedValueOnce(JSON.stringify({ score: 70, whyItFits: "ok" }));

    await webhookPOST(
      makeWebhookRequest(VALID_BODY, "Bearer test-webhook-secret"),
    );

    const gradeResult = await gradePendingJobs({ limit: 10, concurrency: 1 });
    expect(gradeResult.considered).toBe(2);
    expect(gradeResult.succeeded).toBe(1);
    expect(gradeResult.failed).toBe(1);
    expect(gradeResult.errors[0]?.jobId).toBe("e2e-job-1");

    const good = mocks.store.get("e2e-job-2");
    const bad = mocks.store.get("e2e-job-1");
    expect(good?.aiAnalysis).not.toBeNull();
    expect(bad?.aiAnalysis).toBeNull();
  });
});
