import { DEFAULT_OPENROUTER_MODEL, env } from "@/env";
import { cachedClient } from "@/lib/cache";

export type OpenRouterStreamChunk = string;

export type OpenRouterClient = {
  complete(prompt: string, opts?: { signal?: AbortSignal }): Promise<string>;
  stream?(
    prompt: string,
    opts?: { signal?: AbortSignal },
  ): AsyncIterable<OpenRouterStreamChunk>;
};

export type StreamingOpenRouterClient = OpenRouterClient & {
  stream(
    prompt: string,
    opts?: { signal?: AbortSignal },
  ): AsyncIterable<OpenRouterStreamChunk>;
};

const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";
const STREAM_DONE_SENTINEL = "[DONE]";

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
    stream(prompt, opts) {
      return streamChatCompletion({
        apiKey: config.apiKey,
        model,
        prompt,
        signal: opts?.signal,
      });
    },
  };
}

async function* streamChatCompletion(args: {
  apiKey: string;
  model: string;
  prompt: string;
  signal?: AbortSignal;
}): AsyncIterable<OpenRouterStreamChunk> {
  const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: args.model,
      messages: [{ role: "user", content: args.prompt }],
      stream: true,
    }),
    signal: args.signal,
  });
  if (!response.ok) {
    const error: Error & { status?: number } = new Error(
      `OpenRouter stream failed: ${response.status} ${response.statusText}`,
    );
    error.status = response.status;
    throw error;
  }
  if (!response.body) {
    throw new Error("OpenRouter stream returned no body");
  }
  yield* parseSseStream(response.body);
}

async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<OpenRouterStreamChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice("data:".length).trim();
        if (payload === STREAM_DONE_SENTINEL) return;
        const parsed = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const openRouterClient = cachedClient("openRouterClient", () =>
  createOpenRouterClient({
    apiKey: env.ROUTER_API_KEY,
    model: env.OPENROUTER_MODEL,
  }),
);
