import { describe, expect, it } from "vitest";
import { relativeJobTime } from "./relative-time";

const NOW = new Date("2026-07-18T12:00:00Z");

describe("relativeJobTime", () => {
  it("prefixes the span with 'Encontrado ' (PRD FR-3.5 voice)", () => {
    const result = relativeJobTime(new Date("2026-07-18T10:00:00Z"), NOW);
    expect(result.startsWith("Encontrado ")).toBe(true);
  });

  it("renders the span in Spanish (date-fns es locale)", () => {
    const result = relativeJobTime(new Date("2026-07-18T10:00:00Z"), NOW);
    expect(result).toBe("Encontrado 2 horas");
  });
});
