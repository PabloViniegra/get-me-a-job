"use client";

import { useState } from "react";
import type { JobCardData } from "@/lib/jobs.dto";
import { JobCardList } from "./job-card-list";
import { JobDetailModal } from "./job-detail-modal";

type JobViewTarget = {
  data: JobCardData;
  section: "details" | "cover-letter";
};

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
  const [initialSection, setInitialSection] = useState<
    "details" | "cover-letter"
  >("details");

  const handleSelectJob = (target: JobViewTarget) => {
    setSelectedJob(target.data);
    setInitialSection(target.section);
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
        initialSection={initialSection}
      />
    </>
  );
}
