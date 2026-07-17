import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  ROUTER_API_KEY: z.string(),
  APIFY_API_KEY: z.string(),
  APIFY_WEBHOOK_SECRET: z.string(),
  APIFY_ADMIN_SECRET: z.string(),
  APIFY_ACTOR_ID: z.string(),
  // JSON-encoded input passed to the Apify actor at trigger time.
  // Shape is actor-specific; for cheap_scraper/linkedin-job-scraper see
  // the actor's README.
  APIFY_SEARCH_INPUT: z.string(),
  OPENROUTER_MODEL: z
    .string()
    .default("meta-llama/llama-3.3-70b-instruct:free"),
  // Base64-encoded CV plain text. Required in environments where the
  // cv/ directory isn't deployed (Vercel). Falls back to fs read in dev.
  CV_TEXT: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const invalidVars = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid environment variables: ${invalidVars}`);
  }

  return result.data;
}
