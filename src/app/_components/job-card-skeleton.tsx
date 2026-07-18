"use no memo";

import { Skeleton } from "@heroui/react";

export function JobCardSkeleton() {
  return (
    <div
      className="h-full rounded-lg border border-border p-4"
      aria-hidden="true"
      role="presentation"
    >
      <div className="flex flex-row items-start justify-between gap-3">
        <Skeleton className="h-5 w-2/3 rounded-sm" />
        <Skeleton className="h-5 w-14 rounded-sm" />
      </div>
      <Skeleton className="mt-2 h-3 w-1/2 rounded-sm" />
      <div className="mt-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-full rounded-sm" />
        <Skeleton className="h-4 w-full rounded-sm" />
        <Skeleton className="h-4 w-3/4 rounded-sm" />
      </div>
      <Skeleton className="mt-2 h-4 w-32 rounded-sm" />
      <div className="mt-3 flex flex-col gap-1 pt-1">
        <Skeleton className="h-3 w-24 rounded-sm" />
        <Skeleton className="h-4 w-full rounded-sm" />
        <Skeleton className="h-4 w-5/6 rounded-sm" />
      </div>
      <div className="mt-3 flex flex-row items-center justify-between gap-3">
        <Skeleton className="h-3 w-32 rounded-sm" />
        <Skeleton className="h-3 w-16 rounded-sm" />
      </div>
    </div>
  );
}
