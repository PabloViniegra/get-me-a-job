"use client";

import { AnimatePresence, LazyMotion, MotionConfig } from "motion/react";
import * as m from "motion/react-m";
import type { JobCardData } from "@/lib/jobs.dto";
import { JobCard } from "./job-card";

const ENTER_STAGGER_STEP_SECONDS = 0.04;
const ENTER_STAGGER_INDEX_CAP = 6;
const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] satisfies [
  number,
  number,
  number,
  number,
];

const loadMotionFeatures = () =>
  import("./job-list-motion-features").then(
    ({ default: features }) => features,
  );

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
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures}>
        <ul
          aria-busy={isFetchingNextPage}
          className="relative grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {jobs.map((job, index) => (
              <m.li
                key={job.id}
                layout="position"
                layoutDependency={jobs}
                initial={{ opacity: 0, scale: 0.985, y: 8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  transition: {
                    delay:
                      Math.min(index, ENTER_STAGGER_INDEX_CAP) *
                      ENTER_STAGGER_STEP_SECONDS,
                    duration: 0.24,
                    ease: EASE_OUT_QUINT,
                  },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.985,
                  y: -6,
                  transition: { duration: 0.16, ease: EASE_OUT_QUINT },
                }}
                transition={{
                  layout: { duration: 0.32, ease: EASE_OUT_QUINT },
                }}
              >
                <JobCard data={job} onViewDetails={onSelectJob} />
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      </LazyMotion>
    </MotionConfig>
  );
}
