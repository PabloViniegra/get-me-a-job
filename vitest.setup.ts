process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "mongodb://localhost:27017/test";
process.env.ROUTER_API_KEY = process.env.ROUTER_API_KEY ?? "test-router-key";
process.env.APIFY_API_KEY = process.env.APIFY_API_KEY ?? "test-apify-key";
process.env.APIFY_WEBHOOK_SECRET =
  process.env.APIFY_WEBHOOK_SECRET ?? "test-webhook-secret";
process.env.APIFY_ADMIN_SECRET =
  process.env.APIFY_ADMIN_SECRET ?? "test-admin-secret";
process.env.APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID ?? "test/actor";
process.env.APIFY_SEARCH_INPUT =
  process.env.APIFY_SEARCH_INPUT ??
  JSON.stringify({ keyword: "Senior Engineer", locations: ["Madrid"] });
