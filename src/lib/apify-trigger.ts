import { ApifyClient } from "apify-client";
import { ACTOR_ID, SEARCH_INPUT } from "@/config/apify";
import { env } from "@/env";

const globalForApify = globalThis as unknown as {
  apifyClient: ApifyClient | undefined;
};

export const apifyClient =
  globalForApify.apifyClient ?? new ApifyClient({ token: env.APIFY_API_KEY });

if (process.env.NODE_ENV !== "production") {
  globalForApify.apifyClient = apifyClient;
}

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
  client: ApifyClient = apifyClient,
): Promise<TriggerResult> {
  const actorId = options.actorId ?? ACTOR_ID;
  const input = options.input ?? SEARCH_INPUT;

  const run = await client.actor(actorId).start(input);
  return {
    runId: run.id,
    datasetId: run.defaultDatasetId,
    status: String(run.status),
  };
}
