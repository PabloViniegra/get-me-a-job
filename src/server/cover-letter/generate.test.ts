import { afterEach, describe, expect, it } from "vitest";
import {
  buildCoverLetterPrompt,
  computeRateLimit,
  generateCoverLetterStream,
} from "./generate";

const FIXED_NOW = new Date("2026-07-20T12:00:00.000Z");

afterEach(() => {});

describe("computeRateLimit — first three regenerations are free", () => {
  it("allows the very first generation (currentRegenerations=0 → next=1)", () => {
    const decision = computeRateLimit({
      currentRegenerations: 0,
      lastRegeneratedAt: null,
      now: FIXED_NOW,
    });
    expect(decision).toEqual({
      allowed: true,
      retryAfterMs: 0,
      nextRegenerationCount: 1,
    });
  });

  it("allows the first regeneration (currentRegenerations=1 → next=2)", () => {
    const decision = computeRateLimit({
      currentRegenerations: 1,
      lastRegeneratedAt: FIXED_NOW,
      now: FIXED_NOW,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.nextRegenerationCount).toBe(2);
  });

  it("allows the second regeneration (currentRegenerations=2 → next=3)", () => {
    const decision = computeRateLimit({
      currentRegenerations: 2,
      lastRegeneratedAt: FIXED_NOW,
      now: FIXED_NOW,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.nextRegenerationCount).toBe(3);
  });

  it("allows the third regeneration (currentRegenerations=3 → next=4) when 30s elapsed", () => {
    const last = new Date(FIXED_NOW.getTime() - 30_000);
    const decision = computeRateLimit({
      currentRegenerations: 3,
      lastRegeneratedAt: last,
      now: FIXED_NOW,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.nextRegenerationCount).toBe(4);
  });
});

describe("computeRateLimit — progressive exponential wait after 3 regens", () => {
  it("blocks the 4th regen with retryAfterMs≈30s when 0s elapsed since last", () => {
    const decision = computeRateLimit({
      currentRegenerations: 3,
      lastRegeneratedAt: FIXED_NOW,
      now: FIXED_NOW,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBe(30_000);
    expect(decision.nextRegenerationCount).toBe(4);
  });

  it("blocks the 5th regen with retryAfterMs≈60s when 0s elapsed since last", () => {
    const decision = computeRateLimit({
      currentRegenerations: 4,
      lastRegeneratedAt: FIXED_NOW,
      now: FIXED_NOW,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBe(60_000);
    expect(decision.nextRegenerationCount).toBe(5);
  });

  it("blocks the 6th regen with retryAfterMs≈120s when 0s elapsed since last", () => {
    const decision = computeRateLimit({
      currentRegenerations: 5,
      lastRegeneratedAt: FIXED_NOW,
      now: FIXED_NOW,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBe(120_000);
  });

  it("returns retryAfterMs proportional to remaining time when partially elapsed", () => {
    const last = new Date(FIXED_NOW.getTime() - 10_000); // 10s elapsed, 20s left
    const decision = computeRateLimit({
      currentRegenerations: 3,
      lastRegeneratedAt: last,
      now: FIXED_NOW,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBe(20_000);
  });

  it("allows when elapsed >= required wait", () => {
    const last = new Date(FIXED_NOW.getTime() - 30_001);
    const decision = computeRateLimit({
      currentRegenerations: 3,
      lastRegeneratedAt: last,
      now: FIXED_NOW,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.nextRegenerationCount).toBe(4);
  });

  it("allows when lastRegeneratedAt is null even past the free limit (edge case)", () => {
    const decision = computeRateLimit({
      currentRegenerations: 3,
      lastRegeneratedAt: null,
      now: FIXED_NOW,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.nextRegenerationCount).toBe(4);
  });
});

describe("buildCoverLetterPrompt", () => {
  it("embeds the CV text and job fields inside the system prompt", () => {
    const job = {
      jobId: "j-1",
      title: "Staff Engineer",
      linkedinUrl: "https://linkedin.com/jobs/view/j-1",
      description: "Build cool things.",
      salary: "EUR 80k",
      format: "Remote",
      requirements: ["TypeScript"],
    };
    const prompt = buildCoverLetterPrompt({ cvText: "MY CV BODY", job });
    expect(prompt).toContain("MY CV BODY");
    expect(prompt).toContain("Staff Engineer");
    expect(prompt).toContain("Remote");
    expect(prompt).toContain("EUR 80k");
    expect(prompt).toContain("- TypeScript");
  });

  it("falls back to 'No publicado' for missing salary", () => {
    const job = {
      jobId: "j-1",
      title: "T",
      linkedinUrl: "x",
      description: "d",
      salary: null,
      format: "Remote",
      requirements: [],
    };
    expect(buildCoverLetterPrompt({ cvText: "cv", job })).toContain(
      "No publicado",
    );
  });

  it("marks empty requirements explicitly", () => {
    const job = {
      jobId: "j-1",
      title: "T",
      linkedinUrl: "x",
      description: "d",
      salary: null,
      format: "Remote",
      requirements: [],
    };
    expect(buildCoverLetterPrompt({ cvText: "cv", job })).toContain(
      "sin requisitos explícitos",
    );
  });
});

describe("generateCoverLetterStream", () => {
  it("yields chunks from the underlying client.stream() and concatenates to full text", async () => {
    const chunks = ["Hola ", "mundo", "!"];
    const client = {
      complete: () => Promise.resolve(""),
      stream: () =>
        (async function* () {
          for (const c of chunks) yield c;
        })(),
    };
    let collected = "";
    for await (const chunk of generateCoverLetterStream({
      client,
      cvText: "cv",
      job: {
        jobId: "j-1",
        title: "T",
        linkedinUrl: "x",
        description: "d",
        salary: null,
        format: "Remote",
        requirements: [],
      },
    })) {
      collected += chunk;
    }
    expect(collected).toBe("Hola mundo!");
  });

  it("propagates client.stream() errors", async () => {
    const client = {
      complete: () => Promise.resolve(""),
      stream: () =>
        (async function* () {
          yield "ok";
          throw new Error("upstream down");
        })(),
    };
    const iterator = generateCoverLetterStream({
      client,
      cvText: "cv",
      job: {
        jobId: "j-1",
        title: "T",
        linkedinUrl: "x",
        description: "d",
        salary: null,
        format: "Remote",
        requirements: [],
      },
    })[Symbol.asyncIterator]();
    await iterator.next();
    await expect(iterator.next()).rejects.toThrow("upstream down");
  });

  it("forwards the abort signal to the client", async () => {
    const seen: Array<AbortSignal | undefined> = [];
    const client = {
      complete: () => Promise.resolve(""),
      stream: (
        _p: string,
        opts?: { signal?: AbortSignal },
      ): AsyncIterable<string> => {
        seen.push(opts?.signal);
        return (async function* () {
          yield "ok";
        })();
      },
    };
    const controller = new AbortController();
    for await (const _ of generateCoverLetterStream({
      client,
      cvText: "cv",
      signal: controller.signal,
      job: {
        jobId: "j-1",
        title: "T",
        linkedinUrl: "x",
        description: "d",
        salary: null,
        format: "Remote",
        requirements: [],
      },
    })) {
      // drain
    }
    expect(seen[0]).toBe(controller.signal);
  });
});
