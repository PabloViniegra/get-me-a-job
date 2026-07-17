"use no memo";

import { Separator } from "@heroui/react";
import { deriveDashboardCounts } from "./dashboard-stats.helpers";

export { deriveDashboardCounts };
export type { DashboardStatCounts } from "./dashboard-stats.helpers";

type DashboardStatsProps = {
  jobs: ReadonlyArray<{
    scoreTier: "pending" | "excellent" | "worth" | "low";
  }>;
};

type StatCellProps = { value: string; label: string };

function StatCell({ value, label }: StatCellProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-4 first:pl-0 last:pr-0">
      <span className="font-mono text-xl leading-[1.2] font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-xs leading-[1.4] font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
    </div>
  );
}

export function DashboardStats({ jobs }: DashboardStatsProps) {
  const counts = deriveDashboardCounts({
    totalCount: jobs.length,
    excellentCount: jobs.filter((job) => job.scoreTier === "excellent").length,
    pendingCount: jobs.filter((job) => job.scoreTier === "pending").length,
  });

  return (
    <section
      aria-label="Resumen del panel"
      className="flex flex-row items-stretch rounded-md border border-border bg-surface px-2 py-3"
    >
      <StatCell value={String(counts.total)} label="Ofertas" />
      <Separator orientation="vertical" className="self-stretch" />
      <StatCell value={String(counts.excellent)} label="Excelentes" />
      <Separator orientation="vertical" className="self-stretch" />
      <StatCell value={String(counts.pending)} label="Sin analizar" />
    </section>
  );
}
