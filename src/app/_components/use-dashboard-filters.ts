"use client";

import { useCallback, useState } from "react";
import type { Format } from "@/lib/dashboard-filters";
import type { ScoreTier } from "@/lib/score-tier";

export type DashboardFilters = {
  query: string;
  setQuery: (value: string) => void;
  formats: ReadonlyArray<Format>;
  toggleFormat: (format: Format) => void;
  tiers: ReadonlyArray<ScoreTier>;
  toggleTier: (tier: ScoreTier) => void;
};

export function useDashboardFilters(): DashboardFilters {
  const [query, setQuery] = useState("");
  const [formats, setFormats] = useState<ReadonlyArray<Format>>([]);
  const [tiers, setTiers] = useState<ReadonlyArray<ScoreTier>>([]);

  const toggleFormat = useCallback((format: Format) => {
    setFormats((current) =>
      current.includes(format)
        ? current.filter((f) => f !== format)
        : [...current, format],
    );
  }, []);

  const toggleTier = useCallback((tier: ScoreTier) => {
    setTiers((current) =>
      current.includes(tier)
        ? current.filter((t) => t !== tier)
        : [...current, tier],
    );
  }, []);

  return {
    query,
    setQuery,
    formats,
    toggleFormat,
    tiers,
    toggleTier,
  };
}
