# ADR-0006: Auto-trigger grading from the Apify webhook via `after()`

**Status:** Accepted (2026-07-19)
**Deciders:** Pablo Viniegra
**Partially supersedes:** [ADR-0003](./0003-decouple-grading-from-ingestion-webhook.md) (trigger model only — the decoupling decision still stands).
**Related:** [ADR-0003](./0003-decouple-grading-from-ingestion-webhook.md), [ADR-0004](./0004-grading-state-and-concurrency.md).

## Context

[ADR-0003](./0003-decouple-grading-from-ingestion-webhook.md) split ingestion from grading and pinned the trigger model as **operational, not architectural**: "The repo does not prescribe one scheduler — that decision is outside this ADR." The intent was to keep `POST /api/webhooks/apify` and `POST /api/admin/grade` decoupled, with the maintainer wiring an Apify "after run" chain, a Vercel cron, or a manual `curl` between them.

In practice the maintainer never wired that operational trigger. New jobs from the daily Apify scrape land in MongoDB with `aiAnalysis = null`, stay on the dashboard under the "Sin analizar" tier, and never get processed until someone manually hits `POST /api/admin/grade`. The dashboard is now visibly lagging the data plane, which is the exact user-visible bug this ADR was supposed to prevent.

ADR-0003 also explicitly rejected fire-and-forget from inside the webhook (Alternative A):

> "Rejected: orphaned promises lose state on Vercel worker termination, and silent failures complicate the same observability we wanted by inlining in the first place."

That reasoning is still correct. `next/server`'s `after()` runs the callback in the same Vercel worker, and the worker is freezable / terminable once the response is flushed. The orphan risk is real.

## Decision

1. **Make the trigger automatic and in-code.** After the `upsert` loop in `POST /api/webhooks/apify` succeeds, the route schedules a non-awaited `POST /api/admin/grade` against its own origin using Next 15+ `after()`. The webhook response returns immediately to Apify; the grade call runs after the response is flushed.

2. **Decoupling decision from ADR-0003 stays.** Grading still happens in `gradePendingJobs` (the same function a Vercel cron, an Apify "after run" chain, or a manual `curl` could call). The webhook still contains **no** LLM code, no OpenRouter calls, no retry budget — those live in the admin endpoint exactly as ADR-0003 specified. This ADR only changes **who calls** that endpoint, not what it does.

3. **Bearer auth unchanged.** The trigger carries `Authorization: Bearer ${APIFY_ADMIN_SECRET}` — the same secret the admin endpoint already validates against. No new env var, no new secret to rotate.

4. **Self-origin only.** The trigger URL is derived from the incoming `request.url` (`new URL("/api/admin/grade", request.url)`). The webhook cannot be made to hit a different origin by a malformed Apify payload.

5. **Pure helper for testability.** The fetch logic lives in `src/app/api/webhooks/apify/trigger-grade.ts` as `fireGradingTrigger(baseUrl, secret, deps?)`. `deps.fetchImpl` is the seam for unit tests. The route file wires it into `after(() => fireGradingTrigger(...))`.

6. **Best-effort failures.** A non-2xx response or a thrown fetch logs a `log.warn` and is swallowed. The webhook has already returned 200 to Apify; there is no client to surface an error to. The admin endpoint is idempotent, so a retry on the next scrape is harmless.

## Consequences

**Positive**
- New jobs get graded automatically within seconds of the Apify webhook returning, with no operator action. The "Sin analizar" backlog stops growing.
- The decoupling surface (`/api/admin/grade` as an independently callable endpoint) is preserved. A Vercel cron or Apify chain remains a viable migration target if the orphan risk materializes in production.
- The trigger is unit-testable in isolation — no Next runtime needed for the helper.

**Negative**
- **Orphans on Vercel worker termination.** The grade call can be cut short if Vercel freezes the runtime after the response is sent. Mitigation: the admin endpoint is idempotent (hash-gated per ADR-0004), so a partially-completed batch is safely retried on the next scrape or cron. We accept that a single scrape's grades may complete in two waves rather than one.
- **Silent failures complicate observability.** `log.warn` on non-2xx is the only signal. Mitigation: `gradePendingJobs` already returns a structured `{ considered, succeeded, failed, skipped, errors }` summary; we can surface it through a later admin stats endpoint if the silent failures become a real problem.
- **Couples webhook uptime to admin-endpoint availability.** A 5xx from `/api/admin/grade` no longer breaks ingestion (the call is non-awaited) but does mean a backlog. Same recovery path as orphans: next scrape retries the pending rows.
- **Local dev noise.** `fireGradingTrigger` logs on every successful call when `NODE_ENV !== "production"`. Acceptable for development; production stays silent.

## Alternatives Considered

**A. Wire Apify's "after run" hook on the Apify dashboard** (the original ADR-0003 escape hatch). Still a valid configuration change — but it's a manual step the maintainer did not perform, and there is no automated check that it stays configured. In-code triggers do not have that drift risk.

**B. Vercel Cron (`vercel.json` schedule).** Still a valid option for periodic backfill of rows the webhook missed. Complements this ADR rather than replacing it; ADR does not preclude adding the cron later.

**C. Move grading to a queue worker (BullMQ / Inngest).** Rejected: not free-tier-shaped, same trade-off ADR-0003 Alternative C called out. The admin endpoint stays queue-ready: `gradePendingJobs` is the right handler shape for a future queue adapter.

**D. Inline grading again (reverse ADR-0003).** Rejected: the worst-case timing problem ADR-0002 flagged is still real. This ADR keeps the inline path off the table.
