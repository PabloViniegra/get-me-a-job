import { z } from "zod";
import { DEFAULT_OPENROUTER_MODEL } from "@/lib/env";
import type { AiAnalysis, JobSnapshot } from "@/lib/job";
import { formatJob } from "@/lib/job-format";
import { log } from "@/lib/log";
import type { OpenRouterClient } from "@/lib/openrouter";

export type { AiAnalysis, JobSnapshot };

export type GraderFailureReason =
  | "network"
  | "timeout"
  | "parse"
  | "validation";

export type GraderFailure = {
  reason: GraderFailureReason;
  detail?: string;
};

export type GraderResult =
  | { ok: true; value: AiAnalysis }
  | { ok: false; failure: GraderFailure };

export type GraderInputs = {
  client: OpenRouterClient;
  cvText: string;
  job: JobSnapshot;
};

const aiAnalysisSchema = z.object({
  score: z.number().int().min(1).max(100),
  whyItFits: z.string().max(1500),
});

const GRADING_TIMEOUT_MS = 30_000;
const MAX_GRADE_ATTEMPTS = 3;
const RETRY_DELAY_BASE_MS = 2000;

export type GradeOptions = {
  model?: string;
  sleep?: (ms: number) => Promise<void>;
};

async function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PROMPT_TEMPLATE = [
  "You are grading how well a candidate's CV matches a LinkedIn job posting.",
  "Respond with strict JSON matching this schema:",
  '{ "score": integer 1-100, "whyItFits": string (max 1500 chars) }',
  "",
  "Candidate CV:",
  "{CV}",
  "",
  "Job posting:",
  "{JOB}",
].join("\n");

export async function gradeJob(
  inputs: GraderInputs,
  options: GradeOptions = {},
): Promise<GraderResult> {
  const { cvText, job } = inputs;
  const model = options.model ?? DEFAULT_OPENROUTER_MODEL;
  const start = performance.now();
  log.info(
    `[grading] start jobId=${job.jobId} model=${model} cvLen=${cvText.length}`,
  );

  const prompt = PROMPT_TEMPLATE.replace("{CV}", cvText).replace(
    "{JOB}",
    formatJob(job, "en"),
  );

  const callResult = await callWithRetry({
    client: inputs.client,
    prompt,
    job,
    model,
    cvLen: cvText.length,
    sleep: options.sleep ?? defaultSleep,
  });
  if (!callResult.ok) return callResult;

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(callResult.raw));
  } catch {
    const detail = `rawLen=${callResult.raw.length} rawStart=${callResult.raw.slice(0, 80)}`;
    log.info(`[grading] error jobId=${job.jobId} reason=parse ${detail}`);
    return { ok: false, failure: { reason: "parse", detail } };
  }

  const validation = aiAnalysisSchema.safeParse(parsed);
  if (!validation.success) {
    const detail = JSON.stringify(validation.error.issues);
    log.info(
      `[grading] error jobId=${job.jobId} reason=validation issues=${detail}`,
    );
    return { ok: false, failure: { reason: "validation", detail } };
  }

  const dur = Math.round(performance.now() - start);
  log.info(
    `[grading] ok jobId=${job.jobId} model=${model} cvLen=${cvText.length} score=${validation.data.score} dur=${dur}`,
  );
  return { ok: true, value: validation.data };
}

async function callWithRetry(args: {
  client: OpenRouterClient;
  prompt: string;
  job: JobSnapshot;
  model: string;
  cvLen: number;
  sleep: (ms: number) => Promise<void>;
}): Promise<{ ok: true; raw: string } | { ok: false; failure: GraderFailure }> {
  const { client, prompt, job, model, cvLen, sleep } = args;
  for (let attempt = 1; attempt <= MAX_GRADE_ATTEMPTS; attempt++) {
    const signal = AbortSignal.timeout(GRADING_TIMEOUT_MS);
    try {
      const raw = await client.complete(prompt, { signal });
      return { ok: true, raw };
    } catch (err) {
      const errStatus = (err as { status?: unknown })?.status;
      const isLastAttempt = attempt === MAX_GRADE_ATTEMPTS;
      const reason =
        signal.aborted || isAbortError(err) ? "timeout" : "network";
      const detail = (err as Error)?.message ?? String(err);
      log.info(
        `[grading] error jobId=${job.jobId} model=${model} cvLen=${cvLen} reason=${reason} detail=${detail}`,
      );
      if (errStatus !== 429 || isLastAttempt) {
        return { ok: false, failure: { reason, detail } };
      }
      const delayMs = RETRY_DELAY_BASE_MS * 2 ** (attempt - 1);
      log.info(
        `[grading] retry jobId=${job.jobId} attempt=${attempt} delayMs=${delayMs}`,
      );
      await sleep(delayMs);
    }
  }
  return {
    ok: false,
    failure: { reason: "network", detail: "retry budget exhausted" },
  };
}

function isAbortError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  return (err as { name?: unknown }).name === "AbortError";
}

function extractJsonObject(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return raw;
  return raw.slice(start, end + 1);
}
