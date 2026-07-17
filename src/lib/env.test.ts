import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const REQUIRED_BASE = {
  DATABASE_URL: "mongodb://localhost:27017/test",
  ROUTER_API_KEY: "router-key",
  APIFY_API_KEY: "apify-key",
  APIFY_WEBHOOK_SECRET: "webhook-secret",
  APIFY_ADMIN_SECRET: "admin-secret",
  APIFY_ACTOR_ID: "test/actor",
  APIFY_SEARCH_INPUT: '{"keyword":"Engineer"}',
};

describe("parseEnv", () => {
  it("returns a typed env object when all required vars are present", () => {
    const result = parseEnv(REQUIRED_BASE);

    expect(result).toEqual({
      ...REQUIRED_BASE,
      OPENROUTER_MODEL: "meta-llama/llama-3.3-70b-instruct:free",
    });
  });

  it("defaults OPENROUTER_MODEL when unset", () => {
    const result = parseEnv(REQUIRED_BASE);

    expect(result.OPENROUTER_MODEL).toBe(
      "meta-llama/llama-3.3-70b-instruct:free",
    );
  });

  it("uses the provided OPENROUTER_MODEL when set", () => {
    const result = parseEnv({
      ...REQUIRED_BASE,
      OPENROUTER_MODEL: "anthropic/claude-3.5-sonnet",
    });

    expect(result.OPENROUTER_MODEL).toBe("anthropic/claude-3.5-sonnet");
  });

  it("accepts CV_TEXT (base64-encoded CV) when provided", () => {
    const result = parseEnv({
      ...REQUIRED_BASE,
      CV_TEXT: "UEFCTE8gVklOSUVHUkE=",
    });

    expect(result.CV_TEXT).toBe("UEFCTE8gVklOSUVHUkE=");
  });

  it("returns undefined CV_TEXT when not provided (local dev fallback)", () => {
    const result = parseEnv(REQUIRED_BASE);

    expect(result.CV_TEXT).toBeUndefined();
  });

  it("throws a clear error when a required var is missing", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "mongodb://localhost:27017/test",
        ROUTER_API_KEY: "router-key",
        APIFY_API_KEY: "apify-key",
      }),
    ).toThrow(
      "Invalid environment variables: APIFY_WEBHOOK_SECRET, APIFY_ADMIN_SECRET, APIFY_ACTOR_ID, APIFY_SEARCH_INPUT",
    );
  });
});
