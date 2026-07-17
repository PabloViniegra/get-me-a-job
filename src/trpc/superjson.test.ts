import superjson from "superjson";
import { describe, expect, it } from "vitest";
import type { JobCardData } from "@/lib/jobs.dto";

describe("superjson wire round-trip for JobCardData", () => {
  it("preserves the createdAt Date through serialize/parse (A6/40 smoke)", () => {
    const original = {
      createdAt: new Date("2026-07-17T20:00:00Z"),
      score: 87,
    } satisfies Partial<JobCardData>;

    const wire = superjson.stringify(original);
    const received: Partial<JobCardData> = superjson.parse(wire);

    expect(received.createdAt).toBeInstanceOf(Date);
    expect((received.createdAt as Date).toISOString()).toBe(
      "2026-07-17T20:00:00.000Z",
    );
  });
});
