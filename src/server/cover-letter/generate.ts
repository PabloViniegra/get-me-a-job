import type { JobSnapshot } from "@/lib/job";
import { formatJob } from "@/lib/job-format";
import { log } from "@/lib/log";
import type { StreamingOpenRouterClient } from "@/lib/openrouter";

const FREE_REGEN_LIMIT = 3;
const BASE_WAIT_MS = 30_000;

export type CoverLetterInputs = {
  client: StreamingOpenRouterClient;
  cvText: string;
  job: JobSnapshot;
  signal?: AbortSignal;
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterMs: number;
  nextRegenerationCount: number;
};

export function computeRateLimit(args: {
  currentRegenerations: number;
  lastRegeneratedAt: Date | null;
  now: Date;
}): RateLimitDecision {
  const nextCount = args.currentRegenerations + 1;
  if (nextCount <= FREE_REGEN_LIMIT) {
    return { allowed: true, retryAfterMs: 0, nextRegenerationCount: nextCount };
  }
  const overCount = nextCount - FREE_REGEN_LIMIT;
  const requiredWaitMs = BASE_WAIT_MS * 2 ** (overCount - 1);
  if (!args.lastRegeneratedAt) {
    return { allowed: true, retryAfterMs: 0, nextRegenerationCount: nextCount };
  }
  const elapsedMs = args.now.getTime() - args.lastRegeneratedAt.getTime();
  if (elapsedMs >= requiredWaitMs) {
    return { allowed: true, retryAfterMs: 0, nextRegenerationCount: nextCount };
  }
  return {
    allowed: false,
    retryAfterMs: requiredWaitMs - elapsedMs,
    nextRegenerationCount: nextCount,
  };
}

const SYSTEM_PROMPT = [
  "Eres un asistente que redacta cartas de presentación profesionales en español.",
  "Adapta cada carta al CV del candidato y a la oferta de trabajo específica.",
  "Estructura: saludo, párrafo de enganche (por qué esta empresa o puesto),",
  "párrafo de valor (qué aporto basado en mi experiencia),",
  "párrafo de cierre (disponibilidad y llamada a la acción).",
  "Tono: profesional pero cercano. Sin clichés ni placeholders como [Tu nombre].",
  "No inventes experiencia que no esté respaldada por el CV.",
  "Longitud: 250-400 palabras. Prosa continua, sin listas ni Markdown.",
  "Devuelve SOLO el cuerpo de la carta, sin meta-comentarios.",
].join(" ");

export function buildCoverLetterPrompt(args: {
  cvText: string;
  job: JobSnapshot;
}): string {
  return [
    SYSTEM_PROMPT,
    "",
    "CV del candidato:",
    args.cvText,
    "",
    "Oferta de trabajo:",
    formatJob(args.job, "es"),
    "",
    "Redacta la carta de presentación ahora.",
  ].join("\n");
}

export async function* generateCoverLetterStream(
  inputs: CoverLetterInputs,
): AsyncIterable<string> {
  const prompt = buildCoverLetterPrompt({
    cvText: inputs.cvText,
    job: inputs.job,
  });
  const start = performance.now();
  log.info(
    `[cover-letter] stream start jobId=${inputs.job.jobId} cvLen=${inputs.cvText.length}`,
  );
  let charCount = 0;
  try {
    for await (const chunk of inputs.client.stream(prompt, {
      signal: inputs.signal,
    })) {
      charCount += chunk.length;
      yield chunk;
    }
    const dur = Math.round(performance.now() - start);
    log.info(
      `[cover-letter] stream ok jobId=${inputs.job.jobId} chars=${charCount} dur=${dur}`,
    );
  } catch (err) {
    const detail = (err as Error)?.message ?? String(err);
    log.info(
      `[cover-letter] stream error jobId=${inputs.job.jobId} chars=${charCount} detail=${detail}`,
    );
    throw err;
  }
}
