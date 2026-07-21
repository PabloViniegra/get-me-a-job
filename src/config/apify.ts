import { env } from "@/lib/env";

export const ACTOR_ID = env.APIFY_ACTOR_ID ?? "";

export function getSearchInput(): Record<string, unknown> {
  const raw = env.APIFY_SEARCH_INPUT;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    const preview = JSON.stringify(raw.slice(0, 80));
    throw new Error(
      `APIFY_SEARCH_INPUT is not valid JSON: ${(err as Error).message}. Raw value preview: ${preview}`,
    );
  }
}
