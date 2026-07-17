import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.resetModules();
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  delete (globalThis as { openRouterClient?: unknown }).openRouterClient;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockEnv(overrides: Record<string, string | undefined> = {}) {
  vi.doMock("@/env", () => ({
    DEFAULT_OPENROUTER_MODEL: "meta-llama/llama-3.3-70b-instruct:free",
    env: {
      DATABASE_URL: "mongodb://localhost:27017/test",
      ROUTER_API_KEY: "test-router-key",
      APIFY_API_KEY: "test-apify-key",
      APIFY_WEBHOOK_SECRET: "test-webhook-secret",
      OPENROUTER_MODEL: "test-model",
      ...overrides,
    },
  }));
}

async function loadOpenRouter() {
  return import("./openrouter");
}

function okResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve({ choices: [{ message: { content } }] }),
  } as Response;
}

describe("openRouterClient (ingestion)", () => {
  it("returns the assistant message content from the OpenRouter response", async () => {
    mockEnv();
    (mockFetch as Mock).mockResolvedValueOnce(
      okResponse('{"score":85,"whyItFits":"match"}'),
    );

    const { openRouterClient } = await loadOpenRouter();
    const result = await openRouterClient.complete("grade this job");

    expect(result).toBe('{"score":85,"whyItFits":"match"}');
  });

  it("falls back to the default model when OPENROUTER_MODEL is unset", async () => {
    mockEnv({ OPENROUTER_MODEL: undefined });
    (mockFetch as Mock).mockResolvedValueOnce(okResponse("{}"));

    const { openRouterClient } = await loadOpenRouter();
    await openRouterClient.complete("hi");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining(
          '"model":"meta-llama/llama-3.3-70b-instruct:free"',
        ),
      }),
    );
  });

  it("uses the env OPENROUTER_MODEL when set", async () => {
    mockEnv({ OPENROUTER_MODEL: "anthropic/claude-3.5-sonnet" });
    (mockFetch as Mock).mockResolvedValueOnce(okResponse("{}"));

    const { openRouterClient } = await loadOpenRouter();
    await openRouterClient.complete("hi");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining('"model":"anthropic/claude-3.5-sonnet"'),
      }),
    );
  });

  it("builds the documented request shape (URL, method, headers, body)", async () => {
    mockEnv({ ROUTER_API_KEY: "router-secret-key" });
    (mockFetch as Mock).mockResolvedValueOnce(okResponse("{}"));

    const { openRouterClient } = await loadOpenRouter();
    await openRouterClient.complete("hello world");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: "Bearer router-secret-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      model: "test-model",
      messages: [{ role: "user", content: "hello world" }],
      response_format: { type: "json_object" },
    });
  });

  it("propagates opts.signal into the fetch call so abort cancels the request", async () => {
    mockEnv();
    (mockFetch as Mock).mockResolvedValueOnce(okResponse("{}"));

    const { openRouterClient } = await loadOpenRouter();
    const controller = new AbortController();
    await openRouterClient.complete("hi", { signal: controller.signal });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it("surfaces a thrown error when the HTTP response is not OK", async () => {
    mockEnv();
    (mockFetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    } as Response);

    const { openRouterClient } = await loadOpenRouter();

    await expect(openRouterClient.complete("hi")).rejects.toThrow(
      "OpenRouter request failed: 500",
    );
  });

  it("surfaces thrown errors from fetch so callers can catch them", async () => {
    mockEnv();
    (mockFetch as Mock).mockRejectedValueOnce(new Error("network down"));

    const { openRouterClient } = await loadOpenRouter();

    await expect(openRouterClient.complete("hi")).rejects.toThrow(
      "network down",
    );
  });
});
