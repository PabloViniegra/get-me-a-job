export type SortKey = "score" | "createdAt";

export const SORT_KEYS: ReadonlyArray<SortKey> = ["score", "createdAt"];

export const SORT_LABELS: Record<SortKey, string> = {
  score: "Coincidencia",
  createdAt: "Fecha",
};

export const DEFAULT_SORT_KEY: SortKey = "score";
