# ADR-0003: Decouple LLM grading from the Apify ingestion webhook

**Status:** Partially superseded by [ADR-0006](./0006-automatic-grading-trigger-from-webhook.md) (trigger model only — the decoupling decision still stands).
**Deciders:** Pablo Viniegra
**Supersedes:** [ADR-0002](./0002-inline-grading-in-ingestion-webhook.md)
**Related:** [ADR-0001](./0001-description-hash-on-joboffer.md) (hash-gated grading);
PRD Epic 2 / FR-2.1.

> **Note (2026-07-19):** ADR-0006 pins the trigger model as automatic and in-code
> (`after()`-scheduled `POST /api/admin/grade` from inside the webhook) instead
> of leaving it as "operational, not architectural". The decoupling decision
> (webhook = pure upsert pipeline; grading = independent admin endpoint) is
> unchanged.

## Context

[ADR-0002](./0002-inline-grading-in-ingestion-webhook.md) chose to run `gradeJob`
**inline and sequentially** inside the Apify webhook's `upsert` loop. The reasoning
held for the first real runs: webhook p99 stayed well under Vercel's 60s default
timeout, hash-gating (ADR-0001) kept the per-job cost bounded, and the simple single
route was easy to observe.

In practice the worst case caught up with the design. Free-tier OpenRouter latency
hits a long tail (per [ADR-0002](./0002-inline-grading-in-ingestion-webhook.md)'s own
"Negative" section: ~30s outliers × N jobs). Once a daily scrape lands a run with
several outliers and a long Apify dataset, the webhook risks Vercel terminating the
worker mid-loop with no `await` recovery. We have two separate concerns collapsed
into one place: (a) **ingestion durability** (every Apify item must persist) and
(b) **grading latency** (every new/changed `JobOffer` should eventually get an
`aiAnalysis`). Conflating them in the webhook means a slow LLM call can break the
data pipeline.

## Decision

Split the two concerns:

1. **`POST /api/webhooks/apify`** is a **pure upsert pipeline**. No LLM calls,
   no retry budget logic, no OpenRouter timeouts. Returns within seconds of the
   Apify stream completing.
2. **LLM grading moves out of the webhook** to `POST /api/admin/grade` (Bearer
   `APIFY_ADMIN_SECRET`). The endpoint wraps `gradePendingJobs({ limit, concurrency })`
   which:
   - Loads `JobOffer` rows where `descriptionHash` differs from stored or
     `aiAnalysis` is null (hash-gating from
     [ADR-0001](./0001-description-hash-on-joboffer.md) preserved verbatim),
   - Grades each via `gradeJob` with the existing 30s `AbortController` timeout and
     3-attempt exponential backoff for 429s, and
   - Writes `aiAnalysis` on success. Best-effort: a single failure logs + skips,
     the rest of the batch proceeds.
3. **Trigger model is left operational, not architectural.** The endpoint is
   idempotent and may be invoked by an Apify "after run" chain, a Vercel cron, or a
   manual `curl`. The repo does not prescribe one scheduler — that decision is
   outside this ADR.

## Consequences

**Positive**
- Webhook uptime decouples from OpenRouter uptime. A free-tier outage no longer
  threatens ingestion.
- Webhook p99 budget recovers. Targeting < 5s for the data plane (matched the
  appetite noted in ADR-0002's Alternative B).
- Grading observability improves: `gradePendingJobs` returns a structured
  `{ requested, graded, skipped, failed }` summary that callers can log or surface.
- Easy to backfill `aiAnalysis = null` rows on demand without re-running the Apify
  scrape.
- Future migration to a queue worker (BullMQ, Inngest, …) is purely a routing
  change to the same `gradePendingJobs` function — no data-model rewrite.

**Negative**
- Requires an additional operational trigger between ingestion and grading. For
  MVP this is a `curl` or a chained Apify task; not free, but bounded.
- An ingestion run without a grading run leaves rows with `aiAnalysis = null`
  visible on the dashboard ("Pendiente" tier). Acceptable: the chip's
  "Sin analizar" copy makes this an explicit state, not a bug.
- If `gradePendingJobs` is invoked too long after ingestion, freshly-edited jobs
  may sit ungraded until the next run. Mitigated by the idempotency of the admin
  endpoint.

## Alternatives Considered

**A. Keep inline grading, harden the timeout (`waitUntil` + fire-and-forget).**
Rejected: orphaned promises lose state on Vercel worker termination, and silent
failures complicate the same observability we wanted by inlining in the first place.

**B. Webhook becomes a thin toast, grading is purely background-driven by a cron
worker.** Rejected for MVP: the admin endpoint gives the maintainer an explicit
manual recovery path that pure cron does not; the endpoint stays cheap (a couple
of seconds per batch with concurrency 1).

**C. Queue worker (BullMQ / Inngest / SQS).** Rejected: not free-tier-shaped. The
admin endpoint defers this decision without locking us out — `gradePendingJobs`
already has the right shape to be a queue handler later.

**D. Inline grading with a tighter 3–5s per-call budget and a queue-only-the-nulls
fallback.** Rejected: still couples uptime and re-introduces the worst-case timing
problem ADR-0002 flagged but did not solve.
