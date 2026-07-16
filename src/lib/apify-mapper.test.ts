import { describe, expect, it } from "vitest";
import { mapApifyItemToJobOffer } from "./apify-mapper";

describe("mapApifyItemToJobOffer", () => {
  it("maps a full happy-path item (cheap_scraper shape)", () => {
    const result = mapApifyItemToJobOffer({
      jobId: "4354494117",
      jobTitle: "Full-Stack Software Engineer, Inference",
      jobUrl:
        "https://ca.linkedin.com/jobs/view/full-stack-software-engineer-inference-at-cohere-4354494117",
      jobDescription:
        "Cohere is looking for a Full-Stack Engineer. This is a hybrid role in Toronto.",
      salaryInfo: ["$69100.00", "$129200.00"],
      location: "Toronto, Ontario, Canada",
    });

    expect(result).toEqual({
      jobId: "4354494117",
      title: "Full-Stack Software Engineer, Inference",
      linkedinUrl:
        "https://ca.linkedin.com/jobs/view/full-stack-software-engineer-inference-at-cohere-4354494117",
      description:
        "Cohere is looking for a Full-Stack Engineer. This is a hybrid role in Toronto.",
      salary: "$69100.00, $129200.00",
      format: "Hybrid",
      requirements: [],
      descriptionHash: expect.any(String),
    });
  });

  it("maps an empty salaryInfo array to a null salary", () => {
    const result = mapApifyItemToJobOffer({
      jobId: "1",
      jobUrl: "https://example.com/1",
      jobTitle: "Some Job",
      jobDescription: "On-site role in Madrid",
      salaryInfo: [],
    });

    expect(result.salary).toBeNull();
  });

  it("maps a missing salaryInfo field to a null salary", () => {
    const result = mapApifyItemToJobOffer({
      jobId: "2",
      jobUrl: "https://example.com/2",
      jobTitle: "Some Job",
      jobDescription: "On-site role in Madrid",
    });

    expect(result.salary).toBeNull();
  });

  it("maps a description mentioning remote to Remote format", () => {
    const result = mapApifyItemToJobOffer({
      jobId: "3",
      jobUrl: "https://example.com/3",
      jobTitle: "Some Job",
      jobDescription: "This is a remote role based in Madrid",
    });

    expect(result.format).toBe("Remote");
  });

  it("maps a description mentioning hybrid to Hybrid format", () => {
    const result = mapApifyItemToJobOffer({
      jobId: "4",
      jobUrl: "https://example.com/4",
      jobTitle: "Some Job",
      jobDescription: "Hybrid role in Madrid",
    });

    expect(result.format).toBe("Hybrid");
  });

  it("maps a description with neither keyword to On-site format", () => {
    const result = mapApifyItemToJobOffer({
      jobId: "5",
      jobUrl: "https://example.com/5",
      jobTitle: "Some Job",
      jobDescription: "Join our office in Madrid full time",
    });

    expect(result.format).toBe("On-site");
  });

  it("maps missing jobDescription to On-site format without throwing", () => {
    const result = mapApifyItemToJobOffer({
      jobId: "6",
      jobUrl: "https://example.com/6",
      jobTitle: "Some Job",
    });

    expect(result.format).toBe("On-site");
    expect(result.description).toBe("");
  });

  it("maps an empty jobDescription to On-site format", () => {
    const result = mapApifyItemToJobOffer({
      jobId: "7",
      jobUrl: "https://example.com/7",
      jobTitle: "Some Job",
      jobDescription: "",
    });

    expect(result.format).toBe("On-site");
    expect(result.description).toBe("");
  });

  it("known ceiling: negated remote phrasing still maps to Remote format", () => {
    const result = mapApifyItemToJobOffer({
      jobId: "8",
      jobUrl: "https://example.com/8",
      jobTitle: "Some Job",
      jobDescription: "This is NOT a remote position",
    });

    expect(result.format).toBe("Remote");
  });

  it("falls back to location for format when description is silent", () => {
    const result = mapApifyItemToJobOffer({
      jobId: "9",
      jobUrl: "https://example.com/9",
      jobTitle: "Some Job",
      jobDescription: "Some generic JD without location keyword.",
      location: "Remote, Spain",
    });

    expect(result.format).toBe("Remote");
  });

  describe("descriptionHash", () => {
    const baseItem = {
      jobId: "10",
      jobUrl: "https://example.com/10",
      jobTitle: "Some Job",
    };

    it("is deterministic: same description yields the same hash", () => {
      const jobDescription = "Senior Software Engineer role in Madrid";

      const first = mapApifyItemToJobOffer({ ...baseItem, jobDescription });
      const second = mapApifyItemToJobOffer({ ...baseItem, jobDescription });

      expect(first.descriptionHash).toBe(second.descriptionHash);
      expect(first.descriptionHash).toBeTruthy();
    });

    it("changes when the description changes", () => {
      const first = mapApifyItemToJobOffer({
        ...baseItem,
        jobDescription: "Senior Software Engineer role in Madrid",
      });
      const second = mapApifyItemToJobOffer({
        ...baseItem,
        jobDescription: "Junior Backend Developer role in Madrid",
      });

      expect(first.descriptionHash).not.toBe(second.descriptionHash);
    });

    it("is stable for an empty description", () => {
      const first = mapApifyItemToJobOffer({ ...baseItem, jobDescription: "" });
      const second = mapApifyItemToJobOffer({
        ...baseItem,
        jobDescription: "",
      });

      expect(first.descriptionHash).toBe(second.descriptionHash);
      expect(first.descriptionHash).toBeTruthy();
    });

    it("matches the hash of a missing jobDescription (treated as empty)", () => {
      const missing = mapApifyItemToJobOffer({ ...baseItem });
      const empty = mapApifyItemToJobOffer({ ...baseItem, jobDescription: "" });

      expect(missing.descriptionHash).toBe(empty.descriptionHash);
    });
  });
});
