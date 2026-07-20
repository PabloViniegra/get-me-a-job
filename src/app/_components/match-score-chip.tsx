"use no memo";

import { Chip } from "@heroui/react/chip";
import { LoaderCircle } from "lucide-react";
import type { JSX } from "react";
import { type ScoreTier, scoreTier, TIER_LABELS } from "@/lib/score-tier";

export type ChipClasses = {
  container: string;
  icon: string;
  text: string;
};

export function chipClassForTier(tier: ScoreTier): ChipClasses {
  switch (tier) {
    case "excellent":
      return {
        container:
          "bg-accent-soft text-accent-soft-foreground motion-safe:animate-accent-breathe",
        icon: "motion-safe:animate-spin [animation-duration:3s] text-accent",
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
        <span aria-hidden="true">{TIER_LABELS.pending}</span>
        <span className="sr-only">Aún sin analizar</span>
      </span>
    );
  }

  if (tier === "low") {
    return (
      <span className={classes.container} title={`Match ${score} sobre 100`}>
        <span aria-hidden="true">{score}</span>
        <span className="sr-only">{`Match ${score} sobre 100`}</span>
      </span>
    );
  }

  const leading =
    tier === "excellent" ? (
      <LoaderCircle className={classes.icon} aria-hidden="true" size={12} />
    ) : prefix ? (
      prefix
    ) : null;

  const label =
    tier === "excellent"
      ? `Match excelente: ${score} sobre 100`
      : `Match ${score} sobre 100`;

  return (
    <Chip className={classes.container} title={label}>
      {leading}
      {tier === "excellent" ? (
        <span aria-hidden="true" className="text-xs font-medium">
          {TIER_LABELS.excellent}
        </span>
      ) : null}
      <span aria-hidden="true" className={classes.text}>
        {score}
      </span>
      <span className="sr-only">{label}</span>
    </Chip>
  );
}
