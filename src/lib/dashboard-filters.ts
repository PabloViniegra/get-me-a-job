import Fuse from "fuse.js";
import type { JobCardData } from "./jobs.dto";
import type { ScoreTier } from "./score-tier";

export type FilterState = {
  query: string;
  formats: ReadonlyArray<Format>;
  tiers: ReadonlyArray<ScoreTier>;
};

export type Format = "Remote" | "Hybrid" | "On-site";

const ALL_FORMATS: ReadonlyArray<Format> = ["Remote", "Hybrid", "On-site"];
const ALL_TIERS: ReadonlyArray<ScoreTier> = [
  "excellent",
  "worth",
  "low",
  "pending",
];

const SEARCH_THRESHOLD = 0.3;

export function searchJobs(jobs: JobCardData[], query: string): JobCardData[] {
  const trimmed = query.trim();
  if (trimmed === "") return jobs;
  const fuse = new Fuse(jobs, {
    keys: ["title"],
    threshold: SEARCH_THRESHOLD,
    ignoreLocation: true,
    ignoreDiacritics: true,
  });
  return fuse.search(trimmed).map((r) => r.item);
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

export function filterByTiers(
  jobs: JobCardData[],
  tiers: ReadonlyArray<ScoreTier>,
): JobCardData[] {
  if (tiers.length === 0) return jobs;
  if (tiers.length === ALL_TIERS.length) return jobs;
  return jobs.filter((job) =>
    (tiers as ReadonlyArray<string>).includes(job.scoreTier),
  );
}

export function applyFilters(
  jobs: JobCardData[],
  filters: FilterState,
): JobCardData[] {
  return filterByTiers(
    filterByFormats(searchJobs(jobs, filters.query), filters.formats),
    filters.tiers,
  );
}
