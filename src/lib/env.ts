import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  ROUTER_API_KEY: z.string(),
  APIFY_API_KEY: z.string(),
  APIFY_WEBHOOK_SECRET: z.string(),
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
