"use client";

import type { JobCardData } from "@/server/jobs/dto";
import { JobCardGridSkeleton } from "../job-detail/card-grid-skeleton";
import { JobDetailsContainer } from "../job-detail/container";
import { EmptyState } from "../shared/empty-state";
import { ErrorState } from "../shared/error-state";
import { LoadMoreSentinel } from "../shared/load-more-sentinel";
import { FiltersEmptyState } from "./filters-empty-state";

type DashboardJobListSectionProps = {
  jobs: ReadonlyArray<JobCardData>;
  isPending: boolean;
  hasInitialData: boolean;
  isError: boolean;
  errorMessage: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFiltersActiveOrQuerying: boolean;
  skeletonCount: number;
  onRetry: () => void;
  onClearAll: () => void;
  onLoadMore: () => void;
};

export function DashboardJobListSection({
  jobs,
  isPending,
  hasInitialData,
  isError,
  errorMessage,
  hasNextPage,
  isFetchingNextPage,
  isFiltersActiveOrQuerying,
  skeletonCount,
  onRetry,
  onClearAll,
  onLoadMore,
}: DashboardJobListSectionProps) {
  const hasAnyResults = jobs.length > 0;

  if (isError) {
    return <ErrorState errorMessage={errorMessage} onRetry={onRetry} />;
  }

  if (isPending && !hasInitialData) {
    return (
      <output>
        <span className="sr-only">Cargando ofertas…</span>
        <JobCardGridSkeleton count={skeletonCount} />
      </output>
    );
  }

  if (!hasAnyResults && isFiltersActiveOrQuerying) {
    return <FiltersEmptyState onClearFilters={onClearAll} />;
  }

  if (!hasAnyResults) {
    return <EmptyState onRetry={onRetry} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Ofertas</h2>
      <JobDetailsContainer
        jobs={jobs}
        isFetchingNextPage={isFetchingNextPage}
      />
      <LoadMoreSentinel
        onIntersect={onLoadMore}
        enabled={hasNextPage && !isFetchingNextPage}
      />
      {!hasNextPage && jobs.length > 0 ? (
        <p className="text-center text-sm text-muted">
          Has llegado al final de la lista.
        </p>
      ) : null}
      {isFetchingNextPage ? (
        <p className="text-center text-sm text-muted">Cargando más ofertas…</p>
      ) : null}
    </div>
  );
}
