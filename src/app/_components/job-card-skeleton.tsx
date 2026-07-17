"use no memo";

import { Skeleton } from "@heroui/react";

export function JobCardSkeleton() {
  return (
    <div
      className="rounded-lg border border-border p-4"
      aria-hidden="true"
      role="presentation"
    >
      <div className="flex flex-row items-center justify-between gap-3">
        <Skeleton className="h-6 w-2/3 rounded" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-2 flex flex-row gap-1.5">
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
      <div className="mt-2">
        <Skeleton className="h-4 w-32 rounded" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <div className="mt-3 flex flex-col gap-1 border-l-2 border-border-secondary pl-3">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
      </div>
      <div className="mt-3 flex flex-row items-center justify-between gap-3">
        <Skeleton className="h-3 w-32 rounded" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded" />
          <Skeleton className="h-9 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}
