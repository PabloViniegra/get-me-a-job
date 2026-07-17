import { env } from "@/env";

export const ACTOR_ID = env.APIFY_ACTOR_ID ?? "";

export function getSearchInput(): Record<string, unknown> {
  const raw = env.APIFY_SEARCH_INPUT;
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}
