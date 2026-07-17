"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTRPC } from "@/trpc/client";
import { resolveDashboardView } from "./dashboard-state";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { JobCard } from "./job-card";
import { JobCardSkeleton } from "./job-card-skeleton";

const SKELETON_COUNT = 4;
const SKELETON_KEYS = Array.from(
  { length: SKELETON_COUNT },
  (_, i) => `skeleton-${i}`,
);

export function JobsDashboard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const jobs = useQuery(trpc.jobs.list.queryOptions());

  const handleRetry = useCallback(() => {
    void queryClient.invalidateQueries(trpc.jobs.list.queryFilter());
  }, [queryClient, trpc]);

  const view = resolveDashboardView({
    isPending: jobs.isPending,
    isError: jobs.isError,
    dataLength: jobs.data?.length ?? 0,
  });

  if (view === "loading") {
    return (
      <ul className="flex w-full max-w-2xl flex-col gap-2 p-4">
        {SKELETON_KEYS.map((key) => (
          <li key={key}>
            <JobCardSkeleton />
          </li>
        ))}
      </ul>
    );
  }

  if (view === "error") {
    return (
      <ErrorState
        errorMessage={jobs.error?.message ?? ""}
        onRetry={handleRetry}
      />
    );
  }

  if (view === "empty") {
    return <EmptyState onRetry={handleRetry} />;
  }

  if (!jobs.data) {
    return null;
  }

  return (
    <ul className="flex w-full max-w-2xl flex-col gap-2 p-4">
      {jobs.data.map((job) => (
        <li key={job.id}>
          <JobCard data={job} />
        </li>
      ))}
    </ul>
  );
}
