# Domain Context — `get-me-a-job`

Ubiquitous language for the SmartJobPulse pipeline. Terms here are the canonical names; aliases in code or conversation should resolve back to these.

## Glossary

### Core entities

- **`JobOffer`** — the central stored entity. A row in the `JobOffer` MongoDB collection, materialised from a single Apify scrape of a LinkedIn job posting. Identified by `jobId` (the LinkedIn numeric ID, unique).
- **`aiAnalysis`** — the embedded `AiAnalysis` Prisma type on `JobOffer`: `{ score: 1..100, whyItFits: string }`. The output of the grader. Optional on the row (job may exist before grading completes or after a grading failure).
- **`descriptionHash`** — hex `sha256(job.description)`. Persisted on `JobOffer`; identifies the current description content.
- **`gradedDescriptionHash`** — the `descriptionHash` represented by the stored `aiAnalysis`. If absent or different from the current hash, the analysis is stale and the offer is pending grading.
- **`CV`** — the user's résumé, stored at `cv/CV_2026.pdf` and loaded server-only via `pdf-parse`. Never exposed to clients, never logged, never embedded in outbound LLM bodies.

### Subsystems

- **ingestion** — the act of persisting jobs from Apify into MongoDB via `POST /api/webhooks/apify`. The seam where Apify meets the system.
- **grader** — the module that computes an `aiAnalysis` from a job + CV via an `OpenRouterClient`. Owns the prompt, the zod schema, and the null-on-failure policy.
- **`gradeJob`** — the pure function exported by the grader. Signature: `gradeJob({client, cvText, job}): Promise<GraderResult>`.
- **`OpenRouterClient`** — the seam interface for any LLM call to OpenRouter chat completions. The only function: `complete(prompt, opts?): Promise<string>`. The factory reads `OPENROUTER_MODEL` (default `meta-llama/llama-3.3-70b-instruct:free`) and `ROUTER_API_KEY`.

### Conventions

- **Best-effort grading**: a failed grading call returns a typed failure and leaves the job pending. Ingestion remains independent from grader availability.
- **Hash-difference trigger**: a job is eligible for grading when `aiAnalysis` is absent or `gradedDescriptionHash` differs from the current `descriptionHash`.
- **Stale analysis**: an `aiAnalysis` whose graded hash does not match the current description hash remains stored but is not shown as current.
- **Bounded grading concurrency**: pending jobs are claimed with expiring leases and graded in waves of at most three. Ingestion never calls the grader.
- **Logging allowlist**: grading logs use only `[grading]` prefix with `jobId`, `score`, `dur=Ms`, or `reason=<network|timeout|parse|validation>`. No CV, no full prompt, no raw LLM body in any log line.

## Cross-references

- Architecture decisions live in `docs/adr/`.
- The user-facing product spec lives in `PRD.md` (source of truth for scope and epics).
- The visual style lives in `DESIGN-SYSTEM.md` (source of truth for tokens, typography, component specs).
