# ADR-0007: AI cover letter per offer

- Status: Accepted
- Date: 2026-07-20

## Context

The dashboard already surfaces a per-offer match score (`aiAnalysis`) plus a short `whyItFits` rationale (ADR-0001, ADR-0004). Users want the next step: a tailored cover letter they can copy and submit, generated on demand and grounded in their real CV. Two surfaces need the same trigger — the offer card on the list and the detail modal — so the workflow must avoid dead-ends in either entry point.

Cover letters are longer than grading output (~600 tokens vs ~250) and the model call is the dominant cost. We also have to guard against abuse: this endpoint burns paid OpenRouter tokens per request, but the dashboard is currently unauthenticated (consistent with `jobs.list`).

## Decision

- **Persistence.** Each offer carries its own cover letter on `JobOffer`: `coverLetter`, `coverLetterDescriptionHash`, `coverLetterRegenerations` (defaults to 0), `coverLetterLastRegeneratedAt`. Pattern mirrors `aiAnalysis`/`gradedDescriptionHash` so future "stale" detection can hook in without migration.
- **Initial generation is free; regenerations are rate-limited.** `computeRateLimit({ currentRegenerations, lastRegeneratedAt, now })`:
  - `nextCount <= 3` (i.e. first three regenerations) → allowed, no wait.
  - Otherwise `requiredWaitMs = 30_000 * 2^(overCount - 1)`; if elapsed since `coverLetterLastRegeneratedAt` is below it, the route returns **HTTP 429** with `{ retryAfterMs, nextRegenerationCount }`. Concretely: 4th regen waits 30 s, 5th waits 60 s, 6th waits 120 s, …
  - Counter is bumped only on regeneration, not on initial generation, so the first three user clicks are all unblocked.
- **Streaming transport.** The endpoint is `POST /api/cover-letter/[jobId]` and returns a `Response` whose body is a `ReadableStream<Uint8Array>`. We use Next.js native `ReadableStream` (with `start` enqueuing chunks) rather than tRPC because tRPC v11 async-iterator streaming is awkward and we want first-class `AbortSignal` propagation so an aborted client cancels the OpenRouter fetch and we **discard the partial** (no DB write).
- **OpenRouter client.** Add `stream(prompt, opts)` to `OpenRouterClient`. It posts with `stream: true` and `Accept: text/event-stream`, parses SSE line-by-line (with a buffer for partial lines), and yields `choices[0].delta.content`. Termination sentinel is OpenRouter's `data: [DONE]`. Errors propagate (network / HTTP status / missing body) and the caller can `try/finally` to release the reader lock.
- **No `response_format: json_object`.** The cover letter is prose, so the stream request omits it. This keeps the existing `complete()` method (used by the grader) untouched.
- **UI surfaces.**
  - `JobCard` adds a small "Carta IA" button next to "Ver detalles".
  - `JobDetailModal` (refactored under the 250-line cap by extracting the new section) renders `<CoverLetterSection>` near the top of the body, plus a "Carta IA" / "Ver carta IA" button in the footer that scrolls the modal to the section via `getElementById("job-detail-cover-letter").scrollIntoView`.
  - Card-button click passes `initialSection: "cover-letter"` so the modal auto-scrolls to the cover letter on open.
  - `CoverLetterSection` owns its own state machine: `idle` → `streaming` → (`rate-limited` | `error` → `idle`). It consumes the `fetch` response body via `ReadableStream.getReader()`, updates text per chunk, and shows a blinking caret + per-paragraph fade-in during streaming.
  - `CopyButton` is a reusable morph (idle `Copy` ↔ copied `Check`, `AnimatePresence mode="wait"`, 1.5 s reset) wired to `navigator.clipboard.writeText`.

## Consequences

- **Cost.** Each generation pays for one OpenRouter chat completion (~600 output tokens + ~3 k input). Without auth, anyone hitting `/api/cover-letter/[jobId]` can spend that budget. Acceptable today (single-user personal dashboard); flagged below.
- **No auth.** The endpoint is public, same as `jobs.list`. Any caller can drive the rate limiter per `jobId`, but `jobId` is the natural quota key, not the user.
- **No automatic invalidation on description change.** A stale `coverLetter` (offer description changed after generation) is surfaced as-is. User must hit "Regenerar" to refresh. `coverLetterDescriptionHash` is recorded so a future "stale" badge is a UI-only change.
- **Single model.** `OPENROUTER_MODEL` env var (already present) selects the model used for both grading and cover-letter generation. A long cover letter on a small/cheap model can be noticeably lower quality — call out in future ADR if we add model overrides.
- **Streaming cancellation.** Closing the modal or navigating away aborts the fetch; the route handler propagates `request.signal` into the upstream `client.stream()` and `finally` releases the SSE reader. The DB write only runs after the generator yields all chunks without throwing, so partial content is never persisted.

## Follow-ups (not done now)

- **Auth + per-IP rate limiting.** Add bearer secret middleware or edge IP rate limit (Upstash) before exposing publicly beyond localhost.
- **Stale indicator.** Compare `coverLetterDescriptionHash` with current `descriptionHash` and surface an "Oferta actualizada · Regenerar" hint.
- **Telemetry.** Log chars/sec + model to detect regressions. Today we log `start`, `ok`, and `error` events with `jobId`, `cvLen`, `chars`, `dur`.
- **Concurrency safety on counter.** Two simultaneous regen clicks could race the `increment: 1` and skip the rate limit. Real users don't do this; if it becomes an issue, move the increment into a `findFirstAndUpdate` with the rate-limit predicate atomic.