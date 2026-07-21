import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import type { StreamingOpenRouterClient } from "./openrouter";

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
  vi.doMock("@/lib/env", () => ({
    DEFAULT_OPENROUTER_MODEL: "google/gemma-4-26b-a4b-it:free",
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

function sseResponse(chunks: ReadonlyArray<string>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    body: stream,
    json: () => Promise.reject(new Error("not used")),
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
          '"model":"google/gemma-4-26b-a4b-it:free"',
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

async function loadStreamingClient(): Promise<StreamingOpenRouterClient> {
  const mod = await loadOpenRouter();
  return mod.openRouterClient as StreamingOpenRouterClient;
}

describe("openRouterClient.stream", () => {
  it("yields text chunks from an SSE response and stops at [DONE]", async () => {
    mockEnv();
    (mockFetch as Mock).mockResolvedValueOnce(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Hola "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"mundo"}}]}\n\n',
        "data: [DONE]\n\n",
      ]),
    );

    const client = await loadStreamingClient();
    const collected: string[] = [];
    for await (const chunk of client.stream("hola")) {
      collected.push(chunk);
    }
    expect(collected.join("")).toBe("Hola mundo");
  });

  it("buffers partial SSE lines split across read() boundaries", async () => {
    mockEnv();
    const partial = [
      'data: {"choices":[{"delta":{"content":"par',
      'te uno"}}]}\n\ndata: [DONE]\n\n',
    ].join("");
    (mockFetch as Mock).mockResolvedValueOnce(sseResponse([partial]));

    const client = await loadStreamingClient();
    const collected: string[] = [];
    for await (const chunk of client.stream("x")) {
      collected.push(chunk);
    }
    expect(collected.join("")).toBe("parte uno");
  });

  it("builds the documented streaming request shape (URL, headers, body)", async () => {
    mockEnv({ ROUTER_API_KEY: "router-secret-key" });
    (mockFetch as Mock).mockResolvedValueOnce(
      sseResponse(["data: [DONE]\n\n"]),
    );

    const client = await loadStreamingClient();
    for await (const _ of client.stream("hello")) {
      // drain
    }

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: "Bearer router-secret-key",
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      model: "test-model",
      messages: [{ role: "user", content: "hello" }],
      stream: true,
    });
  });

  it("propagates opts.signal into the streaming fetch call", async () => {
    mockEnv();
    (mockFetch as Mock).mockResolvedValueOnce(
      sseResponse(["data: [DONE]\n\n"]),
    );

    const client = await loadStreamingClient();
    const controller = new AbortController();
    for await (const _ of client.stream("hi", { signal: controller.signal })) {
      // drain
    }

    expect(mockFetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("throws when the streaming response is not OK", async () => {
    mockEnv();
    (mockFetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      body: null,
      json: () => Promise.resolve({}),
    } as Response);

    const client = await loadStreamingClient();

    const iterator = client.stream("hi")[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toThrow(
      "OpenRouter stream failed: 429",
    );
  });

  it("throws when the streaming response has no body", async () => {
    mockEnv();
    (mockFetch as Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      body: null,
      json: () => Promise.resolve({}),
    } as Response);

    const client = await loadStreamingClient();

    const iterator = client.stream("hi")[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toThrow("no body");
  });
});
