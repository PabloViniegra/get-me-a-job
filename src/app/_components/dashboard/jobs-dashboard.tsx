"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import type { Format } from "@/lib/dashboard-filters";
import type { SortKey } from "@/lib/dashboard-sort";
import { friendlyErrorMessage } from "@/lib/error-message";
import { JOB_FORMATS } from "@/server/jobs/list-schema";
import { useDebouncedValue } from "../shared/use-debounced-value";
import { JobsFilterBar } from "./filter-bar";
import { JobsFilterBarSkeleton } from "./filter-bar-skeleton";
import { DashboardHeader } from "./header";
import { DashboardJobListSection } from "./job-list-section";
import { DashboardLayout } from "./layout";
import { DashboardResultCount } from "./result-count";
import { DashboardStats } from "./stats";
import { DashboardStatsSkeleton } from "./stats-skeleton";
import { useDashboardFilters } from "./use-filters";
import { type DashboardListInput, useDashboardList } from "./use-list";
import { useDashboardRefresh } from "./use-refresh";
import { useDashboardSort } from "./use-sort";

const PAGE_LIMIT = 24;
const LOADING_SKELETON_COUNT = PAGE_LIMIT;
const SEARCH_DEBOUNCE_MS = 300;

function buildListInput(
  query: string,
  formats: ReadonlyArray<Format>,
  tiers: ReadonlyArray<string>,
  sortKey: SortKey,
  withAnalysis: boolean,
): DashboardListInput {
  const trimmedQuery = query.trim();
  return {
    limit: PAGE_LIMIT,
    query: trimmedQuery.length > 0 ? trimmedQuery : undefined,
    formats:
      formats.length > 0 && formats.length < JOB_FORMATS.length
        ? [...formats]
        : undefined,
    tiers:
      tiers.length > 0 ? (tiers as DashboardListInput["tiers"]) : undefined,
    sortKey,
    withAnalysis: withAnalysis ? true : undefined,
  };
}

export function JobsDashboard({ actions }: { actions?: ReactNode }) {
  const {
    query,
    setQuery,
    formats,
    toggleFormat,
    tiers,
    toggleTier,
    withAnalysis,
    setWithAnalysis,
    clearAll,
    activeFacetCount,
    isActive,
  } = useDashboardFilters();
  const { sortKey, setSortKey } = useDashboardSort();

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const listInput = useMemo(
    () => buildListInput(debouncedQuery, formats, tiers, sortKey, withAnalysis),
    [debouncedQuery, formats, tiers, sortKey, withAnalysis],
  );

  const {
    jobs,
    summary,
    listQueryKey,
    flatJobs,
    newestCreatedAt,
    handleRetry,
    handleLoadMore,
  } = useDashboardList(listInput);

  const handleRefresh = useDashboardRefresh(listQueryKey, {
    loading: "Actualizando ofertas…",
    success: "Ofertas actualizadas",
    error: "No se pudo actualizar",
  });

  const totalOffers = summary.data?.total;
  const subtitleLabel =
    totalOffers !== undefined
      ? totalOffers
      : flatJobs.length > 0
        ? flatJobs.length
        : null;

  return (
    <DashboardLayout>
      <DashboardHeader
        actions={actions}
        subtitleLabel={subtitleLabel}
        isSubtitleLoading={summary.isPending && !summary.data}
        newestCreatedAt={newestCreatedAt}
        isRefreshing={jobs.isFetching}
        onRefresh={handleRefresh}
      />

      {summary.isPending ? (
        <DashboardStatsSkeleton />
      ) : (
        <DashboardStats summary={summary.data ?? null} />
      )}

      {jobs.isPending && !jobs.data ? (
        <JobsFilterBarSkeleton />
      ) : (
        <JobsFilterBar
          value={query}
          onChange={setQuery}
          resultCount={flatJobs.length}
          formats={formats}
          onToggleFormat={toggleFormat}
          tiers={tiers}
          onToggleTier={toggleTier}
          withAnalysis={withAnalysis}
          onChangeWithAnalysis={setWithAnalysis}
          sortKey={sortKey}
          onChangeSortKey={setSortKey}
          activeFacetCount={activeFacetCount}
          onClearAll={clearAll}
        />
      )}

      {isActive && subtitleLabel !== null ? (
        <DashboardResultCount visible={flatJobs.length} total={subtitleLabel} />
      ) : null}

      <section id="ofertas" tabIndex={-1}>
        <DashboardJobListSection
          jobs={flatJobs}
          isPending={jobs.isPending}
          hasInitialData={jobs.data !== undefined}
          isError={jobs.isError}
          errorMessage={friendlyErrorMessage(jobs.error?.message ?? "")}
          hasNextPage={jobs.hasNextPage === true}
          isFetchingNextPage={jobs.isFetchingNextPage}
          isFiltersActiveOrQuerying={isActive || debouncedQuery.length > 0}
          skeletonCount={LOADING_SKELETON_COUNT}
          onRetry={handleRetry}
          onClearAll={clearAll}
          onLoadMore={handleLoadMore}
        />
      </section>
    </DashboardLayout>
  );
}
