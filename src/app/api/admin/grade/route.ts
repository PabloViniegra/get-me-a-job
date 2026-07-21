import { NextResponse } from "next/server";
import { z } from "zod";
import { isBearerAuthorized } from "@/lib/auth";
import { env } from "@/lib/env";
import {
  gradePendingJobs,
  MAX_GRADE_CONCURRENCY,
  MAX_GRADE_LIMIT,
} from "@/server/jobs/grading-runner";

const gradeRequestSchema = z
  .object({
    limit: z.number().int().min(1).max(MAX_GRADE_LIMIT).optional(),
    concurrency: z.number().int().min(1).max(MAX_GRADE_CONCURRENCY).optional(),
  })
  .strict();

export async function POST(request: Request) {
  if (!isBearerAuthorized(request, env.APIFY_ADMIN_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = gradeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await gradePendingJobs(parsed.data);
  return NextResponse.json(result);
}
