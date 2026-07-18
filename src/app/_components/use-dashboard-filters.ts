"use client";

import { useCallback, useState } from "react";
import type { Format } from "@/lib/dashboard-filters";

export type DashboardFilters = {
  query: string;
  setQuery: (value: string) => void;
  formats: ReadonlyArray<Format>;
  toggleFormat: (format: Format) => void;
};

export function useDashboardFilters(): DashboardFilters {
  const [query, setQuery] = useState("");
  const [formats, setFormats] = useState<ReadonlyArray<Format>>([]);

  const toggleFormat = useCallback((format: Format) => {
    setFormats((current) =>
      current.includes(format)
        ? current.filter((f) => f !== format)
        : [...current, format],
    );
  }, []);

  return { query, setQuery, formats, toggleFormat };
}
