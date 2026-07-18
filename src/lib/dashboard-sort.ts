import type { JobCardData } from "./jobs.dto";

export type SortKey = "score" | "createdAt";

export const SORT_KEYS: ReadonlyArray<SortKey> = ["score", "createdAt"];

export const SORT_LABELS: Record<SortKey, string> = {
  score: "Coincidencia",
  createdAt: "Fecha",
};

export const DEFAULT_SORT_KEY: SortKey = "score";

function byScoreDesc(left: JobCardData, right: JobCardData): number {
  const scoreDelta = (right.score ?? -1) - (left.score ?? -1);
  if (scoreDelta !== 0) return scoreDelta;
  return right.createdAt.getTime() - left.createdAt.getTime();
}

function byCreatedAtDesc(left: JobCardData, right: JobCardData): number {
  const dateDelta = right.createdAt.getTime() - left.createdAt.getTime();
  if (dateDelta !== 0) return dateDelta;
  return (right.score ?? -1) - (left.score ?? -1);
}

function sortJobs(
  jobs: JobCardData[],
  comparator: (left: JobCardData, right: JobCardData) => number,
): JobCardData[] {
  return jobs.slice().sort(comparator);
}

export function sortByScore(jobs: JobCardData[]): JobCardData[] {
  return sortJobs(jobs, byScoreDesc);
}

export function sortByCreatedAt(jobs: JobCardData[]): JobCardData[] {
  return sortJobs(jobs, byCreatedAtDesc);
}

export function applySort(
  jobs: JobCardData[],
  sortKey: SortKey,
): JobCardData[] {
  if (sortKey === "score") return sortByScore(jobs);
  return sortByCreatedAt(jobs);
}
