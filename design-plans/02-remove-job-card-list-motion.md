# Remove ambient list motion from JobCardList

Written against: `e8eb9d2` (HEAD)

## Evidence chain

- Surface: `src/app/page.tsx` → `JobsDashboard` (`src/app/_components/jobs-dashboard.tsx:229-253`) → `JobDetailsContainer` (`src/app/_components/job-details-container.tsx:34-47`) → `JobCardList` (`src/app/_components/job-card-list.tsx`).
- Problem: every card in the dashboard grid is wrapped in `m.li` under `AnimatePresence` with stagger enter, stagger exit, and a layout transition. The motion fires on every filter change, sort change, and infinite-query refetch — not on user interaction with a single card. The design reserves motion for the `excellent MatchScoreChip` only and explicitly forbids "ambient micro-animations anywhere else".
- Design evidence:
  - `DESIGN.md` §Motion: `"Motion is rare, and that rarity is what makes the one motion that does run — the excellent MatchScoreChip — mean something. No spring, no bounce, no ambient micro-animations anywhere else."`
  - `DESIGN.md` §Motion table: hover / press micro-interactions are limited to `transition-transform duration-150 ease-out` and `active:scale-[0.97]`. Layout/stagger enter/exit are not listed.
  - `src/app/_components/match-score-chip.test.ts` asserts the invariant directly: only `excellent` carries `animate-` classes; every other tier is static. `JobCardList` violates that invariant at the surface level by adding more ambient animation that the test does not cover.
- Owner: `src/app/_components/job-card-list.tsx:38-72` (`AnimatePresence` + `m.li` with `initial`, `animate`, `exit`, `layout`, `layoutDependency`, custom easing tuple `EASE_OUT_QUINT`).
- Scope and affected surfaces: the job-card grid only. The modal (`job-detail-modal.tsx`), the cover letter streaming caret, the copy-button icon swap, and the `excellent` chip itself all stay as they are — they are either inside the documented motion table or interactive feedback, not ambient list motion.
- Uncertainty: none. The contract is explicit, the test in `match-score-chip.test.ts` documents the "only `excellent` moves" invariant, and the implementation has no documented exception.

## Design decision

Render `JobCardList` as a plain `<ul>` of `<li>` elements wrapping `<JobCard>`. Drop the `motion/react` and `motion/react-m` imports, the `EASE_OUT_QUINT` constant, the `ENTER_STAGGER_*` constants, and the `AnimatePresence` / `m.li` machinery. `JobCard` already carries the documented hover micro-interaction (`transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-px hover:border-border-secondary` in `src/app/_components/job-card.tsx:32`) and the press micro-interaction on its ghost buttons (`active:scale-[0.97]`); no visual feedback is lost.

## Reuse

- Primitives: standard HTML `<ul>` / `<li>`; the existing `JobCard` component, untouched.
- Exemplar: `src/app/_components/job-card-grid-skeleton.tsx:11-22` — the same `<ul>` / `<li>` anatomy used by the skeleton, kept on purpose to mirror the loaded shape. The loaded list converges on the same structure.

No new primitive is required. Removing ambient motion is a deletion, not an addition.

## Changes

1. `src/app/_components/job-card-list.tsx`
   - Change: rewrite the file so that `JobCardList` returns `<ul aria-busy={isFetchingNextPage} className="relative grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{jobs.map((job) => (<li key={job.id}><JobCard data={job} onViewDetails={onSelectJob} /></li>))}</ul>`. Remove the `AnimatePresence` import, the `* as m from "motion/react-m"` import, the `ENTER_STAGGER_STEP_SECONDS`, `ENTER_STAGGER_INDEX_CAP`, and `EASE_OUT_QUINT` constants, and the unused `index` argument from the map.
   - Preserve: the grid breakpoints (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`), the `gap-4` gutter, the `relative` wrapper class, the `aria-busy` reflection of `isFetchingNextPage`, the `JobViewTarget` type, the prop surface, and every consumer (`JobDetailsContainer`, which forwards `jobs`, `isFetchingNextPage`, and `onSelectJob`).
   - Verify: rendered grid renders without opacity / y-translate transitions on filter, sort, or refetch; `bun run lint` passes; `bun run test` still passes (the motion contract test in `match-score-chip.test.ts` is unaffected; no test currently asserts on `JobCardList` motion).

## Scope

- Inherit: every screen that mounts `JobCardList` (currently only the dashboard's loaded branch in `src/app/_components/jobs-dashboard.tsx:228-253`).
- Verify: `src/app/_components/job-card-list.tsx` (the only direct consumer), `src/app/_components/job-details-container.tsx` (the wrapper), and the loaded-grid branch of `src/app/_components/jobs-dashboard.tsx`. The skeleton branch (`JobCardGridSkeleton` → `JobCardSkeleton`) is already static and stays unchanged.
- Exclude: the modal stagger entrance was committed as a separate animation in `74881d9` and is bound to HeroUI's modal lifecycle via `globals.css:116-129`; it is not part of this finding. The cover letter streaming caret and the copy-button icon swap are interaction-feedback or documented motion and stay unchanged.

## Validation

- Product: opening the dashboard, applying a filter, switching sort order, or pulling a new page no longer triggers a card-grid stagger or layout shift. The first render still shows the cards in their final positions; subsequent renders replace them in place.
- Interface: light and dark themes; viewport widths from mobile (single column) through `md:` (2-up) through `xl:` (3-up); both initial load and infinite-scroll pagination states. `prefers-reduced-motion: reduce` becomes a no-op for the grid (the chip's own `motion-safe:` prefix already covers the only remaining motion).
- System: `motion/react` and `motion/react-m` stay imported where they actually drive documented motion (the chip via `globals.css`, the theme toggle via the View Transitions API, the cover letter caret, the copy-button feedback). No new shared primitive is introduced.
- Repository: `bun run lint` → exit 0; `bun run test` → all suites pass (the chip contract test in `match-score-chip.test.ts` and the score-tier test in `src/lib/score-tier.test.ts`).

## Stop conditions

- Stop if `JobCardList` ever needs a real layout transition (for example, a "Reorder columns" affordance). In that case, reopen this plan and re-scope; the ambient stagger was the only thing being removed.
- Stop if a future design revision introduces a documented exception for grid-level motion; update `DESIGN.md` §Motion first, then this plan.

## Design documentation

- After acceptance and validation: no change. `DESIGN.md` §Motion already states the rule this plan enforces; the implementation is being aligned with the existing contract.
