import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  env: {
    APIFY_ADMIN_SECRET: "test-admin-secret",
  },
}));

vi.mock("@/lib/grade-pending", () => ({
  gradePendingJobs: vi.fn(),
  MAX_GRADE_LIMIT: 30,
  MAX_GRADE_CONCURRENCY: 3,
}));

import { gradePendingJobs } from "@/lib/grade-pending";
import { POST } from "./route";

function makeRequest(body: unknown, authHeader?: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (authHeader) headers.set("Authorization", authHeader);

  return new Request("http://localhost/api/admin/grade", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/grade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const response = await POST(makeRequest({ limit: 5 }));
    expect(response.status).toBe(401);
  });

  it("returns 401 when the Authorization header doesn't match", async () => {
    const response = await POST(
      makeRequest({ limit: 5 }, "Bearer wrong-secret"),
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when the body is invalid JSON", async () => {
    const request = new Request("http://localhost/api/admin/grade", {
      method: "POST",
      headers: { Authorization: "Bearer test-admin-secret" },
      body: "not-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(gradePendingJobs).not.toHaveBeenCalled();
  });

  it.each([
    { limit: 0 },
    { limit: 31 },
    { limit: 1.5 },
    { concurrency: 0 },
    { concurrency: 4 },
    { concurrency: 1.5 },
    { limit: "10" },
  ])("returns 400 for invalid options: %o", async (body) => {
    const response = await POST(makeRequest(body, "Bearer test-admin-secret"));

    expect(response.status).toBe(400);
    expect(gradePendingJobs).not.toHaveBeenCalled();
  });

  it("uses scheduler defaults for an empty object", async () => {
    vi.mocked(gradePendingJobs).mockResolvedValue({
      considered: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    });

    const response = await POST(makeRequest({}, "Bearer test-admin-secret"));

    expect(response.status).toBe(200);
    expect(gradePendingJobs).toHaveBeenCalledWith({});
  });

  it("passes validated limit and concurrency to gradePendingJobs", async () => {
    vi.mocked(gradePendingJobs).mockResolvedValue({
      considered: 10,
      succeeded: 7,
      failed: 2,
      skipped: 1,
      errors: [{ jobId: "x", reason: "timeout" }],
    });

    const response = await POST(
      makeRequest({ limit: 10, concurrency: 3 }, "Bearer test-admin-secret"),
    );

    expect(response.status).toBe(200);
    expect(gradePendingJobs).toHaveBeenCalledWith({
      limit: 10,
      concurrency: 3,
    });

    const body = await response.json();
    expect(body).toEqual({
      considered: 10,
      succeeded: 7,
      failed: 2,
      skipped: 1,
      errors: [{ jobId: "x", reason: "timeout" }],
    });
  });
});
