process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "mongodb://localhost:27017/test";
process.env.ROUTER_API_KEY = process.env.ROUTER_API_KEY ?? "test-router-key";
process.env.APIFY_API_KEY = process.env.APIFY_API_KEY ?? "test-apify-key";
process.env.APIFY_WEBHOOK_SECRET =
  process.env.APIFY_WEBHOOK_SECRET ?? "test-webhook-secret";
process.env.APIFY_ADMIN_SECRET =
  process.env.APIFY_ADMIN_SECRET ?? "test-admin-secret";
