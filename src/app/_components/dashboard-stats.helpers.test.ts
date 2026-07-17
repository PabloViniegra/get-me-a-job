import { describe, expect, it } from "vitest";
import { deriveDashboardCounts } from "./dashboard-stats.helpers";

describe("deriveDashboardCounts", () => {
  it("passes through raw counts unchanged", () => {
    expect(
      deriveDashboardCounts({
        totalCount: 12,
        excellentCount: 4,
        pendingCount: 3,
      }),
    ).toEqual({ total: 12, excellent: 4, pending: 3 });
  });

  it("accepts a fully-empty input without coercing to null", () => {
    expect(
      deriveDashboardCounts({
        totalCount: 0,
        excellentCount: 0,
        pendingCount: 0,
      }),
    ).toEqual({ total: 0, excellent: 0, pending: 0 });
  });
});
