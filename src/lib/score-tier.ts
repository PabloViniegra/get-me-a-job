export type ScoreTier = "pending" | "excellent" | "worth" | "low";

export function scoreTier(
  score: number | null,
  hasAiAnalysis: boolean,
): ScoreTier {
  if (!hasAiAnalysis || score === null) return "pending";
  if (score >= 85) return "excellent";
  if (score >= 65) return "worth";
  return "low";
}
