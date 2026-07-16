import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  env: {
    APIFY_WEBHOOK_SECRET: "test-webhook-secret",
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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/grader", () => ({
  gradeJob: vi.fn(),
}));

vi.mock("@/lib/cv", () => ({
  loadCV: vi.fn().mockResolvedValue("test-cv-text"),
}));

vi.mock("@/lib/openrouter", () => ({
  openRouterClient: { complete: vi.fn() },
}));

import { apifyClient } from "@/lib/apify";
import { gradeJob } from "@/lib/grader";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

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
    vi.mocked(prisma.jobOffer.findUnique).mockResolvedValue(null);
    vi.mocked(gradeJob).mockResolvedValue({
      score: 87,
      whyItFits: "Strong TypeScript match.",
    });

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
    expect(prisma.jobOffer.update).toHaveBeenCalledWith({
      where: { jobId: "3692563200" },
      data: {
        aiAnalysis: { score: 87, whyItFits: "Strong TypeScript match." },
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

  it("writes no aiAnalysis and still returns 200 when gradeJob returns null", async () => {
    const item = {
      jobId: "111",
      jobUrl: "https://example.com/111",
      jobTitle: "Grader Fail Job",
      jobDescription: "On-site role",
    };
    mockDataset([item]);
    vi.mocked(prisma.jobOffer.findUnique).mockResolvedValue(null);
    vi.mocked(gradeJob).mockResolvedValue(null);

    const response = await POST(
      makeRequest(
        {
          eventType: "ACTOR.RUN.SUCCEEDED",
          resource: { defaultDatasetId: "dataset-null" },
        },
        "Bearer test-webhook-secret",
      ),
    );

    expect(response.status).toBe(200);
    expect(gradeJob).toHaveBeenCalledTimes(1);
    expect(prisma.jobOffer.update).not.toHaveBeenCalled();
  });

  it("skips grading and returns 200 when loadCV rejects", async () => {
    const { loadCV } = await import("@/lib/cv");
    vi.mocked(loadCV).mockRejectedValueOnce(new Error("pdf missing"));

    const item = {
      jobId: "222",
      jobUrl: "https://example.com/222",
      jobTitle: "Any Job",
      jobDescription: "Remote role",
    };
    mockDataset([item]);

    const response = await POST(
      makeRequest(
        {
          eventType: "ACTOR.RUN.SUCCEEDED",
          resource: { defaultDatasetId: "dataset-cv-fail" },
        },
        "Bearer test-webhook-secret",
      ),
    );

    expect(response.status).toBe(200);
    expect(gradeJob).not.toHaveBeenCalled();
    expect(prisma.jobOffer.update).not.toHaveBeenCalled();
  });

  it("skips grading when stored hash matches incoming and aiAnalysis is already set", async () => {
    const item = {
      jobId: "333",
      jobUrl: "https://example.com/333",
      jobTitle: "Stable Job",
      jobDescription: "Stable description that won't change",
    };
    mockDataset([item]);

    const mapped = (await import("@/lib/apify-mapper")).mapApifyItemToJobOffer(
      item,
    );
    vi.mocked(prisma.jobOffer.findUnique).mockResolvedValue({
      descriptionHash: mapped.descriptionHash,
      aiAnalysis: { score: 80, whyItFits: "previous result" },
    } as never);

    const response = await POST(
      makeRequest(
        {
          eventType: "ACTOR.RUN.SUCCEEDED",
          resource: { defaultDatasetId: "dataset-stable" },
        },
        "Bearer test-webhook-secret",
      ),
    );

    expect(response.status).toBe(200);
    expect(gradeJob).not.toHaveBeenCalled();
    expect(prisma.jobOffer.update).not.toHaveBeenCalled();
  });

  it("re-grades when stored hash matches but aiAnalysis is null (defensive)", async () => {
    const item = {
      jobId: "444",
      jobUrl: "https://example.com/444",
      jobTitle: "Previously Failed Job",
      jobDescription: "Same description as before",
    };
    mockDataset([item]);

    const mapped = (await import("@/lib/apify-mapper")).mapApifyItemToJobOffer(
      item,
    );
    vi.mocked(prisma.jobOffer.findUnique).mockResolvedValue({
      descriptionHash: mapped.descriptionHash,
      aiAnalysis: null,
    } as never);
    vi.mocked(gradeJob).mockResolvedValue({
      score: 65,
      whyItFits: "Partial match.",
    });

    const response = await POST(
      makeRequest(
        {
          eventType: "ACTOR.RUN.SUCCEEDED",
          resource: { defaultDatasetId: "dataset-recover" },
        },
        "Bearer test-webhook-secret",
      ),
    );

    expect(response.status).toBe(200);
    expect(gradeJob).toHaveBeenCalledTimes(1);
    expect(prisma.jobOffer.update).toHaveBeenCalledWith({
      where: { jobId: "444" },
      data: { aiAnalysis: { score: 65, whyItFits: "Partial match." } },
    });
  });

  it("re-grades and overwrites aiAnalysis when stored hash differs from incoming", async () => {
    const item = {
      jobId: "555",
      jobUrl: "https://example.com/555",
      jobTitle: "Edited Job",
      jobDescription: "New edited description",
    };
    mockDataset([item]);

    vi.mocked(prisma.jobOffer.findUnique).mockResolvedValue({
      descriptionHash: "old-hash-not-matching",
      aiAnalysis: { score: 40, whyItFits: "stale" },
    } as never);
    vi.mocked(gradeJob).mockResolvedValue({
      score: 92,
      whyItFits: "Excellent fit.",
    });

    const response = await POST(
      makeRequest(
        {
          eventType: "ACTOR.RUN.SUCCEEDED",
          resource: { defaultDatasetId: "dataset-edited" },
        },
        "Bearer test-webhook-secret",
      ),
    );

    expect(response.status).toBe(200);
    expect(gradeJob).toHaveBeenCalledTimes(1);
    expect(prisma.jobOffer.update).toHaveBeenCalledWith({
      where: { jobId: "555" },
      data: { aiAnalysis: { score: 92, whyItFits: "Excellent fit." } },
    });
  });
});
