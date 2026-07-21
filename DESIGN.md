---
version: alpha
name: Get Me a Job
description: Visual language for the Get Me a Job dashboard — a personal job-search surface that grades each LinkedIn offer against the user's CV.
colors:
  background: oklch(0.9702 0 0)
  foreground: oklch(0.2103 0.0059 285.89)
  surface: oklch(1 0 0)
  surface-foreground: oklch(0.2103 0.0059 285.89)
  muted: oklch(0.5 0.0138 285.94)
  border: oklch(0.9 0.004 286.32)
  accent: oklch(0.6204 0.195 253.83)
  accent-foreground: oklch(0.9911 0 0)
  default: oklch(0.94 0.001 286.375)
  default-foreground: oklch(0.2103 0.0059 285.89)
typography:
  sans:
    fontFamily: Space Grotesk
  mono:
    fontFamily: JetBrains Mono
  display:
    fontFamily: Space Grotesk
    fontSize: 28px
    lineHeight: 1.2
    fontWeight: 600
    letterSpacing: -0.02em
  title:
    fontFamily: Space Grotesk
    fontSize: 20px
    lineHeight: 1.3
    fontWeight: 600
    letterSpacing: -0.01em
  heading:
    fontFamily: Space Grotesk
    fontSize: 16px
    lineHeight: 1.4
    fontWeight: 600
  body:
    fontFamily: Space Grotesk
    fontSize: 14px
    lineHeight: 1.5
    fontWeight: 400
  label:
    fontFamily: Space Grotesk
    fontSize: 13px
    lineHeight: 1.4
    fontWeight: 500
    letterSpacing: 0.01em
  caption:
    fontFamily: Space Grotesk
    fontSize: 12px
    lineHeight: 1.4
    fontWeight: 400
  data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    lineHeight: 1.4
    fontWeight: 500
rounded:
  base: 0.5rem
  field: 0.75rem
spacing:
  base: 0.25rem
components:
  job-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.base}"
    padding: 16px
  primary-button:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.base}"
    padding: 12px
  match-score-chip-worth:
    backgroundColor: "{colors.default}"
    textColor: "{colors.default-foreground}"
    typography: "{typography.data}"
  match-score-chip-low:
    textColor: "{colors.muted}"
    typography: "{typography.data}"
  dashboard-stats:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.field}"
    padding: 12px
---

## Overview

Get Me a Job is a personal dashboard. It ingests a daily LinkedIn scrape, persists each offer in MongoDB, grades it against the user's CV via an LLM, and surfaces the result in a ranked, single-page view. The user is a developer evaluating their own job search the way they would read a linter or a test runner — signal over noise, precision over cheerleading.

The visual language is monochrome-first, IDE-flavored, with a single restrained accent reserved for state that earns it (a match score ≥ 85, primary actions, focus). Depth comes from a border-and-surface progression, not from drop shadows. The product is dense (14px base, no marketing-page whitespace) and quiet — motion is rare and only the Match Score Chip at the top tier animates.

The product is built on HeroUI v3 (whose default theme is the source of truth for color tokens, radius, shadows, and component semantics) and Tailwind CSS v4. Tokens are exposed through Tailwind's `@theme inline` in `src/app/globals.css` and consumed as utility classes; components are composed from HeroUI compound parts (`Card.Header`, `Chip`, `Button`, etc.) — never from raw color props or ad-hoc wrappers.

## Colors

Every color in the system is sourced from HeroUI v3's default theme (`@heroui/styles/dist/themes/default/variables.css`) and re-exposed through Tailwind utilities in `src/app/globals.css`. Do not hardcode hex, rgb, or oklch in components. Reference tokens as Tailwind classes (`bg-surface`, `text-muted`, `border-border-secondary`) or, in custom CSS, as the underlying CSS variables (`var(--accent)`, `var(--border)`).

The product overrides one of HeroUI's defaults and adds one:

- `--link: var(--accent)` everywhere, then `oklch(0.5 0.195 253.83)` in light mode. HeroUI's light `--muted` and `--link` both fail WCAG AA on `--background` (audit-measured 4.43:1 and 3.68:1). The dark theme already passes, so the override is scoped to `.light, [data-theme="light"]` only. Never hand-author dark-mode equivalents — the override is already there.

Calculated tokens (`--accent-soft`, `--border-secondary`, `--*-hover`, etc.) are derived via `color-mix` inside HeroUI and re-exposed as Tailwind utilities by the shared `@theme inline` block in `@heroui/styles/dist/themes/shared/theme.css`. They adjust per theme automatically; do not duplicate them or write a parallel scale.

