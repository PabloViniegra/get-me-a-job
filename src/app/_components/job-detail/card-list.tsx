"use client";

import type { JobCardData } from "@/server/jobs/dto";
import { JobCard } from "./card";

type JobViewTarget = {
  data: JobCardData;
  section: "details" | "cover-letter";
};

type JobCardListProps = {
  jobs: ReadonlyArray<JobCardData>;
  isFetchingNextPage: boolean;
  onSelectJob: (target: JobViewTarget) => void;
};

export function JobCardList({
  jobs,
  isFetchingNextPage,
  onSelectJob,
}: JobCardListProps) {
  return (
    <ul
      aria-busy={isFetchingNextPage}
      className="relative grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {jobs.map((job) => (
        <li key={job.id}>
          <JobCard data={job} onViewDetails={onSelectJob} />
        </li>
      ))}
    </ul>
  );
}
