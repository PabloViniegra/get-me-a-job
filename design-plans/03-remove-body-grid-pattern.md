# Remove the body background grid pattern

Written against: `e8eb9d2` (HEAD)

## Evidence chain

- Surface: every route rendered under `src/app/layout.tsx` (the dashboard at `/`, the 404 surface in `src/app/not-found.tsx`, the runtime-error surface in `src/app/error.tsx`, and any future page) — all of them sit on top of `<body>`.
- Problem: `body` is painted with four layered `repeating-linear-gradient` declarations that draw a multi-directional grid on top of the canvas. The design documents the Canvas role as a flat `{colors.background}` and explicitly reserves depth for the border-and-surface progression; no token or section authorises this grid pattern.
- Design evidence:
  - `DESIGN.md` §Colors / Semantic roles table: `"Canvas | {colors.background} | Page surface, behind everything"`. No "Pattern" or "Grid" role exists alongside it.
  - `DESIGN.md` §Elevation & Depth: `"Depth comes from a border-and-surface progression, not from drop shadows."` and `"Borders do the work; shadows are a whisper."`
  - `DESIGN.md` §Do's and Don'ts: `"Don't add dramatic drop shadows."` and `"Don't introduce a second saturated color 'for variety.'"`
  - `DESIGN.md` §Themes: light and dark `{colors.background}` are documented per-mode (light `oklch(0.9702 0 0)`, dark `oklch(12% 0.005 285.823)`); the gradients in `body` derive their colour from `--border` rather than `--background`, which is itself off-contract.
- Owner: `src/app/globals.css:131-160` (the `body { background: … }` block, after the `@theme inline` re-exposure and the AA-contrast override).
- Scope and affected surfaces: every rendered page. The change is local to one CSS rule and removes four `repeating-linear-gradient` layers; nothing else in `globals.css` depends on them.
- Uncertainty: the `body` background is the only place the grid is declared, but I confirmed by `rg` that no component or test references `repeating-linear-gradient` directly, so removal is safe.

## Design decision

Reduce the `body` background to its documented contract: `background: var(--background); color: var(--foreground); font-family: var(--font-sans);`. Drop the four `repeating-linear-gradient` layers, the `color-mix(… var(--border) …)` derivations, and the multi-direction grid they imply. Cards, modals, and overlays keep their own surfaces (`bg-surface`, `--overlay`) and continue to define depth via the documented progression.

## Reuse

- Token: `{colors.background}` via the `--background` CSS variable (already re-exposed as `--color-background` in `@theme inline` at `src/app/globals.css:5-17`, consumed elsewhere as `bg-background`).
- Exemplar: the same body rule already enforces `color: var(--foreground)` and `font-family: var(--font-sans)`. The fix is to bring `background` to the same register.

No new primitive is required. Removing the grid is a deletion; the documented Canvas token is the only correct owner of this property.

## Changes

1. `src/app/globals.css`
   - Change: in the `body { … }` block at lines 131-160, replace the four `repeating-linear-gradient` layers plus their `, var(--background)` final stop with a single `background: var(--background);` declaration. Keep the existing `color: var(--foreground);` and `font-family: var(--font-sans);` lines.
   - Preserve: the preceding `@theme inline`, the AA-contrast override at lines 27-31, the `--expo-out` token and the theme-toggle view transition keyframes above the body block, and the modal animation tuning below it. None of those rely on the gradients.
   - Verify: rendered `body` paints as a flat `{colors.background}`; cards on top of it keep their `{colors.surface}` and `{colors.border}` contrast; `bun run lint` passes.

## Scope

- Inherit: every page rendered under `src/app/layout.tsx` (the dashboard, the 404 surface, the runtime error surface, and any future route). All of them currently sit on top of the patterned body.
- Verify: `src/app/page.tsx`, `src/app/not-found.tsx`, `src/app/error.tsx`, and the `_components/empty-state.tsx`, `_components/error-state.tsx`, `_components/filters-empty-state.tsx`, `_components/job-card.tsx`, `_components/dashboard-stats.tsx` etc. — all of them depend on the canvas being a flat surface, not on a grid pattern (none consume the gradients).
- Exclude: the cards' own border-first depth (`border border-border` on `JobCard`, `border border-border-secondary` on the modal `Dialog`), the modal `--overlay` surface, and the theme-toggle view transition. Those define their own depth and stay untouched.

## Validation

- Product: opening `/`, `/404`, or any route now shows a flat `{colors.background}` canvas under the content. The card grid remains the only readable structure, matching the squint test in `DESIGN.md` §Elevation & Depth.
- Interface: light and dark themes. Viewport widths from mobile through `xl:`. Both initial load and any subsequent refetch. `prefers-reduced-motion: reduce` is unaffected (it already short-circuits the theme-toggle view transition via the rule at `src/app/globals.css:104-110`).
- System: no new primitive, no parallel scale; `{colors.background}` continues to be the single owner of the canvas role.
- Repository: `bun run lint` → exit 0; `bun run test` → all suites pass (the contract tests for `match-score-chip` and `score-tier` are unrelated to body background; the integration tests in `src/lib/prisma.integration.test.ts` are also unaffected).

## Stop conditions

- Stop if a future design revision explicitly introduces a documented background pattern (a "Grid" role alongside Canvas, for instance). Update `DESIGN.md` first and write a new plan that targets the new role; do not re-add the gradients implicitly.
- Stop if any future page needs to consume the existing gradients as part of a hero or marketing surface. In that case, scope that pattern to the specific page rather than restoring it on `body`.

## Design documentation

- After acceptance and validation: no change. `DESIGN.md` already documents the Canvas role and the border-first depth language; the implementation is being aligned with the existing contract.
