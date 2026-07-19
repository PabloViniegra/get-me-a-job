"use no memo";

import { Skeleton } from "@heroui/react/skeleton";

const VALUE_HEIGHT = "h-7";
const LABEL_HEIGHT = "h-4";

function StatCellSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-4 first:pl-0 last:pr-0">
      <Skeleton
        aria-hidden="true"
        className={`${VALUE_HEIGHT} w-10 rounded-sm`}
      />
      <Skeleton
        aria-hidden="true"
        className={`${LABEL_HEIGHT} w-20 rounded-sm`}
      />
    </div>
  );
}

function Tick() {
  return (
    <div aria-hidden="true" className="w-px self-stretch bg-border-secondary" />
  );
}

export function DashboardStatsSkeleton() {
  return (
    <section
      aria-label="Resumen del panel"
      aria-hidden="true"
      className="flex flex-row items-stretch rounded-md border border-border bg-surface px-2 py-3"
    >
      <StatCellSkeleton />
      <Tick />
      <StatCellSkeleton />
      <Tick />
      <StatCellSkeleton />
    </section>
  );
}
