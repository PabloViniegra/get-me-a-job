import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { refetchDashboardQueries } from "./use-refresh";

describe("refetchDashboardQueries", () => {
  it("rejects when an active dashboard query fails", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let shouldFail = false;
    const queryFn = vi.fn(async () => {
      if (shouldFail) {
        throw new Error("network down");
      }
      return "data";
    });
    const observer = new QueryObserver(queryClient, {
      queryKey: ["jobs", "list"],
      queryFn,
      retry: false,
    });
    const unsubscribe = observer.subscribe(() => undefined);

    try {
      await observer.refetch();
      shouldFail = true;

      await expect(
        refetchDashboardQueries(queryClient, ["jobs", "list"]),
      ).rejects.toThrow("network down");
    } finally {
      unsubscribe();
      queryClient.clear();
    }
  });

  it("refetches every active query under the dashboard router key", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const listQueryFn = vi.fn(async () => "list");
    const summaryQueryFn = vi.fn(async () => "summary");
    const listObserver = new QueryObserver(queryClient, {
      queryKey: [["jobs", "list"], { type: "infinite" }],
      queryFn: listQueryFn,
      retry: false,
    });
    const summaryObserver = new QueryObserver(queryClient, {
      queryKey: [["jobs", "summary"], { type: "query" }],
      queryFn: summaryQueryFn,
      retry: false,
    });
    const unsubscribeList = listObserver.subscribe(() => undefined);
    const unsubscribeSummary = summaryObserver.subscribe(() => undefined);

    try {
      await Promise.all([listObserver.refetch(), summaryObserver.refetch()]);
      listQueryFn.mockClear();
      summaryQueryFn.mockClear();

      await refetchDashboardQueries(queryClient, [["jobs"]]);

      expect(listQueryFn).toHaveBeenCalledTimes(1);
      expect(summaryQueryFn).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribeList();
      unsubscribeSummary();
      queryClient.clear();
    }
  });
});
