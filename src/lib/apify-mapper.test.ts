import { describe, expect, it } from "vitest";
import { mapApifyItemToJobOffer } from "./apify-mapper";

describe("mapApifyItemToJobOffer", () => {
  it("maps a full happy-path item", () => {
    const result = mapApifyItemToJobOffer({
      id: "3692563200",
      link: "https://www.linkedin.com/jobs/view/english-data-labeling-analyst-at-facebook-3692563200",
      title: "English Data Labeling Analyst",
      descriptionText: "APPROVED REMOTE LOCATIONS: Los Angeles, CA",
      salaryInfo: ["$17.00", "$19.00"],
    });

    expect(result).toEqual({
      jobId: "3692563200",
      title: "English Data Labeling Analyst",
      linkedinUrl:
        "https://www.linkedin.com/jobs/view/english-data-labeling-analyst-at-facebook-3692563200",
      description: "APPROVED REMOTE LOCATIONS: Los Angeles, CA",
      salary: "$17.00, $19.00",
      format: "Remote",
      requirements: [],
    });
  });

  it("maps an empty salaryInfo array to a null salary", () => {
    const result = mapApifyItemToJobOffer({
      id: "1",
      link: "https://example.com/1",
      title: "Some Job",
      descriptionText: "On-site role in Madrid",
      salaryInfo: [],
    });

    expect(result.salary).toBeNull();
  });

  it("maps a missing salaryInfo field to a null salary", () => {
    const result = mapApifyItemToJobOffer({
      id: "2",
      link: "https://example.com/2",
      title: "Some Job",
      descriptionText: "On-site role in Madrid",
    });

    expect(result.salary).toBeNull();
  });

  it("maps a description mentioning hybrid to Hybrid format", () => {
    const result = mapApifyItemToJobOffer({
      id: "3",
      link: "https://example.com/3",
      title: "Some Job",
      descriptionText: "This is a hybrid role based in Madrid",
    });

    expect(result.format).toBe("Hybrid");
  });

  it("maps a description with neither keyword to On-site format", () => {
    const result = mapApifyItemToJobOffer({
      id: "4",
      link: "https://example.com/4",
      title: "Some Job",
      descriptionText: "Join our office in Madrid full time",
    });

    expect(result.format).toBe("On-site");
  });

  it("maps missing descriptionText to On-site format without throwing", () => {
    const result = mapApifyItemToJobOffer({
      id: "5",
      link: "https://example.com/5",
      title: "Some Job",
    });

    expect(result.format).toBe("On-site");
    expect(result.description).toBe("");
  });

  it("maps an empty descriptionText to On-site format", () => {
    const result = mapApifyItemToJobOffer({
      id: "7",
      link: "https://example.com/7",
      title: "Some Job",
      descriptionText: "",
    });

    expect(result.format).toBe("On-site");
    expect(result.description).toBe("");
  });

  it("known ceiling: negated remote phrasing still maps to Remote format", () => {
    const result = mapApifyItemToJobOffer({
      id: "6",
      link: "https://example.com/6",
      title: "Some Job",
      descriptionText: "This is NOT a remote position",
    });

    expect(result.format).toBe("Remote");
  });
});
