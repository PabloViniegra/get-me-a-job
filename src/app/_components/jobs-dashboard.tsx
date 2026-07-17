"use client";
"use no memo";

import { Button } from "@heroui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useCallback } from "react";
import { sileo } from "sileo";
import { friendlyErrorMessage } from "@/lib/error-message";
import { useTRPC } from "@/trpc/client";
import { resolveDashboardView } from "./dashboard-state";
import { DashboardStats } from "./dashboard-stats";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { JobCard } from "./job-card";
import { JobCardSkeleton } from "./job-card-skeleton";

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

  return (
    <section className="flex w-full max-w-7xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Ofertas</h1>
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

      {view === "cards" && jobs.data ? (
        <ul
          aria-busy={jobs.isFetching}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {jobs.data.map((job, index) => (
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
    </section>
  );
}
