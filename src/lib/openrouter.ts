import { env } from "@/env";

export type OpenRouterClient = {
  complete(prompt: string, opts?: { signal?: AbortSignal }): Promise<string>;
};

const DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export function createOpenRouterClient(config: {
  apiKey: string;
  model?: string;
}): OpenRouterClient {
  const model = config.model ?? DEFAULT_OPENROUTER_MODEL;
  return {
    async complete(prompt, opts) {
      const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
        signal: opts?.signal,
      });
      if (!response.ok) {
        throw new Error(
          `OpenRouter request failed: ${response.status} ${response.statusText}`,
        );
      }
      const result = (await response.json()) as {
        choices: { message: { content: string } }[];
      };
      return result.choices[0].message.content;
    },
  };
}

const globalForOpenRouter = globalThis as unknown as {
  openRouterClient: OpenRouterClient | undefined;
};

export const openRouterClient =
  globalForOpenRouter.openRouterClient ??
  createOpenRouterClient({
    apiKey: env.ROUTER_API_KEY,
    model: env.OPENROUTER_MODEL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForOpenRouter.openRouterClient = openRouterClient;
}
