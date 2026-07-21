import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  jobOffer: {
    findMany: vi.fn(async () => []),
    aggregate: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(async () => null),
    upsert: vi.fn(),
    updateMany: vi.fn(),
  },
  runCommandRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobOffer: mocks.jobOffer,
    $runCommandRaw: mocks.runCommandRaw,
  },
}));

const TRPC_LIST_INPUT = encodeURIComponent(
  JSON.stringify({
    "0": {
      json: { limit: 24, sortKey: "score", withAnalysis: true },
    },
  }),
);

function makeRequest(method: "GET" | "POST", url: string): Request {
  const init: RequestInit = { method };
  if (method === "POST") {
  }
  return new Request(url, init);
}

describe("trpc route handler — cache headers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runCommandRaw.mockResolvedValue({
      cursor: { firstBatch: [{ total: [], excellent: [], pending: [] }] },
      ok: 1,
    });
  });

  it("prevents shared caching on a successful GET query", async () => {
    const { GET } = await import("./route");
    const req = makeRequest(
      "GET",
      `http://localhost/api/trpc/jobs.list?batch=1&input=${TRPC_LIST_INPUT}`,
    );

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-cache");
  });

  it("returns private no-cache headers on a POST request", async () => {
    const { POST } = await import("./route");
    const req = makeRequest(
      "POST",
      `http://localhost/api/trpc/jobs.list?batch=1`,
    );

    const res = await POST(req);

    expect(res.headers.get("cache-control")).toBe("private, no-cache");
  });
});
