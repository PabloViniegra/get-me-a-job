import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { APIFY_ADMIN_SECRET: "test-admin-secret" },
}));

vi.mock("@/server/apify/trigger", () => ({
  triggerLinkedInScrape: vi.fn(),
}));

import { triggerLinkedInScrape } from "@/server/apify/trigger";
import { POST } from "./route";

function makeRequest(authHeader?: string) {
  const headers = new Headers();
  if (authHeader) headers.set("Authorization", authHeader);
  return new Request("http://localhost/api/admin/scrape", {
    method: "POST",
    headers,
  });
}

describe("POST /api/admin/scrape", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when the Authorization header is missing", async () => {
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns 401 when the Authorization header doesn't match", async () => {
    const response = await POST(makeRequest("Bearer wrong-secret"));
    expect(response.status).toBe(401);
  });

  it("calls triggerLinkedInScrape on auth and returns the result", async () => {
    vi.mocked(triggerLinkedInScrape).mockResolvedValue({
      runId: "run-1",
      datasetId: "ds-1",
      status: "RUNNING",
    });

    const response = await POST(makeRequest("Bearer test-admin-secret"));

    expect(response.status).toBe(200);
    expect(triggerLinkedInScrape).toHaveBeenCalled();
    expect(await response.json()).toEqual({
      runId: "run-1",
      datasetId: "ds-1",
      status: "RUNNING",
    });
  });

  it("returns 500 with detail when the trigger throws", async () => {
    vi.mocked(triggerLinkedInScrape).mockRejectedValue(new Error("apify 503"));

    const response = await POST(makeRequest("Bearer test-admin-secret"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "trigger-failed",
      detail: "apify 503",
    });
  });
});
