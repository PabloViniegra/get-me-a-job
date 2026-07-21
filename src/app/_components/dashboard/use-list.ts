"use client";

import type { QueryKey } from "@tanstack/react-query";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { JobCardData } from "@/server/jobs/dto";
import type { JobsListParsed } from "@/server/jobs/list-schema";
import { useTRPC } from "@/trpc/client";

export type DashboardListInput = Omit<JobsListParsed, "cursor"> & {
  cursor?: string;
};

export type DashboardList = ReturnType<typeof useDashboardList>;

export function useDashboardList(listInput: DashboardListInput) {
  const trpc = useTRPC();

  const jobs = useInfiniteQuery({
    ...trpc.jobs.list.infiniteQueryOptions(listInput, {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }),
    placeholderData: keepPreviousData,
  });
  const summary = useQuery(trpc.jobs.summary.queryOptions());
  const listQueryKey: QueryKey = trpc.jobs.list.infiniteQueryKey(listInput);

  const flatJobs = useMemo<ReadonlyArray<JobCardData>>(
    () => jobs.data?.pages.flatMap((page) => page.items) ?? [],
    [jobs.data],
  );

  const newestCreatedAt = useMemo(
    () =>
      flatJobs.reduce<Date | null>(
        (acc, job) =>
          acc === null || job.createdAt.getTime() > acc.getTime()
            ? job.createdAt
            : acc,
        null,
      ),
    [flatJobs],
  );

  const handleRetry = useCallback(() => {
    void jobs.refetch();
  }, [jobs]);

  const handleLoadMore = useCallback(() => {
    if (jobs.hasNextPage && !jobs.isFetchingNextPage) {
      void jobs.fetchNextPage();
    }
  }, [jobs]);

  return {
    jobs,
    summary,
    listQueryKey,
    flatJobs,
    newestCreatedAt,
    handleRetry,
    handleLoadMore,
  };
}
