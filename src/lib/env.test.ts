import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("returns a typed env object when all required vars are present", () => {
    const result = parseEnv({
      DATABASE_URL: "mongodb://localhost:27017/test",
      ROUTER_API_KEY: "router-key",
      APIFY_API_KEY: "apify-key",
      APIFY_WEBHOOK_SECRET: "webhook-secret",
    });

    expect(result).toEqual({
      DATABASE_URL: "mongodb://localhost:27017/test",
      ROUTER_API_KEY: "router-key",
      APIFY_API_KEY: "apify-key",
      APIFY_WEBHOOK_SECRET: "webhook-secret",
      OPENROUTER_MODEL: "meta-llama/llama-3.3-70b-instruct:free",
    });
  });

  it("defaults OPENROUTER_MODEL when unset", () => {
    const result = parseEnv({
      DATABASE_URL: "mongodb://localhost:27017/test",
      ROUTER_API_KEY: "router-key",
      APIFY_API_KEY: "apify-key",
      APIFY_WEBHOOK_SECRET: "webhook-secret",
    });

    expect(result.OPENROUTER_MODEL).toBe(
      "meta-llama/llama-3.3-70b-instruct:free",
    );
  });

  it("uses the provided OPENROUTER_MODEL when set", () => {
    const result = parseEnv({
      DATABASE_URL: "mongodb://localhost:27017/test",
      ROUTER_API_KEY: "router-key",
      APIFY_API_KEY: "apify-key",
      APIFY_WEBHOOK_SECRET: "webhook-secret",
      OPENROUTER_MODEL: "anthropic/claude-3.5-sonnet",
    });

    expect(result.OPENROUTER_MODEL).toBe("anthropic/claude-3.5-sonnet");
  });

  it("throws a clear error when a required var is missing", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "mongodb://localhost:27017/test",
        ROUTER_API_KEY: "router-key",
        APIFY_API_KEY: "apify-key",
      }),
    ).toThrow("Invalid environment variables: APIFY_WEBHOOK_SECRET");
  });
});
