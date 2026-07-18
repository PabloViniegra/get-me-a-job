"use client";

import { useState } from "react";

export type DashboardFilters = {
  query: string;
  setQuery: (value: string) => void;
};

export function useDashboardFilters(): DashboardFilters {
  const [query, setQuery] = useState("");
  return { query, setQuery };
}
