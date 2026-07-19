import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  env: {
    APIFY_WEBHOOK_SECRET: "test-webhook-secret",
    APIFY_ADMIN_SECRET: "test-admin-secret",
    OPENROUTER_MODEL: "test-model",
  },
}));

vi.mock("@/lib/apify", () => ({
  apifyClient: { dataset: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobOffer: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/grader", () => ({
  gradeJob: vi.fn(),
}));

vi.mock("@/lib/openrouter", () => ({
  openRouterClient: { complete: vi.fn() },
}));

vi.mock("./trigger-grade", () => ({
  fireGradingTrigger: vi.fn(),
}));

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: vi.fn((cb: () => void | Promise<void>) => {
      void cb();
    }),
  };
});

import { apifyClient } from "@/lib/apify";
import { gradeJob } from "@/lib/grader";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";
import { fireGradingTrigger } from "./trigger-grade";

function mockDataset(items: unknown[]) {
  const listItems = vi.fn().mockResolvedValue({ items });
  vi.mocked(apifyClient.dataset).mockReturnValue({ listItems } as never);
}

function makeRequest(body: unknown, authHeader?: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

  return new Request("http://localhost/api/webhooks/apify", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/apify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const request = makeRequest({ eventType: "ACTOR.RUN.SUCCEEDED" });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 401 when the Authorization header doesn't match the webhook secret", async () => {
    const request = makeRequest(
      { eventType: "ACTOR.RUN.SUCCEEDED" },
      "Bearer wrong-secret",
    );

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 200 no-op when eventType is not ACTOR.RUN.SUCCEEDED", async () => {
    const request = makeRequest(
      { eventType: "ACTOR.RUN.FAILED" },
      "Bearer test-webhook-secret",
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(apifyClient.dataset).not.toHaveBeenCalled();
    expect(prisma.jobOffer.upsert).not.toHaveBeenCalled();
  });

  it("returns 200 and upserts the mapped job when eventType is ACTOR.RUN.SUCCEEDED", async () => {
    const item = {
      jobId: "3692563200",
      jobUrl:
        "https://www.linkedin.com/jobs/view/english-data-labeling-analyst-at-facebook-3692563200",
      jobTitle: "English Data Labeling Analyst",
      jobDescription: "APPROVED REMOTE LOCATIONS: Los Angeles, CA",
      salaryInfo: ["$17.00", "$19.00"],
    };
    mockDataset([item]);

    const request = makeRequest(
      {
        eventType: "ACTOR.RUN.SUCCEEDED",
        resource: { defaultDatasetId: "dataset-1" },
      },
      "Bearer test-webhook-secret",
    );

    const response = await POST(request);
    const mappedFields = {
      title: "English Data Labeling Analyst",
      linkedinUrl:
        "https://www.linkedin.com/jobs/view/english-data-labeling-analyst-at-facebook-3692563200",
      description: "APPROVED REMOTE LOCATIONS: Los Angeles, CA",
      salary: "$17.00, $19.00",
      format: "Remote",
      requirements: [] as string[],
    };

    expect(response.status).toBe(200);
    expect(apifyClient.dataset).toHaveBeenCalledWith("dataset-1");
    expect(prisma.jobOffer.upsert).toHaveBeenCalledWith({
      where: { jobId: "3692563200" },
      create: {
        jobId: "3692563200",
        ...mappedFields,
        descriptionHash: expect.any(String),
      },
      update: {
        ...mappedFields,
        descriptionHash: expect.any(String),
      },
    });
  });

  it("upserts every item in the dataset, including a mapper edge case", async () => {
    const items = [
      {
        jobId: "1",
        jobUrl: "https://example.com/1",
        jobTitle: "Job A",
        jobDescription: "Remote role",
      },
      {
        jobId: "2",
        jobUrl: "https://example.com/2",
        jobTitle: "Job B",
        jobDescription: "On-site role",
        salaryInfo: [],
      },
      { jobId: "3", jobUrl: "https://example.com/3", jobTitle: "Job C" },
    ];
    mockDataset(items);

    const request = makeRequest(
      {
        eventType: "ACTOR.RUN.SUCCEEDED",
        resource: { defaultDatasetId: "dataset-2" },
      },
      "Bearer test-webhook-secret",
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(prisma.jobOffer.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.jobOffer.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { jobId: "1" },
        update: expect.objectContaining({ format: "Remote" }),
      }),
    );
    expect(prisma.jobOffer.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { jobId: "2" },
        update: expect.objectContaining({ salary: null }),
      }),
    );
    expect(prisma.jobOffer.upsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: { jobId: "3" },
        update: expect.objectContaining({ format: "On-site", description: "" }),
      }),
    );
  });

  it("re-posting the same payload calls upsert again with the same jobId key", async () => {
    const item = {
      jobId: "42",
      jobUrl: "https://example.com/42",
      jobTitle: "Repeat Job",
      jobDescription: "Hybrid role",
    };
    mockDataset([item]);

    const payload = {
      eventType: "ACTOR.RUN.SUCCEEDED",
      resource: { defaultDatasetId: "dataset-3" },
    };

    await POST(makeRequest(payload, "Bearer test-webhook-secret"));
    await POST(makeRequest(payload, "Bearer test-webhook-secret"));

    expect(prisma.jobOffer.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.jobOffer.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { jobId: "42" } }),
    );
    expect(prisma.jobOffer.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { jobId: "42" },
        update: expect.objectContaining({
          descriptionHash: expect.any(String),
        }),
      }),
    );
  });

  it("returns 200 no-op when the body isn't valid JSON", async () => {
    const request = new Request("http://localhost/api/webhooks/apify", {
      method: "POST",
      headers: { Authorization: "Bearer test-webhook-secret" },
      body: "not-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("does NOT call gradeJob (grading moved to /api/admin/grade)", async () => {
    const item = {
      jobId: "1",
      jobUrl: "https://example.com/1",
      jobTitle: "Any",
      jobDescription: "Any",
    };
    mockDataset([item]);

    await POST(
      makeRequest(
        {
          eventType: "ACTOR.RUN.SUCCEEDED",
          resource: { defaultDatasetId: "dataset-no-grade" },
        },
        "Bearer test-webhook-secret",
      ),
    );

    expect(gradeJob).not.toHaveBeenCalled();
  });

  it("triggers the grading endpoint after a successful ingestion (ADR-0006)", async () => {
    const item = {
      jobId: "1",
      jobUrl: "https://example.com/1",
      jobTitle: "Any",
      jobDescription: "Any",
    };
    mockDataset([item]);

    await POST(
      makeRequest(
        {
          eventType: "ACTOR.RUN.SUCCEEDED",
          resource: { defaultDatasetId: "dataset-trigger" },
        },
        "Bearer test-webhook-secret",
      ),
    );

    expect(fireGradingTrigger).toHaveBeenCalledTimes(1);
    const [baseUrl, secret] = vi.mocked(fireGradingTrigger).mock.calls[0] as [
      string,
      string,
    ];
    expect(baseUrl).toBe("http://localhost/api/webhooks/apify");
    expect(secret).toBe("test-admin-secret");
  });

  it("does NOT trigger grading on non-SUCCEEDED events", async () => {
    await POST(
      makeRequest(
        { eventType: "ACTOR.RUN.FAILED" },
        "Bearer test-webhook-secret",
      ),
    );

    expect(fireGradingTrigger).not.toHaveBeenCalled();
  });

  it("does NOT trigger grading when auth fails", async () => {
    await POST(makeRequest({ eventType: "ACTOR.RUN.SUCCEEDED" }));

    expect(fireGradingTrigger).not.toHaveBeenCalled();
  });
});
