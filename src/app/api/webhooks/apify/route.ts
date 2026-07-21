import { after, NextResponse } from "next/server";
import { isBearerAuthorized } from "@/lib/auth";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { prisma } from "@/lib/prisma";
import { apifyClient } from "@/server/apify/client";
import {
  type ApifyLinkedInJobItem,
  mapApifyItemToJobOffer,
} from "@/server/apify/mapper";
import { fireGradingTrigger } from "./trigger-grade";

const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;

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

  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (contentLength > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
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

  let skipped = 0;
  for (const item of items) {
    let mapped: ReturnType<typeof mapApifyItemToJobOffer>;
    try {
      mapped = mapApifyItemToJobOffer(item);
    } catch (err) {
      skipped += 1;
      log.warn(
        `[webhook] skipping invalid item jobId=${item.jobId}: ${(err as Error).message}`,
      );
      continue;
    }
    const { jobId, ...fields } = mapped;
    await prisma.jobOffer.upsert({
      where: { jobId },
      create: { jobId, ...fields },
      update: fields,
    });
  }

  after(() => {
    void fireGradingTrigger(request.url, env.APIFY_ADMIN_SECRET);
  });

  return NextResponse.json({ ok: true, skipped }, { status: 200 });
}
