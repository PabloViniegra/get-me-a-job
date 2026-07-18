"use client";
"use no memo";

import { Button } from "@heroui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useCallback, useMemo } from "react";
import { sileo } from "sileo";
import { applyFilters } from "@/lib/dashboard-filters";
import { friendlyErrorMessage } from "@/lib/error-message";
import { relativeJobTime } from "@/lib/relative-time";
import { useTRPC } from "@/trpc/client";
import { resolveDashboardView } from "./dashboard-state";
import { DashboardStats } from "./dashboard-stats";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { FiltersEmptyState } from "./filters-empty-state";
import { JobCard } from "./job-card";
import { JobCardSkeleton } from "./job-card-skeleton";
import { JobsFilterBar } from "./jobs-filter-bar";
import { useDashboardFilters } from "./use-dashboard-filters";

const SKELETON_COUNT = 4;
const SKELETON_KEYS = Array.from(
  { length: SKELETON_COUNT },
  (_, i) => `skeleton-${i}`,
);
const STAGGER_STEP_MS = 60;
const STAGGER_INDEX_CAP = 6;

export function JobsDashboard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const jobs = useQuery(trpc.jobs.list.queryOptions());
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

  const handleRetry = useCallback(() => {
    void queryClient.invalidateQueries(trpc.jobs.list.queryFilter());
  }, [queryClient, trpc]);

  const handleRefresh = useCallback(() => {
    void sileo.promise(
      queryClient.refetchQueries(trpc.jobs.list.queryFilter()),
      {
        loading: { title: "Actualizando ofertas…" },
        success: { title: "Ofertas actualizadas" },
        error: { title: "No se pudo actualizar" },
      },
    );
  }, [queryClient, trpc]);

  const view = resolveDashboardView({
    isPending: jobs.isPending,
    isError: jobs.isError,
    dataLength: jobs.data?.length ?? 0,
  });

  const filteredJobs = useMemo(
    () => (jobs.data ? applyFilters(jobs.data, { query, formats, tiers }) : []),
    [jobs.data, query, formats, tiers],
  );

  const newestCreatedAt = useMemo(
    () =>
      jobs.data?.reduce<Date | null>(
        (acc, job) =>
          acc === null || job.createdAt.getTime() > acc.getTime()
            ? job.createdAt
            : acc,
        null,
      ),
    [jobs.data],
  );

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
          {jobs.data ? (
            <p className="font-mono text-xs uppercase tracking-wider text-muted">
              dashboard · {jobs.data.length}{" "}
              {jobs.data.length === 1 ? "oferta" : "ofertas"}
              {newestCreatedAt
                ? ` · más reciente ${relativeJobTime(newestCreatedAt)}`
                : ""}
            </p>
          ) : null}
        </div>
        <Button
          aria-label="Actualizar ofertas"
          variant="secondary"
          onPress={handleRefresh}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Actualizar
        </Button>
      </header>

      {jobs.data ? <DashboardStats jobs={jobs.data} /> : null}

      {view === "cards" && jobs.data ? (
        <JobsFilterBar
          value={query}
          onChange={setQuery}
          resultCount={filteredJobs.length}
          formats={formats}
          onToggleFormat={toggleFormat}
          tiers={tiers}
          onToggleTier={toggleTier}
          activeFacetCount={activeFacetCount}
          onClearAll={clearAll}
        />
      ) : null}

      {isActive && jobs.data ? (
        <p aria-live="polite" className="text-sm text-muted">
          Mostrando {filteredJobs.length} de {jobs.data.length} ofertas
        </p>
      ) : null}

      {view === "loading" ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SKELETON_KEYS.map((key) => (
            <li key={key}>
              <JobCardSkeleton />
            </li>
          ))}
        </ul>
      ) : null}

      {view === "error" ? (
        <ErrorState
          errorMessage={friendlyErrorMessage(jobs.error?.message ?? "")}
          onRetry={handleRetry}
        />
      ) : null}

      {view === "empty" ? <EmptyState onRetry={handleRetry} /> : null}

      {view === "cards" && filteredJobs.length > 0 ? (
        <ul
          aria-busy={jobs.isFetching}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {filteredJobs.map((job, index) => (
            <li
              key={job.id}
              className="motion-safe:animate-job-enter"
              style={{
                animationDelay: `${Math.min(index, STAGGER_INDEX_CAP) * STAGGER_STEP_MS}ms`,
              }}
            >
              <JobCard data={job} />
            </li>
          ))}
        </ul>
      ) : null}

      {view === "cards" && jobs.data && filteredJobs.length === 0 ? (
        <FiltersEmptyState onClearFilters={clearAll} />
      ) : null}
    </section>
  );
}
