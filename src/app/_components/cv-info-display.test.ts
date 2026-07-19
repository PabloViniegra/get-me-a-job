import { describe, expect, it } from "vitest";
import { buildCvChipLabel } from "./cv-info-display";

describe("buildCvChipLabel", () => {
  it("composes filename, middot separator, and size in KB", () => {
    expect(buildCvChipLabel("CV_2026.pdf", 1024)).toBe("CV_2026.pdf · 1.00 KB");
  });

  it("uses 2 decimals under 10 KB for finer resolution on small CVs", () => {
    expect(buildCvChipLabel("CV_2026.pdf", 512)).toBe("CV_2026.pdf · 0.50 KB");
    expect(buildCvChipLabel("CV_2026.pdf", 5 * 1024)).toBe(
      "CV_2026.pdf · 5.00 KB",
    );
  });

  it("uses 1 decimal at or above 10 KB to keep the label compact", () => {
    expect(buildCvChipLabel("CV_2026.pdf", 10 * 1024)).toBe(
      "CV_2026.pdf · 10.0 KB",
    );
    expect(buildCvChipLabel("CV_2026.pdf", 250 * 1024)).toBe(
      "CV_2026.pdf · 250.0 KB",
    );
  });

  it("preserves the original filename verbatim (no path, no extension rewrite)", () => {
    expect(buildCvChipLabel("My Résumé.final.pdf", 2048)).toBe(
      "My Résumé.final.pdf · 2.00 KB",
    );
  });

  it("handles a 0-byte file without throwing or rendering 'NaN'", () => {
    expect(buildCvChipLabel("empty.pdf", 0)).toBe("empty.pdf · 0.00 KB");
  });
});
