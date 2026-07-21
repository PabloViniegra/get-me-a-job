import { ApifyClient } from "apify-client";
import { cachedClient } from "@/lib/cache";
import { env } from "@/lib/env";

export const apifyClient = cachedClient(
  "apifyClient",
  () => new ApifyClient({ token: env.APIFY_API_KEY }),
);
