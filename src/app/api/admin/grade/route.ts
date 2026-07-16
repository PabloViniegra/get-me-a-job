import { NextResponse } from "next/server";
import { env } from "@/env";
import { gradePendingJobs } from "@/lib/grade-pending";

type GradeRequestBody = {
  limit?: number;
  concurrency?: number;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (authHeader !== `Bearer ${env.APIFY_ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: GradeRequestBody = await request.json().catch(() => ({}));

  const result = await gradePendingJobs({
    limit: body.limit,
    concurrency: body.concurrency,
  });

  return NextResponse.json(result);
}
