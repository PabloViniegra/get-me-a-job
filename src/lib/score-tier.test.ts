import { describe, expect, it } from "vitest";
import { type ScoreTier, scoreTier, TIER_LABELS } from "./score-tier";

describe("scoreTier", () => {
  describe("boundaries (PRD FR-3.4 / DESIGN-SYSTEM §Match Score Chip)", () => {
    const matrix: ReadonlyArray<{
      name: string;
      score: number | null;
      hasAiAnalysis: boolean;
      want: ScoreTier;
    }> = [
      {
        name: "no aiAnalysis yet",
        score: null,
        hasAiAnalysis: false,
        want: "pending",
      },
      {
        name: "lowest score with analysis",
        score: 0,
        hasAiAnalysis: true,
        want: "low",
      },
      {
        name: "score=1 with analysis",
        score: 1,
        hasAiAnalysis: true,
        want: "low",
      },
      {
        name: "score=64 with analysis (just below worth)",
        score: 64,
        hasAiAnalysis: true,
        want: "low",
      },
      {
        name: "score=65 with analysis (worth floor, inclusive)",
        score: 65,
        hasAiAnalysis: true,
        want: "worth",
      },
      {
        name: "score=84 with analysis (still worth)",
        score: 84,
        hasAiAnalysis: true,
        want: "worth",
      },
      {
        name: "score=85 with analysis (excellent floor, inclusive)",
        score: 85,
        hasAiAnalysis: true,
        want: "excellent",
      },
      {
        name: "score=100 with analysis",
        score: 100,
        hasAiAnalysis: true,
        want: "excellent",
      },
    ];

    for (const c of matrix) {
      it(`${c.name} → ${c.want}`, () => {
        expect(scoreTier(c.score, c.hasAiAnalysis)).toBe(c.want);
      });
    }
  });

  describe("priority", () => {
    it("treats 'no analysis' as pending even when a score is somehow present (defensive)", () => {
      expect(scoreTier(95, false)).toBe("pending");
    });

    it("treats a non-empty score with hasAiAnalysis=false as pending (consumers must guard)", () => {
      expect(scoreTier(50, false)).toBe("pending");
    });
  });

  it("has four tiers total (design system contract)", () => {
    const tiers = new Set<ScoreTier>();
    for (let s = 0; s <= 100; s++) {
      tiers.add(scoreTier(s, true));
    }
    tiers.add(scoreTier(null, false));
    expect(tiers.size).toBe(4);
  });
});

describe("TIER_LABELS", () => {
  it("covers every ScoreTier with a non-empty label", () => {
    const tiers: ReadonlyArray<ScoreTier> = [
      "excellent",
      "worth",
      "low",
      "pending",
    ];
    for (const t of tiers) {
      expect(TIER_LABELS[t]).toBeTruthy();
    }
  });
});
