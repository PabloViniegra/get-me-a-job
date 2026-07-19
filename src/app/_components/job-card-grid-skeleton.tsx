"use no memo";

import { useId } from "react";
import { JobCardSkeleton } from "./job-card-skeleton";

type JobCardGridSkeletonProps = {
  count: number;
};

export function JobCardGridSkeleton({ count }: JobCardGridSkeletonProps) {
  const baseId = useId();
  return (
    <ul
      aria-busy="true"
      aria-hidden="true"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeletons are stateless placeholders; the key only needs to be unique and stable per render
        <li key={`${baseId}-${i}`}>
          <JobCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
