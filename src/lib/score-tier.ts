export type ScoreTier = "pending" | "excellent" | "worth" | "low";

export const TIER_VALUES: ReadonlyArray<ScoreTier> = [
  "excellent",
  "worth",
  "low",
  "pending",
];

export const TIER_LABELS: Record<ScoreTier, string> = {
  excellent: "Excelente",
  worth: "Vale la pena",
  low: "Bajo",
  pending: "Sin analizar",
};

export function scoreTier(
  score: number | null,
  hasAiAnalysis: boolean,
): ScoreTier {
  if (!hasAiAnalysis || score === null) return "pending";
  if (score >= 85) return "excellent";
  if (score >= 65) return "worth";
  return "low";
}
