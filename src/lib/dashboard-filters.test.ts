import { describe, expect, it } from "vitest";
import {
  applyFilters,
  type FilterState,
  filterByFormats,
  filterByTiers,
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

  describe("FilterState", () => {
    it("carries query, formats, and tiers", () => {
      const f: FilterState = {
        query: "backend",
        formats: ["Remote"],
        tiers: ["excellent"],
      };
      expect(f.query).toBe("backend");
      expect(f.formats).toEqual(["Remote"]);
      expect(f.tiers).toEqual(["excellent"]);
    });
  });

  describe("filterByFormats", () => {
    it("returns the same array reference when formats is empty (identity)", () => {
      const jobs = [
        makeJob({ id: "a", format: "Remote" }),
        makeJob({ id: "b", format: "On-site" }),
      ];
      expect(filterByFormats(jobs, [])).toBe(jobs);
    });

    it("keeps only jobs matching a single selected format", () => {
      const jobs = [
        makeJob({ id: "a", format: "Remote" }),
        makeJob({ id: "b", format: "On-site" }),
        makeJob({ id: "c", format: "Hybrid" }),
      ];
      const got = filterByFormats(jobs, ["Remote"]);
      expect(got.map((j) => j.id)).toEqual(["a"]);
    });

    it("unions jobs across multiple selected formats (OR semantics), preserving input order", () => {
      const jobs = [
        makeJob({ id: "a", format: "Remote" }),
        makeJob({ id: "b", format: "On-site" }),
        makeJob({ id: "c", format: "Hybrid" }),
        makeJob({ id: "d", format: "Remote" }),
      ];
      const got = filterByFormats(jobs, ["Remote", "Hybrid"]);
      expect(got.map((j) => j.id)).toEqual(["a", "c", "d"]);
    });

    it("returns the same array reference when all three formats are selected (identity)", () => {
      const jobs = [
        makeJob({ id: "a", format: "Remote" }),
        makeJob({ id: "b", format: "On-site" }),
        makeJob({ id: "c", format: "Hybrid" }),
      ];
      expect(filterByFormats(jobs, ["Remote", "Hybrid", "On-site"])).toBe(jobs);
    });
  });

  describe("filterByTiers", () => {
    it("returns the same array reference when tiers is empty (identity)", () => {
      const jobs = [
        makeJob({ id: "a", scoreTier: "excellent" }),
        makeJob({ id: "b", scoreTier: "low" }),
      ];
      expect(filterByTiers(jobs, [])).toBe(jobs);
    });

    it("keeps only jobs matching a single selected tier", () => {
      const jobs = [
        makeJob({ id: "a", scoreTier: "excellent" }),
        makeJob({ id: "b", scoreTier: "low" }),
        makeJob({ id: "c", scoreTier: "worth" }),
      ];
      const got = filterByTiers(jobs, ["excellent"]);
      expect(got.map((j) => j.id)).toEqual(["a"]);
    });

    it("unions jobs across multiple selected tiers (OR semantics), preserving input order", () => {
      const jobs = [
        makeJob({ id: "a", scoreTier: "excellent" }),
        makeJob({ id: "b", scoreTier: "low" }),
        makeJob({ id: "c", scoreTier: "worth" }),
        makeJob({ id: "d", scoreTier: "pending" }),
        makeJob({ id: "e", scoreTier: "excellent" }),
      ];
      const got = filterByTiers(jobs, ["excellent", "pending"]);
      expect(got.map((j) => j.id)).toEqual(["a", "d", "e"]);
    });

    it("returns the same array reference when all four tiers are selected (identity)", () => {
      const jobs = [
        makeJob({ id: "a", scoreTier: "excellent" }),
        makeJob({ id: "b", scoreTier: "low" }),
        makeJob({ id: "c", scoreTier: "worth" }),
        makeJob({ id: "d", scoreTier: "pending" }),
      ];
      expect(
        filterByTiers(jobs, ["excellent", "worth", "low", "pending"]),
      ).toBe(jobs);
    });
  });

  describe("applyFilters", () => {
    const emptyFilters: FilterState = { query: "", formats: [], tiers: [] };

    it("returns the same array reference when all facets are empty (identity)", () => {
      const jobs = [makeJob({ id: "a" })];
      expect(applyFilters(jobs, emptyFilters)).toBe(jobs);
    });

    it("returns the same array reference when query is whitespace-only", () => {
      const jobs = [makeJob({ id: "a" })];
      expect(applyFilters(jobs, { ...emptyFilters, query: "   " })).toBe(jobs);
    });

    it("filters by query alone, keeping only jobs whose title matches", () => {
      const jobs = [
        makeJob({ id: "a", title: "Backend Engineer" }),
        makeJob({ id: "b", title: "Frontend Developer" }),
      ];
      expect(
        applyFilters(jobs, { ...emptyFilters, query: "backend" }).map(
          (j) => j.id,
        ),
      ).toEqual(["a"]);
    });

    it("filters by formats alone, unioning jobs across multiple selected formats (OR within facet)", () => {
      const jobs = [
        makeJob({ id: "a", format: "Remote" }),
        makeJob({ id: "b", format: "On-site" }),
        makeJob({ id: "c", format: "Hybrid" }),
      ];
      expect(
        applyFilters(jobs, {
          ...emptyFilters,
          formats: ["Remote", "Hybrid"],
        }).map((j) => j.id),
      ).toEqual(["a", "c"]);
    });

    it("filters by tiers alone, unioning jobs across multiple selected tiers (OR within facet)", () => {
      const jobs = [
        makeJob({ id: "a", scoreTier: "excellent" }),
        makeJob({ id: "b", scoreTier: "low" }),
        makeJob({ id: "c", scoreTier: "worth" }),
      ];
      expect(
        applyFilters(jobs, {
          ...emptyFilters,
          tiers: ["excellent", "worth"],
        }).map((j) => j.id),
      ).toEqual(["a", "c"]);
    });

    it("composes all three facets with AND semantics (intersection across facets)", () => {
      const jobs = [
        makeJob({
          id: "a",
          title: "Backend Engineer",
          format: "Remote",
          scoreTier: "excellent",
        }),
        makeJob({
          id: "b",
          title: "Backend Engineer",
          format: "On-site",
          scoreTier: "excellent",
        }),
        makeJob({
          id: "c",
          title: "Backend Engineer",
          format: "Remote",
          scoreTier: "low",
        }),
        makeJob({
          id: "d",
          title: "Frontend Developer",
          format: "Remote",
          scoreTier: "excellent",
        }),
      ];
      expect(
        applyFilters(jobs, {
          query: "backend",
          formats: ["Remote"],
          tiers: ["excellent"],
        }).map((j) => j.id),
      ).toEqual(["a"]);
    });

    it("returns an empty array when no job matches all active facets", () => {
      const jobs = [
        makeJob({
          id: "a",
          title: "Frontend",
          format: "On-site",
          scoreTier: "low",
        }),
      ];
      expect(
        applyFilters(jobs, {
          query: "backend",
          formats: ["Remote"],
          tiers: ["excellent"],
        }),
      ).toEqual([]);
    });

    it("preserves the input order of matching jobs", () => {
      const jobs = [
        makeJob({ id: "c", format: "Remote" }),
        makeJob({ id: "a", format: "Remote" }),
        makeJob({ id: "b", format: "Remote" }),
      ];
      expect(
        applyFilters(jobs, { ...emptyFilters, formats: ["Remote"] }).map(
          (j) => j.id,
        ),
      ).toEqual(["c", "a", "b"]);
    });

    it("does not mutate the input array", () => {
      const jobs = [
        makeJob({
          id: "a",
          title: "Backend",
          format: "Remote",
          scoreTier: "excellent",
        }),
        makeJob({
          id: "b",
          title: "Frontend",
          format: "On-site",
          scoreTier: "low",
        }),
      ];
      const beforeIds = jobs.map((j) => j.id);
      const beforeTitles = jobs.map((j) => j.title);
      const beforeFormats = jobs.map((j) => j.format);
      const beforeTiers = jobs.map((j) => j.scoreTier);
      applyFilters(jobs, {
        query: "anything",
        formats: ["Remote"],
        tiers: ["excellent"],
      });
      expect(jobs.map((j) => j.id)).toEqual(beforeIds);
      expect(jobs.map((j) => j.title)).toEqual(beforeTitles);
      expect(jobs.map((j) => j.format)).toEqual(beforeFormats);
      expect(jobs.map((j) => j.scoreTier)).toEqual(beforeTiers);
    });
  });
});
