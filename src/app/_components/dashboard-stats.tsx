import type { JobsSummary } from "@/lib/jobs.list.schema";
import { TIER_LABELS } from "@/lib/score-tier";

type DashboardStatsProps = {
  summary: JobsSummary | null;
};

type StatCellProps = { value: string; label: string };

function StatCell({ value, label }: StatCellProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-4 first:pl-0 last:pr-0">
      <span className="font-mono text-xl leading-[1.2] font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-xs leading-[1.4] font-medium text-muted">
        {label}
      </span>
    </div>
  );
}

function Tick() {
  return (
    <div aria-hidden="true" className="w-px self-stretch bg-border-secondary" />
  );
}

export function DashboardStats({ summary }: DashboardStatsProps) {
  const totalCount = summary?.total;
  const excellentCount = summary?.excellent;
  const pendingCount = summary?.pending;

  return (
    <section
      aria-label="Resumen del panel"
      className="flex flex-row items-stretch rounded-md border border-border bg-surface px-2 py-3"
    >
      <StatCell
        value={totalCount === undefined ? "—" : String(totalCount)}
        label="Ofertas"
      />
      <Tick />
      <StatCell
        value={excellentCount === undefined ? "—" : String(excellentCount)}
        label={`${TIER_LABELS.excellent}s`}
      />
      <Tick />
      <StatCell
        value={pendingCount === undefined ? "—" : String(pendingCount)}
        label={TIER_LABELS.pending}
      />
    </section>
  );
}
