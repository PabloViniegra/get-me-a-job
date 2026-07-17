// Calls POST /api/admin/grade repeatedly against the production alias
// until it reports considered=0. Auth via Bearer <APIFY_ADMIN_SECRET>
// from the env file.
//
// Usage:
//   bun --env-file=.env run scripts/admin-grade.ts [limit] [concurrency]
//
// Defaults match the route handler (limit=30, concurrency=3). The Vercel
// serverless function for /api/admin/grade awaits gradePendingJobs, so each
// iteration blocks for ~3-5 min on Haiku at limit=30. Hobby projects (60s
// function timeout) will not fit — lower the limit to 20 or upgrade.

const BASE_URL = "https://get-me-a-job.vercel.app";
const ROUTE = "/api/admin/grade";
const DEFAULT_LIMIT = 30;
const DEFAULT_CONCURRENCY = 3;
const MAX_ITERATIONS = 10;
const REQUEST_TIMEOUT_MS = 360_000;

type GradeResponse = {
  considered: number;
  succeeded: number;
  failed: number;
  errors: Array<{ jobId: string; reason: string; detail?: string }>;
};

const secret = process.env.APIFY_ADMIN_SECRET;
if (!secret) {
  console.error("[admin-grade] APIFY_ADMIN_SECRET not set in env");
  process.exit(1);
}

const limit = Number(process.argv[2] ?? DEFAULT_LIMIT);
const concurrency = Number(process.argv[3] ?? DEFAULT_CONCURRENCY);

async function callOnce(): Promise<GradeResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${ROUTE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ limit, concurrency }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
    }
    return (await res.json()) as GradeResponse;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(
    `[admin-grade] start base=${BASE_URL} limit=${limit} concurrency=${concurrency}`,
  );

  let totalConsidered = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration += 1;
    const t0 = Date.now();
    let result: GradeResponse;
    try {
      result = await callOnce();
    } catch (err) {
      console.error(`[admin-grade] iter=${iteration} request failed:`, err);
      process.exit(1);
    }
    const elapsedMs = Date.now() - t0;

    totalConsidered += result.considered;
    totalSucceeded += result.succeeded;
    totalFailed += result.failed;

    console.log(
      `[admin-grade] iter=${iteration} considered=${result.considered} succeeded=${result.succeeded} failed=${result.failed} elapsedMs=${elapsedMs}`,
    );

    if (result.errors.length > 0) {
      for (const e of result.errors) {
        console.log(
          `  - ${e.jobId}: ${e.reason}${e.detail ? ` (${e.detail})` : ""}`,
        );
      }
    }

    if (result.considered === 0) break;
  }

  console.log(
    `[admin-grade] DONE iterations=${iteration} totalConsidered=${totalConsidered} succeeded=${totalSucceeded} failed=${totalFailed}`,
  );

  if (totalFailed > 0) {
    console.log(
      `[admin-grade] ${totalFailed} jobs failed grading — see iter logs above`,
    );
    process.exit(2);
  }
}

main();
