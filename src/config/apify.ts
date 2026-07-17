import { env } from "@/env";

export const ACTOR_ID = env.APIFY_ACTOR_ID;

export const SEARCH_INPUT: Record<string, unknown> = JSON.parse(
  env.APIFY_SEARCH_INPUT,
) as Record<string, unknown>;
