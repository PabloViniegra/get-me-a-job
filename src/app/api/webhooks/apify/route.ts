import { NextResponse } from "next/server";
import { env } from "@/env";

type ApifyWebhookPayload = {
  eventType?: string;
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

  // Placeholder: dataset fetch + JobOffer upsert lands in a later ticket.
  return NextResponse.json({ ok: true }, { status: 200 });
}
