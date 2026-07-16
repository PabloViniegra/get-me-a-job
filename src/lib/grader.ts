import { z } from "zod";
import type { OpenRouterClient } from "./openrouter";

export type AiAnalysis = {
  score: number;
  whyItFits: string;
};

export type JobSnapshot = {
  jobId: string;
  title: string;
  linkedinUrl: string;
  description: string;
  salary: string | null;
  format: string;
  requirements: string[];
};

export type GraderFailureReason =
  | "network"
  | "timeout"
  | "parse"
  | "validation";

export type GraderInputs = {
  client: OpenRouterClient;
  cvText: string;
  job: JobSnapshot;
  onFailure?: (reason: GraderFailureReason, detail?: string) => void;
};

const aiAnalysisSchema = z.object({
  score: z.number().int().min(1).max(100),
  whyItFits: z.string().max(1500),
});

const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const GRADING_TIMEOUT_MS = 30_000;

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
  model: string = DEFAULT_MODEL,
): Promise<AiAnalysis | null> {
  const { client, cvText, job } = inputs;
  const start = performance.now();
  console.info(
    `[grading] start jobId=${job.jobId} model=${model} cvLen=${cvText.length}`,
  );

  const prompt = PROMPT_TEMPLATE.replace("{CV}", cvText).replace(
    "{JOB}",
    formatJob(job),
  );

  const signal = AbortSignal.timeout(GRADING_TIMEOUT_MS);

  let raw: string;
  try {
    raw = await client.complete(prompt, { signal });
  } catch (err) {
    const reason = signal.aborted || isAbortError(err) ? "timeout" : "network";
    const detail = (err as Error)?.message ?? String(err);
    console.info(
      `[grading] error jobId=${job.jobId} model=${model} cvLen=${cvText.length} reason=${reason} detail=${detail}`,
    );
    inputs.onFailure?.(reason, detail);
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const detail = `rawLen=${raw.length} rawStart=${raw.slice(0, 80)}`;
    console.info(`[grading] error jobId=${job.jobId} reason=parse ${detail}`);
    inputs.onFailure?.("parse", detail);
    return null;
  }

  const result = aiAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    const detail = JSON.stringify(result.error.issues);
    console.info(
      `[grading] error jobId=${job.jobId} reason=validation issues=${detail}`,
    );
    inputs.onFailure?.("validation", detail);
    return null;
  }

  const dur = Math.round(performance.now() - start);
  console.info(
    `[grading] ok jobId=${job.jobId} model=${model} cvLen=${cvText.length} score=${result.data.score} dur=${dur}`,
  );
  return result.data;
}

function isAbortError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  return (err as { name?: unknown }).name === "AbortError";
}

function formatJob(job: JobSnapshot): string {
  const salary = job.salary ?? "Not disclosed";
  const requirements =
    job.requirements.length > 0
      ? job.requirements.map((r) => `- ${r}`).join("\n")
      : "(none)";
  return [
    `Title: ${job.title}`,
    `Format: ${job.format}`,
    `Salary: ${salary}`,
    `LinkedIn: ${job.linkedinUrl}`,
    "",
    "Description:",
    job.description,
    "",
    "Requirements:",
    requirements,
  ].join("\n");
}
