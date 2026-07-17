import type { ApifyClient } from "apify-client";
import { ACTOR_ID, getSearchInput } from "@/config/apify";
import { apifyClient as defaultApifyClient } from "@/lib/apify";

export type TriggerOptions = {
  actorId?: string;
  input?: Record<string, unknown>;
};

export type TriggerResult = {
  runId: string;
  datasetId: string;
  status: string;
};

export async function triggerLinkedInScrape(
  options: TriggerOptions = {},
  client: ApifyClient = defaultApifyClient,
): Promise<TriggerResult> {
  const actorId = options.actorId ?? ACTOR_ID;
  if (!actorId) {
    throw new Error(
      "APIFY_ACTOR_ID is not configured. Set it in the environment before triggering a scrape.",
    );
  }

  const input = options.input ?? getSearchInput();
  if (Object.keys(input).length === 0) {
    throw new Error(
      "APIFY_SEARCH_INPUT is not configured. Set it to a JSON object before triggering a scrape.",
    );
  }

  const run = await client.actor(actorId).start(input);
  return {
    runId: run.id,
    datasetId: run.defaultDatasetId,
    status: String(run.status),
  };
}
