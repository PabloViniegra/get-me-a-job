import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshJobsList } from "./dashboard-refresh";

function makeMocks() {
  const refetchQueries = vi.fn().mockResolvedValue([]);
  const queryFilter = vi.fn(() => ({ queryKey: ["jobs", "list"] as const }));
  const queryClient = { refetchQueries };
  const trpc = { jobs: { list: { queryFilter } } };
  return { queryClient, trpc, refetchQueries, queryFilter };
}

describe("refreshJobsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls queryClient.refetchQueries with the jobs.list query filter", async () => {
    const { queryClient, trpc, refetchQueries, queryFilter } = makeMocks();

    await refreshJobsList(
      queryClient as unknown as Parameters<typeof refreshJobsList>[0],
      trpc as unknown as Parameters<typeof refreshJobsList>[1],
    );

    expect(queryFilter).toHaveBeenCalledTimes(1);
    expect(refetchQueries).toHaveBeenCalledTimes(1);
    expect(refetchQueries).toHaveBeenCalledWith({ queryKey: ["jobs", "list"] });
  });

  it("returns the refetch result (Promise resolution bubbles up to sileo.promise)", async () => {
    const refetchQueries = vi.fn().mockResolvedValue(["row-1"]);
    const queryClient = { refetchQueries };
    const trpc = { jobs: { list: { queryFilter: () => ({}) } } };

    const result = await refreshJobsList(
      queryClient as unknown as Parameters<typeof refreshJobsList>[0],
      trpc as unknown as Parameters<typeof refreshJobsList>[1],
    );

    expect(result).toEqual(["row-1"]);
  });
});
