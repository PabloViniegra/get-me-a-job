import { NextResponse } from "next/server";
import { env } from "@/env";
import { apifyClient } from "@/lib/apify";
import type { ApifyLinkedInJobItem } from "@/lib/apify-mapper";
import { mapApifyItemToJobOffer } from "@/lib/apify-mapper";
import { isBearerAuthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ApifyWebhookPayload = {
  eventType?: string;
  resource?: {
    defaultDatasetId?: string;
  };
};

export async function POST(request: Request) {
  if (!isBearerAuthorized(request, env.APIFY_WEBHOOK_SECRET)) {
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

  for (const item of items) {
    const mapped = mapApifyItemToJobOffer(item);
    const { jobId, ...fields } = mapped;
    await prisma.jobOffer.upsert({
      where: { jobId },
      create: { jobId, ...fields },
      update: fields,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
