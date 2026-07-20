"use client";
"use no memo";

import { useState } from "react";
import type { JobCardData } from "@/lib/jobs.dto";
import { JobCardList } from "./job-card-list";
import { JobDetailModal } from "./job-detail-modal";

type JobDetailsContainerProps = {
  jobs: ReadonlyArray<JobCardData>;
  isFetchingNextPage: boolean;
};

export function JobDetailsContainer({
  jobs,
  isFetchingNextPage,
}: JobDetailsContainerProps) {
  const [selectedJob, setSelectedJob] = useState<JobCardData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectJob = (job: JobCardData) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  return (
    <>
      <JobCardList
        jobs={jobs}
        isFetchingNextPage={isFetchingNextPage}
        onSelectJob={handleSelectJob}
      />
      <JobDetailModal
        data={selectedJob}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}
