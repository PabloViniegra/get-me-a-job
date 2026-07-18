# ADR-0004: Track grading freshness and claim work with expiring leases

**Status:** Accepted (2026-07-18)
**Deciders:** Pablo Viniegra
**Related:** [ADR-0001](./0001-description-hash-on-joboffer.md), [ADR-0003](./0003-decouple-grading-from-ingestion-webhook.md)

## Context

ADR-0003 requires grading every new or significantly edited `JobOffer`, but the implementation selected only rows with `aiAnalysis = null`. Ingestion replaces `descriptionHash` before the separate grading run, so the previous hash is no longer available and an existing analysis can remain attached to a changed description. Separate manual, chained, or scheduled grading invocations can also select the same row and duplicate OpenRouter work.

## Decision

Add two nullable fields to `JobOffer`:

- `gradedDescriptionHash` records the current `descriptionHash` only after a successful grading result is persisted.
- `gradingLeaseUntil` claims a row for five minutes before calling OpenRouter.

A row is eligible when it has a non-null current hash, no active lease, and either no analysis or a graded hash different from the current hash. Candidate scanning uses stable cursor pagination in pages of 100 until 30 rows are claimed or the collection is exhausted.

Claims use conditional `updateMany` operations so only one invocation can acquire an available or expired lease. Final persistence also requires the current hash and lease to match the original claim. If the description changed during grading, the result is discarded, the lease is released, and the row remains pending. Grading failures release their lease and preserve the previous analysis.

An analysis is current only when `gradedDescriptionHash === descriptionHash`. Stale analyses remain stored but are hidden from the dashboard and sorted with pending offers. Existing rows with no graded hash are re-graded once after deployment.

The admin endpoint accepts `limit` from 1 to 30 and `concurrency` from 1 to 3. Invalid input returns HTTP 400. Batch results preserve `considered`, `succeeded`, `failed`, and `errors`, and add `skipped`; `considered = succeeded + failed + skipped`.

## Consequences

- Re-grading now matches FR-2.1 and ADR-0003 for edited descriptions.
- Overlapping invocations do not intentionally duplicate LLM work, and abandoned claims recover automatically.
- Deploying this change temporarily marks existing analyses pending and consumes quota to validate them once.
- Cursor pagination avoids the previous fixed 500-row starvation risk.
- Retry jitter, `Retry-After`, and webhook batch resilience remain separate decisions.
