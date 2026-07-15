# ADR-0002: Inline grading in the Apify ingestion webhook

**Status:** Accepted (2026-07-15)
**Deciders:** Pablo Viniegra
**Related:** Issue #14 (Epic 2 spec), Issue #19 (Ticket 11 — implementation).

## Context

PRD FR-2.1 calls for grading on each new or edited job. PRD §5 calls out that the free-tier OpenRouter models throttle on bursts and recommends "slight millisecond intervals" or batching. The Apify webhook at `POST /api/webhooks/apify` already iterates the dataset item by item and `upsert`s each `JobOffer`. We need to choose where the grader runs.

The two-axis question: **(when)** during ingestion vs after, and **(how)** synchronous vs queued.

## Decision

Run `gradeJob` **inline and sequentially** inside the existing `for (const item of items)` loop in the webhook handler. Each call bounded by a 30s `AbortController` timeout. Best-effort failure: log + skip + leave `aiAnalysis` null.

**Order per item**: `upsert` → compare hashes → call `gradeJob` (if hash differs) → write `aiAnalysis` on success.

## Consequences

**Positive**
- Single route of code. All state visible in webhook logs; one place to add tracing or retries later.
- Sequential ordering naturally enforces PRD §5's "slight millisecond intervals" without an extra scheduler.
- No new infra (no cron, no queue worker, no message broker).
- Webhook idempotency preserved: same hash on re-scrape is a no-op for grading.

**Negative**
- Webhook runtime = base + N × grading_time. Worst case (100 jobs × ~30s for free-tier outliers) = ~50 minutes — far beyond Vercel's 60s default. If daily job counts push webhook runtime up, this decision needs revisiting.
- OpenRouter latency variance directly increases webhook timeout risk. Mitigated with the 30s per-call `AbortController`.
- Couples webhook uptime to OpenRouter uptime. Mitigated with best-effort (failure → log + skip; webhook still 200).

## Alternatives Considered

**A. Fire-and-forget (`void (async () => ...)` / `waitUntil`).** Rejected: orphaned promises lose grading if the Vercel worker terminates, and silent failures complicate observability. Worth the complexity only when webhook runtime becomes the bottleneck.

**B. Separate cron / queue worker.** Rejected for MVP. Cleaner architecture long term (webhook stays < 5s, no LLM blocking the response). Cost: state machine outside the webhook, retry semantics, observability across two surfaces. Deferred to a future epic if/when webhook timeouts become a real problem.

**C. Streaming grades from OpenRouter (SSE / chunked transfer).** Rejected: we need a strict JSON `{score, whyItFits}` payload, not partial tokens. Streaming complicates error handling and forces a parser over a stream. Non-streaming is the simpler shape for this contract.

**D. Parallel grading (`Promise.all` over items).** Rejected: free tier rate-limits on bursts; parallel would maximise 429 probability. Sequential is the deliberate posture.
