import { describe, expect, it } from "vitest";
import { type JobOfferRow, toJobCardData } from "./jobs.dto";

function makeRow(overrides: Partial<JobOfferRow> = {}): JobOfferRow {
  return {
    id: "mongo-id-1",
    jobId: "3692563200",
    title: "Senior TypeScript Engineer",
    linkedinUrl: "https://linkedin.com/jobs/view/3692563200",
    description: "Build cool things with TypeScript.",
    salary: "EUR 60k-80k",
    format: "Remote",
    requirements: ["TypeScript", "React"],
    descriptionHash: null,
    aiAnalysis: { score: 87, whyItFits: "Strong match." },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    ...overrides,
  };
}

describe("toJobCardData — tier rule", () => {
  it("maps a fully-populated scored row to all spec'd fields", () => {
    const createdAt = new Date("2026-03-04T05:06:07Z");
    const result = toJobCardData(
      makeRow({
        linkedinUrl: "https://linkedin.com/jobs/view/flow-through",
        format: "Hybrid",
        createdAt,
      }),
    );

    expect(result).toMatchObject({
      id: "mongo-id-1",
      jobId: "3692563200",
      title: "Senior TypeScript Engineer",
      format: "Hybrid",
      salary: "EUR 60k-80k",
      linkedinUrl: "https://linkedin.com/jobs/view/flow-through",
      createdAt,
      descriptionPreview: "Build cool things with TypeScript.",
      whyItFitsPreview: "Strong match.",
      requirements: ["TypeScript", "React"],
      requirementsOverflowCount: 0,
      hasAiAnalysis: true,
      score: 87,
      scoreTier: "excellent",
    });
  });

  it("maps a row with aiAnalysis=null to pending tier with null previews", () => {
    const result = toJobCardData(makeRow({ aiAnalysis: null }));

    expect(result.hasAiAnalysis).toBe(false);
    expect(result.score).toBeNull();
    expect(result.scoreTier).toBe("pending");
    expect(result.whyItFitsPreview).toBeNull();
  });

  it("maps score=85 to 'excellent' (boundary inclusive)", () => {
    const result = toJobCardData(
      makeRow({ aiAnalysis: { score: 85, whyItFits: "ok" } }),
    );

    expect(result.scoreTier).toBe("excellent");
    expect(result.score).toBe(85);
  });

  it("maps score=84 to 'worth' (still above the worth threshold)", () => {
    const result = toJobCardData(
      makeRow({ aiAnalysis: { score: 84, whyItFits: "ok" } }),
    );

    expect(result.scoreTier).toBe("worth");
  });

  it("maps score=64 to 'low' (just below the worth threshold)", () => {
    const result = toJobCardData(
      makeRow({ aiAnalysis: { score: 64, whyItFits: "ok" } }),
    );

    expect(result.scoreTier).toBe("low");
  });

  it("maps score=65 to 'worth' (boundary inclusive)", () => {
    const result = toJobCardData(
      makeRow({ aiAnalysis: { score: 65, whyItFits: "ok" } }),
    );

    expect(result.scoreTier).toBe("worth");
  });

  it("maps score=1 to 'low'", () => {
    const result = toJobCardData(
      makeRow({ aiAnalysis: { score: 1, whyItFits: "ok" } }),
    );

    expect(result.scoreTier).toBe("low");
    expect(result.score).toBe(1);
  });

  it("maps score=100 to 'excellent'", () => {
    const result = toJobCardData(
      makeRow({ aiAnalysis: { score: 100, whyItFits: "ok" } }),
    );

    expect(result.scoreTier).toBe("excellent");
  });
});

describe("toJobCardData — descriptionPreview", () => {
  it("returns the description unchanged when within the limit", () => {
    const result = toJobCardData(makeRow({ description: "Short." }));

    expect(result.descriptionPreview).toBe("Short.");
  });

  it("returns an empty preview for an empty description without ellipsis", () => {
    const result = toJobCardData(makeRow({ description: "" }));

    expect(result.descriptionPreview).toBe("");
  });

  it("returns the description unchanged at exactly 200 characters", () => {
    const description = "a".repeat(200);
    const result = toJobCardData(makeRow({ description }));

    expect(result.descriptionPreview).toBe(description);
    expect(result.descriptionPreview.length).toBe(200);
  });

  it("truncates with an ellipsis at 200 characters when the description exceeds 200", () => {
    const description = "a".repeat(4000);
    const result = toJobCardData(makeRow({ description }));

    expect(result.descriptionPreview).toBe(`${"a".repeat(200)}…`);
    expect(result.descriptionPreview.length).toBe(201);
  });
});

describe("toJobCardData — whyItFitsPreview", () => {
  it("returns null when aiAnalysis is null (null safety)", () => {
    const result = toJobCardData(makeRow({ aiAnalysis: null }));

    expect(result.whyItFitsPreview).toBeNull();
  });

  it("takes the first paragraph when separated by double newlines", () => {
    const result = toJobCardData(
      makeRow({
        aiAnalysis: {
          score: 80,
          whyItFits: "First paragraph here.\n\nSecond paragraph here.",
        },
      }),
    );

    expect(result.whyItFitsPreview).toBe("First paragraph here.");
  });

  it("takes the first paragraph when separated by single newlines", () => {
    const result = toJobCardData(
      makeRow({
        aiAnalysis: {
          score: 80,
          whyItFits: "First line here.\nSecond line here.",
        },
      }),
    );

    expect(result.whyItFitsPreview).toBe("First line here.");
  });

  it("returns the full text truncated at 240 chars + ellipsis when longer than 240", () => {
    const longText = `First paragraph ${"a".repeat(260)}`;
    const result = toJobCardData(
      makeRow({
        aiAnalysis: { score: 80, whyItFits: longText },
      }),
    );

    expect(result.whyItFitsPreview).toBe(
      `First paragraph ${"a".repeat(240 - "First paragraph ".length)}…`,
    );
    expect(result.whyItFitsPreview?.length).toBe(241);
  });

  it("returns the text unchanged at exactly 240 characters", () => {
    const text = "a".repeat(240);
    const result = toJobCardData(
      makeRow({ aiAnalysis: { score: 80, whyItFits: text } }),
    );

    expect(result.whyItFitsPreview).toBe(text);
  });
});

describe("toJobCardData — requirements list", () => {
  it("returns an empty requirements array and zero overflow when there are no requirements", () => {
    const result = toJobCardData(makeRow({ requirements: [] }));

    expect(result.requirements).toEqual([]);
    expect(result.requirementsOverflowCount).toBe(0);
  });

  it("returns all five requirements and zero overflow when there are exactly five", () => {
    const requirements = ["TypeScript", "React", "Node", "GraphQL", "AWS"];
    const result = toJobCardData(makeRow({ requirements }));

    expect(result.requirements).toEqual(requirements);
    expect(result.requirementsOverflowCount).toBe(0);
  });

  it("returns the first five requirements and overflow=7 when there are twelve", () => {
    const requirements = Array.from({ length: 12 }, (_, i) => `req-${i + 1}`);
    const result = toJobCardData(makeRow({ requirements }));

    expect(result.requirements).toEqual(requirements.slice(0, 5));
    expect(result.requirementsOverflowCount).toBe(7);
  });
});

describe("toJobCardData — null safety", () => {
  it("preserves a null salary without coercion", () => {
    const result = toJobCardData(makeRow({ salary: null }));

    expect(result.salary).toBeNull();
  });
});
