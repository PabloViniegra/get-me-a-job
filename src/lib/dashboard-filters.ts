import Fuse from "fuse.js";
import type { JobCardData } from "./jobs.dto";

export type FilterState = {
  query: string;
  formats: ReadonlyArray<Format>;
};

export type Format = "Remote" | "Hybrid" | "On-site";

const ALL_FORMATS: ReadonlyArray<Format> = ["Remote", "Hybrid", "On-site"];

const SEARCH_THRESHOLD = 0.3;

type JobSearcher = {
  search(query: string): JobCardData[];
};

export function createJobSearcher(jobs: JobCardData[]): JobSearcher {
  const fuse = new Fuse(jobs, {
    keys: ["title"],
    threshold: SEARCH_THRESHOLD,
    ignoreLocation: true,
    ignoreDiacritics: true,
  });
  return {
    search(query: string): JobCardData[] {
      const trimmed = query.trim();
      if (trimmed === "") return jobs;
      return fuse.search(trimmed).map((r) => r.item);
    },
  };
}

export function searchJobs(jobs: JobCardData[], query: string): JobCardData[] {
  return createJobSearcher(jobs).search(query);
}

export function filterByFormats(
  jobs: JobCardData[],
  formats: ReadonlyArray<Format>,
): JobCardData[] {
  if (formats.length === 0) return jobs;
  if (formats.length === ALL_FORMATS.length) return jobs;
  return jobs.filter((job) =>
    (formats as ReadonlyArray<string>).includes(job.format),
  );
}
