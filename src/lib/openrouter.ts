import { DEFAULT_OPENROUTER_MODEL, env } from "@/env";
import { cachedClient } from "@/lib/cache";

export type OpenRouterClient = {
  complete(prompt: string, opts?: { signal?: AbortSignal }): Promise<string>;
};

const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export function createOpenRouterClient(config: {
  apiKey: string;
  model?: string;
}): OpenRouterClient {
  const model =
    config.model ?? env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL;
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
        const error: Error & { status?: number } = new Error(
          `OpenRouter request failed: ${response.status} ${response.statusText}`,
        );
        error.status = response.status;
        throw error;
      }
      const result = (await response.json()) as {
        choices: { message: { content: string } }[];
      };
      return result.choices[0].message.content;
    },
  };
}

export const openRouterClient = cachedClient("openRouterClient", () =>
  createOpenRouterClient({
    apiKey: env.ROUTER_API_KEY,
    model: env.OPENROUTER_MODEL,
  }),
);
