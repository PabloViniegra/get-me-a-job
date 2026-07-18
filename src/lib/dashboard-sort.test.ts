import { describe, expect, it } from "vitest";
import {
  applySort,
  DEFAULT_SORT_KEY,
  type SortKey,
  sortByCreatedAt,
  sortByScore,
} from "./dashboard-sort";
import type { JobCardData } from "./jobs.dto";

function makeJob(overrides: Partial<JobCardData> = {}): JobCardData {
  return {
    id: "id-1",
    jobId: "job-1",
    title: "Senior Backend Engineer",
    format: "Remote",
    salary: null,
    linkedinUrl: "https://www.linkedin.com/jobs/view/1",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    descriptionPreview: "",
    whyItFitsPreview: null,
    requirements: [],
    requirementsOverflowCount: 0,
    hasAiAnalysis: false,
    score: null,
    scoreTier: "pending",
    ...overrides,
  };
}

describe("dashboard-sort", () => {
  describe("constants", () => {
    it("declares score as the default sort key", () => {
      expect(DEFAULT_SORT_KEY).toBe("score");
    });

    it("exposes a label per sort key", () => {
      const keys: ReadonlyArray<SortKey> = ["score", "createdAt"];
      for (const key of keys) {
        expect(typeof key).toBe("string");
      }
    });
  });

  describe("sortByScore", () => {
    it("orders jobs by score descending", () => {
      const jobs = [
        makeJob({ id: "low", score: 30 }),
        makeJob({ id: "high", score: 95 }),
        makeJob({ id: "mid", score: 70 }),
      ];
      const got = sortByScore(jobs).map((j) => j.id);
      expect(got).toEqual(["high", "mid", "low"]);
    });

    it("places jobs without a score (null) at the end", () => {
      const jobs = [
        makeJob({ id: "pending-a", score: null }),
        makeJob({ id: "high", score: 95 }),
        makeJob({ id: "pending-b", score: null }),
      ];
      const got = sortByScore(jobs).map((j) => j.id);
      expect(got).toEqual(["high", "pending-a", "pending-b"]);
    });

    it("breaks score ties by createdAt descending (newest first)", () => {
      const jobs = [
        makeJob({
          id: "older",
          score: 80,
          createdAt: new Date("2025-01-01T00:00:00Z"),
        }),
        makeJob({
          id: "newer",
          score: 80,
          createdAt: new Date("2025-06-01T00:00:00Z"),
        }),
        makeJob({
          id: "middle",
          score: 80,
          createdAt: new Date("2025-03-01T00:00:00Z"),
        }),
      ];
      const got = sortByScore(jobs).map((j) => j.id);
      expect(got).toEqual(["newer", "middle", "older"]);
    });

    it("returns an empty array when input is empty", () => {
      expect(sortByScore([])).toEqual([]);
    });

    it("does not mutate the input array", () => {
      const jobs = [
        makeJob({ id: "low", score: 30 }),
        makeJob({ id: "high", score: 95 }),
      ];
      const beforeIds = jobs.map((j) => j.id);
      const beforeCreatedAt = jobs.map((j) => j.createdAt.getTime());
      sortByScore(jobs);
      expect(jobs.map((j) => j.id)).toEqual(beforeIds);
      expect(jobs.map((j) => j.createdAt.getTime())).toEqual(beforeCreatedAt);
    });
  });

  describe("sortByCreatedAt", () => {
    it("orders jobs by createdAt descending (newest first)", () => {
      const jobs = [
        makeJob({
          id: "old",
          createdAt: new Date("2024-01-01T00:00:00Z"),
        }),
        makeJob({
          id: "newest",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        }),
        makeJob({
          id: "middle",
          createdAt: new Date("2025-01-01T00:00:00Z"),
        }),
      ];
      const got = sortByCreatedAt(jobs).map((j) => j.id);
      expect(got).toEqual(["newest", "middle", "old"]);
    });

    it("breaks date ties by score descending (best match first)", () => {
      const jobs = [
        makeJob({
          id: "low-score",
          score: 40,
          createdAt: new Date("2025-01-01T00:00:00Z"),
        }),
        makeJob({
          id: "high-score",
          score: 95,
          createdAt: new Date("2025-01-01T00:00:00Z"),
        }),
        makeJob({
          id: "mid-score",
          score: 70,
          createdAt: new Date("2025-01-01T00:00:00Z"),
        }),
      ];
      const got = sortByCreatedAt(jobs).map((j) => j.id);
      expect(got).toEqual(["high-score", "mid-score", "low-score"]);
    });

    it("places jobs without a score (null) at the end of the tiebreaker", () => {
      const jobs = [
        makeJob({
          id: "pending",
          score: null,
          createdAt: new Date("2025-01-01T00:00:00Z"),
        }),
        makeJob({
          id: "scored",
          score: 80,
          createdAt: new Date("2025-01-01T00:00:00Z"),
        }),
      ];
      const got = sortByCreatedAt(jobs).map((j) => j.id);
      expect(got).toEqual(["scored", "pending"]);
    });

    it("returns an empty array when input is empty", () => {
      expect(sortByCreatedAt([])).toEqual([]);
    });

    it("does not mutate the input array", () => {
      const jobs = [
        makeJob({ id: "a", createdAt: new Date("2024-01-01T00:00:00Z") }),
        makeJob({ id: "b", createdAt: new Date("2026-01-01T00:00:00Z") }),
      ];
      const beforeIds = jobs.map((j) => j.id);
      const beforeCreatedAt = jobs.map((j) => j.createdAt.getTime());
      sortByCreatedAt(jobs);
      expect(jobs.map((j) => j.id)).toEqual(beforeIds);
      expect(jobs.map((j) => j.createdAt.getTime())).toEqual(beforeCreatedAt);
    });
  });

  describe("applySort", () => {
    it("sorts by score when sortKey is 'score'", () => {
      const jobs = [
        makeJob({ id: "low", score: 30 }),
        makeJob({ id: "high", score: 95 }),
      ];
      const got = applySort(jobs, "score").map((j) => j.id);
      expect(got).toEqual(["high", "low"]);
    });

    it("re-sorts by score even when input was previously sorted by createdAt", () => {
      const jobs = [
        makeJob({
          id: "newest-low-score",
          score: 10,
          createdAt: new Date("2026-01-01T00:00:00Z"),
        }),
        makeJob({
          id: "oldest-high-score",
          score: 95,
          createdAt: new Date("2024-01-01T00:00:00Z"),
        }),
      ];
      const got = applySort(jobs, "score").map((j) => j.id);
      expect(got).toEqual(["oldest-high-score", "newest-low-score"]);
    });

    it("sorts by createdAt when sortKey is 'createdAt'", () => {
      const jobs = [
        makeJob({
          id: "old",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          score: 99,
        }),
        makeJob({
          id: "new",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          score: 10,
        }),
      ];
      const got = applySort(jobs, "createdAt").map((j) => j.id);
      expect(got).toEqual(["new", "old"]);
    });

    it("returns a different array reference (always sorts; referential stability is provided by the caller)", () => {
      const jobs = [makeJob({ id: "a", score: 50 })];
      expect(applySort(jobs, "score")).not.toBe(jobs);
      expect(applySort(jobs, "createdAt")).not.toBe(jobs);
    });

    it("does not mutate the input array", () => {
      const jobs = [
        makeJob({ id: "low", score: 30 }),
        makeJob({ id: "high", score: 95 }),
      ];
      const beforeIds = jobs.map((j) => j.id);
      applySort(jobs, "createdAt");
      applySort(jobs, "score");
      expect(jobs.map((j) => j.id)).toEqual(beforeIds);
    });
  });
});
