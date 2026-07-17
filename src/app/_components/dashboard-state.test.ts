import { describe, expect, it } from "vitest";
import { resolveDashboardView } from "./dashboard-state";

describe("resolveDashboardView", () => {
  it("returns 'loading' when isPending is true (priority over error/empty/ready)", () => {
    expect(
      resolveDashboardView({ isPending: true, isError: true, dataLength: 0 }),
    ).toBe("loading");
  });

  it("returns 'error' when not pending and isError is true", () => {
    expect(
      resolveDashboardView({ isPending: false, isError: true, dataLength: 0 }),
    ).toBe("error");
  });

  it("returns 'empty' when not pending and not error and the array is empty", () => {
    expect(
      resolveDashboardView({ isPending: false, isError: false, dataLength: 0 }),
    ).toBe("empty");
  });

  it("returns 'cards' on the happy path", () => {
    expect(
      resolveDashboardView({ isPending: false, isError: false, dataLength: 7 }),
    ).toBe("cards");
  });

  it("does NOT return 'empty' if data is undefined-ish but length is positive", () => {
    expect(
      resolveDashboardView({ isPending: false, isError: false, dataLength: 1 }),
    ).toBe("cards");
  });

  it("gives 'error' priority over a non-empty data length (stale data shouldn't mask an error)", () => {
    expect(
      resolveDashboardView({ isPending: false, isError: true, dataLength: 5 }),
    ).toBe("error");
  });
});
