"use client";
"use no memo";

import { Button } from "@heroui/react";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useCallback, useMemo } from "react";
import { sileo } from "sileo";
import type { Format } from "@/lib/dashboard-filters";
import type { SortKey } from "@/lib/dashboard-sort";
import { friendlyErrorMessage } from "@/lib/error-message";
import type { ListJobsResult } from "@/lib/jobs.list";
import { JOB_FORMATS, type JobsListParsed } from "@/lib/jobs.list.schema";
import { relativeJobTime } from "@/lib/relative-time";
import { useTRPC } from "@/trpc/client";
import { DashboardStats } from "./dashboard-stats";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { FiltersEmptyState } from "./filters-empty-state";
import { JobCard } from "./job-card";
import { JobsFilterBar } from "./jobs-filter-bar";
import { LoadMoreSentinel } from "./load-more-sentinel";
import { useDashboardFilters } from "./use-dashboard-filters";
import { useDashboardSort } from "./use-dashboard-sort";
import { useDebouncedValue } from "./use-debounced-value";

const PAGE_LIMIT = 24;
const SEARCH_DEBOUNCE_MS = 300;
const STAGGER_STEP_MS = 80;
const STAGGER_INDEX_CAP = 6;

type JobsListInput = Omit<JobsListParsed, "cursor"> & { cursor?: string };

function ensureDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function buildListInput(
  query: string,
  formats: ReadonlyArray<Format>,
  sortKey: SortKey,
): JobsListInput {
  const trimmedQuery = query.trim();
  return {
    limit: PAGE_LIMIT,
    query: trimmedQuery.length > 0 ? trimmedQuery : undefined,
    formats:
      formats.length > 0 && formats.length < JOB_FORMATS.length
        ? [...formats]
        : undefined,
    sortKey,
  };
}

type JobsDashboardProps = {
  firstPage: ListJobsResult;
  summary: { total: number; excellent: number; pending: number };
};

export function JobsDashboard({ firstPage, summary }: JobsDashboardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const {
    query,
    setQuery,
    formats,
    toggleFormat,
    tiers,
    toggleTier,
    clearAll,
    activeFacetCount,
    isActive,
  } = useDashboardFilters();
  const { sortKey, setSortKey } = useDashboardSort();

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const listInput = useMemo(
    () => buildListInput(debouncedQuery, formats, sortKey),
    [debouncedQuery, formats, sortKey],
  );

  const jobs = useInfiniteQuery({
    ...trpc.jobs.list.infiniteQueryOptions(listInput, {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }),
    initialPageParam: null as string | null,
    initialData:
      listInput.query === undefined &&
      listInput.formats === undefined &&
      listInput.sortKey === "score"
        ? { pages: [firstPage], pageParams: [null] }
        : undefined,
    placeholderData: keepPreviousData,
  });

  const handleRetry = useCallback(() => {
    void jobs.refetch();
  }, [jobs]);

  const handleRefresh = useCallback(() => {
    void sileo.promise(
      queryClient.refetchQueries({
        queryKey: trpc.jobs.list.infiniteQueryKey(listInput),
      }),
      {
        loading: { title: "Actualizando ofertas…" },
        success: { title: "Ofertas actualizadas" },
        error: { title: "No se pudo actualizar" },
      },
    );
  }, [queryClient, trpc, listInput]);

  const flatJobs = useMemo(
    () =>
      (jobs.data?.pages.flatMap((page) => page.items) ?? []).map((job) => ({
        ...job,
        createdAt: ensureDate(job.createdAt),
      })),
    [jobs.data],
  );

  const tierFilteredJobs = useMemo(
    () =>
      tiers.length === 0
        ? flatJobs
        : flatJobs.filter((job) => tiers.includes(job.scoreTier)),
    [flatJobs, tiers],
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

  const hasAnyResults = flatJobs.length > 0;
  const tierFilterHasNoMatches = hasAnyResults && tierFilteredJobs.length === 0;
  const subtitleLabel = summary.total;

  return (
    <section className="flex w-full max-w-7xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground">
            Get{" "}
            <span className="font-mono font-medium tracking-normal text-muted">
              me
            </span>{" "}
            a job
          </h1>
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            dashboard · {subtitleLabel}{" "}
            {subtitleLabel === 1 ? "oferta" : "ofertas"}
            {newestCreatedAt
              ? ` · más reciente ${relativeJobTime(newestCreatedAt)}`
              : ""}
          </p>
        </div>
        <Button
          aria-label="Actualizar ofertas"
          variant="secondary"
          onPress={handleRefresh}
          isDisabled={jobs.isFetching}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Actualizar
        </Button>
      </header>

      <DashboardStats summary={summary} />

      <JobsFilterBar
        value={query}
        onChange={setQuery}
        resultCount={tierFilteredJobs.length}
        formats={formats}
        onToggleFormat={toggleFormat}
        tiers={tiers}
        onToggleTier={toggleTier}
        sortKey={sortKey}
        onChangeSortKey={setSortKey}
        activeFacetCount={activeFacetCount}
        onClearAll={clearAll}
      />

      {isActive ? (
        <p aria-live="polite" className="text-sm text-muted">
          Mostrando {tierFilteredJobs.length} de {subtitleLabel} ofertas
        </p>
      ) : null}

      {jobs.isError ? (
        <ErrorState
          errorMessage={friendlyErrorMessage(jobs.error?.message ?? "")}
          onRetry={handleRetry}
        />
      ) : !hasAnyResults && (isActive || debouncedQuery.length > 0) ? (
        <FiltersEmptyState onClearFilters={clearAll} />
      ) : !hasAnyResults ? (
        <EmptyState onRetry={handleRetry} />
      ) : (
        <div className="flex flex-col gap-4">
          <ul
            aria-busy={jobs.isFetchingNextPage}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {tierFilteredJobs.map((job, index) => (
              <li
                key={job.id}
                className="motion-safe:animate-job-enter"
                style={{
                  animationDelay: `${
                    Math.min(index, STAGGER_INDEX_CAP) * STAGGER_STEP_MS
                  }ms`,
                }}
              >
                <JobCard data={job} />
              </li>
            ))}
          </ul>
          {tierFilterHasNoMatches ? (
            <FiltersEmptyState onClearFilters={clearAll} />
          ) : (
            <LoadMoreSentinel
              onIntersect={() => {
                if (jobs.hasNextPage && !jobs.isFetchingNextPage) {
                  void jobs.fetchNextPage();
                }
              }}
              enabled={jobs.hasNextPage === true && !jobs.isFetchingNextPage}
            />
          )}
          {!jobs.hasNextPage && tierFilteredJobs.length > 0 ? (
            <p className="text-center text-sm text-muted">
              Has llegado al final de la lista.
            </p>
          ) : null}
          {jobs.isFetchingNextPage ? (
            <p className="text-center text-sm text-muted">
              Cargando más ofertas…
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
