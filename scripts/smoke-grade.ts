// Smoke harness for live integration verification.
// Run with: bun --env-file=.env run scripts/smoke-grade.ts
//
// Observed during smoke (2026-07-15): OpenRouter free-tier models (Llama 3.3
// 70B, Qwen3, Mistral, Gemma) were 429-rate-limited at the upstream provider
// surface (Venice et al.). The pipeline still passed: Prisma upsert + findUnique
// + update worked against live Atlas; loadCV() returned 4333 chars; the grader
// surfaced the 429 as reason=network and persisted the row with aiAnalysis=null
// per PRD FR-1.5 best-effort posture. Re-run during off-peak to exercise the
// happy path of the LLM completion.

import { createHash } from "node:crypto";
import { mapApifyItemToJobOffer } from "../src/lib/apify-mapper";
import { loadCV } from "../src/lib/cv";
import { gradeJob } from "../src/lib/grader";
import { openRouterClient } from "../src/lib/openrouter";
import { prisma } from "../src/lib/prisma";

const SMOKE_JOB_ID = `smoke-${Date.now()}`;

function hashDescription(description: string): string {
  return createHash("sha256").update(description).digest("hex");
}

async function main() {
  const apifyItem = {
    jobId: SMOKE_JOB_ID,
    jobUrl: `https://www.linkedin.com/jobs/view/smoke-test-${SMOKE_JOB_ID}`,
    jobTitle: "Senior Full-Stack Engineer (Smoke Test)",
    jobDescription:
      "We are looking for a senior engineer with TypeScript, React, and Next.js experience. You will own the full stack of our product, work closely with design, and ship to production continuously.",
    salaryInfo: ["€50,000", "€70,000"],
  };

  console.log(`[smoke] jobId=${SMOKE_JOB_ID}`);
  const mapped = mapApifyItemToJobOffer(apifyItem);
  const incomingHash = hashDescription(mapped.description);
  console.log(
    `[smoke] mapped: title="${mapped.title}" format=${mapped.format} descriptionHash=${incomingHash.slice(0, 12)}...`,
  );

  console.log("[smoke] step 1: upsert");
  await prisma.jobOffer.upsert({
    where: { jobId: mapped.jobId },
    create: { ...mapped, descriptionHash: incomingHash },
    update: { ...mapped, descriptionHash: incomingHash },
  });

  console.log("[smoke] step 2: findUnique to compare hashes");
  const stored = await prisma.jobOffer.findUnique({
    where: { jobId: mapped.jobId },
    select: { descriptionHash: true, aiAnalysis: true },
  });
  console.log(
    `[smoke] stored: hash=${stored?.descriptionHash?.slice(0, 12) ?? "null"}... aiAnalysis=${
      stored?.aiAnalysis ? "present" : "null"
    }`,
  );

  const shouldGrade =
    !stored?.descriptionHash ||
    stored.descriptionHash !== incomingHash ||
    !stored.aiAnalysis;

  if (!shouldGrade) {
    console.log(
      "[smoke] hash + aiAnalysis already present; skipping grading (idempotent path)",
    );
  } else {
    console.log("[smoke] step 3: loadCV (cache miss expected)");
    const cvText = await loadCV();
    console.log(`[smoke] cv loaded: ${cvText.length} chars`);

    console.log(
      "[smoke] step 4: gradeJob via real OpenRouter (this is the live call)",
    );
    const t0 = Date.now();
    const result = await gradeJob({
      client: openRouterClient,
      cvText,
      job: mapped,
    });
    const elapsed = Date.now() - t0;

    if (!result.ok) {
      console.log(
        `[smoke] gradeJob failed reason=${result.failure.reason} detail=${result.failure.detail ?? ""}`,
      );
    } else {
      const ai = result.value;
      console.log(`[smoke] gradeJob succeeded in ${elapsed}ms`);
      console.log(
        `[smoke]   score=${ai.score} whyItFits.length=${ai.whyItFits.length} preview="${ai.whyItFits.slice(0, 100).replace(/\n/g, " ")}..."`,
      );

      console.log("[smoke] step 5: persist aiAnalysis");
      await prisma.jobOffer.update({
        where: { jobId: mapped.jobId },
        data: { aiAnalysis: ai },
      });
      console.log("[smoke] aiAnalysis persisted");
    }
  }

  console.log("[smoke] step 6: read back final row");
  const final = await prisma.jobOffer.findUnique({
    where: { jobId: mapped.jobId },
    select: { jobId: true, aiAnalysis: true, descriptionHash: true },
  });
  console.log(`[smoke] final: ${JSON.stringify(final, null, 2)}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[smoke] FATAL", err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
