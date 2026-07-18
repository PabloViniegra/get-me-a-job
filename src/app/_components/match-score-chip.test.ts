import { describe, expect, it } from "vitest";
import type { ScoreTier } from "@/lib/score-tier";
import { chipClassForTier } from "./match-score-chip";

describe("chipClassForTier (DESIGN-SYSTEM §Match Score Chip — visual contract)", () => {
  it("'excellent' uses bg-accent-soft surface + motion-safe glow ring + a spinning icon at 2s", () => {
    const cls = chipClassForTier("excellent");
    expect(cls.container).toContain("bg-accent-soft");
    expect(cls.container).toContain("text-accent-soft-foreground");
    expect(cls.container).toContain("motion-safe:animate-glow-pulse");
    expect(cls.icon).toContain("motion-safe:animate-spin");
    expect(cls.icon).toContain("[animation-duration:2s]");
    expect(cls.text).toContain("font-mono");
    expect(cls.text).toContain("tabular-nums");
  });

  it("'worth' uses bg-default surface, no animation", () => {
    const cls = chipClassForTier("worth");
    expect(cls.container).toContain("bg-default");
    expect(cls.container).not.toContain("motion-safe");
    expect(cls.icon).toBe("");
    expect(cls.text).toContain("font-mono");
    expect(cls.text).toContain("tabular-nums");
  });

  it("'low' renders as plain mono text in --muted, no chip fill, no animation", () => {
    const cls = chipClassForTier("low");
    expect(cls.container).not.toMatch(/bg-/);
    expect(cls.container).toContain("font-mono");
    expect(cls.container).toContain("tabular-nums");
    expect(cls.container).toContain("text-muted");
    expect(cls.container).not.toContain("motion-safe");
    expect(cls.icon).toBe("");
  });

  it("'pending' renders as plain text in --muted with the literal 'Sin analizar' label, no chip fill", () => {
    const cls = chipClassForTier("pending");
    expect(cls.container).not.toMatch(/bg-/);
    expect(cls.container).toContain("text-muted");
    expect(cls.container).not.toContain("motion-safe");
    expect(cls.icon).toBe("");
    expect(cls.text).toBe("");
  });

  it("the prefers-reduced-motion guarantee comes from motion-safe: prefix (not motion-reduce:)", () => {
    const allTiers: ScoreTier[] = ["pending", "excellent", "worth", "low"];
    for (const tier of allTiers) {
      const cls = chipClassForTier(tier);
      expect(cls.container).not.toContain("motion-reduce:");
      expect(cls.icon).not.toContain("motion-reduce:");
    }
  });

  it("only 'excellent' carries animation classes (every other tier is static)", () => {
    expect(chipClassForTier("excellent")).not.toEqual(
      chipClassForTier("worth"),
    );
    expect(chipClassForTier("excellent").container).toMatch(/animate-/);
    expect(chipClassForTier("excellent").icon).toMatch(/animate-/);

    const staticTiers: ScoreTier[] = ["pending", "worth", "low"];
    for (const tier of staticTiers) {
      const cls = chipClassForTier(tier);
      expect(cls.container).not.toMatch(/animate-/);
      expect(cls.icon).not.toMatch(/animate-/);
    }
  });
});
