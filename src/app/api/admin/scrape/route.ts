import { NextResponse } from "next/server";
import { env } from "@/env";
import { triggerLinkedInScrape } from "@/lib/apify-trigger";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (authHeader !== `Bearer ${env.APIFY_ADMIN_SECRET}`) {
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
