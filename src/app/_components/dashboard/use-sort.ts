"use client";

import { useState } from "react";
import { DEFAULT_SORT_KEY, type SortKey } from "@/lib/dashboard-sort";

export type DashboardSort = {
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
};

export function useDashboardSort(): DashboardSort {
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  return { sortKey, setSortKey };
}
