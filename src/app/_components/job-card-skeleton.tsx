"use no memo";

import { Skeleton } from "@heroui/react";

export function JobCardSkeleton() {
  return (
    <div className="rounded-lg border border-border p-4" aria-hidden="true">
      <div className="flex flex-row items-center justify-between gap-3">
        <Skeleton className="h-6 w-2/3 rounded" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-3 flex flex-row">
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="mt-1 h-4 w-32 rounded" />
      </div>
      <div className="mt-3 flex flex-row justify-end">
        <Skeleton className="h-9 w-24 rounded" />
      </div>
    </div>
  );
}
