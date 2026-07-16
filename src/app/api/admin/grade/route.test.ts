import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  env: {
    APIFY_ADMIN_SECRET: "test-admin-secret",
  },
}));

vi.mock("@/lib/grade-pending", () => ({
  gradePendingJobs: vi.fn(),
}));

import { gradePendingJobs } from "@/lib/grade-pending";
import { POST } from "./route";

function makeRequest(body: unknown, authHeader?: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

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

  it("calls gradePendingJobs with empty options when body is invalid JSON", async () => {
    vi.mocked(gradePendingJobs).mockResolvedValue({
      considered: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    });

    const request = new Request("http://localhost/api/admin/grade", {
      method: "POST",
      headers: { Authorization: "Bearer test-admin-secret" },
      body: "not-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(gradePendingJobs).toHaveBeenCalledWith({});
  });

  it("passes limit and concurrency from the body to gradePendingJobs", async () => {
    vi.mocked(gradePendingJobs).mockResolvedValue({
      considered: 10,
      succeeded: 8,
      failed: 2,
      errors: [{ jobId: "x", reason: "timeout" }],
    });

    const response = await POST(
      makeRequest({ limit: 10, concurrency: 5 }, "Bearer test-admin-secret"),
    );

    expect(response.status).toBe(200);
    expect(gradePendingJobs).toHaveBeenCalledWith({
      limit: 10,
      concurrency: 5,
    });

    const body = await response.json();
    expect(body).toEqual({
      considered: 10,
      succeeded: 8,
      failed: 2,
      errors: [{ jobId: "x", reason: "timeout" }],
    });
  });
});
