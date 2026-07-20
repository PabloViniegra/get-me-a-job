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
  withAnalysis: boolean;
  setWithAnalysis: (value: boolean) => void;
  clearAll: () => void;
  activeFacetCount: number;
  isActive: boolean;
};

export function useDashboardFilters(): DashboardFilters {
  const [query, setQuery] = useState("");
  const [formats, setFormats] = useState<ReadonlyArray<Format>>([]);
  const [tiers, setTiers] = useState<ReadonlyArray<ScoreTier>>([]);
  const [withAnalysis, setWithAnalysis] = useState(true);

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

  const clearAll = useCallback(() => {
    setQuery("");
    setFormats([]);
    setTiers([]);
    setWithAnalysis(true);
  }, []);

  const isActive =
    query !== "" || tiers.length > 0 || formats.length > 0 || !withAnalysis;

  return {
    query,
    setQuery,
    formats,
    toggleFormat,
    tiers,
    toggleTier,
    withAnalysis,
    setWithAnalysis,
    clearAll,
    activeFacetCount: formats.length + tiers.length + (withAnalysis ? 0 : 1),
    isActive,
  };
}
