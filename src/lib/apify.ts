import { ApifyClient } from "apify-client";
import { env } from "@/env";
import { cachedClient } from "@/lib/cache";

export const apifyClient = cachedClient(
  "apifyClient",
  () => new ApifyClient({ token: env.APIFY_API_KEY }),
);
