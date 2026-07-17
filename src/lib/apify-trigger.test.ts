import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/apify", () => ({
  ACTOR_ID: "test/actor",
  SEARCH_INPUT: { keyword: "Senior Engineer", locations: ["Madrid"] },
}));

vi.mock("@/env", () => ({
  env: { APIFY_API_KEY: "test-apify-key" },
}));

import { triggerLinkedInScrape } from "./apify-trigger";

function makeRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    defaultDatasetId: "ds-1",
    status: "RUNNING",
    ...overrides,
  };
}

function makeMockClient(run: unknown) {
  const start = vi.fn().mockResolvedValue(run);
  const actor = vi.fn().mockReturnValue({ start });
  return { actor, client: { actor } as never };
}

describe("triggerLinkedInScrape", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts the configured actor with SEARCH_INPUT by default", async () => {
    const run = makeRun();
    const { actor } = makeMockClient(run);

    const result = await triggerLinkedInScrape({}, { actor } as never);

    expect(actor).toHaveBeenCalledWith("test/actor");
    expect(result).toEqual({
      runId: "run-1",
      datasetId: "ds-1",
      status: "RUNNING",
    });
  });

  it("accepts a custom actorId override", async () => {
    const { actor } = makeMockClient(makeRun());

    await triggerLinkedInScrape({ actorId: "custom/actor" }, {
      actor,
    } as never);

    expect(actor).toHaveBeenCalledWith("custom/actor");
  });

  it("accepts a custom input override", async () => {
    const start = vi.fn().mockResolvedValue(makeRun());
    const actor = vi.fn().mockReturnValue({ start });
    const client = { actor } as never;

    await triggerLinkedInScrape(
      { input: { keyword: "Other", locations: ["Remote"] } },
      client,
    );

    expect(start).toHaveBeenCalledWith({
      keyword: "Other",
      locations: ["Remote"],
    });
  });

  it("propagates errors from apify-client", async () => {
    const start = vi.fn().mockRejectedValue(new Error("apify 503"));
    const actor = vi.fn().mockReturnValue({ start });

    await expect(triggerLinkedInScrape({}, { actor } as never)).rejects.toThrow(
      "apify 503",
    );
  });
});
