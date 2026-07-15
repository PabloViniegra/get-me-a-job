# ADR-0001: Add `descriptionHash` to `JobOffer`

**Status:** Accepted (2026-07-15)
**Deciders:** Pablo Viniegra
**Related:** Issue #14 (Epic 2 spec), Issue #15 (Ticket 7 — implementation).

## Context

PRD Epic 2 / FR-2.1: "For every *new* or *significantly edited* job posting during ingestion, the system must invoke an OpenRouter API completion." Free-tier OpenRouter calls are slow (free tier latency 1–10s typical, up to 30s outliers) and rate-limited (429 on bursts). We need a way to detect "significantly edited" jobs so we don't burn our free-tier budget re-grading identical re-scrapes.

The risk we needed to close: if Apify sends the same job dataset twice (which it does — daily cron may surface unchanged jobs), naive "grade every item" re-grades every job every run.

## Decision

Add a nullable `descriptionHash` field to `JobOffer`. Hash the job's `description` text with `sha256`, hex-encode, persist on every `upsert`. Skip grading when the stored hash equals the incoming hash **and** `aiAnalysis` is already non-null on the stored row.

```prisma
model JobOffer {
  // ...
  descriptionHash String?
  // ...
}
```

Nullable to permit additive migration without backfill. Existing rows have `descriptionHash = null` → next scrape re-grades them once (acceptable: small one-time cost).

## Consequences

**Positive**
- Deterministic, O(1) comparison; no LLM cost to decide whether to call LLM.
- Additive, nullable schema migration — no downtime, no data movement.
- Hash algorithm pinned (`sha256`); future algorithm change is a separate concern.

**Negative**
- False negatives possible: if LinkedIn reformats description text but content is unchanged, hash differs and we re-grade. Acceptable: free-tier cost is bounded; re-grade is idempotent.
- Any hash-algorithm change in the future forces re-grading of all jobs. Mitigated by pinning `sha256` in code; documented in `CONTEXT.md`.
- Adds one column to every `JobOffer` row (~64 bytes hex). Trivial.

## Alternatives Considered

**A. Re-grade every call (no diff).** Simplest, no schema change. Rejected: budget burn on idempotent re-scrapes.

**B. Diff the full mapper output (title + description + salary + format + requirements).** No schema change. Rejected: too noisy — LinkedIn reorders whitespace, formats currency differently, or splits salary into different fields, producing false positives that waste tokens. A single hash on `description` is a stable signal of "intent changed".

**C. Re-grade via cron worker on `aiAnalysis = null` rows.** No diff needed. Rejected for MVP: adds infra (cron schedule + worker), requires state-tracking outside the webhook. Kept on the roadmap as an escape hatch if webhook runtime balloons.

**D. Skip re-grade entirely, only grade on creation.** Rejected: contradicts PRD FR-2.1 ("significantly edited").
