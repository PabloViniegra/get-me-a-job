# ADR-0005: Paginate the dashboard feed on the server

**Status:** Accepted (2026-07-19)
**Deciders:** Pablo Viniegra
**Related:** [ADR-0004](./0004-grading-state-and-concurrency.md), CWV audit memory `#1250`

## Context

`jobs.list` returns the entire `JobOffer` collection in a single Prisma
`findMany` with no `take`. Production is now sitting on ~700 rows after a few
weeks of scraping. The full payload is around 93 KB compressed (500 KB
uncompressed), and the dashboard renders every row synchronously after
TanStack hydrates. Lighthouse mobile medians at the time of the audit:
performance score 60, LCP 3.54 s, TBT 3.55 s, CLS 0.00036 (good), FCP
1.09 s. The bottleneck is the unbounded fetch and render, not TTFB. CLS is
already inside the green threshold.

`DashboardStats` reuses that same `useQuery` to count offers by tier, so the
total collection has to be in client memory before the totals paint. The
`DASHBOARD · 709 OFERTAS · MÁS RECIENTE ENCONTRADO 20 HORAS` line is what
Lighthouse reported as the LCP element. The skeleton grid never shifts, but
the document grows by hundreds of cards in one paint and the entrance
animation staggers only the first six cards (`STAGGER_INDEX_CAP = 6`).

ADR-0004 already uses Prisma cursor pagination in pages of 100 for the
grading scan and explicitly avoids the previous fixed-scan starvation risk.
This ADR applies the same trick to the dashboard read path.

## Decision

1. **New cursor-paginated `jobs.list` input.** All fields are optional so the
   existing `jobs.list()` call site keeps working until the frontend
   migrates:
   - `cursor`: last `id` from the previous page, opaque to the client.
   - `limit`: 1..48, default 24.
   - `query`: case-insensitive substring search on `title` via Prisma
     `contains`, trimmed server-side.
   - `formats`: subset of `["Remote", "Hybrid", "On-site"]`; absent or full
     set is a no-op.
   - `sortKey`: `"score"` (default) or `"createdAt"`.
   - Returns `{ items: JobCardData[]; nextCursor: string | null }`.

2. **Stable sort with a unique tiebreaker.** Order becomes
   `[{ aiAnalysis: { score: "desc" } }, { id: "desc" }]`. `id` (Mongo `_id`)
   replaces `updatedAt` as the tiebreaker so the Prisma cursor is always
   uniquely positioned. With `updatedAt` at second precision, two rows
   could share `(score, updatedAt)` and break cursor continuity. The visible
   order only changes when two rows have identical score **and** identical
   sub-second `updatedAt`, which is rare.

3. **`jobs.summary` for totals.** A second public procedure returns
   `{ total: number; excellent: number; pending: number }` from a single
   Prisma `count` followed by conditional counts. `DashboardStats` consumes
   this so the top bar paints accurate numbers on the first page without
   re-rendering 700 cards.

4. **Tier filter stays client-side for this ADR.** Tier is a derived field
   based on `aiAnalysis.score` and the `gradedDescriptionHash ===
   descriptionHash` invariant, so it does not map cleanly to a Prisma
   `where`. With 24-row pages the client-side filter is negligible. If the
   dataset grows past a few thousand rows or if users report the page
   "running out" of tier matches, a follow-up ADR can express the tier as a
   Prisma predicate (`score gte` plus the hash equality) or as an
   `$lookup`-backed aggregation.

5. **Infinite scroll on the client.** The dashboard uses
   `@tanstack/react-query` `useInfiniteQuery`. A bottom sentinel via
   `IntersectionObserver` triggers `fetchNextPage`. The first page reaches
   the client as part of the initial render so LCP stays on the existing
   prerendered skeleton until data is ready; refresh and error states stay
   the same.

6. **Legacy `jobs.list()` is preserved** as a shim that calls the new
   procedure with all defaults. Once the frontend migrates, this shim is
   deleted.

## Consequences

- First page transfers ~5 KB of card data instead of 93 KB. Lab Lighthouse
  run after deployment should show LCP ≤ 1.5 s mobile and TBT ≤ 200 ms.
- The dashboard renders 24 cards on first paint and 24 more per scroll; DOM
  size stops growing after each fetch. CLS should not regress because the
  grid already had a stable skeleton footprint sized for the page.
- `DashboardStats` shows the same numbers it does today, but from
  `jobs.summary` rather than counting the rendered page.
- `useDashboardFilters` keeps the same shape. `applySort`, `searchJobs`,
  and `filterByTiers` stay on the client because they operate on the
  current page; only `filterByFormats` and `searchJobs` will have a
  server-side counterpart that the dashboard does **not** call yet (see
  Slice 6).
- If a future feature needs the full ordered list server-side (e.g.,
  exporting offers), it should `unstable_cache` per-day rather than call
  this procedure.