Semantic roles, not color values, are what components should refer to. The mapping below is the only contract that matters for new UI:

| Role | Token | Use |
|---|---|---|
| Canvas | `{colors.background}` | Page surface, behind everything |
| Card / non-overlay | `{colors.surface}` | `Card`, list rows, accordions |
| Nested / hover inside a card | `--surface-secondary`, `--surface-tertiary` | Disclosure rows, hover states, table striping |
| Overlay | `--overlay` | Modals, popovers, tooltips, menus |
| Primary text | `{colors.foreground}` | Headings, body copy, primary values |
| Secondary / tertiary text | `{colors.muted}` | Metadata, captions, placeholders, low-match scores |
| Emphasis boundary | `{colors.border}` | Card outline, component outline |
| Internal divider | `--separator` | Inside a list/table between same-weight rows |
| The one accent | `{colors.accent}` | Primary action, focus ring, ≥85 score chip |
| Neutral chip surface | `{colors.default}` | "Worth reviewing" score chip, neutral metadata chip |
| Outbound link | `--link` (= `{colors.accent}` in light AA-fixed form) | LinkedIn URL on `JobCard`, footer links |

Text follows a four-level hierarchy: primary (`{colors.foreground}`) → secondary (`{colors.muted}`) → tertiary (`color-mix(in oklab, var(--muted) 65%, transparent)`, applied directly — no token) → disabled (`{colors.muted}` at HeroUI's `--disabled-opacity: 0.5`). Two levels is a flat hierarchy pretending to be a system.

Match-score tiers, in this order of priority, are the only place the accent is allowed to dominate:

| Tier | Score | Background | Foreground | Motion |
|---|---|---|---|---|
| Excellent | ≥ 85 | `--accent-soft` | `--accent-soft-foreground` | Inset ring opacity breathe (2.4s ease-in-out) + 3s slow icon spin |
| Worth | 65–84 | `{colors.default}` | `{colors.default-foreground}` | None |
| Low | < 65 | None — mono text only | `{colors.muted}` | None |
| Pending | not yet analyzed | None | `{colors.muted}` | None |

## Themes

The system supports light and dark via `next-themes` (`attribute={["class", "data-theme"]}` in `src/app/providers.tsx`). HeroUI's `.dark, [data-theme="dark"]` block ships every value that differs from light; the table below records the only product-relevant tokens that diverge. Tokens not listed (`{colors.accent}`, `{colors.accent-foreground}`) are identical in both modes.

| Token | Light | Dark |
|---|---|---|
| `{colors.background}` | `oklch(0.9702 0 0)` | `oklch(12% 0.005 285.823)` |
| `{colors.foreground}` | `oklch(0.2103 0.0059 285.89)` | `oklch(0.9911 0 0)` |
| `{colors.surface}` | `oklch(1 0 0)` | `oklch(0.2103 0.0059 285.89)` |
| `{colors.surface-foreground}` | `oklch(0.2103 0.0059 285.89)` | `oklch(0.9911 0 0)` |
| `{colors.muted}` | `oklch(0.5 0.0138 285.94)` (AA override) | `oklch(70.5% 0.015 286.067)` |
| `{colors.border}` | `oklch(0.9 0.004 286.32)` | `oklch(28% 0.006 286.033)` |
| `{colors.default}` | `oklch(0.94 0.001 286.375)` | `oklch(27.4% 0.006 286.033)` |
| `{colors.default-foreground}` | `oklch(0.2103 0.0059 285.89)` | `oklch(0.9911 0 0)` |
| `--link` | `oklch(0.5 0.195 253.83)` (AA override) | `oklch(0.6204 0.195 253.83)` (= `{colors.accent}`) |
| `--surface-shadow` | layered, ~2–4px blur | `0 0 0 0 transparent inset` — border does all the work |
| `--overlay-shadow` | layered, ~14–28px | `0 0 1px 0 rgba(255,255,255,0.3) inset` |

The theme toggle (`src/app/_components/theme-toggle.tsx`) uses the View Transitions API to mask-fade between modes; the easing is `--expo-out` in `src/app/globals.css` and `prefers-reduced-motion` already short-circuits it.

## Typography

Two families, one job each, both via `next/font/google` in `src/app/layout.tsx`:

- **Space Grotesk** (`--font-sans`) — geometric humanist sans for UI. Weights 400, 500, 600.
- **JetBrains Mono** (`--font-mono`) — for data, IDs, salary, and metadata labels. Weight 500, with `font-variant-numeric: tabular-nums` applied wherever numbers must align.

These are deliberately not Geist. Every Vercel-adjacent starter ships Geist by default; using it here would be the same template-y look this system is trying not to have. Space Grotesk + JetBrains Mono is the same IDE/dev-tool register this app's interface is targeting — diagnostic, not promotional.

Base size is 14px. This is a dense, IDE-like surface, not a marketing page. Do not bump the base.

Eight semantic scales. Each is a contract; use the scale, not a one-off `text-[Npx]`. The exceptions (`text-[28px]` on the dashboard H1, `text-[13px]` for the filter bar legends) are deliberate, documented, and should not multiply.

| Scale | Size / line-height | Weight | Tracking | When |
|---|---|---|---|---|
| `display` | 28px / 1.2 | 600 | -0.02em | Page H1 — once per screen |
| `title` | 20px / 1.3 | 600 | -0.01em | Modal / section heading |
| `heading` | 16px / 1.4 | 600 | normal | `Card.Title` (job title) |
| `body` | 14px / 1.5 | 400 | normal | Description, chat, paragraphs |
| `label` | 13px / 1.4 | 500 | 0.01em | Filter legends, form labels, chip text |
| `caption` | 12px / 1.4 | 400 | normal | Footnotes, supporting copy |
| `data` | 13px / 1.4 (mono, tabular-nums) | 500 | normal | Scores, salary, `jobId`, timestamps |

Never signal hierarchy by size alone. Pair size with weight; pair labels with tracking. The `data` scale always carries the mono family — switching to sans for "just this one number" breaks the alignment grid.

Uppercase mono with `tracking-wider` is the metadata voice (job format, requirement tags, field labels, the `// por qué encaja` accent). It is the only place that pattern appears, so it reads as a status annotation, not as a visual flourish.

## Layout

Spacing is 4px-grid via HeroUI's `--spacing: 0.25rem`, which matches Tailwind v4's default and means no scale override is needed. Use Tailwind spacing utilities (`p-1`…`p-16`, `gap-2`, `space-y-3`) directly. Apply by context, not by feel:

| Context | Range |
|---|---|
| Micro (icon-to-label gap, inline pairings) | 4–8px |
| Component (button/chip internal padding) | 8–12px |
| Card (internal card padding) | 16–24px |
| Section (between cards/groups) | 24–32px |
| Page (major regions, container padding) | 48–64px |

Padding stays symmetrical unless content forces asymmetry. The dashboard's outer `main` uses centered flex with `font-sans`; cards inside a grid use `h-full` so the row stays even when content length varies.

Desktop-first. The PRD has no mobile requirement; optimize the card grid for ≥ 768px (`md:` breakpoint). Below that, collapse to a single column rather than redesigning the card.

## Elevation & Depth

Borders do the work; shadows are a whisper. Four real levels, low to high:

`{colors.background}` (page) → `{colors.surface}` (cards) → `--surface-secondary` / `--surface-tertiary` (nested or hover state inside a card) → `--overlay` (modals, popovers, tooltips).

Shadows come from HeroUI tokens, already tuned per mode:

- Light: `--surface-shadow` (layered, ~2–4px blur) plus a `{colors.border}`. The card has both.
- Dark: `--surface-shadow` collapses to `0 0 0 0 transparent inset` — the border alone defines the boundary. The card has only the border.
- Overlays (modals, popovers) use `--overlay-shadow` in both modes since they float above content.

The squint test: blur your eyes. The hierarchy should still read. Nothing should jump out as a hard line; nothing should look like a card on a card on a card. If you can name the exact hex jump at a glance, the step is too loud.

## Shapes

Two named tokens, both from HeroUI:

- `{rounded.base}` = `0.5rem` (8px) — `Card`, `Chip`, buttons, neutral surfaces. `JobCard` uses this.
- `{rounded.field}` = `0.75rem` (12px) — form fields, the dashboard-stats bar.

The full `xs`…`4xl` scale exists in `@heroui/styles` (derived from `--radius` via `calc()`) and is exposed as Tailwind `rounded-*` utilities. Prefer the source-named tokens for component contracts; use the utilities for one-off shapes (avatars, badge dots) without inventing a new token.

Don't mix sharp and soft radii on the same surface.

## Components

The product composes from HeroUI v3 compound components — no `HeroUIProvider`, no flat props. The list below is this app's usage contract, not HeroUI's API; verify anatomy against the `heroui-react` skill before implementing.

### JobCard

The dashboard's primary surface. Maps to `JobOffer` (PRD §4). Top to bottom:

- **Header:** `title` in the `heading` scale + `format` (Remote / Hybrid / On-site) as a `Chip` on `{colors.default}` — metadata, not status.
- **Score:** `MatchScoreChip`, top-right.
- **Body:** `description` in the `body` scale, line-clamped to 3 lines; `requirements` as a `TagGroup` of chips; `salary` in the `data` scale. If `salary` is null, render `—` in `{colors.muted}` with the `sr-only` text "Salario no publicado" — never hide the row.
- **Footer:** relative timestamp (`date-fns`, `es` locale, e.g. "hace 2 horas") in `caption` over `{colors.muted}`, then `Button`s in the `ghost` variant for "Carta IA" and "Ver detalles", then an outbound `Link` to `linkedinUrl` (the `--link` override gives it the accent color).
- **Surface:** `{colors.surface}` + `{colors.border}`, `{rounded.base}` (8px), 16px padding. Hover lifts 1px and shifts the border to `--border-secondary`.

### MatchScoreChip (signature)

The one place motion and saturated color are allowed to coexist. Reserve both for this component.

- **Excellent (≥ 85):** `Chip` on `--accent-soft` / `--accent-soft-foreground` with the score in the `data` scale, a small `LoaderCircle` (12px, `{colors.accent}`) spinning at 3s linear, and a 1px inset accent ring whose opacity breathes (25% ↔ 65%, 2.4s ease-in-out) via the `motion-safe:animate-accent-breathe` token. Both the breathe and the icon spin are required — the static half is not an option (FR-3.4).
- **Worth (65–84):** `Chip` on `{colors.default}` / `{colors.default-foreground}`, `data` scale, no icon, no motion.
- **Low (< 65):** plain mono text in `{colors.muted}` on `{colors.surface}` — no fill, no border, still visible.
- **Pending (no analysis yet):** "Sin analizar" in `{colors.muted}` — no number to show.

Wrap the motion in `motion-safe:` and freeze the chip to the static "excellent" state under `prefers-reduced-motion: reduce`.

### DashboardStats

The top-of-page summary bar. Three cells separated by 1px `{colors.border-secondary}` ticks. Value in `data` scale (mono, tabular-nums) at 20px / 1.2 / 600 — a step up from `body`, not a step down from `display`. Label in `caption` over `{colors.muted}`. Bar uses `{colors.surface}` + `{colors.border}` with 12px vertical padding and `{rounded.field}`.

### Skeleton

HeroUI's `Skeleton` matching the exact `JobCard` structure (same padding, same radius, same slot sizes). A skeleton that doesn't match its loaded shape shifts the layout on resolve — that is worse than a spinner.

### Toast (sileo)

FR-3.6 grouped / morphing toast for repeated actions (e.g. manual refresh). Position top-right (configured in `src/app/providers.tsx`). Surface follows `--overlay` / `--overlay-shadow` like any other floating element. sileo's own API is not documented here — verify against its docs when wiring, do not assume prop names from this file.

### General HeroUI usage

- Semantic variants only (`primary`, `secondary`, `tertiary`, `danger`, `ghost`, `outline`) — never a raw color prop.
- One `primary` action per screen / per context.
- `onPress`, not `onClick`. React 19 + HeroUI v3.
- Every interactive element: default, hover, active, focus, disabled. Every data view: loading (Skeleton), empty (explicit copy, not a blank card), error (readable message, not a raw stack trace). Missing states read as broken, not as "not built yet."

## Motion

Motion is rare, and that rarity is what makes the one motion that does run — the `excellent` `MatchScoreChip` — mean something. No spring, no bounce, no ambient micro-animations anywhere else.

| Interaction | Duration | Easing |
|---|---|---|
| Hover / press micro-interactions (`transition-transform duration-150 ease-out`, `active:scale-[0.97]`) | 150ms | ease-out |
| Modal enter / exit (HeroUI's defaults are re-tuned in `src/app/globals.css`) | 220ms / 180ms | `--expo-out` (deceleration on both ends) |
| Theme toggle view transition (View Transitions API) | 1s | `--expo-out` |
| `excellent` `MatchScoreChip` ring opacity breathe (required, FR-3.4) | 2.4s | ease-in-out, infinite |
| `excellent` `MatchScoreChip` icon spin (required, FR-3.4) | 3s | linear, infinite |

Keep the `excellent` loop slow enough to read as ambient status, not as an alert. The chip's `motion-safe:` prefix means it falls back to the static "excellent" state under `prefers-reduced-motion: reduce`. The theme-toggle view transition has its own reduced-motion short-circuit in `src/app/globals.css`.

## Iconography

One set: `lucide-react` (already installed). Stroke width 1.75–2, `currentColor` only — the icon inherits whatever text token it sits next to. Three sizes only:

| Size | Inline with |
|---|---|
| 12px | Caption / label text (mono metadata, the `LoaderCircle` on the `excellent` chip) |
| 14px | Body text (chevrons, secondary affordances) |
| 16px | Standalone (nav, the `ThemeToggle`, state icons in empty / error states) |
| 20px | Hero / button-only — rare; the `ThemeToggle` fallback |

If removing the icon loses no meaning, remove it. Iconography is decoration when text already says the thing; keep it only when it carries weight text can't (the score chip's spin, the `Clock` next to "hace 2 horas").

## Accessibility

- **Contrast:** WCAG AA minimum (4.5:1 for body text). HeroUI's light `--muted` and `--link` both fall short of AA on `--background`; the `globals.css` AA override fixes that for the `{colors.muted}` and `--link` tokens only. The `{colors.accent}` / `{colors.accent-foreground}` pairing on primary buttons does **not** pass AA against the linter's sRGB approximation — do not use the primary button for body text; reserve it for the CTA where size and weight make the lower ratio acceptable. When in doubt, run an actual contrast check on the rendered oklch values.
- **Focus:** every focusable element gets `--focus` (= `{colors.accent}`) as a visible ring. `--ring-offset-width` (2px) is a HeroUI token — reuse it, don't hand-write the offset.
- **Motion:** `prefers-reduced-motion: reduce` already short-circuits the theme-toggle view transition. The `excellent` chip motion is wrapped in `motion-safe:` and freezes to its static "excellent" state. Any new ambient motion needs the same treatment.
- **Disabled state:** use `--disabled-opacity` (0.5, a HeroUI token), not a hand-picked value.
- **Skip link:** the layout renders an `sr-only` "Saltar a las ofertas" link that becomes visible on focus, jumping to `#ofertas`. Don't remove it.
- **Localization:** UI copy is Spanish (`es`), `date-fns` locale is `es` (FR-3.5). Copy tone is analytical, not motivational — describe the match, don't cheerlead it ("gap en experiencia con GraphQL", not "¡Casi perfecto!").

## Voice & Content

The user is a developer evaluating their own job search like a linter or test runner. UI copy must read the same way: describe the data, don't celebrate it. "Match excelente: 87 sobre 100" beats "¡Este puesto es para ti!". "Sin analizar" beats "Pendiente de revisión". When a value is missing, say so plainly ("Salario no publicado", "hace 2 horas") rather than with a marketing-friendly placeholder.

The product's UI is Spanish-only. `lang="es"` is set on `<html>` in `src/app/layout.tsx`; `date-fns` is configured with the `es` locale. Do not introduce English UI strings, and do not introduce a translation layer — there is no second locale to translate to.

## Do's and Don'ts

- **Do** reference HeroUI CSS variables (directly or through Tailwind utilities mapped in `src/app/globals.css`).
- **Don't** hardcode hex, rgb, or oklch in a component.
- **Do** keep one accent — `{colors.accent}` — and use it for state and action.
- **Don't** introduce a second saturated color "for variety."
- **Do** use border-first depth; let shadow be a whisper.
- **Don't** add dramatic drop shadows.
- **Do** use the four-level text hierarchy (`primary`, `secondary`, `tertiary`, `disabled`).
- **Don't** reduce it to "text" and "gray text."
- **Do** reserve motion for the `excellent` `MatchScoreChip`.
- **Don't** add ambient animation elsewhere.
- **Do** use semantic HeroUI variants (`primary`, `danger`, `ghost`).
- **Don't** pass raw color props to HeroUI components.
- **Do** honor `prefers-reduced-motion` — the `excellent` chip must freeze to its static state, and the theme-toggle view transition already short-circuits.
- **Don't** override HeroUI's dark-mode values for tokens that are already calculated (`--accent-soft`, `--border-secondary`, `--*-hover`). The source derives them per theme.
