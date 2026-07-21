import { NextResponse } from "next/server";
import { isBearerAuthorized } from "@/lib/auth";
import { env } from "@/lib/env";
import { triggerLinkedInScrape } from "@/server/apify/trigger";

export async function POST(request: Request) {
  if (!isBearerAuthorized(request, env.APIFY_ADMIN_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await triggerLinkedInScrape();
    return NextResponse.json(result);
  } catch (err) {
    const detail = (err as Error)?.message ?? String(err);
    return NextResponse.json(
      { error: "trigger-failed", detail },
      { status: 500 },
    );
  }
}
