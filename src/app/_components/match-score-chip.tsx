"use no memo";

import { Chip } from "@heroui/react";
import { Sparkles } from "lucide-react";
import type { JSX } from "react";
import { type ScoreTier, scoreTier } from "@/lib/score-tier";

export type ChipClasses = {
  container: string;
  icon: string;
  text: string;
};

const PENDING_LABEL = "Sin analizar";

export function chipClassForTier(tier: ScoreTier): ChipClasses {
  switch (tier) {
    case "excellent":
      return {
        container:
          "bg-accent-soft text-accent-soft-foreground motion-safe:animate-pulse",
        icon: "motion-safe:animate-spin [animation-duration:2s] text-accent",
        text: "font-mono tabular-nums",
      };
    case "worth":
      return {
        container: "bg-default text-default-foreground",
        icon: "",
        text: "font-mono tabular-nums",
      };
    case "low":
      return {
        container: "font-mono tabular-nums text-muted",
        icon: "",
        text: "",
      };
    case "pending":
      return {
        container: "text-muted",
        icon: "",
        text: "",
      };
  }
}

type MatchScoreChipProps = {
  score: number | null;
  hasAiAnalysis: boolean;
  prefix?: JSX.Element;
};

export function MatchScoreChip({
  score,
  hasAiAnalysis,
  prefix,
}: MatchScoreChipProps) {
  const tier = scoreTier(score, hasAiAnalysis);
  const classes = chipClassForTier(tier);

  if (tier === "pending") {
    return (
      <span className={classes.container} title="Aún sin analizar">
        {PENDING_LABEL}
      </span>
    );
  }

  if (tier === "low") {
    return (
      <span className={classes.container} title={`Match ${score} sobre 100`}>
        {score}
      </span>
    );
  }

  const leading =
    tier === "excellent" ? (
      <Sparkles className={classes.icon} aria-hidden="true" size={14} />
    ) : prefix ? (
      prefix
    ) : null;

  return (
    <Chip
      className={classes.container}
      title={
        tier === "excellent"
          ? `Match excelente: ${score} sobre 100`
          : `Match ${score} sobre 100`
      }
    >
      {leading}
      {tier === "excellent" ? (
        <span className="text-xs font-medium">Excelente</span>
      ) : null}
      <span className={classes.text}>{score}</span>
    </Chip>
  );
}
