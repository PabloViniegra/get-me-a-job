import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConfig = vi.hoisted(() => ({
  ACTOR_ID: "test/actor" as string,
  searchInput: {
    keyword: "Senior Engineer",
    locations: ["Madrid"],
  } as Record<string, unknown>,
}));

vi.mock("@/config/apify", () => ({
  get ACTOR_ID() {
    return mockConfig.ACTOR_ID;
  },
  getSearchInput: () => mockConfig.searchInput,
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.ACTOR_ID = "test/actor";
    mockConfig.searchInput = {
      keyword: "Senior Engineer",
      locations: ["Madrid"],
    };
  });

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

  it("throws a clear error when APIFY_ACTOR_ID is unset", async () => {
    mockConfig.ACTOR_ID = "";
    const { actor } = makeMockClient(makeRun());

    await expect(triggerLinkedInScrape({}, { actor } as never)).rejects.toThrow(
      /APIFY_ACTOR_ID/,
    );
  });

  it("throws a clear error when APIFY_SEARCH_INPUT is unset", async () => {
    mockConfig.searchInput = {};
    const { actor } = makeMockClient(makeRun());

    await expect(triggerLinkedInScrape({}, { actor } as never)).rejects.toThrow(
      /APIFY_SEARCH_INPUT/,
    );
  });

  it("propagates errors from apify-client", async () => {
    const start = vi.fn().mockRejectedValue(new Error("apify 503"));
    const actor = vi.fn().mockReturnValue({ start });

    await expect(triggerLinkedInScrape({}, { actor } as never)).rejects.toThrow(
      "apify 503",
    );
  });
});
