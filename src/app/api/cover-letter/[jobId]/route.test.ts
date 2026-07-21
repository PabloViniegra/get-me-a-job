import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "mongodb://localhost:27017/test",
    ROUTER_API_KEY: "test-router-key",
  },
}));

vi.mock("@/lib/cv", () => ({
  loadCV: vi.fn().mockResolvedValue("FAKE CV TEXT"),
}));

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobOffer: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

const mockStream = vi.fn();

vi.mock("@/lib/openrouter", () => ({
  openRouterClient: {
    complete: vi.fn(),
    stream: (...args: unknown[]) => mockStream(...args),
  },
}));

import { POST } from "./route";

function makeParams(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

function makeRequest(jobId: string): Request {
  return new Request(`http://localhost/api/cover-letter/${jobId}`, {
    method: "POST",
  });
}

async function readStream(response: Response): Promise<string> {
  if (!response.body) throw new Error("no body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe("POST /api/cover-letter/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 for empty jobId", async () => {
    const response = await POST(makeRequest(""), makeParams(""));
    expect(response.status).toBe(400);
  });

  it("returns 404 when the job does not exist", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const response = await POST(makeRequest("missing"), makeParams("missing"));
    expect(response.status).toBe(404);
  });

  it("returns 429 when the rate limit blocks regeneration, with retryAfterMs", async () => {
    const lastAt = new Date();
    mockFindUnique.mockResolvedValueOnce({
      jobId: "j-1",
      title: "T",
      linkedinUrl: "u",
      description: "d",
      salary: null,
      format: "Remote",
      requirements: [],
      descriptionHash: "h",
      coverLetter: "old",
      coverLetterRegenerations: 5,
      coverLetterLastRegeneratedAt: lastAt,
    });

    const response = await POST(makeRequest("j-1"), makeParams("j-1"));

    expect(response.status).toBe(429);
    const body = (await response.json()) as {
      error: string;
      retryAfterMs: number;
      nextRegenerationCount: number;
    };
    expect(body.error).toBe("rate_limited");
    expect(body.retryAfterMs).toBeGreaterThan(0);
    expect(body.retryAfterMs).toBeLessThanOrEqual(120_000);
    expect(body.nextRegenerationCount).toBe(6);
    expect(mockStream).not.toHaveBeenCalled();
  });

  it("streams chunks, persists the cover letter on completion, and increments regen count", async () => {
    mockFindUnique.mockResolvedValueOnce({
      jobId: "j-2",
      title: "T",
      linkedinUrl: "u",
      description: "d",
      salary: null,
      format: "Remote",
      requirements: ["TypeScript"],
      descriptionHash: "h-current",
      coverLetter: null,
      coverLetterRegenerations: 0,
      coverLetterLastRegeneratedAt: null,
    });
    mockStream.mockImplementationOnce(() =>
      (async function* () {
        yield "Hola ";
        yield "mundo";
      })(),
    );
    mockUpdate.mockResolvedValueOnce({});

    const response = await POST(makeRequest("j-2"), makeParams("j-2"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/^text\/plain/);

    const text = await readStream(response);
    expect(text).toBe("Hola mundo");

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updateArgs = mockUpdate.mock.calls[0] as [
      { where: { jobId: string }; data: Record<string, unknown> },
    ];
    expect(updateArgs[0].where).toEqual({ jobId: "j-2" });
    expect(updateArgs[0].data.coverLetter).toBe("Hola mundo");
    expect(updateArgs[0].data.coverLetterDescriptionHash).toBe("h-current");
    expect(updateArgs[0].data.coverLetterRegenerations).toBeUndefined();
    expect(updateArgs[0].data.coverLetterLastRegeneratedAt).toBeInstanceOf(
      Date,
    );
  });

  it("increments the regen counter when regenerating an existing letter", async () => {
    mockFindUnique.mockResolvedValueOnce({
      jobId: "j-3",
      title: "T",
      linkedinUrl: "u",
      description: "d",
      salary: null,
      format: "Remote",
      requirements: [],
      descriptionHash: "h",
      coverLetter: "old",
      coverLetterRegenerations: 1,
      coverLetterLastRegeneratedAt: new Date(Date.now() - 60_000),
    });
    mockStream.mockImplementationOnce(() =>
      (async function* () {
        yield "nuevo";
      })(),
    );
    mockUpdate.mockResolvedValueOnce({});

    const response = await POST(makeRequest("j-3"), makeParams("j-3"));
    await readStream(response);

    const updateArgs = mockUpdate.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(updateArgs[0].data.coverLetterRegenerations).toEqual({
      increment: 1,
    });
  });

  it("forwards request abort to the upstream stream via signal", async () => {
    mockFindUnique.mockResolvedValueOnce({
      jobId: "j-4",
      title: "T",
      linkedinUrl: "u",
      description: "d",
      salary: null,
      format: "Remote",
      requirements: [],
      descriptionHash: "h",
      coverLetter: null,
      coverLetterRegenerations: 0,
      coverLetterLastRegeneratedAt: null,
    });
    const seenSignal: Array<AbortSignal | undefined> = [];
    mockStream.mockImplementationOnce(
      (_p: string, opts?: { signal?: AbortSignal }) => {
        seenSignal.push(opts?.signal);
        return (async function* () {
          yield "ok";
        })();
      },
    );

    const controller = new AbortController();
    const request = new Request("http://localhost/api/cover-letter/j-4", {
      method: "POST",
      signal: controller.signal,
    });
    const response = await POST(request, makeParams("j-4"));
    await readStream(response);

    expect(seenSignal[0]).toBeInstanceOf(AbortSignal);
  });

  it("does not persist when the upstream stream throws", async () => {
    mockFindUnique.mockResolvedValueOnce({
      jobId: "j-5",
      title: "T",
      linkedinUrl: "u",
      description: "d",
      salary: null,
      format: "Remote",
      requirements: [],
      descriptionHash: "h",
      coverLetter: null,
      coverLetterRegenerations: 0,
      coverLetterLastRegeneratedAt: null,
    });
    mockStream.mockImplementationOnce(() =>
      (async function* () {
        yield "partial ";
        throw new Error("upstream blew up");
      })(),
    );

    const response = await POST(makeRequest("j-5"), makeParams("j-5"));

    await expect(readStream(response)).rejects.toThrow("upstream blew up");
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
