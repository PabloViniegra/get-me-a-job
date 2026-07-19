import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/log", () => ({
  log: { info: vi.fn(), warn: vi.fn() },
}));

import { log } from "@/lib/log";
import { fireGradingTrigger } from "./trigger-grade";

const BASE_URL = "https://app.example.com/api/webhooks/apify";
const SECRET = "admin-secret";

beforeEach(() => {
  vi.mocked(log.warn).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fireGradingTrigger", () => {
  it("POSTs to /api/admin/grade on the same origin with Bearer auth", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));

    await fireGradingTrigger(BASE_URL, SECRET, { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://app.example.com/api/admin/grade");
    expect(init.method).toBe("POST");
    expect(init.body).toBe("{}");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${SECRET}`);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("logs a warning and swallows the error when fetch rejects", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      fireGradingTrigger(BASE_URL, SECRET, { fetchImpl }),
    ).resolves.toBeUndefined();

    expect(vi.mocked(log.warn)).toHaveBeenCalledWith(
      expect.stringContaining("[webhook] grade trigger failed"),
    );
  });

  it("logs a warning when the admin endpoint responds non-2xx", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 502 }));

    await fireGradingTrigger(BASE_URL, SECRET, { fetchImpl });

    expect(vi.mocked(log.warn)).toHaveBeenCalledWith(
      expect.stringContaining("non-2xx status=502"),
    );
  });

  it("stays silent on a 2xx response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));

    await fireGradingTrigger(BASE_URL, SECRET, { fetchImpl });

    expect(vi.mocked(log.warn)).not.toHaveBeenCalled();
  });
});
