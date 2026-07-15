import { NextResponse } from "next/server";
import { env } from "@/env";
import { apifyClient } from "@/lib/apify";
import type { ApifyLinkedInJobItem } from "@/lib/apify-mapper";
import { mapApifyItemToJobOffer } from "@/lib/apify-mapper";
import { loadCV } from "@/lib/cv";
import { gradeJob } from "@/lib/grader";
import { openRouterClient } from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";

type ApifyWebhookPayload = {
  eventType?: string;
  resource?: {
    defaultDatasetId?: string;
  };
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (authHeader !== `Bearer ${env.APIFY_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload: ApifyWebhookPayload | null = await request
    .json()
    .catch(() => null);

  if (payload?.eventType !== "ACTOR.RUN.SUCCEEDED") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const datasetId = payload.resource?.defaultDatasetId;
  if (!datasetId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { items } = await apifyClient
    .dataset<ApifyLinkedInJobItem>(datasetId)
    .listItems();

  let cvText: string | null;
  try {
    cvText = await loadCV();
  } catch (err) {
    console.info(
      `[grading] error reason=cv-unavailable detail=${err instanceof Error ? err.message : String(err)}`,
    );
    cvText = null;
  }

  for (const item of items) {
    const mapped = mapApifyItemToJobOffer(item);
    const { jobId, ...fields } = mapped;
    await prisma.jobOffer.upsert({
      where: { jobId },
      create: { jobId, ...fields },
      update: fields,
    });

    if (cvText === null) {
      continue;
    }

    const stored = await prisma.jobOffer.findUnique({
      where: { jobId },
      select: { descriptionHash: true, aiAnalysis: true },
    });

    const hashUnchanged = stored?.descriptionHash === mapped.descriptionHash;
    const alreadyGraded =
      stored?.aiAnalysis !== null && stored?.aiAnalysis !== undefined;
    if (hashUnchanged && alreadyGraded) {
      continue;
    }

    const result = await gradeJob({
      client: openRouterClient,
      cvText,
      job: mapped,
    });

    if (result) {
      await prisma.jobOffer.update({
        where: { jobId },
        data: { aiAnalysis: result },
      });
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
