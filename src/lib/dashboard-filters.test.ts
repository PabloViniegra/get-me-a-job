import { describe, expect, it } from "vitest";
import {
  createJobSearcher,
  type FilterState,
  searchJobs,
} from "./dashboard-filters";
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

describe("dashboard-filters", () => {
  describe("searchJobs", () => {
    it("returns the same array reference when the query is empty (identity / short-circuit)", () => {
      const jobs = [
        makeJob({ id: "a", title: "Backend" }),
        makeJob({ id: "b", title: "Frontend" }),
      ];
      expect(searchJobs(jobs, "")).toBe(jobs);
    });

    it("treats whitespace-only queries as empty (identity)", () => {
      const jobs = [makeJob({ id: "a", title: "Backend" })];
      expect(searchJobs(jobs, "   ")).toBe(jobs);
    });

    it("matches case-insensitively on exact substring of title", () => {
      const jobs = [
        makeJob({ id: "a", title: "Senior Backend Engineer" }),
        makeJob({ id: "b", title: "Frontend Developer" }),
      ];
      const got = searchJobs(jobs, "BACKEND");
      expect(got.map((j) => j.id)).toEqual(["a"]);
    });

    it("matches a substring inside the title, not only prefixes", () => {
      const jobs = [
        makeJob({ id: "a", title: "Senior Backend Engineer" }),
        makeJob({ id: "b", title: "Frontend Developer" }),
      ];
      const got = searchJobs(jobs, "end");
      expect(got.map((j) => j.id)).toContain("a");
    });

    it("matches with a typo via fuzzy search (fuse.js, threshold 0.3)", () => {
      const jobs = [makeJob({ id: "a", title: "Senior Backend Engineer" })];
      const got = searchJobs(jobs, "engneer");
      expect(got.map((j) => j.id)).toEqual(["a"]);
    });

    it("treats accented and non-accented characters as equivalent", () => {
      const jobs = [makeJob({ id: "a", title: "Ingeniéro de Software" })];
      const got = searchJobs(jobs, "ingeniero");
      expect(got.map((j) => j.id)).toEqual(["a"]);
    });

    it("returns an empty array when nothing matches", () => {
      const jobs = [makeJob({ id: "a", title: "Backend Engineer" })];
      const got = searchJobs(jobs, "zzzzz");
      expect(got).toEqual([]);
    });

    it("does not mutate the input array", () => {
      const jobs = [
        makeJob({ id: "a", title: "Backend" }),
        makeJob({ id: "b", title: "Frontend" }),
      ];
      const beforeIds = jobs.map((j) => j.id);
      const beforeTitles = jobs.map((j) => j.title);
      searchJobs(jobs, "backend");
      expect(jobs.map((j) => j.id)).toEqual(beforeIds);
      expect(jobs.map((j) => j.title)).toEqual(beforeTitles);
    });

    it("does not include jobs whose title does not match the query", () => {
      const jobs = [
        makeJob({ id: "a", title: "Backend Engineer" }),
        makeJob({ id: "b", title: "Frontend Developer" }),
        makeJob({ id: "c", title: "Mobile Engineer" }),
      ];
      const got = searchJobs(jobs, "backend");
      expect(got.map((j) => j.id)).toEqual(["a"]);
    });
  });

  describe("createJobSearcher", () => {
    it("returns a searcher whose empty-query result preserves the input array reference", () => {
      const jobs = [makeJob({ id: "a", title: "Backend" })];
      const searcher = createJobSearcher(jobs);
      expect(searcher.search("")).toBe(jobs);
    });

    it("returns the same hit set as searchJobs for a non-empty query", () => {
      const jobs = [
        makeJob({ id: "a", title: "Backend Engineer" }),
        makeJob({ id: "b", title: "Frontend Developer" }),
      ];
      const searcher = createJobSearcher(jobs);
      expect(searcher.search("backend").map((j) => j.id)).toEqual(
        searchJobs(jobs, "backend").map((j) => j.id),
      );
    });
  });

  describe("FilterState", () => {
    it("only requires a `query` field at this stage (placeholder for tier/format in later tickets)", () => {
      const f: FilterState = { query: "backend" };
      expect(f.query).toBe("backend");
    });
  });
});
