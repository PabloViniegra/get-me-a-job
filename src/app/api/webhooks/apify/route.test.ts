import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  env: { APIFY_WEBHOOK_SECRET: "test-webhook-secret" },
}));

import { POST } from "./route";

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

  it("returns 200 when eventType is ACTOR.RUN.SUCCEEDED", async () => {
    const request = makeRequest(
      { eventType: "ACTOR.RUN.SUCCEEDED" },
      "Bearer test-webhook-secret",
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
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
});
