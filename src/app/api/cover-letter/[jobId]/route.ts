import { z } from "zod";
import { env } from "@/env";
import {
  computeRateLimit,
  generateCoverLetterStream,
} from "@/lib/cover-letter";
import { loadCV } from "@/lib/cv";
import { log } from "@/lib/log";
import {
  openRouterClient,
  type StreamingOpenRouterClient,
} from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";

const jobIdSchema = z.string().min(1).max(128);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const parsed = jobIdSchema.safeParse(jobId);
  if (!parsed.success) {
    return new Response("Invalid jobId", { status: 400 });
  }

  const job = await prisma.jobOffer.findUnique({
    where: { jobId: parsed.data },
    select: {
      jobId: true,
      title: true,
      linkedinUrl: true,
      description: true,
      salary: true,
      format: true,
      requirements: true,
      descriptionHash: true,
      coverLetter: true,
      coverLetterRegenerations: true,
      coverLetterLastRegeneratedAt: true,
    },
  });
  if (!job) {
    return new Response("Not found", { status: 404 });
  }

  const decision = computeRateLimit({
    currentRegenerations: job.coverLetterRegenerations,
    lastRegeneratedAt: job.coverLetterLastRegeneratedAt,
    now: new Date(),
  });
  if (!decision.allowed) {
    return Response.json(
      {
        error: "rate_limited",
        retryAfterMs: Math.ceil(decision.retryAfterMs),
        nextRegenerationCount: decision.nextRegenerationCount,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(decision.retryAfterMs / 1000)),
        },
      },
    );
  }

  const cvText = await loadCV();
  const isRegen = job.coverLetter !== null;

  const source = streamThenPersist({
    client: openRouterClient as StreamingOpenRouterClient,
    cvText,
    job: {
      jobId: job.jobId,
      title: job.title,
      linkedinUrl: job.linkedinUrl,
      description: job.description,
      salary: job.salary,
      format: job.format,
      requirements: job.requirements,
    },
    signal: request.signal,
    onComplete: (text) =>
      persistCoverLetter({
        jobId: job.jobId,
        descriptionHash: job.descriptionHash,
        isRegen,
        text,
      }),
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of source) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (err) {
        console.error(
          `[cover-letter] stream error jobId=${job.jobId} model=${env.OPENROUTER_MODEL ?? "(default)"}`,
          err,
        );
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

async function* streamThenPersist(args: {
  client: Parameters<typeof generateCoverLetterStream>[0]["client"];
  cvText: string;
  job: Parameters<typeof generateCoverLetterStream>[0]["job"];
  signal: AbortSignal | undefined;
  onComplete: (text: string) => Promise<void>;
}): AsyncIterable<Uint8Array> {
  const encoder = new TextEncoder();
  let accumulated = "";
  for await (const chunk of generateCoverLetterStream({
    client: args.client,
    cvText: args.cvText,
    job: args.job,
    signal: args.signal,
  })) {
    accumulated += chunk;
    yield encoder.encode(chunk);
  }
  await args.onComplete(accumulated);
}

async function persistCoverLetter(args: {
  jobId: string;
  descriptionHash: string | null;
  isRegen: boolean;
  text: string;
}): Promise<void> {
  const { jobId, descriptionHash, isRegen, text } = args;
  await prisma.jobOffer.update({
    where: { jobId },
    data: {
      coverLetter: text,
      coverLetterDescriptionHash: descriptionHash,
      ...(isRegen ? { coverLetterRegenerations: { increment: 1 } } : {}),
      coverLetterLastRegeneratedAt: new Date(),
    },
  });
  log.info(
    `[cover-letter] persisted jobId=${jobId} isRegen=${isRegen} chars=${text.length}`,
  );
}
