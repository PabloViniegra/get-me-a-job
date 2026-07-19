"use client";
"use no memo";

import { Button } from "@heroui/react/button";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo } from "react";
import type { Format } from "@/lib/dashboard-filters";
import type { SortKey } from "@/lib/dashboard-sort";
import { friendlyErrorMessage } from "@/lib/error-message";
import { JOB_FORMATS, type JobsListParsed } from "@/lib/jobs.list.schema";
import { useTRPC } from "@/trpc/client";
import { DashboardStats } from "./dashboard-stats";
import { DashboardStatsSkeleton } from "./dashboard-stats-skeleton";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { FiltersEmptyState } from "./filters-empty-state";
import { HeaderSubtitleSkeleton } from "./header-subtitle-skeleton";
import { JobCardGridSkeleton } from "./job-card-grid-skeleton";
import { JobCardList } from "./job-card-list";
import { JobsFilterBar } from "./jobs-filter-bar";
import { JobsFilterBarSkeleton } from "./jobs-filter-bar-skeleton";
import { LoadMoreSentinel } from "./load-more-sentinel";
import { RelativeTime } from "./relative-time";
import { ThemeToggle } from "./theme-toggle";
import { useDashboardFilters } from "./use-dashboard-filters";
import { useDashboardSort } from "./use-dashboard-sort";
import { useDebouncedValue } from "./use-debounced-value";

const PAGE_LIMIT = 24;
const LOADING_SKELETON_COUNT = PAGE_LIMIT;
const SEARCH_DEBOUNCE_MS = 300;

type JobsListInput = Omit<JobsListParsed, "cursor"> & { cursor?: string };

function buildListInput(
  query: string,
  formats: ReadonlyArray<Format>,
  tiers: ReadonlyArray<string>,
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
    tiers: tiers.length > 0 ? (tiers as JobsListInput["tiers"]) : undefined,
    sortKey,
  };
}

export function JobsDashboard({ actions }: { actions?: ReactNode }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  useEffect(() => {
    void import("@/lib/relative-time");
  }, []);
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
    () => buildListInput(debouncedQuery, formats, tiers, sortKey),
    [debouncedQuery, formats, tiers, sortKey],
  );

  const jobs = useInfiniteQuery({
    ...trpc.jobs.list.infiniteQueryOptions(listInput, {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }),
    placeholderData: keepPreviousData,
  });
  const summary = useQuery(trpc.jobs.summary.queryOptions());

  const handleRetry = useCallback(() => {
    void jobs.refetch();
  }, [jobs]);

  const handleRefresh = useCallback(async () => {
    const { sileo } = await import("sileo");
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

  const hasAnyResults = flatJobs.length > 0;
  const totalOfferts = summary.data?.total;
  const subtitleLabel =
    totalOfferts !== undefined
      ? totalOfferts
      : flatJobs.length > 0
        ? flatJobs.length
        : null;

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
          {summary.isPending && !summary.data ? (
            <HeaderSubtitleSkeleton />
          ) : subtitleLabel !== null ? (
            <p className="font-mono text-xs uppercase tracking-wider text-muted">
              dashboard · {subtitleLabel}{" "}
              {subtitleLabel === 1 ? "oferta" : "ofertas"}
              {newestCreatedAt ? (
                <>
                  {" · más reciente "}
                  <RelativeTime date={newestCreatedAt} />
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <Button
            aria-label="Actualizar ofertas"
            variant="secondary"
            onPress={handleRefresh}
            isDisabled={jobs.isFetching}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Actualizar
          </Button>
          <ThemeToggle />
        </div>
      </header>

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
          sortKey={sortKey}
          onChangeSortKey={setSortKey}
          activeFacetCount={activeFacetCount}
          onClearAll={clearAll}
        />
      )}

      {isActive && subtitleLabel !== null ? (
        <p aria-live="polite" className="text-sm text-muted">
          Mostrando {flatJobs.length} de {subtitleLabel} ofertas
        </p>
      ) : null}

      <section id="ofertas" tabIndex={-1}>
        {jobs.isError ? (
          <ErrorState
            errorMessage={friendlyErrorMessage(jobs.error?.message ?? "")}
            onRetry={handleRetry}
          />
        ) : jobs.isPending && !jobs.data ? (
          <output>
            <span className="sr-only">Cargando ofertas…</span>
            <JobCardGridSkeleton count={LOADING_SKELETON_COUNT} />
          </output>
        ) : !hasAnyResults && (isActive || debouncedQuery.length > 0) ? (
          <FiltersEmptyState onClearFilters={clearAll} />
        ) : !hasAnyResults ? (
          <EmptyState onRetry={handleRetry} />
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="sr-only">Ofertas</h2>
            <JobCardList
              jobs={flatJobs}
              isFetchingNextPage={jobs.isFetchingNextPage}
            />
            <LoadMoreSentinel
              onIntersect={() => {
                if (jobs.hasNextPage && !jobs.isFetchingNextPage) {
                  void jobs.fetchNextPage();
                }
              }}
              enabled={jobs.hasNextPage === true && !jobs.isFetchingNextPage}
            />
            {!jobs.hasNextPage && flatJobs.length > 0 ? (
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
    </section>
  );
}
