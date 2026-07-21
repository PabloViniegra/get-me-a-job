# Align DashboardStats radius with `{rounded.field}`

Written against: `e8eb9d2` (HEAD)

## Evidence chain

- Surface: `src/app/page.tsx` → `JobsDashboard` (`src/app/_components/jobs-dashboard.tsx:181-185`) → `DashboardStats` / `DashboardStatsSkeleton` at the top of the section.
- Problem: The bar uses `rounded-md` (0.375rem / 6px) where the design contract specifies `{rounded.field}` (0.75rem / 12px). At a glance the bar is visibly tighter than `JobCard`'s 8px and the documented contract is broken in two files (the component and its skeleton, kept in lock-step on purpose).
- Design evidence:
  - `DESIGN.md` frontmatter, `components.dashboard-stats.rounded: "{rounded.field}"`.
  - `DESIGN.md` §Components §DashboardStats: `"Bar uses {colors.surface} + {colors.border} with 12px vertical padding and {rounded.field}."`
  - `DESIGN.md` §Shapes: `{rounded.field} = 0.75rem (12px) — form fields, the dashboard-stats bar.`
  - Tailwind v4 default `rounded-xl` resolves to `0.75rem`, equal to `{rounded.field}`.
- Owner: `src/app/_components/dashboard-stats.tsx:37` and `src/app/_components/dashboard-stats-skeleton.tsx:32`.
- Scope and affected surfaces: the bar (and its skeleton) at the top of the dashboard; no other file uses `{rounded.field}` so the change is local. JobCard continues to use `{rounded.base}` via `rounded-lg` and is unaffected.
- Uncertainty: none.

## Design decision

Replace `rounded-md` with `rounded-xl` on both the loaded bar and its skeleton so the surface honours `{rounded.field}` exactly. The bar already matches the loaded shape on every other dimension (`border border-border bg-surface px-2 py-3`, ticks between cells, `font-mono text-xl …` for the value), so this is a single-class correction that preserves the documented padding, surface, and tick geometry.

## Reuse

- Token: `{rounded.field}` via Tailwind utility `rounded-xl` (no new primitive).
- Exemplar: `src/app/_components/job-card.tsx:32` — the existing precedent for consuming a documented radius token through a Tailwind utility (`rounded-lg` for `{rounded.base}`).

No new primitive is required; `rounded-xl` is the system-mapped Tailwind utility for `{rounded.field}`.

## Changes

1. `src/app/_components/dashboard-stats.tsx`
   - Change: on the `<section>` at line 37, swap `rounded-md` for `rounded-xl`. No other class on the element changes.
   - Preserve: the surface `{colors.surface}` (`bg-surface`), the emphasis boundary `{colors.border}` (`border border-border`), the 12px vertical padding (`py-3`), the inter-cell `{colors.border-secondary}` ticks, and the StatCell inner padding (`px-4 first:pl-0 last:pr-0`).
   - Verify: rendered top-of-page bar shows 12px corner radius; `bun run lint` passes; visual parity with the skeleton before and after the change.
2. `src/app/_components/dashboard-stats-skeleton.tsx`
   - Change: on the `<section>` at line 32, swap `rounded-md` for `rounded-xl` so the skeleton continues to mirror the loaded shape (the design rule "A skeleton that doesn't match its loaded shape shifts the layout on resolve" applies).
   - Preserve: `aria-hidden="true"` and the StatCellSkeleton slot dimensions (`h-6 w-10`, `h-4 w-20`, `rounded-sm` on the inner `Skeleton` rectangles).
   - Verify: during initial load (`summary.isPending`), the bar's outer radius is identical to the loaded bar.

## Scope

- Inherit: every consumer of `DashboardStats` and `DashboardStatsSkeleton` (currently only `JobsDashboard` at `src/app/_components/jobs-dashboard.tsx:181-185`).
- Verify: re-render the dashboard against the existing jobs dataset and confirm the bar radius reads as a softer 12px inside the same `{rounded.base}` card grid below it.
- Exclude: `JobCard` (`{rounded.base}` / `rounded-lg`), the modal container (`rounded-2xl` in `job-detail-modal.tsx:72` is not bound to a radius token), the filter panel surface (`rounded-lg` in `jobs-filter-bar.tsx:211`), and any empty/error/404 state card (`rounded-lg`). All of those target a different documented radius and stay untouched.

## Validation

- Product: while data loads and after it resolves, the bar at the top of the dashboard has the same 12px corner radius it already advertises in the design doc.
- Interface: light and dark themes, viewport widths ≥ 768px (per `DESIGN.md` §Layout), and the skeleton state during the summary prefetch.
- System: only one radius token (`{rounded.field}`) is consumed by one pair of components; no parallel scale introduced.
- Repository: `bun run lint` → exit 0; `bun run test` → existing `src/app/_components/match-score-chip.test.ts` and `src/lib/score-tier.test.ts` still pass (they assert on the score chip, not the stats bar).

## Stop conditions

- Stop if `{rounded.field}` is re-defined anywhere else or the dashboard-stats component is restructured to delegate its surface to a HeroUI `Card` primitive (in that case, the new owner owns the radius and this plan is stale).
- Stop if a future design revision moves `dashboard-stats` to a different radius token; update `DESIGN.md` first, then this plan.

## Design documentation

- After acceptance and validation: no change. `DESIGN.md` already states `{rounded.field}` for `dashboard-stats`; the implementation is being aligned with the existing contract.
