import { ApifyClient } from "apify-client";
import { env } from "@/env";

const globalForApify = globalThis as unknown as {
  apifyClient: ApifyClient | undefined;
};

export const apifyClient =
  globalForApify.apifyClient ??
  new ApifyClient({
    token: env.APIFY_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalForApify.apifyClient = apifyClient;
}
